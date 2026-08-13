#![no_std]

//! Dispute contract — records disputes and coordinates their resolution.
//!
//! The dispute contract can NEVER move funds on its own. Opening a dispute
//! freezes the deposit in the escrow contract (`escrow.lock_for_dispute`),
//! and executing an accepted resolution asks escrow to settle the agreed split
//! (`escrow.settle_dispute`). Escrow validates the caller and its own state on
//! every call, so a compromised or buggy dispute contract still cannot
//! withdraw anything arbitrarily.
//!
//! Flow: open_dispute → propose_resolution (landlord) → accept_resolution
//! (tenant) → resolve_dispute (either party executes the accepted split).

use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String, Symbol};

use tr_common::escrow_api::EscrowClient;
use tr_common::events;
use tr_common::{
    DisputeRecord, DisputeState, Error, EvidenceRecord, EvidenceType, TryClientResult,
};

#[contracttype]
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum DataKey {
    Admin,
    AgreementContract,
    EscrowContract,
    EvidenceCounter,
    Dispute(u32),
    Evidence(u32),
}

#[contract]
pub struct DisputeContract;

#[contractimpl]
impl DisputeContract {
    /// One-time setup: `agreement_contract` is the only contract allowed to
    /// open disputes; `escrow_contract` is where the deposit lives.
    pub fn initialize(
        env: Env,
        admin: Address,
        agreement_contract: Address,
        escrow_contract: Address,
    ) {
        admin.require_auth();
        env.storage().persistent().set(&DataKey::Admin, &admin);
        env.storage()
            .persistent()
            .set(&DataKey::AgreementContract, &agreement_contract);
        env.storage()
            .persistent()
            .set(&DataKey::EscrowContract, &escrow_contract);
    }

    /// Open a dispute. Only the registered agreement contract may call this
    /// (it has already verified the initiator is a party). Immediately freezes
    /// the deposit in escrow — the deposit lock is preserved for the whole
    /// dispute (Dispute → Escrow cross-contract call).
    pub fn open_dispute(
        env: Env,
        agreement_id: u32,
        initiator: Address,
        landlord: Address,
        tenant: Address,
        reason: String,
        caller: Address,
    ) -> Result<(), Error> {
        caller.require_auth();
        require_caller(&env, &DataKey::AgreementContract, &caller)?;

        initiator.require_auth();
        if initiator != landlord && initiator != tenant {
            return Err(Error::NotParty);
        }

        let existing: Option<DisputeRecord> = env
            .storage()
            .persistent()
            .get(&DataKey::Dispute(agreement_id));
        if existing.is_some() {
            return Err(Error::DisputeAlreadyOpen);
        }

        let record = DisputeRecord {
            agreement_id,
            landlord,
            tenant,
            initiator,
            reason,
            state: DisputeState::Opened,
            to_tenant: 0,
            to_landlord: 0,
            opened_at: env.ledger().timestamp(),
            resolved_at: None,
        };
        env.storage()
            .persistent()
            .set(&DataKey::Dispute(agreement_id), &record);

        // Preserve the deposit lock: the escrow contract accepts this only
        // from the registered dispute contract.
        let escrow_contract: Address = env
            .storage()
            .persistent()
            .get(&DataKey::EscrowContract)
            .ok_or(Error::NotInitialized)?;
        let caller_addr = env.current_contract_address();
        EscrowClient::new(&env, &escrow_contract)
            .try_lock_for_dispute(&agreement_id, &caller_addr)
            .into_result()?;

        env.events().publish(
            (Symbol::new(&env, events::DISPUTE_OPENED),),
            (agreement_id,),
        );
        Ok(())
    }

    /// Either party submits an evidence reference for the dispute.
    pub fn submit_dispute_evidence(
        env: Env,
        agreement_id: u32,
        submitter: Address,
        evidence_type: EvidenceType,
        content_hash: String,
    ) -> Result<u32, Error> {
        submitter.require_auth();
        let record = load(&env, agreement_id)?;
        if submitter != record.landlord && submitter != record.tenant {
            return Err(Error::NotParty);
        }
        if record.state == DisputeState::Resolved {
            return Err(Error::InvalidState);
        }

        let counter: u32 = env
            .storage()
            .persistent()
            .get(&DataKey::EvidenceCounter)
            .unwrap_or(0);
        let evidence_id = counter + 1;

        let evidence = EvidenceRecord {
            id: evidence_id,
            agreement_id,
            evidence_type,
            content_hash,
            submitted_by: submitter,
            timestamp: env.ledger().timestamp(),
        };
        env.storage()
            .persistent()
            .set(&DataKey::Evidence(evidence_id), &evidence);
        env.storage()
            .persistent()
            .set(&DataKey::EvidenceCounter, &evidence_id);

        env.events().publish(
            (Symbol::new(&env, events::EVIDENCE_SUBMITTED),),
            (agreement_id, evidence_id),
        );
        Ok(evidence_id)
    }

