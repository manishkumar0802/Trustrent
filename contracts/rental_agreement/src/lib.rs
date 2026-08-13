#![no_std]

//! Rental agreement contract — the orchestrator.
//!
//! Owns the agreement lifecycle and enforces role-based authorization:
//! landlord-only actions and tenant-only actions each `require_auth` the
//! acting party and verify the party matches the agreement record.
//!
//! Cross-contract calls (all real, all purposeful):
//! - RentalAgreement → Escrow: `lock_deposit` (tenant funds), `release_full`
//!   (full refund on close), `release_partial` (agreed deduction split).
//! - RentalAgreement → Dispute: `open_dispute` (delegates dispute records),
//!   `get_dispute` (verifies resolution before closing).
//! - Dispute → Escrow (see the dispute contract): freezes and settles the
//!   deposit — the escrow contract validates the caller on every call.
//!
//! State machine (see ARCHITECTURE.md): CREATED → ACTIVE →
//! MOVE_OUT_REQUESTED → EVIDENCE_SUBMITTED → INSPECTION_PENDING →
//! APPROVED → SETTLEMENT → CLOSED, with the dispute fork
//! INSPECTION_PENDING → DISPUTED → RESOLVED → SETTLEMENT → CLOSED.
//! Invalid transitions return `Error::InvalidState`.

use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String, Symbol};

use tr_common::dispute_api::DisputeClient;
use tr_common::escrow_api::EscrowClient;
use tr_common::events;
use tr_common::{
    AgreementRecord, AgreementState, DisputeState, Error, EvidenceRecord, EvidenceType,
    TryClientResult,
};

#[contracttype]
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum DataKey {
    Admin,
    EscrowContract,
    DisputeContract,
    Counter,
    EvidenceCounter,
    Agreement(u32),
    Evidence(u32),
}

#[contract]
pub struct AgreementContract;

#[contractimpl]
impl AgreementContract {
    /// One-time setup: the addresses of the escrow and dispute contracts this
    /// agreement contract orchestrates.
    pub fn initialize(
        env: Env,
        admin: Address,
        escrow_contract: Address,
        dispute_contract: Address,
    ) {
        admin.require_auth();
        env.storage().persistent().set(&DataKey::Admin, &admin);
        env.storage()
            .persistent()
            .set(&DataKey::EscrowContract, &escrow_contract);
        env.storage()
            .persistent()
            .set(&DataKey::DisputeContract, &dispute_contract);
    }

    /// Landlord creates the agreement. `tenant` (optional) is the invited
    /// tenant — only they may join. Returns the new agreement id.
    pub fn create_agreement(
        env: Env,
        landlord: Address,
        tenant: Option<Address>,
        property_ref: String,
        rent_amount: i128,
        deposit_amount: i128,
    ) -> Result<u32, Error> {
        landlord.require_auth();
        if rent_amount <= 0 || deposit_amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let counter: u32 = env
            .storage()
            .persistent()
            .get(&DataKey::Counter)
            .unwrap_or(0);
        let id = counter + 1;

        let record = AgreementRecord {
            id,
            landlord,
            tenant,
            property_ref,
            rent_amount,
            deposit_amount,
            state: AgreementState::Created,
            created_at: env.ledger().timestamp(),
            settled: false,
            pending_deduction: None,
            pending_deduction_reason: None,
        };
        env.storage()
            .persistent()
            .set(&DataKey::Agreement(id), &record);
        env.storage().persistent().set(&DataKey::Counter, &id);

        env.events()
            .publish((Symbol::new(&env, events::AGREEMENT_CREATED),), (id,));
        Ok(id)
    }

    /// Tenant joins a CREATED agreement → ACTIVE. If the landlord invited a
    /// specific tenant at creation, only that tenant may join.
    pub fn join_agreement(env: Env, agreement_id: u32, tenant: Address) -> Result<(), Error> {
        tenant.require_auth();
        let mut record = load_agreement(&env, agreement_id)?;

        match record.state {
            AgreementState::Created => {}
            AgreementState::Active => return Err(Error::TenantAlreadyJoined),
            _ => return Err(Error::InvalidState),
        }
        if let Some(expected) = record.tenant.as_ref() {
            if expected != &tenant {
                return Err(Error::Unauthorized);
            }
        }

        record.tenant = Some(tenant);
        record.state = AgreementState::Active;
        env.storage()
            .persistent()
            .set(&DataKey::Agreement(agreement_id), &record);

        env.events()
            .publish((Symbol::new(&env, events::TENANT_JOINED),), (agreement_id,));
        Ok(())
    }

