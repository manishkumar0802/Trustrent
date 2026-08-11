#![no_std]

//! Escrow contract — holds the security deposit and controls its release.
//!
//! Security model:
//! - Neither the tenant nor the landlord can withdraw arbitrarily. Every
//!   fund-moving function requires `caller` to be the registered agreement or
//!   dispute contract (the caller passes its own `env.current_contract_address()`
//!   and the escrow contract `require_auth`s it — a contract address is
//!   implicitly authorized as the direct invoker).
//! - No real token transfer happens yet (bookkeeping only); when a Stellar
//!   Asset Contract is wired in phase 3, the release paths below will transfer
//!   the token — the authorization and state guards are exactly the same.
//!
//! Guards: invalid amounts rejected; double lock rejected; double release
//! rejected; releases rejected while the deposit is dispute-locked; dispute
//! settlements only from the dispute contract and only while dispute-locked.

use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, Symbol};

use tr_common::events;
use tr_common::{DepositRecord, DepositStatus, Error};

#[contracttype]
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum DataKey {
    Admin,
    AgreementContract,
    DisputeContract,
    Deposit(u32),
}

#[contract]
pub struct EscrowContract;

#[contractimpl]
impl EscrowContract {
    /// One-time setup. Only the addresses registered here can trigger fund
    /// movements: `agreement_contract` (lock/release) and `dispute_contract`
    /// (lock for dispute / settlement).
    pub fn initialize(
        env: Env,
        admin: Address,
        agreement_contract: Address,
        dispute_contract: Address,
    ) {
        admin.require_auth();
        env.storage().persistent().set(&DataKey::Admin, &admin);
        env.storage()
            .persistent()
            .set(&DataKey::AgreementContract, &agreement_contract);
        env.storage()
            .persistent()
            .set(&DataKey::DisputeContract, &dispute_contract);
    }

    /// Lock the tenant's deposit. Only the authorized agreement contract may
    /// call this (it authenticates the tenant and enforces agreement state).
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

        let deposit = DepositRecord {
            agreement_id,
            tenant,
            landlord,
            amount,
            released: 0,
            status: DepositStatus::Locked,
            locked_at: env.ledger().timestamp(),
        };
        env.storage()
            .persistent()
            .set(&DataKey::Deposit(agreement_id), &deposit);

