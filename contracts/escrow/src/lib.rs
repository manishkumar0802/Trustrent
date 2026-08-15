#![no_std]

//! Escrow contract — holds the security deposit and controls its release.
//!
//! Real token transfers happen through a Stellar Asset Contract (SAC) whose
//! address is registered at `initialize`. The escrow contract itself holds
//! the locked funds: on lock, the tenant's approved allowance is pulled via
//! `transfer_from`; on release/settlement, the escrow contract transfers out
//! of its own balance.
//!
//! Security model:
//! - Neither the tenant nor the landlord can withdraw arbitrarily. Every
//!   fund-moving function requires `caller` to be the registered agreement or
//!   dispute contract (the caller passes its own `env.current_contract_address()`
//!   and the escrow contract `require_auth`s it — a contract address is
//!   implicitly authorized as the direct invoker).
//! - The token contract is never given spend authority beyond what each
//!   action needs: the tenant approves only the escrow contract (the spender
//!   in `transfer_from`), and releases move funds out of the escrow contract's
//!   own balance.
//!
//! Guards: invalid amounts rejected; double lock rejected; double release
//! rejected; releases rejected while the deposit is dispute-locked; dispute
//! settlements only from the dispute contract and only while dispute-locked.

use soroban_sdk::{
    contract, contractimpl, contracttype, panic_with_error, token, Address, Env, Symbol,
};

use tr_common::events;
use tr_common::{DepositRecord, DepositStatus, Error};

#[contracttype]
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum DataKey {
    Admin,
    AgreementContract,
    DisputeContract,
    Token,
    Deposit(u32),
}

#[contract]
pub struct EscrowContract;

#[contractimpl]
impl EscrowContract {
    /// One-time setup. Only the addresses registered here can trigger fund
    /// movements: `agreement_contract` (lock/release) and `dispute_contract`
    /// (lock for dispute / settlement). `token` is the Stellar Asset Contract
    /// the deposit is denominated in.
    pub fn initialize(
        env: Env,
        admin: Address,
        agreement_contract: Address,
        dispute_contract: Address,
        token: Address,
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
            .set(&DataKey::DisputeContract, &dispute_contract);
        env.storage().persistent().set(&DataKey::Token, &token);
    }

    /// Lock the tenant's deposit: pull `amount` from the tenant's balance
    /// into this contract (SAC `transfer_from` — the tenant must have approved
    /// this escrow contract as spender). Only the authorized agreement
    /// contract may call this (it authenticates the tenant and enforces
    /// agreement state).
    pub fn lock_deposit(
        env: Env,
        agreement_id: u32,
        tenant: Address,
        landlord: Address,
        amount: i128,
        caller: Address,
    ) -> Result<(), Error> {
        caller.require_auth();
        require_caller(&env, &DataKey::AgreementContract, &caller)?;
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        let existing: Option<DepositRecord> = env
            .storage()
            .persistent()
            .get(&DataKey::Deposit(agreement_id));
        if existing.is_some() {
            return Err(Error::DepositAlreadyLocked);
        }

        // Pull the funds into escrow first — if the tenant lacks balance or
        // allowance, the whole lock fails and nothing is recorded.
        let token: Address = env
            .storage()
            .persistent()
            .get(&DataKey::Token)
            .ok_or(Error::NotInitialized)?;
        let this = env.current_contract_address();
        token::Client::new(&env, &token).transfer_from(&this, &tenant, &this, &amount);

        let deposit = DepositRecord {
            agreement_id,
            tenant: tenant.clone(),
            landlord: landlord.clone(),
            amount,
            released: 0,
            released_to_tenant: 0,
            released_to_landlord: 0,
            status: DepositStatus::Locked,
            locked_at: env.ledger().timestamp(),
        };
        env.storage()
            .persistent()
            .set(&DataKey::Deposit(agreement_id), &deposit);

        env.events().publish(
            (Symbol::new(&env, events::DEPOSIT_LOCKED),),
            (agreement_id, tenant, landlord, amount),
        );
        Ok(())
    }

    /// Read the deposit record.
    pub fn get_deposit(env: Env, agreement_id: u32) -> Result<DepositRecord, Error> {
        load_deposit(&env, agreement_id)
    }