    /// Landlord proposes a resolution split (Opened → UnderReview).
    pub fn propose_resolution(
        env: Env,
        agreement_id: u32,
        landlord: Address,
        to_tenant: i128,
        to_landlord: i128,
    ) -> Result<(), Error> {
        landlord.require_auth();
        let mut record = load(&env, agreement_id)?;
        if record.landlord != landlord {
            return Err(Error::Unauthorized);
        }
        if record.state != DisputeState::Opened {
            return Err(Error::InvalidState);
        }
        if to_tenant < 0 || to_landlord < 0 || to_tenant + to_landlord <= 0 {
            return Err(Error::InvalidAmount);
        }
        // Bound the split by the locked deposit (Dispute → Escrow read): a
        // resolution can never exceed what escrow actually holds, so the
        // dispute can never reach an unresolvable Accepted state.
        let escrow_contract: Address = env
            .storage()
            .persistent()
            .get(&DataKey::EscrowContract)
            .ok_or(Error::NotInitialized)?;
        let deposit = EscrowClient::new(&env, &escrow_contract)
            .try_get_deposit(&agreement_id)
            .into_result()?;
        if to_tenant + to_landlord > deposit.amount {
            return Err(Error::InvalidAmount);
        }

        record.to_tenant = to_tenant;
        record.to_landlord = to_landlord;
        record.state = DisputeState::UnderReview;
        env.storage()
            .persistent()
            .set(&DataKey::Dispute(agreement_id), &record);

        env.events().publish(
            (Symbol::new(&env, events::DEDUCTION_PROPOSED),),
            (agreement_id, to_tenant + to_landlord),
        );
        Ok(())
    }

    /// Tenant accepts the proposed resolution (UnderReview → Accepted).
    pub fn accept_resolution(env: Env, agreement_id: u32, tenant: Address) -> Result<(), Error> {
        tenant.require_auth();
        let mut record = load(&env, agreement_id)?;
        if record.tenant != tenant {
            return Err(Error::Unauthorized);
        }
        if record.state != DisputeState::UnderReview {
            return Err(Error::InvalidState);
        }

        record.state = DisputeState::Accepted;
        env.storage()
            .persistent()
            .set(&DataKey::Dispute(agreement_id), &record);

        env.events().publish(
            (Symbol::new(&env, events::SETTLEMENT_ACCEPTED),),
            (agreement_id, record.to_tenant, record.to_landlord),
        );
        Ok(())
    }

    /// Execute an accepted resolution: instructs the escrow contract to
    /// settle the agreed split (Dispute → Escrow cross-contract call). Either
    /// party may trigger the execution once the tenant has accepted.
    pub fn resolve_dispute(env: Env, agreement_id: u32, caller: Address) -> Result<(), Error> {
        caller.require_auth();
        let mut record = load(&env, agreement_id)?;
        if caller != record.landlord && caller != record.tenant {
            return Err(Error::NotParty);
        }
        if record.state != DisputeState::Accepted {
            return Err(Error::InvalidState);
        }

        let escrow_contract: Address = env
            .storage()
            .persistent()
            .get(&DataKey::EscrowContract)
            .ok_or(Error::NotInitialized)?;
        let caller_addr = env.current_contract_address();
        EscrowClient::new(&env, &escrow_contract)
            .try_settle_dispute(
                &agreement_id,
                &record.to_tenant,
                &record.to_landlord,
                &caller_addr,
            )
            .into_result()?;

        record.state = DisputeState::Resolved;
        record.resolved_at = Some(env.ledger().timestamp());
        env.storage()
            .persistent()
            .set(&DataKey::Dispute(agreement_id), &record);

        env.events().publish(
            (Symbol::new(&env, events::DISPUTE_RESOLVED),),
            (agreement_id, record.to_tenant, record.to_landlord),
        );
        Ok(())
    }

    pub fn get_dispute(env: Env, agreement_id: u32) -> Result<DisputeRecord, Error> {
        load(&env, agreement_id)
    }
}

