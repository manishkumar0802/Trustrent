#![no_std]

//! User registry contract — the identity and role directory for the platform.
//!
//! Stores a wallet address → role mapping (Landlord / Tenant / Arbitrator)
//! plus a reputation score. The dispute contract consults this registry to
//! verify an address really is a registered Arbitrator before a binding
//! resolution is accepted, and — after a dispute settles — the dispute
//! contract adjusts the winner's/loser's reputation through
//! `adjust_reputation`, which only the registered reputation source may
//! call. The registry never moves funds and holds no deposit state — it is
//! a pure directory, which keeps it cheap and audit-friendly.
//!
//! Registration and absolute reputation changes are admin-only
//! (`require_admin`). Delta adjustments (`adjust_reputation`) are restricted
//! to a single source contract (the dispute contract) configured by the
//! admin. Reads (`get_user`) are public so any contract or wallet can look a
//! counterparty up.

use soroban_sdk::{contract, contractimpl, contracttype, panic_with_error, Address, Env, Symbol};

use tr_common::events;
use tr_common::{Error, UserRecord, UserRole};

#[contracttype]
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum DataKey {
    Admin,
    /// The contract allowed to call `adjust_reputation` (the dispute
    /// contract). Unset until the admin configures it.
    ReputationSource,
    User(Address),
}

/// Neutral starting reputation for a newly registered user. Mid-band (50 of
/// 0..=100) so dispute outcomes have symmetric headroom in both directions —
/// a baseline of 100 would make wins impossible.
const INITIAL_REPUTATION: u32 = 50;

#[contract]
pub struct UserRegistryContract;

#[contractimpl]
impl UserRegistryContract {
    /// One-time setup: the admin who may register users and update
    /// reputations.
    pub fn initialize(env: Env, admin: Address) {
        admin.require_auth();
        if env.storage().persistent().has(&DataKey::Admin) {
            panic_with_error!(&env, Error::AlreadyInitialized);
        }
        env.storage().persistent().set(&DataKey::Admin, &admin);
    }

    /// Register a user with a role. Admin-only. Emits `UserRegistered`.
    pub fn register_user(
        env: Env,
        admin: Address,
        user: Address,
        role: UserRole,
    ) -> Result<(), Error> {
        admin.require_auth();
        require_admin(&env, &admin)?;
        if env.storage().persistent().has(&DataKey::User(user.clone())) {
            return Err(Error::UserAlreadyRegistered);
        }

        let record = UserRecord {
            address: user.clone(),
            role,
            reputation: INITIAL_REPUTATION,
            registered_at: env.ledger().timestamp(),
        };
        env.storage()
            .persistent()
            .set(&DataKey::User(user), &record);

        env.events().publish(
            (Symbol::new(&env, events::USER_REGISTERED),),
            (record.address.clone(), role),
        );
        Ok(())
    }

    /// Update a user's reputation score (clamped to 0..=100). Admin-only.
    /// Emits `ReputationUpdated`.
    pub fn set_reputation(
        env: Env,
        admin: Address,
        user: Address,
        reputation: u32,
    ) -> Result<(), Error> {
        admin.require_auth();
        require_admin(&env, &admin)?;

        let mut record: UserRecord = env
            .storage()
            .persistent()
            .get(&DataKey::User(user.clone()))
            .ok_or(Error::UserNotFound)?;
        record.reputation = reputation.min(100);
        env.storage()
            .persistent()
            .set(&DataKey::User(user), &record);

        env.events().publish(
            (Symbol::new(&env, events::REPUTATION_UPDATED),),
            (record.address.clone(), record.reputation),
        );
        Ok(())
    }

    /// Configure the contract allowed to call `adjust_reputation` (the
    /// dispute contract). Admin-only. Without this, dispute outcomes cannot
    /// touch reputation.
    pub fn set_reputation_source(env: Env, admin: Address, source: Address) -> Result<(), Error> {
        admin.require_auth();
        require_admin(&env, &admin)?;
        env.storage()
            .persistent()
            .set(&DataKey::ReputationSource, &source);
        Ok(())
    }

    /// Delta-based reputation change, restricted to the configured reputation
    /// source (the dispute contract after a settlement). `delta` may be
    /// positive or negative; the result is clamped to 0..=100. Emits
    /// `ReputationUpdated`. Returns `Error::Unauthorized` if the caller is
    /// not the configured source, `Error::NotInitialized` if no source has
    /// been configured yet.
    pub fn adjust_reputation(
        env: Env,
        caller: Address,
        user: Address,
        delta: i32,
    ) -> Result<(), Error> {
        caller.require_auth();
        let source: Address = env
            .storage()
            .persistent()
            .get(&DataKey::ReputationSource)
            .ok_or(Error::NotInitialized)?;
        if caller != source {
            return Err(Error::Unauthorized);
        }

        let mut record: UserRecord = env
            .storage()
            .persistent()
            .get(&DataKey::User(user.clone()))
            .ok_or(Error::UserNotFound)?;
        let next = (record.reputation as i32 + delta).clamp(0, 100) as u32;
        record.reputation = next;
        env.storage()
            .persistent()
            .set(&DataKey::User(user), &record);

        env.events().publish(
            (Symbol::new(&env, events::REPUTATION_UPDATED),),
            (record.address.clone(), record.reputation),
        );
        Ok(())
    }

    /// Public read helper: look up a user's role and reputation.
    pub fn get_user(env: Env, user: Address) -> Result<UserRecord, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::User(user))
            .ok_or(Error::UserNotFound)
    }
}

