# TrustRent — Decentralized Rental Escrow & Dispute Resolution Platform

## The problem

Today, when someone rents a house:

- Tenant pays a security deposit.
- Landlord holds the money.
- At the end of the lease, disputes are common:
  - "You damaged the wall."
  - "No, it was already like that."
  - "I'm keeping ₹20,000."
- The tenant often has little proof, and the landlord controls the deposit.

The process relies heavily on trust, which is exactly where blockchain can help.

## The solution

TrustRent is a decentralized rental platform where the security deposit is
never held by the landlord.

Instead:

- The deposit is locked in a Soroban smart contract (escrow).
- Both parties digitally agree to the rental terms.
- Every important action is recorded on-chain.
- If everything goes well, the contract automatically returns the deposit.
- If there's a dispute, an arbitrator decides how the deposit is split.

No one can secretly take or alter the funds.

## User roles

**Landlord**

- Lists a property.
- Creates a rental agreement.
- Uploads move-in/move-out inspection evidence.
- Confirms the property handover.
- Opens disputes if needed.

**Tenant**

- Accepts the agreement.
- Pays the deposit into escrow.
- Uploads their own inspection evidence.
- Requests deposit release.
- Can dispute unfair deductions.

**Arbitrator**

- Reviews disputes.
- Sees evidence from both sides.
- Decides how the deposit is distributed.

## Complete workflow

### Step 1 — Landlord creates agreement

They enter:

- Property name
- Monthly rent
- Security deposit
- Lease duration
- Move-in date
- Move-out date

The smart contract creates a rental agreement.
Status: Pending Tenant

### Step 2 — Tenant accepts

The tenant reviews the agreement. If they agree:

- They sign with their wallet.
- They send the security deposit.

The escrow contract now locks the money.
Status: Deposit Locked

### Step 3 — Move-in inspection

Both parties upload evidence such as:

- Photos
- Notes
- Room condition checklist

Example:

```
Kitchen  - Good
Bathroom - Good
Bedroom  - Small scratch
```

The files themselves can be stored off-chain (e.g., IPFS or cloud storage),
while their hashes are stored on-chain for verification. Now no one can
later claim the evidence was changed.

### Step 4 — Rental active

During the lease, dashboard shows:

```
Agreement #101
Deposit Locked ✅
Remaining Days: 124
Status: Active
```

### Step 5 — Move-out

Landlord uploads final inspection. Tenant uploads theirs.
If both agree: "Release Deposit" -> the escrow contract sends the money
back automatically. No arbitrator needed.

## What if there's a dispute?

Example:

```
Landlord claims: Broken Window - ₹4000 deduction
Tenant says: Window already broken.
```

Landlord opens a dispute.
Status becomes: Dispute Open

**Arbitrator reviews:**

The arbitrator sees:

- Move-in photos
- Move-out photos
- Messages
- Evidence timeline

The arbitrator decides, e.g.:

```
Tenant receives 80%
Landlord receives 20%
```

The smart contract automatically distributes the funds according to that
decision.

## Smart contract architecture

Instead of one large contract, responsibilities are split:

```
                    User Registry
                    /           \
                   /             \
          Rental Agreement ---- Escrow
                   \
                    \
                Dispute Contract
```

**User Registry Contract**

Stores:

- Wallet address
- Role (Tenant/Landlord/Arbitrator)
- Reputation score

**Rental Agreement Contract**

Stores:

- Agreement details
- Status
- Linked escrow ID
- Linked dispute ID

**Escrow Contract**

Handles:

- Lock deposit
- Hold funds
- Release funds
- Split funds

(This contract should only move money based on defined rules.)

**Dispute Contract**

Stores:

- Evidence references
- Arbitrator assignment
- Final decision

(It tells the escrow contract how to distribute funds.)

## Inter-contract communication

Simplified flow:

```
Landlord creates agreement
        |
        v
Agreement Contract
        |
Tenant accepts
        v
Escrow Contract locks deposit
        |
        v
Agreement status updated
        |
Move-out
        |
        v
Dispute Contract (if needed)
        |
Decision
        v
Escrow releases funds
```

This directly demonstrates inter-contract communication, one of the
competition requirements.

## Event streaming

Every important action emits an event, e.g.:

- `AgreementCreated`
- `TenantSigned`
- `DepositLocked`
- `InspectionUploaded`
- `DisputeOpened`
- `DecisionMade`
- `DepositReleased`

The frontend listens for these events and updates the activity feed in
real time.

## Frontend

Think of an Airbnb-style dashboard.

**Dashboard**

```
Welcome, Manish
Active Rentals: 2
Pending Deposits: ₹45,000
Open Disputes: 1
```

**Agreement Page**

- Property
- Deposit
- Status
- Timeline
- Inspection
- Release Deposit

**Activity Feed**

```
✔ Deposit Locked
✔ Inspection Uploaded
✔ Tenant Accepted
✔ Dispute Opened
✔ Arbitrator Assigned
```

## Production features

To make it feel like a real SaaS product:

- Responsive design for mobile and desktop.
- Wallet authentication.
- Skeleton loaders while data loads.
- Toast notifications for successful actions.
- Graceful error handling (failed wallet connection, rejected transaction,
  network issues).
- Search and filtering for agreements.
- User profile with reputation.

## Why this fits Stellar

Stellar is designed for fast, low-cost financial transactions.

The app uses Stellar to:

- Securely hold deposits.
- Transfer funds quickly.
- Provide immutable agreement records.
- Record transparent dispute outcomes.

The blockchain isn't forced into the project — it's used where it adds
real value.

## Suggested naming

Rather than calling it "TrustRent" alone, pitch it as:

> **TrustRent – Decentralized Rental Escrow & Dispute Resolution Platform**

That title immediately tells judges:

- it's more than a payment app,
- it involves multiple smart contracts,
- it has real-world business value,
- and it naturally showcases the advanced features they're looking for.