fn require_caller(env: &Env, key: &DataKey, caller: &Address) -> Result<(), Error> {
    let authorized: Address = env
        .storage()
        .persistent()
        .get(key)
        .ok_or(Error::NotInitialized)?;
    if caller != &authorized {
        return Err(Error::Unauthorized);
    }
    Ok(())
}

fn load(env: &Env, agreement_id: u32) -> Result<DisputeRecord, Error> {
    env.storage()
        .persistent()
        .get(&DataKey::Dispute(agreement_id))
        .ok_or(Error::DisputeNotFound)
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::testutils::Address as _;
    use soroban_sdk::{Env, String as SorobanString};

    use escrow::EscrowContract;
    use tr_common::escrow_api::EscrowClient;
    use tr_common::DepositStatus;

    const DEPOSIT: i128 = 30_000_000_000;

    /// Registers the real escrow contract alongside the dispute contract so
    /// the Dispute → Escrow cross-contract calls execute against real state.
    fn setup() -> (Env, Address, Address, Address) {
        let env = Env::default();
        env.mock_all_auths();

        let escrow_id = env.register(EscrowContract, ());
        let dispute_id = env.register(DisputeContract, ());

        let admin = Address::generate(&env);
        let agreement = Address::generate(&env);

        EscrowClient::new(&env, &escrow_id).initialize(&admin, &agreement, &dispute_id);

        let client = DisputeContractClient::new(&env, &dispute_id);
        client.initialize(&admin, &agreement, &escrow_id);

        (env, dispute_id, agreement, escrow_id)
    }

    fn open_helper(
        env: &Env,
        client: &DisputeContractClient<'_>,
        agreement: &Address,
        agreement_id: u32,
        initiator: &Address,
        landlord: &Address,
        tenant: &Address,
    ) {
        client.open_dispute(
            &agreement_id,
            initiator,
            landlord,
            tenant,
            &SorobanString::from_str(env, "deposit withheld"),
            agreement,
        );
    }

    #[test]
    fn opening_freezes_the_deposit() {
        let (env, dispute_id, agreement, escrow_id) = setup();
        let client = DisputeContractClient::new(&env, &dispute_id);
        let landlord = Address::generate(&env);
        let tenant = Address::generate(&env);

        // Tenant locks the deposit through the (simulated) agreement contract.
        EscrowClient::new(&env, &escrow_id)
            .lock_deposit(&1u32, &tenant, &landlord, &DEPOSIT, &agreement);

        open_helper(&env, &client, &agreement, 1, &tenant, &landlord, &tenant);

        let dispute = client.get_dispute(&1u32);
        assert_eq!(dispute.state, DisputeState::Opened);
        assert_eq!(dispute.initiator, tenant);
        assert_eq!(dispute.landlord, landlord);
        assert_eq!(dispute.tenant, tenant);

        // The deposit is frozen in escrow.
        let deposit = EscrowClient::new(&env, &escrow_id).get_deposit(&1u32);
        assert_eq!(deposit.status, DepositStatus::Disputed);
        assert_eq!(deposit.released, 0);
    }

    #[test]
    fn full_dispute_flow_settles_escrow() {
        let (env, dispute_id, agreement, escrow_id) = setup();
        let client = DisputeContractClient::new(&env, &dispute_id);
        let landlord = Address::generate(&env);
        let tenant = Address::generate(&env);

        EscrowClient::new(&env, &escrow_id)
            .lock_deposit(&1u32, &tenant, &landlord, &DEPOSIT, &agreement);
        open_helper(&env, &client, &agreement, 1, &tenant, &landlord, &tenant);

        // Landlord proposes a split: tenant 25k, landlord 5k.
        client.propose_resolution(&1u32, &landlord, &25_000_000_000i128, &5_000_000_000i128);
        assert_eq!(client.get_dispute(&1u32).state, DisputeState::UnderReview);

        // Tenant accepts.
        client.accept_resolution(&1u32, &tenant);
        assert_eq!(client.get_dispute(&1u32).state, DisputeState::Accepted);

        // Either party executes; escrow settles the split.
        client.resolve_dispute(&1u32, &tenant);
        let dispute = client.get_dispute(&1u32);
        assert_eq!(dispute.state, DisputeState::Resolved);
        assert!(dispute.resolved_at.is_some());

        let deposit = EscrowClient::new(&env, &escrow_id).get_deposit(&1u32);
        assert_eq!(deposit.released, DEPOSIT);
        assert_eq!(deposit.status, DepositStatus::Released);

        // The dispute contract cannot be used twice for the same agreement.
        assert_eq!(
            client
                .try_resolve_dispute(&1u32, &landlord)
                .unwrap_err()
                .unwrap(),
            Error::InvalidState
        );
    }

    #[test]
    fn unauthorized_calls_are_rejected() {
        let (env, dispute_id, agreement, escrow_id) = setup();
        let client = DisputeContractClient::new(&env, &dispute_id);
        let landlord = Address::generate(&env);
        let tenant = Address::generate(&env);
        let stranger = Address::generate(&env);

        // Only the agreement contract can open a dispute.
        assert_eq!(
            client
                .try_open_dispute(
                    &1u32,
                    &tenant,
                    &landlord,
                    &tenant,
                    &SorobanString::from_str(&env, "x"),
                    &stranger,
                )
                .unwrap_err()
                .unwrap(),
            Error::Unauthorized
        );

        // A dispute freezes an existing deposit, so one must be locked first.
        EscrowClient::new(&env, &escrow_id)
            .lock_deposit(&1u32, &tenant, &landlord, &DEPOSIT, &agreement);

        open_helper(&env, &client, &agreement, 1, &tenant, &landlord, &tenant);

        // Only the landlord proposes, only the tenant accepts.
        assert_eq!(
            client
                .try_propose_resolution(&1u32, &tenant, &25_000_000_000i128, &5_000_000_000i128)
                .unwrap_err()
                .unwrap(),
            Error::Unauthorized
        );
        client.propose_resolution(&1u32, &landlord, &25_000_000_000i128, &5_000_000_000i128);
        assert_eq!(
            client
                .try_accept_resolution(&1u32, &landlord)
                .unwrap_err()
                .unwrap(),
            Error::Unauthorized
        );

        // A stranger cannot submit evidence or resolve.
        assert_eq!(
            client
                .try_submit_dispute_evidence(
                    &1u32,
                    &stranger,
                    &EvidenceType::DamageEvidence,
                    &SorobanString::from_str(&env, "Qm..."),
                )
                .unwrap_err()
                .unwrap(),
            Error::NotParty
        );
        assert_eq!(
            client
                .try_resolve_dispute(&1u32, &stranger)
                .unwrap_err()
                .unwrap(),
            Error::NotParty
        );
    }

    #[test]
    fn guards_on_state_and_amounts() {
        let (env, dispute_id, agreement, escrow_id) = setup();
        let client = DisputeContractClient::new(&env, &dispute_id);
        let landlord = Address::generate(&env);
        let tenant = Address::generate(&env);

        // A dispute freezes an existing deposit, so one must be locked first.
        EscrowClient::new(&env, &escrow_id)
            .lock_deposit(&1u32, &tenant, &landlord, &DEPOSIT, &agreement);

        // Double open rejected.
        open_helper(&env, &client, &agreement, 1, &tenant, &landlord, &tenant);
        assert_eq!(
            client
                .try_open_dispute(
                    &1u32,
                    &tenant,
                    &landlord,
                    &tenant,
                    &SorobanString::from_str(&env, "again"),
                    &agreement,
                )
                .unwrap_err()
                .unwrap(),
            Error::DisputeAlreadyOpen
        );

        // Invalid splits rejected.
        assert_eq!(
            client
                .try_propose_resolution(&1u32, &landlord, &-1i128, &0i128)
                .unwrap_err()
                .unwrap(),
            Error::InvalidAmount
        );
        assert_eq!(
            client
                .try_propose_resolution(&1u32, &landlord, &0i128, &0i128)
                .unwrap_err()
                .unwrap(),
            Error::InvalidAmount
        );
        // A split exceeding the locked deposit is rejected via the
        // Dispute → Escrow read.
        assert_eq!(
            client
                .try_propose_resolution(&1u32, &landlord, &40_000_000_000i128, &0i128)
                .unwrap_err()
                .unwrap(),
            Error::InvalidAmount
        );

        // Cannot resolve before the tenant accepts.
        client.propose_resolution(&1u32, &landlord, &25_000_000_000i128, &5_000_000_000i128);
        assert_eq!(
            client
                .try_resolve_dispute(&1u32, &tenant)
                .unwrap_err()
                .unwrap(),
            Error::InvalidState
        );

        // Unknown dispute not found.
        assert_eq!(
            client.try_get_dispute(&42u32).unwrap_err().unwrap(),
            Error::DisputeNotFound
        );
    }
}
