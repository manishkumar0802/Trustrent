#![no_std]

//! Shared types, errors, event names and cross-contract interfaces for the
//! TrustRent Soroban contracts.
//!
//! This crate is a plain `rlib` linked into each contract crate so that
//! `rental_agreement`, `escrow` and `dispute` share a single source of truth
//! for state machines, records, errors and the event catalog.
//!
//! The `contractclient` traits at the bottom are the CROSS-CONTRACT
//! interfaces. A calling contract instantiates the generated client against
//! the callee's address (e.g. `EscrowClient::new(&env, &escrow_addr)`) and
//! passes its own `env.current_contract_address()` as `caller`; the callee
//! `require_auth`s that address (a contract address is implicitly authorized
//! as the direct invoker) and checks it against the addresses registered at
//! `initialize`. This is the mechanism that stops unauthorized contracts and
//! arbitrary parties from moving funds. See `ARCHITECTURE.md`.

use soroban_sdk::{contractclient, contracterror, contracttype, Address, Env, String};

/// Lifecycle state of a rental agreement.
///
/// Mirrors the on-chain state machine documented in `ARCHITECTURE.md`:
///
/// CREATED → ACTIVE → MOVE_OUT_REQUESTED → EVIDENCE_SUBMITTED →
/// INSPECTION_PENDING → APPROVED → SETTLEMENT → CLOSED
///
/// Alternative dispute path:
/// INSPECTION_PENDING → DISPUTED → RESOLVED → SETTLEMENT → CLOSED
#[contracttype]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum AgreementState {
    Created,
    Active,
    MoveOutRequested,
    EvidenceSubmitted,
    InspectionPending,
    Approved,
    Disputed,
    Resolved,
    Settlement,
    Closed,
}

/// Status of a locked deposit inside the escrow contract.
#[contracttype]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum DepositStatus {
    Locked,
    PartiallyReleased,
    Released,
    Disputed,
}

/// Status of a dispute record.
#[contracttype]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum DisputeState {
    Opened,
    UnderReview,
    Accepted,
    Resolved,
}

/// How a deposit is settled at the end of the lifecycle.
#[contracttype]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum SettlementType {
    FullRefund,
    PartialDeduction,
    DisputeLocked,
}

/// Type of evidence referenced from on-chain (the payload itself is never
/// stored on-chain — only this reference).
#[contracttype]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum EvidenceType {
    MoveIn,
    MoveOut,
    UtilityReceipt,
    RentReceipt,
    DamageEvidence,
    Other,
}

/// Structured errors shared by all TrustRent contracts.
///
/// Normal validation failures return these errors instead of panicking, so
/// callers (and the frontend) can handle them deterministically.
#[contracterror]
#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    /// Caller is not the authorized contract / party for this action.
    Unauthorized = 1,
    /// The requested transition is not valid for the current state.
    InvalidState = 2,
    AgreementNotFound = 3,
    TenantAlreadyJoined = 4,
    InvalidAmount = 5,
    DepositAlreadyLocked = 6,
    DepositAlreadyReleased = 7,
    InvalidDeduction = 8,
    DisputeAlreadyOpen = 9,
    DisputeNotFound = 10,
    /// Caller is neither landlord nor tenant of the agreement.
    NotParty = 11,
    SettlementAlreadyExecuted = 12,
    EvidenceNotFound = 13,
    DepositNotFound = 14,
    /// `initialize` has not been called / contract addresses not configured.
    NotInitialized = 15,
}

/// Core agreement record stored by `rental_agreement`.
#[contracttype]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct AgreementRecord {
    pub id: u32,
    pub landlord: Address,
    /// The joined tenant. `None` until the tenant joins (`state == Active`).
    pub tenant: Option<Address>,
    pub property_ref: String,
    pub rent_amount: i128,
    pub deposit_amount: i128,
    pub state: AgreementState,
    pub created_at: u64,
    /// True once escrow has released funds — blocks double settlement.
    pub settled: bool,
    /// Deduction proposed by the landlord, awaiting tenant acceptance.
    pub pending_deduction: Option<i128>,
    pub pending_deduction_reason: Option<String>,
}

/// Deposit lock record stored by `escrow`.
#[contracttype]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct DepositRecord {
    pub agreement_id: u32,
    pub tenant: Address,
    pub landlord: Address,
    pub amount: i128,
    /// Amount already released from the lock.
    pub released: i128,
    pub status: DepositStatus,
    pub locked_at: u64,
}