    /// Full refund: release the entire remaining deposit to the tenant. Only
    /// the authorized agreement contract may call this.
    pub fn release_full(env: Env, agreement_id: u32, caller: Address) -> Result<(), Error> {
        caller.require_auth();
        require_caller(&env, &DataKey::AgreementContract, &caller)?;
        let mut deposit = load_deposit(&env, agreement_id)?;
        match deposit.status {
            DepositStatus::Released => return Err(Error::DepositAlreadyReleased),
            // While a dispute is open the deposit is frozen — only the
            // dispute contract can settle it.
            DepositStatus::Disputed => return Err(Error::InvalidState),
            DepositStatus::Locked | DepositStatus::PartiallyReleased => {}
        }

        let amount = deposit.amount - deposit.released;
        // Move the funds out of escrow to the tenant (SAC transfer).
        let token: Address = env
            .storage()
            .persistent()
            .get(&DataKey::Token)
            .ok_or(Error::NotInitialized)?;
        let this = env.current_contract_address();
        token::Client::new(&env, &token).transfer(&this, &deposit.tenant, &amount);

        deposit.released = deposit.amount;
        deposit.released_to_tenant += amount;
        deposit.status = DepositStatus::Released;
        env.storage()
            .persistent()
            .set(&DataKey::Deposit(agreement_id), &deposit);

        env.events().publish(
            (Symbol::new(&env, events::DEPOSIT_RELEASED),),
            (agreement_id, amount, 0i128, deposit.released),
        );
        Ok(())
    }

    /// Release a split of the deposit (agreed deduction). Only the authorized
    /// agreement contract may call this.
    pub fn release_partial(
        env: Env,
        agreement_id: u32,
        to_tenant: i128,
        to_landlord: i128,
        caller: Address,
    ) -> Result<(), Error> {
        caller.require_auth();
        require_caller(&env, &DataKey::AgreementContract, &caller)?;
        let mut deposit = load_deposit(&env, agreement_id)?;
        match deposit.status {
            DepositStatus::Released => return Err(Error::DepositAlreadyReleased),
            DepositStatus::Disputed => return Err(Error::InvalidState),
            DepositStatus::Locked | DepositStatus::PartiallyReleased => {}
        }

        let total = validate_split(to_tenant, to_landlord)?;
        let remaining = deposit.amount - deposit.released;
        // A completed settlement must allocate every remaining unit. Allowing
        // a partial release here would leave funds stranded with no recovery
        // path in the agreement state machine.
        if total != remaining {
            return Err(Error::InvalidAmount);
        }
        release_split(&env, agreement_id, &mut deposit, to_tenant, to_landlord);
        Ok(())
    }

    /// Freeze the deposit while a dispute is open. Only the authorized
    /// dispute contract may call this. The deposit stays locked until a
    /// settlement instructs a release.
    pub fn lock_for_dispute(env: Env, agreement_id: u32, caller: Address) -> Result<(), Error> {
        caller.require_auth();
        require_caller(&env, &DataKey::DisputeContract, &caller)?;
        let mut deposit = load_deposit(&env, agreement_id)?;
        if deposit.status != DepositStatus::Locked {
            return Err(if deposit.status == DepositStatus::Released {
                Error::DepositAlreadyReleased
            } else {
                Error::InvalidState
            });
        }
        deposit.status = DepositStatus::Disputed;
        env.storage()
            .persistent()
            .set(&DataKey::Deposit(agreement_id), &deposit);
        env.events().publish(
            (Symbol::new(&env, events::DEPOSIT_DISPUTED),),
            (agreement_id, deposit.amount - deposit.released),
        );
        Ok(())
    }

    /// Execute a dispute settlement: release the agreed split. Only the
    /// authorized dispute contract may call this, and only while the deposit
    /// is dispute-locked. The status flips to Released (or PartiallyReleased),
    /// so double settlement is impossible.
    pub fn settle_dispute(
        env: Env,
        agreement_id: u32,
        to_tenant: i128,
        to_landlord: i128,
        caller: Address,
    ) -> Result<(), Error> {
        caller.require_auth();
        require_caller(&env, &DataKey::DisputeContract, &caller)?;
        let mut deposit = load_deposit(&env, agreement_id)?;
        if deposit.status != DepositStatus::Disputed {
            return Err(Error::InvalidState);
        }

        let total = validate_split(to_tenant, to_landlord)?;
        let remaining = deposit.amount - deposit.released;
        if total != remaining {
            return Err(Error::InvalidAmount);
        }
        release_split(&env, agreement_id, &mut deposit, to_tenant, to_landlord);
        Ok(())
    }
}

