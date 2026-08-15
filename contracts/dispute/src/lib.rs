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

use soroban_sdk::{
    contract, contractimpl, contracttype, panic_with_error, Address, Env, String, Symbol,
};

use tr_common::escrow_api::EscrowClient;
use tr_common::events;
use tr_common::registry_api::UserRegistryClient;
use tr_common::{
    DisputeRecord, DisputeState, Error, EvidenceRecord, EvidenceType, TryClientResult, UserRole,
};

#[contracttype]
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum DataKey {
    Admin,
    AgreementContract,
    EscrowContract,
    UserRegistry,
    Arbitrator,
    EvidenceCounter,
    Dispute(u32),
    Evidence(u32),
    EvidenceHash(u32, String),
}

#[contract]
pub struct DisputeContract;

#[contractimpl]
impl DisputeContract {
    /// One-time setup: `agreement_contract` is the only contract allowed to
    /// open disputes; `escrow_contract` is where the deposit lives;
    /// `user_registry` is where arbitrator identities are verified.
    pub fn initialize(
        env: Env,
        admin: Address,
        agreement_contract: Address,
        escrow_contract: Address,
        user_registry: Address,
    ) {
        admin.require_auth();
        if env.storage().persistent().has(&DataKey::Admin) {
            panic_with_error!(&env, Error::AlreadyInitialized);
        }
        env.storage().persistent().set(&DataKey::Admin, &admin);
        env.storage()
            .persistent()
            .set(&DataKey::AgreementContract, &agreement_contract);
        env.storage()
            .persistent()
            .set(&DataKey::EscrowContract, &escrow_contract);
        env.storage()
            .persistent()
            .set(&DataKey::UserRegistry, &user_registry);
    }