    /// Read helpers.
    pub fn get_agreement(env: Env, agreement_id: u32) -> Result<AgreementRecord, Error> {
        load_agreement(&env, agreement_id)
    }

    pub fn get_evidence(env: Env, evidence_id: u32) -> Result<EvidenceRecord, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Evidence(evidence_id))
            .ok_or(Error::EvidenceNotFound)
    }

    /// Tenant funds the security deposit. Cross-contract: RentalAgreement →
    /// Escrow. The escrow contract only accepts `lock_deposit` from this
    /// agreement contract, so the tenant cannot bypass agreement-state checks
    /// (e.g. locking after move-out).
    pub fn lock_deposit(env: Env, agreement_id: u32, tenant: Address) -> Result<(), Error> {
        tenant.require_auth();
        let record = load_agreement(&env, agreement_id)?;
        if record.tenant.as_ref() != Some(&tenant) {
            return Err(Error::Unauthorized);
        }
        if record.state != AgreementState::Active {
            return Err(Error::InvalidState);
        }

        let escrow_contract: Address = env
            .storage()
            .persistent()
            .get(&DataKey::EscrowContract)
            .ok_or(Error::NotInitialized)?;
        let caller = env.current_contract_address();
        EscrowClient::new(&env, &escrow_contract)
            .try_lock_deposit(
                &agreement_id,
                &tenant,
                &record.landlord,
                &record.deposit_amount,
                &caller,
            )
            .into_result()?;
        Ok(())
    }

    /// Tenant requests move-out → MOVE_OUT_REQUESTED. Tenant-only.
    pub fn request_move_out(env: Env, agreement_id: u32, tenant: Address) -> Result<(), Error> {
        tenant.require_auth();
        let mut record = load_agreement(&env, agreement_id)?;
        if record.tenant.as_ref() != Some(&tenant) {
            return Err(Error::Unauthorized);
        }
        if record.state != AgreementState::Active {
            return Err(Error::InvalidState);
        }

        record.state = AgreementState::MoveOutRequested;
        env.storage()
            .persistent()
            .set(&DataKey::Agreement(agreement_id), &record);

        env.events().publish(
            (Symbol::new(&env, events::MOVE_OUT_REQUESTED),),
            (agreement_id,),
        );
        Ok(())
    }

    /// Either party submits an evidence reference (hash/CID — never the file).
    /// First tenant evidence moves MOVE_OUT_REQUESTED → EVIDENCE_SUBMITTED.
    /// Allowed during the move-out flow and while a dispute is open.
    pub fn submit_evidence(
        env: Env,
        agreement_id: u32,
        submitter: Address,
        evidence_type: EvidenceType,
        content_hash: String,
    ) -> Result<u32, Error> {
        submitter.require_auth();
        let mut record = load_agreement(&env, agreement_id)?;
        require_party(&record, &submitter)?;

        let in_move_out_flow = matches!(
            record.state,
            AgreementState::MoveOutRequested
                | AgreementState::EvidenceSubmitted
                | AgreementState::InspectionPending
                | AgreementState::Disputed
        );
        if !in_move_out_flow {
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

        if record.state == AgreementState::MoveOutRequested {
            record.state = AgreementState::EvidenceSubmitted;
            env.storage()
                .persistent()
                .set(&DataKey::Agreement(agreement_id), &record);
        }

        env.events().publish(
            (Symbol::new(&env, events::EVIDENCE_SUBMITTED),),
            (agreement_id, evidence_id),
        );
        Ok(evidence_id)
    }

    /// Landlord reviews evidence. Call twice: EVIDENCE_SUBMITTED →
    /// INSPECTION_PENDING (review starts), then INSPECTION_PENDING → APPROVED
    /// (approval). Emits `InspectionApproved` on approval.
    pub fn approve_inspection(env: Env, agreement_id: u32, landlord: Address) -> Result<(), Error> {
        landlord.require_auth();
        let mut record = load_agreement(&env, agreement_id)?;
        if record.landlord != landlord {
            return Err(Error::Unauthorized);
        }

        match record.state {
            AgreementState::EvidenceSubmitted => {
                record.state = AgreementState::InspectionPending;
            }
            AgreementState::InspectionPending => {
                record.state = AgreementState::Approved;
                env.events().publish(
                    (Symbol::new(&env, events::INSPECTION_APPROVED),),
                    (agreement_id,),
                );
            }
            _ => return Err(Error::InvalidState),
        }
        env.storage()
            .persistent()
            .set(&DataKey::Agreement(agreement_id), &record);
        Ok(())
    }

    /// Landlord proposes a deduction after a clean move-out → SETTLEMENT.
    /// The deposit stays locked until the tenant accepts or a dispute opens.
    pub fn propose_deduction(
        env: Env,
        agreement_id: u32,
        landlord: Address,
        amount: i128,
        reason: String,
    ) -> Result<(), Error> {
        landlord.require_auth();
        let mut record = load_agreement(&env, agreement_id)?;
        if record.landlord != landlord {
            return Err(Error::Unauthorized);
        }
        if record.state != AgreementState::Approved {
            return Err(Error::InvalidState);
        }
        if amount <= 0 || amount > record.deposit_amount {
            return Err(Error::InvalidDeduction);
        }

        record.pending_deduction = Some(amount);
        record.pending_deduction_reason = Some(reason);
        record.state = AgreementState::Settlement;
        env.storage()
            .persistent()
            .set(&DataKey::Agreement(agreement_id), &record);

        env.events().publish(
            (Symbol::new(&env, events::DEDUCTION_PROPOSED),),
            (agreement_id, amount),
        );
        Ok(())
    }

    /// Tenant accepts the proposed deduction — executes the split release on
    /// the escrow contract (RentalAgreement → Escrow). Emits
    /// `SettlementAccepted`.
    pub fn accept_deduction(env: Env, agreement_id: u32, tenant: Address) -> Result<(), Error> {
        tenant.require_auth();
        let mut record = load_agreement(&env, agreement_id)?;
        if record.tenant.as_ref() != Some(&tenant) {
            return Err(Error::Unauthorized);
        }
        if record.state != AgreementState::Settlement {
            return Err(Error::InvalidState);
        }
        let deduction = record.pending_deduction.ok_or(Error::InvalidDeduction)?;
        if record.settled {
            return Err(Error::SettlementAlreadyExecuted);
        }

        let escrow_contract: Address = env
            .storage()
            .persistent()
            .get(&DataKey::EscrowContract)
            .ok_or(Error::NotInitialized)?;
        let caller = env.current_contract_address();
        let to_tenant = record.deposit_amount - deduction;
        let to_landlord = deduction;
        EscrowClient::new(&env, &escrow_contract)
            .try_release_partial(&agreement_id, &to_tenant, &to_landlord, &caller)
            .into_result()?;

        record.settled = true;
        env.storage()
            .persistent()
            .set(&DataKey::Agreement(agreement_id), &record);

        env.events().publish(
            (Symbol::new(&env, events::SETTLEMENT_ACCEPTED),),
            (agreement_id, to_tenant, to_landlord),
        );
        Ok(())
    }

    /// Either party opens a dispute after inspection → DISPUTED. Delegates the
    /// dispute record to the dispute contract (RentalAgreement → Dispute),
    /// which freezes the deposit in escrow (Dispute → Escrow).
    pub fn open_dispute(
        env: Env,
        agreement_id: u32,
        initiator: Address,
        reason: String,
    ) -> Result<(), Error> {
        initiator.require_auth();
        let mut record = load_agreement(&env, agreement_id)?;
        require_party(&record, &initiator)?;
        if record.state != AgreementState::InspectionPending {
            return Err(Error::InvalidState);
        }

        let landlord = record.landlord.clone();
        let tenant = record.tenant.clone().ok_or(Error::NotParty)?;
        let dispute_contract: Address = env
            .storage()
            .persistent()
            .get(&DataKey::DisputeContract)
            .ok_or(Error::NotInitialized)?;
        let caller = env.current_contract_address();
        DisputeClient::new(&env, &dispute_contract)
            .try_open_dispute(
                &agreement_id,
                &initiator,
                &landlord,
                &tenant,
                &reason,
                &caller,
            )
            .into_result()?;

        record.state = AgreementState::Disputed;
        env.storage()
            .persistent()
            .set(&DataKey::Agreement(agreement_id), &record);
        Ok(())
    }

    /// Close the agreement — the ONLY path to CLOSED.
    ///
    /// - APPROVED: full refund — escrow releases the full deposit to the
    ///   tenant (RentalAgreement → Escrow), then SETTLEMENT → CLOSED.
    /// - SETTLEMENT: the deduction was executed by `accept_deduction`.
    /// - RESOLVED: the dispute was settled; verifies with the dispute
    ///   contract (RentalAgreement → Dispute read), then SETTLEMENT → CLOSED.
    pub fn close_agreement(env: Env, agreement_id: u32, caller: Address) -> Result<(), Error> {
        caller.require_auth();
        let mut record = load_agreement(&env, agreement_id)?;
        require_party(&record, &caller)?;

        let escrow_contract: Address = env
            .storage()
            .persistent()
            .get(&DataKey::EscrowContract)
            .ok_or(Error::NotInitialized)?;

        match record.state {
            AgreementState::Approved => {
                // Full refund to the tenant.
                let caller_addr = env.current_contract_address();
                EscrowClient::new(&env, &escrow_contract)
                    .try_release_full(&agreement_id, &caller_addr)
                    .into_result()?;
                record.settled = true;
                record.state = AgreementState::Closed;
                env.storage()
                    .persistent()
                    .set(&DataKey::Agreement(agreement_id), &record);
                env.events().publish(
                    (Symbol::new(&env, events::AGREEMENT_CLOSED),),
                    (agreement_id,),
                );
                Ok(())
            }
            AgreementState::Settlement => {
                if record.pending_deduction.is_none() || !record.settled {
                    return Err(Error::InvalidState);
                }
                record.state = AgreementState::Closed;
                env.storage()
                    .persistent()
                    .set(&DataKey::Agreement(agreement_id), &record);
                env.events().publish(
                    (Symbol::new(&env, events::AGREEMENT_CLOSED),),
                    (agreement_id,),
                );
                Ok(())
            }
            // The agreement record stays DISPUTED while the dispute contract
            // handles the resolution. Closing verifies the dispute is truly
            // resolved (RentalAgreement → Dispute read) and then transitions
            // directly to CLOSED — the RESOLVED → SETTLEMENT → CLOSED walk
            // happens atomically inside this call.
            AgreementState::Disputed | AgreementState::Resolved => {
                let dispute_contract: Address = env
                    .storage()
                    .persistent()
                    .get(&DataKey::DisputeContract)
                    .ok_or(Error::NotInitialized)?;
                let dispute = DisputeClient::new(&env, &dispute_contract)
                    .try_get_dispute(&agreement_id)
                    .into_result()?;
                if dispute.state != DisputeState::Resolved {
                    return Err(Error::InvalidState);
                }
                record.settled = true;
                record.state = AgreementState::Closed;
                env.storage()
                    .persistent()
                    .set(&DataKey::Agreement(agreement_id), &record);
                env.events().publish(
                    (Symbol::new(&env, events::AGREEMENT_CLOSED),),
                    (agreement_id,),
                );
                Ok(())
            }
            _ => Err(Error::InvalidState),
        }
    }
}