/// Execute a split release: move the funds out of escrow (SAC transfers to
/// tenant and landlord), update the bookkeeping, persist and emit
/// `DepositReleased`. Called by both the agreed-deduction and dispute
/// settlement paths after their respective caller/state checks.
fn release_split(
    env: &Env,
    agreement_id: u32,
    deposit: &mut DepositRecord,
    to_tenant: i128,
    to_landlord: i128,
) {
    let token: Address = env
        .storage()
        .persistent()
        .get(&DataKey::Token)
        .ok_or(Error::NotInitialized)
        .unwrap_or_else(|_| panic_with_error!(env, Error::NotInitialized));
    let this = env.current_contract_address();
    let token_client = token::Client::new(env, &token);
    token_client.transfer(&this, &deposit.tenant, &to_tenant);
    token_client.transfer(&this, &deposit.landlord, &to_landlord);

    let total = to_tenant + to_landlord;
    deposit.released += total;
    deposit.released_to_tenant += to_tenant;
    deposit.released_to_landlord += to_landlord;
    deposit.status = if deposit.released == deposit.amount {
        DepositStatus::Released
    } else {
        DepositStatus::PartiallyReleased
    };
    env.storage()
        .persistent()
        .set(&DataKey::Deposit(agreement_id), deposit);

    env.events().publish(
        (Symbol::new(env, events::DEPOSIT_RELEASED),),
        (agreement_id, to_tenant, to_landlord, deposit.released),
    );
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

fn load_deposit(env: &Env, agreement_id: u32) -> Result<DepositRecord, Error> {
    env.storage()
        .persistent()
        .get(&DataKey::Deposit(agreement_id))
        .ok_or(Error::DepositNotFound)
}

/// Both amounts must be non-negative and the total strictly positive.
fn validate_split(to_tenant: i128, to_landlord: i128) -> Result<i128, Error> {
    if to_tenant < 0 || to_landlord < 0 {
        return Err(Error::InvalidAmount);
    }
    let total = to_tenant
        .checked_add(to_landlord)
        .ok_or(Error::InvalidAmount)?;
    if total <= 0 {
        return Err(Error::InvalidAmount);
    }
    Ok(total)
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::testutils::Address as _;
    use soroban_sdk::token::{StellarAssetClient, TokenClient};
    use soroban_sdk::Env;

    /// Returns (env, contract_id, agreement, dispute, token). The
    /// agreement/dispute addresses are stored as the authorized callers;
    /// tests pass them as `caller` to simulate those contracts invoking
    /// (with `mock_all_auths`, `require_auth` passes for any address, exactly
    /// as the implicit contract-invoker auth behaves in production). `token`
    /// is a freshly registered Stellar Asset Contract.
    fn setup() -> (Env, Address, Address, Address, Address) {
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let token = env
            .register_stellar_asset_contract_v2(admin.clone())
            .address();
        let contract_id = env.register(EscrowContract, ());
        let client = EscrowContractClient::new(&env, &contract_id);
        let agreement = Address::generate(&env);
        let dispute = Address::generate(&env);
        client.initialize(&admin, &agreement, &dispute, &token);
        (env, contract_id, agreement, dispute, token)
    }

    /// Mint `amount` of the SAC token to `user` and approve this escrow
    /// contract to spend it — exactly what the tenant does off-chain before
    /// locking a deposit.
    fn fund(env: &Env, token: &Address, escrow: &Address, user: &Address, amount: i128) {
        StellarAssetClient::new(env, token).mint(user, &amount);
        // Well below the host's max ledger so the allowance never expires.
        TokenClient::new(env, token).approve(user, escrow, &amount, &5_000_000u32);
    }

    #[test]
    fn lock_and_full_release() {
        let (env, contract_id, agreement, _dispute, token) = setup();
        let client = EscrowContractClient::new(&env, &contract_id);
        let tenant = Address::generate(&env);
        let landlord = Address::generate(&env);
        fund(&env, &token, &contract_id, &tenant, 30_000_000_000i128);

        client.lock_deposit(&1u32, &tenant, &landlord, &30_000_000_000i128, &agreement);

        let deposit = client.get_deposit(&1u32);
        assert_eq!(deposit.amount, 30_000_000_000i128);
        assert_eq!(deposit.released, 0);
        assert_eq!(deposit.status, DepositStatus::Locked);
        assert_eq!(deposit.tenant, tenant);
        assert_eq!(deposit.landlord, landlord);

        // Real tokens moved: tenant funded escrow, escrow now holds them.
        let token_client = TokenClient::new(&env, &token);
        assert_eq!(token_client.balance(&tenant), 0);
        assert_eq!(token_client.balance(&contract_id), 30_000_000_000i128);

        // Authorized agreement contract releases in full.
        client.release_full(&1u32, &agreement);
        let deposit = client.get_deposit(&1u32);
        assert_eq!(deposit.released, 30_000_000_000i128);
        assert_eq!(deposit.status, DepositStatus::Released);

        // And the tokens went back to the tenant.
        assert_eq!(token_client.balance(&tenant), 30_000_000_000i128);
        assert_eq!(token_client.balance(&contract_id), 0);

        // Double release and double lock are rejected.
        assert_eq!(
            client
                .try_release_full(&1u32, &agreement)
                .unwrap_err()
                .unwrap(),
            Error::DepositAlreadyReleased
        );
        assert_eq!(
            client
                .try_lock_deposit(&1u32, &tenant, &landlord, &1i128, &agreement)
                .unwrap_err()
                .unwrap(),
            Error::DepositAlreadyLocked
        );
    }

    #[test]
    fn lock_requires_funded_allowance() {
        let (env, contract_id, agreement, _dispute, token) = setup();
        let client = EscrowContractClient::new(&env, &contract_id);
        let tenant = Address::generate(&env);
        let landlord = Address::generate(&env); // No balance, no allowance: the lock must fail and record nothing.
        let result =
            client.try_lock_deposit(&1u32, &tenant, &landlord, &30_000_000_000i128, &agreement);
        assert!(result.is_err());
        assert_eq!(
            client.try_get_deposit(&1u32).unwrap_err().unwrap(),
            Error::DepositNotFound
        );
        assert_eq!(TokenClient::new(&env, &token).balance(&tenant), 0);
    }

    #[test]
    fn unauthorized_withdrawal_fails() {
        let (env, contract_id, agreement, _dispute, token) = setup();
        let client = EscrowContractClient::new(&env, &contract_id);
        let tenant = Address::generate(&env);
        let landlord = Address::generate(&env);
        let stranger = Address::generate(&env);
        fund(&env, &token, &contract_id, &tenant, 30_000_000_000i128);

        client.lock_deposit(&1u32, &tenant, &landlord, &30_000_000_000i128, &agreement);

        // Neither the tenant, nor the landlord, nor a stranger can withdraw.
        assert_eq!(
            client
                .try_release_full(&1u32, &tenant)
                .unwrap_err()
                .unwrap(),
            Error::Unauthorized
        );
        assert_eq!(
            client
                .try_release_full(&1u32, &landlord)
                .unwrap_err()
                .unwrap(),
            Error::Unauthorized
        );
        assert_eq!(
            client
                .try_release_full(&1u32, &stranger)
                .unwrap_err()
                .unwrap(),
            Error::Unauthorized
        );
        assert_eq!(
            client
                .try_release_partial(&1u32, &20_000_000_000i128, &10_000_000_000i128, &tenant)
                .unwrap_err()
                .unwrap(),
            Error::Unauthorized
        );
        // Deposit is untouched, and so are the tokens.
        let deposit = client.get_deposit(&1u32);
        assert_eq!(deposit.released, 0);
        assert_eq!(deposit.status, DepositStatus::Locked);
        assert_eq!(
            TokenClient::new(&env, &token).balance(&contract_id),
            30_000_000_000i128
        );
    }

    #[test]
    fn settlement_must_allocate_the_entire_locked_deposit() {
        let (env, contract_id, agreement, _dispute, token) = setup();
        let client = EscrowContractClient::new(&env, &contract_id);
        let tenant = Address::generate(&env);
        let landlord = Address::generate(&env);
        fund(&env, &token, &contract_id, &tenant, 30_000_000_000i128);

        client.lock_deposit(&1u32, &tenant, &landlord, &30_000_000_000i128, &agreement);

        assert_eq!(
            client
                .try_release_partial(&1u32, &20_000_000_000i128, &0i128, &agreement)
                .unwrap_err()
                .unwrap(),
            Error::InvalidAmount
        );
        let deposit = client.get_deposit(&1u32);
        assert_eq!(deposit.released, 0);
        assert_eq!(deposit.amount - deposit.released, 30_000_000_000i128);
        assert_eq!(deposit.status, DepositStatus::Locked);

        // Release the remainder — status becomes Released and real tokens
        // move to each party.
        client.release_partial(&1u32, &20_000_000_000i128, &10_000_000_000i128, &agreement);
        let deposit = client.get_deposit(&1u32);
        assert_eq!(deposit.released, 30_000_000_000i128);
        assert_eq!(deposit.released_to_tenant, 20_000_000_000i128);
        assert_eq!(deposit.released_to_landlord, 10_000_000_000i128);
        assert_eq!(deposit.status, DepositStatus::Released);

        let token_client = TokenClient::new(&env, &token);
        assert_eq!(token_client.balance(&tenant), 20_000_000_000i128);
        assert_eq!(token_client.balance(&landlord), 10_000_000_000i128);
        assert_eq!(token_client.balance(&contract_id), 0);

        // Anything after full release is rejected.
        assert_eq!(
            client
                .try_release_partial(&1u32, &1i128, &0i128, &agreement)
                .unwrap_err()
                .unwrap(),
            Error::DepositAlreadyReleased
        );
    }

    #[test]
    fn rejects_invalid_amounts() {
        let (env, contract_id, agreement, _dispute, token) = setup();
        let client = EscrowContractClient::new(&env, &contract_id);
        let tenant = Address::generate(&env);
        let landlord = Address::generate(&env);

        // Cannot lock zero or negative.
        assert_eq!(
            client
                .try_lock_deposit(&1u32, &tenant, &landlord, &0i128, &agreement)
                .unwrap_err()
                .unwrap(),
            Error::InvalidAmount
        );
        assert_eq!(
            client
                .try_lock_deposit(&1u32, &tenant, &landlord, &-5i128, &agreement)
                .unwrap_err()
                .unwrap(),
            Error::InvalidAmount
        );

        fund(&env, &token, &contract_id, &tenant, 30_000_000_000i128);
        client.lock_deposit(&1u32, &tenant, &landlord, &30_000_000_000i128, &agreement);

        // Negative / zero-total / over-release splits are rejected.
        assert_eq!(
            client
                .try_release_partial(&1u32, &-1i128, &0i128, &agreement)
                .unwrap_err()
                .unwrap(),
            Error::InvalidAmount
        );
        assert_eq!(
            client
                .try_release_partial(&1u32, &0i128, &0i128, &agreement)
                .unwrap_err()
                .unwrap(),
            Error::InvalidAmount
        );
        assert_eq!(
            client
                .try_release_partial(&1u32, &40_000_000_000i128, &0i128, &agreement)
                .unwrap_err()
                .unwrap(),
            Error::InvalidAmount
        );
    }

    #[test]
    fn dispute_lock_and_settlement() {
        let (env, contract_id, agreement, dispute, token) = setup();
        let client = EscrowContractClient::new(&env, &contract_id);
        let tenant = Address::generate(&env);
        let landlord = Address::generate(&env);
        fund(&env, &token, &contract_id, &tenant, 30_000_000_000i128);

        client.lock_deposit(&1u32, &tenant, &landlord, &30_000_000_000i128, &agreement);

        // Dispute contract freezes the deposit.
        client.lock_for_dispute(&1u32, &dispute);
        assert_eq!(client.get_deposit(&1u32).status, DepositStatus::Disputed);

        // While dispute-locked, the agreement contract cannot release.
        assert_eq!(
            client
                .try_release_full(&1u32, &agreement)
                .unwrap_err()
                .unwrap(),
            Error::InvalidState
        );
        assert_eq!(
            client
                .try_release_partial(&1u32, &30_000_000_000i128, &0i128, &agreement)
                .unwrap_err()
                .unwrap(),
            Error::InvalidState
        );

        // Only the dispute contract can settle; only while dispute-locked.
        assert_eq!(
            client
                .try_settle_dispute(&1u32, &25_000_000_000i128, &5_000_000_000i128, &agreement)
                .unwrap_err()
                .unwrap(),
            Error::Unauthorized
        );
        client.settle_dispute(&1u32, &25_000_000_000i128, &5_000_000_000i128, &dispute);

        let deposit = client.get_deposit(&1u32);
        assert_eq!(deposit.released, 30_000_000_000i128);
        assert_eq!(deposit.status, DepositStatus::Released);

        // Settlement moved real tokens to both parties.
        let token_client = TokenClient::new(&env, &token);
        assert_eq!(token_client.balance(&tenant), 25_000_000_000i128);
        assert_eq!(token_client.balance(&landlord), 5_000_000_000i128);
        assert_eq!(token_client.balance(&contract_id), 0);

        // Double settlement is impossible.
        assert_eq!(
            client
                .try_settle_dispute(&1u32, &1i128, &0i128, &dispute)
                .unwrap_err()
                .unwrap(),
            Error::InvalidState
        );
    }
}