        env.events().publish(
            (Symbol::new(&env, events::DEPOSIT_LOCKED),),
            (agreement_id, amount),
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
        deposit.released = deposit.amount;
        deposit.status = DepositStatus::Released;
        env.storage()
            .persistent()
            .set(&DataKey::Deposit(agreement_id), &deposit);

        env.events().publish(
            (Symbol::new(&env, events::DEPOSIT_RELEASED),),
            (agreement_id, amount),
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
        if deposit.released + total > deposit.amount {
            return Err(Error::InvalidAmount);
        }
        deposit.released += total;
        deposit.status = if deposit.released == deposit.amount {
            DepositStatus::Released
        } else {
            DepositStatus::PartiallyReleased
        };
        env.storage()
            .persistent()
            .set(&DataKey::Deposit(agreement_id), &deposit);

        env.events().publish(
            (Symbol::new(&env, events::DEPOSIT_RELEASED),),
            (agreement_id, total),
        );
        Ok(())
    }

    /// Freeze the deposit while a dispute is open. Only the authorized
    /// dispute contract may call this. The deposit stays locked until a
    /// settlement instructs a release.
    pub fn lock_for_dispute(env: Env, agreement_id: u32, caller: Address) -> Result<(), Error> {
        caller.require_auth();
        require_caller(&env, &DataKey::DisputeContract, &caller)?;
        let mut deposit = load_deposit(&env, agreement_id)?;
        if deposit.status == DepositStatus::Released {
            return Err(Error::DepositAlreadyReleased);
        }
        deposit.status = DepositStatus::Disputed;
        env.storage()
            .persistent()
            .set(&DataKey::Deposit(agreement_id), &deposit);
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
        if deposit.released + total > deposit.amount {
            return Err(Error::InvalidAmount);
        }
        deposit.released += total;
        deposit.status = if deposit.released == deposit.amount {
            DepositStatus::Released
        } else {
            DepositStatus::PartiallyReleased
        };
        env.storage()
            .persistent()
            .set(&DataKey::Deposit(agreement_id), &deposit);

        env.events().publish(
            (Symbol::new(&env, events::DEPOSIT_RELEASED),),
            (agreement_id, total),
        );
        Ok(())
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
    let total = to_tenant + to_landlord;
    if total <= 0 {
        return Err(Error::InvalidAmount);
    }
    Ok(total)
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::testutils::Address as _;
    use soroban_sdk::Env;

    /// Returns (env, client, agreement, dispute). The agreement/dispute
    /// addresses are stored as the authorized callers; tests pass them as
    /// `caller` to simulate those contracts invoking (with `mock_all_auths`,
    /// `require_auth` passes for any address, exactly as the implicit
    /// contract-invoker auth behaves in production).
    fn setup() -> (Env, EscrowContractClient, Address, Address) {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(EscrowContract, ());
        let client = EscrowContractClient::new(&env, &contract_id);
        let admin = Address::generate(&env);
        let agreement = Address::generate(&env);
        let dispute = Address::generate(&env);
        client.initialize(&admin, &agreement, &dispute);
        (env, client, agreement, dispute)
    }

    #[test]
    fn lock_and_full_release() {
        let (env, client, agreement, _dispute) = setup();
        let tenant = Address::generate(&env);
        let landlord = Address::generate(&env);

        client
            .lock_deposit(&1u32, &tenant, &landlord, &30_000_000_000i128, &agreement)
            .unwrap();

        let deposit = client.get_deposit(&1u32).unwrap();
        assert_eq!(deposit.amount, 30_000_000_000i128);
        assert_eq!(deposit.released, 0);
        assert_eq!(deposit.status, DepositStatus::Locked);
        assert_eq!(deposit.tenant, tenant);
        assert_eq!(deposit.landlord, landlord);

        // Authorized agreement contract releases in full.
        client.release_full(&1u32, &agreement).unwrap();
        let deposit = client.get_deposit(&1u32).unwrap();
        assert_eq!(deposit.released, 30_000_000_000i128);
        assert_eq!(deposit.status, DepositStatus::Released);

        // Double release and double lock are rejected.
        assert_eq!(
            client.release_full(&1u32, &agreement).unwrap_err(),
            Error::DepositAlreadyReleased
        );
        assert_eq!(
            client
                .lock_deposit(&1u32, &tenant, &landlord, &1i128, &agreement)
                .unwrap_err(),
            Error::DepositAlreadyLocked
        );
    }

    #[test]
    fn unauthorized_withdrawal_fails() {
        let (env, client, agreement, _dispute) = setup();
        let tenant = Address::generate(&env);
        let landlord = Address::generate(&env);
        let stranger = Address::generate(&env);

        client
            .lock_deposit(&1u32, &tenant, &landlord, &30_000_000_000i128, &agreement)
            .unwrap();

        // Neither the tenant, nor the landlord, nor a stranger can withdraw.
        assert_eq!(
            client.release_full(&1u32, &tenant).unwrap_err(),
            Error::Unauthorized
        );
        assert_eq!(
            client.release_full(&1u32, &landlord).unwrap_err(),
            Error::Unauthorized
        );
        assert_eq!(
            client.release_full(&1u32, &stranger).unwrap_err(),
            Error::Unauthorized
        );
        assert_eq!(
            client
                .release_partial(&1u32, &20_000_000_000i128, &10_000_000_000i128, &tenant)
                .unwrap_err(),
            Error::Unauthorized
        );
        // Deposit is untouched.
        let deposit = client.get_deposit(&1u32).unwrap();
        assert_eq!(deposit.released, 0);
        assert_eq!(deposit.status, DepositStatus::Locked);
    }

    #[test]
    fn partial_release_split() {
        let (env, client, agreement, _dispute) = setup();
        let tenant = Address::generate(&env);
        let landlord = Address::generate(&env);

        client
            .lock_deposit(&1u32, &tenant, &landlord, &30_000_000_000i128, &agreement)
            .unwrap();

        client
            .release_partial(&1u32, &20_000_000_000i128, &0i128, &agreement)
            .unwrap();
        let deposit = client.get_deposit(&1u32).unwrap();
        assert_eq!(deposit.released, 20_000_000_000i128);
        assert_eq!(deposit.status, DepositStatus::PartiallyReleased);

        // Release the remainder — status becomes Released.
        client
            .release_partial(&1u32, &0i128, &10_000_000_000i128, &agreement)
            .unwrap();
        let deposit = client.get_deposit(&1u32).unwrap();
        assert_eq!(deposit.released, 30_000_000_000i128);
        assert_eq!(deposit.status, DepositStatus::Released);

        // Anything after full release is rejected.
        assert_eq!(
            client
                .release_partial(&1u32, &1i128, &0i128, &agreement)
                .unwrap_err(),
            Error::DepositAlreadyReleased
        );
    }

    #[test]
    fn rejects_invalid_amounts() {
        let (env, client, agreement, _dispute) = setup();
        let tenant = Address::generate(&env);
        let landlord = Address::generate(&env);

        // Cannot lock zero or negative.
        assert_eq!(
            client
                .lock_deposit(&1u32, &tenant, &landlord, &0i128, &agreement)
                .unwrap_err(),
            Error::InvalidAmount
        );
        assert_eq!(
            client
                .lock_deposit(&1u32, &tenant, &landlord, &-5i128, &agreement)
                .unwrap_err(),
            Error::InvalidAmount
        );

        client
            .lock_deposit(&1u32, &tenant, &landlord, &30_000_000_000i128, &agreement)
            .unwrap();

        // Negative / zero-total / over-release splits are rejected.
        assert_eq!(
            client
                .release_partial(&1u32, &-1i128, &0i128, &agreement)
                .unwrap_err(),
            Error::InvalidAmount
        );
        assert_eq!(
            client
                .release_partial(&1u32, &0i128, &0i128, &agreement)
                .unwrap_err(),
            Error::InvalidAmount
        );
        assert_eq!(
            client
                .release_partial(&1u32, &40_000_000_000i128, &0i128, &agreement)
                .unwrap_err(),
            Error::InvalidAmount
        );
    }

    #[test]
    fn dispute_lock_and_settlement() {
        let (env, client, agreement, dispute) = setup();
        let tenant = Address::generate(&env);
        let landlord = Address::generate(&env);

        client
            .lock_deposit(&1u32, &tenant, &landlord, &30_000_000_000i128, &agreement)
            .unwrap();

        // Dispute contract freezes the deposit.
        client.lock_for_dispute(&1u32, &dispute).unwrap();
        assert_eq!(
            client.get_deposit(&1u32).unwrap().status,
            DepositStatus::Disputed
        );

        // While dispute-locked, the agreement contract cannot release.
        assert_eq!(
            client.release_full(&1u32, &agreement).unwrap_err(),
            Error::InvalidState
        );
        assert_eq!(
            client
                .release_partial(&1u32, &30_000_000_000i128, &0i128, &agreement)
                .unwrap_err(),
            Error::InvalidState
        );

        // Only the dispute contract can settle; only while dispute-locked.
        assert_eq!(
            client
                .settle_dispute(&1u32, &25_000_000_000i128, &5_000_000_000i128, &agreement)
                .unwrap_err(),
            Error::Unauthorized
        );
        client
            .settle_dispute(&1u32, &25_000_000_000i128, &5_000_000_000i128, &dispute)
            .unwrap();

        let deposit = client.get_deposit(&1u32).unwrap();
        assert_eq!(deposit.released, 30_000_000_000i128);
        assert_eq!(deposit.status, DepositStatus::Released);

        // Double settlement is impossible.
        assert_eq!(
            client
                .settle_dispute(&1u32, &1i128, &0i128, &dispute)
                .unwrap_err(),
            Error::InvalidState
        );
    }
}