/// Dispute record stored by `dispute`.
#[contracttype]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct DisputeRecord {
    pub agreement_id: u32,
    pub landlord: Address,
    pub tenant: Address,
    pub initiator: Address,
    pub reason: String,
    pub state: DisputeState,
    /// Accepted resolution split (escrow settle amounts).
    pub to_tenant: i128,
    pub to_landlord: i128,
    pub opened_at: u64,
    pub resolved_at: Option<u64>,
}

/// On-chain reference to an OFF-chain evidence payload — never the payload
/// itself.
#[contracttype]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct EvidenceRecord {
    pub id: u32,
    pub agreement_id: u32,
    pub evidence_type: EvidenceType,
    pub content_hash: String,
    pub submitted_by: Address,
    pub timestamp: u64,
}

/// Canonical event names. The frontend consumes these to render the activity
/// timeline. See `docs/events.md` for the full catalog.
pub mod events {
    pub const AGREEMENT_CREATED: &str = "AgreementCreated";
    pub const TENANT_JOINED: &str = "TenantJoined";
    pub const DEPOSIT_LOCKED: &str = "DepositLocked";
    pub const MOVE_OUT_REQUESTED: &str = "MoveOutRequested";
    pub const EVIDENCE_SUBMITTED: &str = "EvidenceSubmitted";
    pub const INSPECTION_APPROVED: &str = "InspectionApproved";
    pub const DEDUCTION_PROPOSED: &str = "DeductionProposed";
    pub const SETTLEMENT_ACCEPTED: &str = "SettlementAccepted";
    pub const DISPUTE_OPENED: &str = "DisputeOpened";
    pub const DISPUTE_RESOLVED: &str = "DisputeResolved";
    pub const DEPOSIT_RELEASED: &str = "DepositReleased";
    pub const AGREEMENT_CLOSED: &str = "AgreementClosed";
}

/// Cross-contract interface for the `escrow` contract.
///
/// Every fund-moving method takes `caller` — the address of the calling
/// contract, passed as `env.current_contract_address()` by the caller. The
/// escrow contract `require_auth`s it (implicit contract-invoker auth) and
/// checks it against the addresses stored at `initialize`, so only the
/// registered agreement/dispute contracts can trigger fund movements.
pub mod escrow_api {
    use super::*;

    #[contractclient(name = "EscrowClient")]
    pub trait EscrowInterface {
        fn initialize(
            env: Env,
            admin: Address,
            agreement_contract: Address,
            dispute_contract: Address,
        );

        fn lock_deposit(
            env: Env,
            agreement_id: u32,
            tenant: Address,
            landlord: Address,
            amount: i128,
            caller: Address,
        ) -> Result<(), Error>;

        fn get_deposit(env: Env, agreement_id: u32) -> Result<DepositRecord, Error>;

        fn release_full(env: Env, agreement_id: u32, caller: Address) -> Result<(), Error>;

        fn release_partial(
            env: Env,
            agreement_id: u32,
            to_tenant: i128,
            to_landlord: i128,
            caller: Address,
        ) -> Result<(), Error>;

        fn lock_for_dispute(env: Env, agreement_id: u32, caller: Address) -> Result<(), Error>;

        fn settle_dispute(
            env: Env,
            agreement_id: u32,
            to_tenant: i128,
            to_landlord: i128,
            caller: Address,
        ) -> Result<(), Error>;
    }
}

/// Cross-contract interface for the `dispute` contract.
///
/// `open_dispute` is only callable by the registered agreement contract
/// (checked via `caller`), which has already verified the initiator is a
/// party to the agreement.
pub mod dispute_api {
    use super::*;

    #[contractclient(name = "DisputeClient")]
    pub trait DisputeInterface {
        fn initialize(
            env: Env,
            admin: Address,
            agreement_contract: Address,
            escrow_contract: Address,
        );

        fn open_dispute(
            env: Env,
            agreement_id: u32,
            initiator: Address,
            landlord: Address,
            tenant: Address,
            reason: String,
            caller: Address,
        ) -> Result<(), Error>;

        fn submit_dispute_evidence(
            env: Env,
            agreement_id: u32,
            submitter: Address,
            evidence_type: EvidenceType,
            content_hash: String,
        ) -> Result<u32, Error>;

        fn propose_resolution(
            env: Env,
            agreement_id: u32,
            landlord: Address,
            to_tenant: i128,
            to_landlord: i128,
        ) -> Result<(), Error>;

        fn accept_resolution(env: Env, agreement_id: u32, tenant: Address) -> Result<(), Error>;

        fn resolve_dispute(env: Env, agreement_id: u32, caller: Address) -> Result<(), Error>;

        fn get_dispute(env: Env, agreement_id: u32) -> Result<DisputeRecord, Error>;
    }
}