fn require_admin(env: &Env, admin: &Address) -> Result<(), Error> {
    let stored: Address = env
        .storage()
        .persistent()
        .get(&DataKey::Admin)
        .ok_or(Error::NotInitialized)?;
    if admin != &stored {
        return Err(Error::Unauthorized);
    }
    Ok(())
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::testutils::Address as _;
    use soroban_sdk::Env;
    extern crate alloc;
    use alloc::boxed::Box;

    fn setup() -> (Env, Address, UserRegistryContractClient<'static>) {
        let env = Env::default();
        env.mock_all_auths();

        let client_env: &'static Env = Box::leak(Box::new(env.clone()));
        let id = env.register(UserRegistryContract, ());
        let client = UserRegistryContractClient::new(client_env, &id);

        let admin = Address::generate(&env);
        client.initialize(&admin);

        (env, admin, client)
    }

    #[test]
    fn register_and_read_user() {
        let (env, admin, client) = setup();
        let landlord = Address::generate(&env);
        let tenant = Address::generate(&env);
        let arbitrator = Address::generate(&env);

        client.register_user(&admin, &landlord, &UserRole::Landlord);
        client.register_user(&admin, &tenant, &UserRole::Tenant);
        client.register_user(&admin, &arbitrator, &UserRole::Arbitrator);

        let record = client.get_user(&arbitrator);
        assert_eq!(record.address, arbitrator);
        assert_eq!(record.role, UserRole::Arbitrator);
        assert_eq!(record.reputation, INITIAL_REPUTATION);
    }

    #[test]
    fn duplicate_registration_rejected() {
        let (env, admin, client) = setup();
        let user = Address::generate(&env);

        client.register_user(&admin, &user, &UserRole::Tenant);
        assert_eq!(
            client
                .try_register_user(&admin, &user, &UserRole::Tenant)
                .unwrap_err()
                .unwrap(),
            Error::UserAlreadyRegistered
        );
    }

    #[test]
    fn non_admin_cannot_register_or_update() {
        let (env, admin, client) = setup();
        let user = Address::generate(&env);
        let stranger = Address::generate(&env);

        assert_eq!(
            client
                .try_register_user(&stranger, &user, &UserRole::Tenant)
                .unwrap_err()
                .unwrap(),
            Error::Unauthorized
        );

        client.register_user(&admin, &user, &UserRole::Tenant);
        assert_eq!(
            client
                .try_set_reputation(&stranger, &user, &50)
                .unwrap_err()
                .unwrap(),
            Error::Unauthorized
        );
    }

    #[test]
    fn reputation_updates_and_clamps() {
        let (env, admin, client) = setup();
        let user = Address::generate(&env);

        client.register_user(&admin, &user, &UserRole::Tenant);
        client.set_reputation(&admin, &user, &42);
        assert_eq!(client.get_user(&user).reputation, 42);

        // Clamped to the 0..=100 band.
        client.set_reputation(&admin, &user, &999);
        assert_eq!(client.get_user(&user).reputation, 100);

        // Unknown user.
        let stranger = Address::generate(&env);
        assert_eq!(
            client.try_get_user(&stranger).unwrap_err().unwrap(),
            Error::UserNotFound
        );
    }

    #[test]
    fn adjust_reputation_requires_configured_source() {
        let (env, admin, client) = setup();
        let user = Address::generate(&env);
        client.register_user(&admin, &user, &UserRole::Tenant);

        // No reputation source configured yet.
        let source = Address::generate(&env);
        assert_eq!(
            client
                .try_adjust_reputation(&source, &user, &10)
                .unwrap_err()
                .unwrap(),
            Error::NotInitialized
        );

        // Admin configures the source.
        client.set_reputation_source(&admin, &source);

        // A non-source caller is rejected.
        let stranger = Address::generate(&env);
        assert_eq!(
            client
                .try_adjust_reputation(&stranger, &user, &10)
                .unwrap_err()
                .unwrap(),
            Error::Unauthorized
        );

        // Only the admin can change the source.
        assert_eq!(
            client
                .try_set_reputation_source(&stranger, &source)
                .unwrap_err()
                .unwrap(),
            Error::Unauthorized
        );
    }

    #[test]
    fn adjust_reputation_applies_delta_and_clamps() {
        let (env, admin, client) = setup();
        let source = Address::generate(&env);
        client.set_reputation_source(&admin, &source);

        let user = Address::generate(&env);
        client.register_user(&admin, &user, &UserRole::Tenant);

        // Starts at the neutral baseline.
        assert_eq!(client.get_user(&user).reputation, INITIAL_REPUTATION);

        // Source adds and subtracts deltas.
        client.adjust_reputation(&source, &user, &10);
        assert_eq!(client.get_user(&user).reputation, 60);
        client.adjust_reputation(&source, &user, &-30);
        assert_eq!(client.get_user(&user).reputation, 30);

        // Clamped at both ends (use large-but-valid deltas — i32::MAX is a
        // reserved sentinel in the Soroban host).
        client.adjust_reputation(&source, &user, &1_000_000);
        assert_eq!(client.get_user(&user).reputation, 100);
        client.adjust_reputation(&source, &user, &-1_000_000);
        assert_eq!(client.get_user(&user).reputation, 0);

        // Unknown user cannot be adjusted.
        let stranger = Address::generate(&env);
        assert_eq!(
            client
                .try_adjust_reputation(&source, &stranger, &10)
                .unwrap_err()
                .unwrap(),
            Error::UserNotFound
        );
    }
}