    /// Assign the platform arbitrator (admin-only). The address must be
    /// registered in the user registry with the `Arbitrator` role — verified
    /// by a Dispute → UserRegistry read — so a random wallet cannot pose as
    /// the arbitrator. Emits `ArbitratorAssigned`.
    pub fn set_arbitrator(env: Env, admin: Address, arbitrator: Address) -> Result<(), Error> {
        admin.require_auth();
        require_caller(&env, &DataKey::Admin, &admin)?;

        let registry: Address = env
            .storage()
            .persistent()
            .get(&DataKey::UserRegistry)
            .ok_or(Error::NotInitialized)?;
        let user = UserRegistryClient::new(&env, &registry)
            .try_get_user(&arbitrator)
            .into_result()?;
        if user.role != UserRole::Arbitrator {
            return Err(Error::NotAnArbitrator);
        }

        env.storage()
            .persistent()
            .set(&DataKey::Arbitrator, &arbitrator);
        env.events().publish(
            (Symbol::new(&env, events::ARBITRATOR_ASSIGNED),),
            (arbitrator,),
        );
        Ok(())
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

        let arbitrator: Option<Address> = env.storage().persistent().get(&DataKey::Arbitrator);

        let record = DisputeRecord {
            agreement_id,
            landlord,
            tenant,
            initiator,
            arbitrator,
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
        if env
            .storage()
            .persistent()
            .has(&DataKey::EvidenceHash(agreement_id, content_hash.clone()))
        {
            return Err(Error::DuplicateEvidence);
        }

        let counter: u32 = env
            .storage()
            .persistent()
            .get(&DataKey::EvidenceCounter)
            .unwrap_or(0);
        let evidence_id = counter.checked_add(1).ok_or(Error::InvalidState)?;

        let evidence = EvidenceRecord {
            id: evidence_id,
            agreement_id,
            evidence_type,
            content_hash: content_hash.clone(),
            submitted_by: submitter,
            timestamp: env.ledger().timestamp(),
        };
        env.storage()
            .persistent()
            .set(&DataKey::Evidence(evidence_id), &evidence);
        env.storage().persistent().set(
            &DataKey::EvidenceHash(agreement_id, content_hash),
            &evidence_id,
        );
        env.storage()
            .persistent()
            .set(&DataKey::EvidenceCounter, &evidence_id);

        env.events().publish(
            (Symbol::new(&env, events::EVIDENCE_SUBMITTED),),
            (agreement_id, evidence_id),
        );
        Ok(evidence_id)
    }

    /// Propose a resolution split (Opened → UnderReview when the landlord
    /// proposes, Opened → Accepted when the assigned arbitrator proposes).
    ///
    /// An arbitrator's proposal is **binding**: it skips the tenant
    /// acceptance step, so an accepted arbitrator decision flows straight to
    /// `resolve_dispute`. The arbitrator must be the one assigned to this
    /// dispute (which itself was verified against the user registry at
    /// `set_arbitrator`).
    pub fn propose_resolution(
        env: Env,
        agreement_id: u32,
        proposer: Address,
        to_tenant: i128,
        to_landlord: i128,
    ) -> Result<(), Error> {
        proposer.require_auth();
        let mut record = load(&env, agreement_id)?;
        let is_landlord = record.landlord == proposer;
        let is_assigned_arbitrator = record.arbitrator.as_ref() == Some(&proposer);
        if !is_landlord && !is_assigned_arbitrator {
            return Err(Error::Unauthorized);
        }
        if record.state != DisputeState::Opened {
            return Err(Error::InvalidState);
        }
        let total = to_tenant
            .checked_add(to_landlord)
            .ok_or(Error::InvalidAmount)?;
        if to_tenant < 0 || to_landlord < 0 || total <= 0 {
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
        // A dispute resolution must allocate the entire remaining lock. This
        // prevents a resolved dispute from orphaning unreleased funds.
        let remaining = deposit.amount - deposit.released;
        if total != remaining {
            return Err(Error::InvalidAmount);
        }

        record.to_tenant = to_tenant;
        record.to_landlord = to_landlord;
        record.state = if is_assigned_arbitrator {
            DisputeState::Accepted
        } else {
            DisputeState::UnderReview
        };
        env.storage()
            .persistent()
            .set(&DataKey::Dispute(agreement_id), &record);

        env.events().publish(
            (Symbol::new(&env, events::DISPUTE_RESOLUTION_PROPOSED),),
            (agreement_id, to_tenant, to_landlord),
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
        let is_arbitrator = record.arbitrator.as_ref() == Some(&caller);
        if caller != record.landlord && caller != record.tenant && !is_arbitrator {
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
    use tr_common::registry_api::UserRegistryClient;
    use tr_common::{DepositStatus, UserRole};
    use user_registry::UserRegistryContract;

    const DEPOSIT: i128 = 30_000_000_000;

    /// Registers the real escrow + user_registry contracts alongside the
    /// dispute contract so cross-contract calls execute against real state.
    /// Returns (env, dispute_id, agreement, escrow_id, registry_id, admin).
    fn setup() -> (Env, Address, Address, Address, Address, Address) {
        let env = Env::default();
        env.mock_all_auths();

        let escrow_id = env.register(EscrowContract, ());
        let dispute_id = env.register(DisputeContract, ());
        let registry_id = env.register(UserRegistryContract, ());

        let admin = Address::generate(&env);
        let agreement = Address::generate(&env);

        EscrowClient::new(&env, &escrow_id).initialize(&admin, &agreement, &dispute_id);
        UserRegistryClient::new(&env, &registry_id).initialize(&admin);

        let client = DisputeContractClient::new(&env, &dispute_id);
        client.initialize(&admin, &agreement, &escrow_id, &registry_id);

        (env, dispute_id, agreement, escrow_id, registry_id, admin)
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

    /// Lock a deposit via the (simulated) agreement contract and open a
    /// dispute for it.
    fn lock_and_open(
        env: &Env,
        client: &DisputeContractClient<'_>,
        agreement: &Address,
        escrow_id: &Address,
        landlord: &Address,
        tenant: &Address,
    ) {
        EscrowClient::new(env, escrow_id)
            .lock_deposit(&1u32, tenant, landlord, &DEPOSIT, agreement);
        open_helper(env, client, agreement, 1, tenant, landlord, tenant);
    }

    /// Register a user in the registry as an Arbitrator, then set them as the
    /// dispute contract's arbitrator. Returns the arbitrator address.
    fn assign_arbitrator(
        env: &Env,
        client: &DisputeContractClient<'_>,
        registry_id: &Address,
        admin: &Address,
    ) -> Address {
        let arbitrator = Address::generate(env);
        UserRegistryClient::new(env, registry_id).register_user(
            admin,
            &arbitrator,
            &UserRole::Arbitrator,
        );
        client.set_arbitrator(admin, &arbitrator);
        arbitrator
    }

    #[test]
    fn opening_freezes_the_deposit() {
        let (env, dispute_id, agreement, escrow_id, _registry_id, _admin) = setup();
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
        assert_eq!(dispute.arbitrator, None);

        // The deposit is frozen in escrow.
        let deposit = EscrowClient::new(&env, &escrow_id).get_deposit(&1u32);
        assert_eq!(deposit.status, DepositStatus::Disputed);
        assert_eq!(deposit.released, 0);
    }

    #[test]
    fn full_dispute_flow_settles_escrow() {
        let (env, dispute_id, agreement, escrow_id, _registry_id, _admin) = setup();
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
    fn arbitrator_assignment_verified_against_registry() {
        let (env, dispute_id, agreement, escrow_id, registry_id, admin) = setup();
        let client = DisputeContractClient::new(&env, &dispute_id);

        // A non-arbitrator (unregistered wallet) cannot be assigned.
        let stranger = Address::generate(&env);
        assert_eq!(
            client
                .try_set_arbitrator(&admin, &stranger)
                .unwrap_err()
                .unwrap(),
            Error::UserNotFound
        );

        // A user registered with a different role cannot be assigned.
        let tenant = Address::generate(&env);
        UserRegistryClient::new(&env, &registry_id).register_user(
            &admin,
            &tenant,
            &UserRole::Tenant,
        );
        assert_eq!(
            client
                .try_set_arbitrator(&admin, &tenant)
                .unwrap_err()
                .unwrap(),
            Error::NotAnArbitrator
        );

        // A non-admin cannot assign an arbitrator.
        let arbitrator = Address::generate(&env);
        UserRegistryClient::new(&env, &registry_id).register_user(
            &admin,
            &arbitrator,
            &UserRole::Arbitrator,
        );
        assert_eq!(
            client
                .try_set_arbitrator(&stranger, &arbitrator)
                .unwrap_err()
                .unwrap(),
            Error::Unauthorized
        );

        // A registered Arbitrator can be assigned.
        client.set_arbitrator(&admin, &arbitrator);
        let _ = (agreement, escrow_id);
    }

    #[test]
    fn arbitrator_decision_is_binding() {
        let (env, dispute_id, agreement, escrow_id, registry_id, admin) = setup();
        let client = DisputeContractClient::new(&env, &dispute_id);
        let landlord = Address::generate(&env);
        let tenant = Address::generate(&env);

        let arbitrator = assign_arbitrator(&env, &client, &registry_id, &admin);
        lock_and_open(&env, &client, &agreement, &escrow_id, &landlord, &tenant);

        // The assigned arbitrator is recorded on the dispute.
        assert_eq!(
            client.get_dispute(&1u32).arbitrator,
            Some(arbitrator.clone())
        );

        // Arbitrator's proposal is binding: Opened → Accepted directly,
        // skipping tenant acceptance.
        client.propose_resolution(&1u32, &arbitrator, &20_000_000_000i128, &10_000_000_000i128);
        assert_eq!(client.get_dispute(&1u32).state, DisputeState::Accepted);

        // The arbitrator (or either party) can execute the accepted split.
        client.resolve_dispute(&1u32, &arbitrator);
        assert_eq!(client.get_dispute(&1u32).state, DisputeState::Resolved);

        let deposit = EscrowClient::new(&env, &escrow_id).get_deposit(&1u32);
        assert_eq!(deposit.released, DEPOSIT);
        assert_eq!(deposit.status, DepositStatus::Released);
    }

    #[test]
    fn unassigned_wallets_cannot_act_as_arbitrator() {
        let (env, dispute_id, agreement, escrow_id, registry_id, admin) = setup();
        let client = DisputeContractClient::new(&env, &dispute_id);
        let landlord = Address::generate(&env);
        let tenant = Address::generate(&env);

        let arbitrator = assign_arbitrator(&env, &client, &registry_id, &admin);
        lock_and_open(&env, &client, &agreement, &escrow_id, &landlord, &tenant);

        // A registered Arbitrator who is NOT assigned to this dispute cannot
        // propose — only the assigned arbitrator is authorized.
        let other_arbitrator = Address::generate(&env);
        UserRegistryClient::new(&env, &registry_id).register_user(
            &admin,
            &other_arbitrator,
            &UserRole::Arbitrator,
        );
        assert_eq!(
            client
                .try_propose_resolution(
                    &1u32,
                    &other_arbitrator,
                    &20_000_000_000i128,
                    &10_000_000_000i128
                )
                .unwrap_err()
                .unwrap(),
            Error::Unauthorized
        );

        // The assigned arbitrator is authorized.
        client.propose_resolution(&1u32, &arbitrator, &20_000_000_000i128, &10_000_000_000i128);

        // And the assigned arbitrator can execute the resolution.
        client.resolve_dispute(&1u32, &arbitrator);
        assert_eq!(client.get_dispute(&1u32).state, DisputeState::Resolved);
    }

    #[test]
    fn unauthorized_calls_are_rejected() {
        let (env, dispute_id, agreement, escrow_id, _registry_id, _admin) = setup();
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
        let (env, dispute_id, agreement, escrow_id, _registry_id, _admin) = setup();
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