fn load_agreement(env: &Env, agreement_id: u32) -> Result<AgreementRecord, Error> {
    env.storage()
        .persistent()
        .get(&DataKey::Agreement(agreement_id))
        .ok_or(Error::AgreementNotFound)
}

fn require_party(record: &AgreementRecord, who: &Address) -> Result<(), Error> {
    if *who == record.landlord || record.tenant.as_ref() == Some(who) {
        Ok(())
    } else {
        Err(Error::NotParty)
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::testutils::Address as _;
    use soroban_sdk::{Env, String as SorobanString};
    extern crate alloc;
    use alloc::boxed::Box;

    use dispute::DisputeContract;
    use escrow::EscrowContract;
    use tr_common::escrow_api::EscrowClient;
    use tr_common::{DepositStatus, DisputeState};

    const RENT: i128 = 18_000_000_000;
    const DEPOSIT: i128 = 30_000_000_000;

    trait TestUnwrap: Sized {
        fn unwrap(self) -> Self {
            self
        }
    }

    impl<T> TestUnwrap for T {}

    struct Harness {
        env: Env,
        agreement: AgreementContractClient<'static>,
        escrow: EscrowClient<'static>,
        dispute: DisputeClient<'static>,
        landlord: Address,
        tenant: Address,
    }

    /// Registers all three contracts in one Env and wires them up — every
    /// cross-contract call in the flows below executes against real state.
    fn setup() -> Harness {
        let env = Env::default();
        env.mock_all_auths();

        let agreement_id = env.register(AgreementContract, ());
        let escrow_id = env.register(EscrowContract, ());
        let dispute_id = env.register(DisputeContract, ());

        let admin = Address::generate(&env);

        // Generated clients borrow their Env. Keep a test-only cloned handle
        // alive for the duration of the process; all Env clones share the
        // same Soroban host state as `env` returned in the harness.
        let client_env: &'static Env = Box::leak(Box::new(env.clone()));

        EscrowClient::new(client_env, &escrow_id).initialize(&admin, &agreement_id, &dispute_id);
        let dispute = DisputeClient::new(client_env, &dispute_id);
        dispute.initialize(&admin, &agreement_id, &escrow_id);

        let agreement = AgreementContractClient::new(client_env, &agreement_id);
        agreement.initialize(&admin, &escrow_id, &dispute_id);

        let landlord = Address::generate(&env);
        let tenant = Address::generate(&env);

        Harness {
            env,
            agreement,
            escrow: EscrowClient::new(client_env, &escrow_id),
            dispute,
            landlord,
            tenant,
        }
    }

    fn create_and_join(h: &Harness) -> u32 {
        let id = h
            .agreement
            .create_agreement(
                &h.landlord,
                &Some(h.tenant.clone()),
                &SorobanString::from_str(&h.env, "Greenview 1BHK"),
                &RENT,
                &DEPOSIT,
            )
            .unwrap();
        h.agreement.join_agreement(&id, &h.tenant).unwrap();
        id
    }

    fn to_move_out_requested(h: &Harness) -> u32 {
        let id = create_and_join(h);
        h.agreement.lock_deposit(&id, &h.tenant).unwrap();
        h.agreement.request_move_out(&id, &h.tenant).unwrap();
        id
    }

    fn to_inspection_pending(h: &Harness) -> u32 {
        let id = to_move_out_requested(h);
        h.agreement
            .submit_evidence(
                &id,
                &h.tenant,
                &EvidenceType::MoveOut,
                &SorobanString::from_str(&h.env, "QmZ9f3kXp..."),
            )
            .unwrap();
        h.agreement.approve_inspection(&id, &h.landlord).unwrap();
        id
    }

    #[test]
    fn agreement_creation_and_joining() {
        let h = setup();

        let id = h
            .agreement
            .create_agreement(
                &h.landlord,
                &Some(h.tenant.clone()),
                &SorobanString::from_str(&h.env, "Greenview 1BHK"),
                &RENT,
                &DEPOSIT,
            )
            .unwrap();

        let record = h.agreement.get_agreement(&id).unwrap();
        assert_eq!(record.state, AgreementState::Created);
        assert_eq!(record.landlord, h.landlord);
        assert_eq!(record.deposit_amount, DEPOSIT);
        assert_eq!(record.rent_amount, RENT);

        // Only the invited tenant may join.
        let stranger = Address::generate(&h.env);
        assert_eq!(
            h.agreement
                .try_join_agreement(&id, &stranger)
                .unwrap_err()
                .unwrap(),
            Error::Unauthorized
        );

        h.agreement.join_agreement(&id, &h.tenant).unwrap();
        assert_eq!(
            h.agreement.get_agreement(&id).unwrap().state,
            AgreementState::Active
        );

        // Joining twice fails.
        assert_eq!(
            h.agreement
                .try_join_agreement(&id, &h.tenant)
                .unwrap_err()
                .unwrap(),
            Error::TenantAlreadyJoined
        );
    }

    #[test]
    fn deposit_locks_in_escrow() {
        let h = setup();
        let id = create_and_join(&h);

        h.agreement.lock_deposit(&id, &h.tenant).unwrap();

        let deposit = h.escrow.get_deposit(&id).unwrap();
        assert_eq!(deposit.amount, DEPOSIT);
        assert_eq!(deposit.status, DepositStatus::Locked);
        assert_eq!(deposit.tenant, h.tenant);
        assert_eq!(deposit.landlord, h.landlord);

        // Double locking rejected.
        assert_eq!(
            h.agreement
                .try_lock_deposit(&id, &h.tenant)
                .unwrap_err()
                .unwrap(),
            Error::DepositAlreadyLocked
        );

        // Locking before the agreement is ACTIVE is rejected.
        let early = h
            .agreement
            .create_agreement(
                &h.landlord,
                &Some(h.tenant.clone()),
                &SorobanString::from_str(&h.env, "Studio"),
                &RENT,
                &DEPOSIT,
            )
            .unwrap();
        assert_eq!(
            h.agreement
                .try_lock_deposit(&early, &h.tenant)
                .unwrap_err()
                .unwrap(),
            Error::InvalidState
        );
    }

    #[test]
    fn move_out_request_and_evidence() {
        let h = setup();
        let id = create_and_join(&h);

        // Move-out before the deposit is locked is fine — but the state must
        // be ACTIVE.
        h.agreement.request_move_out(&id, &h.tenant).unwrap();
        assert_eq!(
            h.agreement.get_agreement(&id).unwrap().state,
            AgreementState::MoveOutRequested
        );

        // Requesting again is an invalid transition.
        assert_eq!(
            h.agreement
                .try_request_move_out(&id, &h.tenant)
                .unwrap_err()
                .unwrap(),
            Error::InvalidState
        );

        let evidence_id = h
            .agreement
            .submit_evidence(
                &id,
                &h.tenant,
                &EvidenceType::MoveOut,
                &SorobanString::from_str(&h.env, "QmZ9f3kXp..."),
            )
            .unwrap();
        assert_eq!(
            h.agreement.get_agreement(&id).unwrap().state,
            AgreementState::EvidenceSubmitted
        );

        let evidence = h.agreement.get_evidence(&evidence_id).unwrap();
        assert_eq!(evidence.agreement_id, id);
        assert_eq!(evidence.evidence_type, EvidenceType::MoveOut);
        assert_eq!(evidence.submitted_by, h.tenant);
        assert_eq!(
            evidence.content_hash,
            SorobanString::from_str(&h.env, "QmZ9f3kXp...")
        );

        // The landlord can submit damage evidence too (still in the flow).
        h.agreement
            .submit_evidence(
                &id,
                &h.landlord,
                &EvidenceType::DamageEvidence,
                &SorobanString::from_str(&h.env, "QmAbC..."),
            )
            .unwrap();
    }

    #[test]
    fn full_refund_flow() {
        let h = setup();
        let id = to_inspection_pending(&h);

        // First approve call: start inspection.
        assert_eq!(
            h.agreement.get_agreement(&id).unwrap().state,
            AgreementState::InspectionPending
        );

        // Second approve call: approval.
        h.agreement.approve_inspection(&id, &h.landlord).unwrap();
        assert_eq!(
            h.agreement.get_agreement(&id).unwrap().state,
            AgreementState::Approved
        );

        // Closing triggers the full refund to the tenant.
        h.agreement.close_agreement(&id, &h.landlord).unwrap();
        assert_eq!(
            h.agreement.get_agreement(&id).unwrap().state,
            AgreementState::Closed
        );

        let deposit = h.escrow.get_deposit(&id).unwrap();
        assert_eq!(deposit.status, DepositStatus::Released);
        assert_eq!(deposit.released, DEPOSIT);
    }

    #[test]
    fn partial_deduction_flow() {
        let h = setup();
        let id = to_inspection_pending(&h);
        h.agreement.approve_inspection(&id, &h.landlord).unwrap();

        // Deduction cannot exceed the deposit.
        assert_eq!(
            h.agreement
                .try_propose_deduction(
                    &id,
                    &h.landlord,
                    &(DEPOSIT + 1),
                    &SorobanString::from_str(&h.env, "x")
                )
                .unwrap_err()
                .unwrap(),
            Error::InvalidDeduction
        );

        h.agreement
            .propose_deduction(
                &id,
                &h.landlord,
                &5_000_000_000i128,
                &SorobanString::from_str(&h.env, "repaint"),
            )
            .unwrap();
        let record = h.agreement.get_agreement(&id).unwrap();
        assert_eq!(record.state, AgreementState::Settlement);
        assert_eq!(record.pending_deduction, Some(5_000_000_000i128));

        // Tenant accepts → the split is released in escrow.
        h.agreement.accept_deduction(&id, &h.tenant).unwrap();
        let deposit = h.escrow.get_deposit(&id).unwrap();
        assert_eq!(deposit.released, DEPOSIT);
        assert_eq!(deposit.status, DepositStatus::Released);

        // Double settlement is impossible.
        assert_eq!(
            h.agreement
                .try_accept_deduction(&id, &h.tenant)
                .unwrap_err()
                .unwrap(),
            Error::SettlementAlreadyExecuted
        );

        h.agreement.close_agreement(&id, &h.tenant).unwrap();
        assert_eq!(
            h.agreement.get_agreement(&id).unwrap().state,
            AgreementState::Closed
        );
        // Closing again fails (already CLOSED).
        assert_eq!(
            h.agreement
                .try_close_agreement(&id, &h.tenant)
                .unwrap_err()
                .unwrap(),
            Error::InvalidState
        );
    }

    #[test]
    fn dispute_flow_through_escrow() {
        let h = setup();
        let id = to_inspection_pending(&h); // state INSPECTION_PENDING

        // Tenant opens a dispute.
        h.agreement
            .open_dispute(
                &id,
                &h.tenant,
                &SorobanString::from_str(&h.env, "deposit withheld"),
            )
            .unwrap();
        assert_eq!(
            h.agreement.get_agreement(&id).unwrap().state,
            AgreementState::Disputed
        );

        // Dispute recorded; deposit frozen in escrow.
        let dispute = h.dispute.get_dispute(&id).unwrap();
        assert_eq!(dispute.state, DisputeState::Opened);
        assert_eq!(dispute.initiator, h.tenant);
        assert_eq!(
            h.escrow.get_deposit(&id).unwrap().status,
            DepositStatus::Disputed
        );

        // Landlord proposes a resolution; tenant accepts; either party executes.
        h.dispute
            .propose_resolution(&id, &h.landlord, &25_000_000_000i128, &5_000_000_000i128)
            .unwrap();
        h.dispute.accept_resolution(&id, &h.tenant).unwrap();
        h.dispute.resolve_dispute(&id, &h.tenant).unwrap();

        let dispute = h.dispute.get_dispute(&id).unwrap();
        assert_eq!(dispute.state, DisputeState::Resolved);

        let deposit = h.escrow.get_deposit(&id).unwrap();
        assert_eq!(deposit.status, DepositStatus::Released);
        assert_eq!(deposit.released, DEPOSIT);

        // Agreement closes after the resolved dispute.
        h.agreement.close_agreement(&id, &h.tenant).unwrap();
        assert_eq!(
            h.agreement.get_agreement(&id).unwrap().state,
            AgreementState::Closed
        );
    }

    #[test]
    fn invalid_state_transitions_rejected() {
        let h = setup();
        let _id = create_and_join(&h);

        // CREATED → CLOSED fails.
        let fresh = h
            .agreement
            .create_agreement(
                &h.landlord,
                &Some(h.tenant.clone()),
                &SorobanString::from_str(&h.env, "Fresh"),
                &RENT,
                &DEPOSIT,
            )
            .unwrap();
        assert_eq!(
            h.agreement
                .try_close_agreement(&fresh, &h.landlord)
                .unwrap_err()
                .unwrap(),
            Error::InvalidState
        );

        // CLOSED → ACTIVE is impossible: no function moves out of Closed, and
        // join requires CREATED.
        let done = to_move_out_requested(&h);
        h.agreement
            .submit_evidence(
                &done,
                &h.tenant,
                &EvidenceType::MoveOut,
                &SorobanString::from_str(&h.env, "hash"),
            )
            .unwrap();
        h.agreement.approve_inspection(&done, &h.landlord).unwrap();
        h.agreement.approve_inspection(&done, &h.landlord).unwrap();
        h.agreement.close_agreement(&done, &h.tenant).unwrap();
        assert_eq!(
            h.agreement
                .try_join_agreement(&done, &h.tenant)
                .unwrap_err()
                .unwrap(),
            Error::InvalidState
        );

        // Evidence before move-out is invalid.
        let active_only = create_and_join(&h);
        assert_eq!(
            h.agreement
                .try_submit_evidence(
                    &active_only,
                    &h.tenant,
                    &EvidenceType::MoveOut,
                    &SorobanString::from_str(&h.env, "hash"),
                )
                .unwrap_err()
                .unwrap(),
            Error::InvalidState
        );

        // Approve from the wrong state fails.
        assert_eq!(
            h.agreement
                .try_approve_inspection(&active_only, &h.landlord)
                .unwrap_err()
                .unwrap(),
            Error::InvalidState
        );

        // Dispute can only open from INSPECTION_PENDING.
        assert_eq!(
            h.agreement
                .try_open_dispute(
                    &active_only,
                    &h.tenant,
                    &SorobanString::from_str(&h.env, "no")
                )
                .unwrap_err()
                .unwrap(),
            Error::InvalidState
        );
    }

    #[test]
    fn unauthorized_actions_rejected() {
        let h = setup();
        let id = create_and_join(&h);
        let stranger = Address::generate(&h.env);

        // Tenant cannot approve inspections.
        assert_eq!(
            h.agreement
                .try_approve_inspection(&id, &h.tenant)
                .unwrap_err()
                .unwrap(),
            Error::Unauthorized
        );

        // Move-out is tenant-only — the landlord is a party but not the tenant.
        h.agreement.request_move_out(&id, &h.tenant).unwrap();
        assert_eq!(
            h.agreement
                .try_request_move_out(&id, &h.landlord)
                .unwrap_err()
                .unwrap(),
            Error::Unauthorized
        );

        // Strangers are not the tenant.
        assert_eq!(
            h.agreement
                .try_request_move_out(&id, &stranger)
                .unwrap_err()
                .unwrap(),
            Error::Unauthorized
        );
        assert_eq!(
            h.agreement
                .try_submit_evidence(
                    &id,
                    &stranger,
                    &EvidenceType::Other,
                    &SorobanString::from_str(&h.env, "x"),
                )
                .unwrap_err()
                .unwrap(),
            Error::NotParty
        );

        // A stranger cannot close.
        assert_eq!(
            h.agreement
                .try_close_agreement(&id, &stranger)
                .unwrap_err()
                .unwrap(),
            Error::NotParty
        );

        // Unknown agreement.
        assert_eq!(
            h.agreement.try_get_agreement(&99u32).unwrap_err().unwrap(),
            Error::AgreementNotFound
        );

        // Invalid creation amounts.
        assert_eq!(
            h.agreement
                .try_create_agreement(
                    &h.landlord,
                    &Some(h.tenant.clone()),
                    &SorobanString::from_str(&h.env, "X"),
                    &RENT,
                    &0i128,
                )
                .unwrap_err()
                .unwrap(),
            Error::InvalidAmount
        );
    }
}
