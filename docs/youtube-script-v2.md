# TrustRent — YouTube Script (Casual / Walkthrough Style)

**Video Title:** "I Built a Blockchain Rental Escrow App — Full Walkthrough"
**Target Length:** 12–15 minutes
**Tone:** Casual, "hi guys" vlog style, screen-recording heavy

---

## INTRO (0:00–0:40)

**[SCREEN: You on camera, or just your desktop with the app running]**

> Hi guys, welcome back to the channel. Today I want to show you something I've been building — it's called TrustRent.
>
> So basically, the idea is: when you rent a house, you pay a security deposit, right? And that money goes to the landlord. And then at the end, if there's any dispute — like "oh you damaged this" or "no it was already like that" — the landlord has your money and you have no proof.
>
> So I built a blockchain app where the deposit goes into a smart contract instead. Nobody can touch it unilaterally. It gets released only through a transparent process. Let me show you how the whole thing works — how to run it, what the code looks like, everything.

---

## PART 1 — HOW TO RUN THE PROJECT (0:40–3:00)

**[SCREEN: Terminal — show the repo root]**

> Alright so first let me show you how to actually run this project. It's a monorepo — meaning there's a bunch of different packages all in one repo.
>
> **[SCREEN: `ls` of the project root]**
>
> You can see we have:
> - `contracts/` — that's the smart contracts, written in Rust
> - `apps/web/` — the frontend, Next.js
> - `apps/api/` — the backend API, Fastify
> - `packages/` — shared TypeScript code
> - `scripts/` — deployment scripts
> - `docs/` — all the documentation
>
> **Step 1: Install everything**

**[SCREEN: Terminal]**

```bash
git clone https://github.com/manishkumar0802/Trustrent.git
cd Trustrent
npm install
```

> That installs all the JavaScript dependencies — frontend, API, shared packages, everything.
>
> **Step 2: Run the frontend**

**[SCREEN: Terminal]**

```bash
npm run dev
```

> This starts the Next.js app on port 3000. Let me open it in the browser.

**[SCREEN: Browser opens localhost:3000]**

> And there it is. That's the TrustRent dashboard.
>
> **Step 3: Run the API (optional, in another terminal)**

**[SCREEN: New terminal tab]**

```bash
npm run dev:api
```

> This starts the Fastify API on port 4000. You can hit the health endpoint at `localhost:4000/health` to verify it's running.

**[SCREEN: Browser — localhost:4000/health]**

> See — `ok: true`, service is running.

> **Step 4: Run the contract tests**

**[SCREEN: Terminal]**

```bash
cd contracts
cargo test --workspace
```

> This runs all the Rust tests for the smart contracts. Let me show you the output...

**[SCREEN: Test output scrolling — 30+ tests passing]**

> All green. 30 plus tests passing. Every cross-contract call, every state transition, every security check — all tested.
>
> So that's how you run the project. `npm install`, `npm run dev`, done. The frontend is live, the API is live, and the contracts are tested. Let me now walk you through what's actually happening under the hood.

---

## PART 2 — THE PROBLEM (3:00–4:00)

**[SCREEN: Maybe a quick diagram or just talking over the app]**

> Before I show you the code, let me quickly explain the problem this solves.
>
> You rent a flat. You pay ₹30,000 deposit. Landlord holds it. Three months later you move out. Landlord says "you damaged the kitchen" and keeps ₹10,000. You say "no, it was already like that." But you have no proof. And the money is already gone.
>
> That's the problem. The landlord controls the funds. The tenant has no recourse.
>
> TrustRent fixes this by putting the deposit in a smart contract. The contract holds it. Neither party can touch it alone. And it gets released based on evidence and agreement — or an arbitrator decides.

---

## PART 3 — THE ARCHITECTURE (4:00–5:30)

**[SCREEN: Architecture diagram or folder structure]**

> Let me show you the architecture. This is the big picture.
>
> We have four smart contracts:

**[SCREEN: Highlight each in the diagram]**

> 1. **Rental Agreement** — this is the main one. It orchestrates everything: create agreement, join, lock deposit, move-out, evidence, inspection, dispute, settlement, close.
>
> 2. **Escrow** — this holds the actual money. Real Stellar tokens move in and out. Nobody can withdraw on their own — only the agreement or dispute contract can tell it to release funds.
>
> 3. **Dispute** — handles disagreements. It freezes the deposit, records the dispute, and executes the settlement through escrow.
>
> 4. **User Registry** — a directory of users. Maps wallet addresses to roles and reputation scores.

> The frontend talks to these contracts through a typed client. Right now it's using mock data — phase 1 — but the interface is ready for real Stellar SDK calls in phase 2.

---

## PART 4 — THE SMART CONTRACTS (5:30–8:00)

### 4A — Let me show you the code

**[SCREEN: Open contracts/escrow/src/lib.rs in editor]**

> Let me start with the escrow contract — this is where the money lives.
>
> **[Highlight `lock_deposit` function]**
>
> See this function? `lock_deposit`. When a tenant locks their deposit, the escrow contract pulls tokens from the tenant using the Stellar Asset Contract's `transfer_from`. The tenant has to pre-approve the escrow contract as a spender — kind of like MetaMask approvals on Ethereum.
>
> **[Highlight `require_caller` function]**
>
> And here's the security check. Every fund-moving function takes a `caller` parameter. The escrow verifies this is the registered agreement or dispute contract. If a random wallet tries to withdraw — rejected. If the tenant tries — rejected. If the landlord tries — rejected. Only the smart contracts can move the money.

**[SCREEN: Open contracts/rental_agreement/src/lib.rs]**

> Now the rental agreement contract. This is the orchestrator.
>
> **[Highlight `create_agreement` function]**
>
> Landlord creates an agreement — sets the property, rent, deposit amount. The contract records everything and returns an agreement ID.
>
> **[Highlight `lock_deposit` function — the cross-contract call]**
>
> When the tenant locks the deposit, this contract calls the escrow contract. See? `EscrowClient::new(&env, &escrow_contract).try_lock_deposit(...)`. It passes its own address as the caller. The escrow contract verifies it's the registered agreement contract and processes the lock.
>
> **[Highlight the state transitions]**
>
> And every state transition is enforced. You can't move from CREATED to CLOSED — you have to go through the whole lifecycle. Invalid transitions return `InvalidState`.

**[SCREEN: Open contracts/dispute/src/lib.rs]**

> The dispute contract is interesting too.
>
> **[Highlight `open_dispute` function]**
>
> When a dispute opens, it immediately freezes the deposit in escrow — `EscrowClient::new(&env, &escrow_contract).try_lock_for_dispute(...)`. The deposit stays frozen for the entire dispute.
>
> **[Highlight `resolve_dispute` function]**
>
> And when the dispute is resolved, it calls `escrow.settle_dispute` to release the funds according to the agreed split. After that, it updates reputation in the user registry — winner gains, loser loses.

### 4B — The test harness

**[SCREEN: Open contracts/rental_agreement/src/lib.rs — the test module]**

> Let me show you the tests because this is really cool.
>
> **[Highlight the `setup` function]**
>
> See this? The test harness registers all four contracts in the same environment. The rental agreement, escrow, dispute, and user registry — all wired together. Every cross-contract call in the tests executes against real state. Not mocks. Real contracts talking to real contracts.
>
> **[Highlight `fund_tenant` function]**
>
> This function mints tokens to the tenant and approves the escrow contract to spend them — exactly like what would happen on real testnet.
>
> **[Highlight `dispute_flow_through_escrow` test]**
>
> Look at this test — it runs the entire dispute flow. Open dispute → deposit freezes → landlord proposes split → tenant accepts → resolve dispute → escrow settles → agreement closes. All in one test, all real cross-contract calls.

---

## PART 5 — THE FRONTEND (8:00–10:30)

**[SCREEN: Browser — localhost:3000]**

> Alright now let me show you the frontend properly.
>
> **[SCREEN: Dashboard]**
>
> This is the dashboard. You can see the primary agreement — ₹30,000 locked in escrow, status is ACTIVE. There's a quick stats panel, an activity feed showing on-chain events, and a list of your agreements.

**[SCREEN: Click into agreement AG-1042]**

> Let me click into this agreement. Here you see the full lifecycle timeline — a stepper showing exactly where you are. We're in the ACTIVE stage. Below that, the deposit hero card shows the locked amount. Property details, parties involved, everything.

**[SCREEN: Toggle role switcher]**

> Oh and check this out — I can switch between landlord and tenant views. Watch what happens to the buttons.

**[SCREEN: Show buttons changing]**

> See? When I'm the tenant, I see "Submit evidence." When I switch to landlord, I see "Review move-out." The whole UI adapts based on your role.

**[SCREEN: Navigate to move-out page]**

> This is the move-out flow. The tenant submits evidence here — photos, receipts, room condition reports. These files go to IPFS off-chain, and only the hash goes on-chain. So the blockchain stores the proof, not the file itself.

**[SCREEN: Navigate to disputes page]**

> And here's the disputes page. We have one active dispute — the landlord proposed an ₹8,000 deduction for kitchen repaint. You can see the arbitrator is assigned, the evidence panel, and the resolution flow.

**[SCREEN: Show mobile view — resize browser]**

> Oh and the whole thing is responsive. If I shrink the browser to mobile size — you get a top bar and bottom navigation. Sidebar disappears. Clean mobile layout.

---

## PART 6 — THE STATE MACHINE (10:30–11:30)

**[SCREEN: State machine diagram or code]**

> Let me quickly explain the state machine because this is what ties everything together.

**[SCREEN: Show the diagram]**

> The agreement starts at CREATED. Tenant joins → ACTIVE. Tenant requests move-out → MOVE_OUT_REQUESTED. Evidence is submitted → EVIDENCE_SUBMITTED. Landlord reviews → INSPECTION_PENDING.
>
> From there, two paths:
>
> Path 1: Landlord approves → APPROVED → close → full refund → CLOSED.
>
> Path 2: Either party opens a dispute → DISPUTED → dispute resolved → RESOLVED → settlement → CLOSED.
>
> The contracts enforce every transition. You can't skip steps. You can't go backwards. Invalid transitions are rejected with `InvalidState`. The state machine is the source of truth.

---

## PART 7 — THE CI/CD PIPELINE (11:30–12:15)

**[SCREEN: GitHub Actions CI page]**

> Let me show you the CI pipeline too.

**[SCREEN: `.github/workflows/ci.yml`]**

> We have GitHub Actions running on every push. Three jobs in parallel:
>
> 1. **Contracts** — Rust formatting check, clippy lints, tests, and WASM build
> 2. **Web** — ESLint, TypeScript typecheck, Vitest tests, Next.js build
> 3. **API** — Same flow
>
> If anything breaks, you get notified immediately. Clean, automated, production-ready.

---

## PART 8 — THE SHARED PACKAGES (12:15–12:45)

**[SCREEN: packages/types/src/index.ts]**

> One more thing — the shared packages. This is what keeps the whole monorepo consistent.

**[SCREEN: Show types]**

> `@trustrent/types` has all the domain types — Agreement, DisputeRecord, EvidenceReference, ContractEvent. These mirror the on-chain state machine. The frontend, API, and blockchain client all share this single source of truth.

**[SCREEN: Show shared]**

> `@trustrent/shared` has lifecycle helpers, event labels, formatting functions like `formatINR` for ₹30,000 display. Everything stays in sync.

**[SCREEN: Show blockchain client]**

> And `@trustrent/blockchain` is the typed Stellar client. Right now it's a stub — every method throws `NotImplementedError`. But the interface is exactly what the real integration will look like. Phase 2 just fills in the bodies with actual Stellar SDK calls.

---

## PART 9 — HOW THE WHOLE FLOW WORKS (12:45–14:00)

**[SCREEN: Browser — full walkthrough]**

> Let me walk you through the complete flow from start to finish.
>
> **Step 1:** Landlord opens the app, creates an agreement. Property, rent, deposit. The smart contract records it.
>
> **Step 2:** Tenant gets a notification, reviews the terms, joins the agreement. Then locks the deposit. The escrow contract pulls the tokens. Now the deposit is safe.
>
> **Step 3:** Lease runs for a few months. Dashboard shows the status, deposit locked, everything transparent.
>
> **Step 4:** Tenant moves out. Submits evidence — room photos, utility bills. Landlord reviews, inspects.
>
> **Step 5a — Happy path:** Everything is clean. Landlord closes the agreement. Escrow releases the full deposit to the tenant. Tenant's reputation goes up. Done.
>
> **Step 5b — Dispute path:** Landlord claims damage. Proposes deduction. Tenant disagrees. Dispute opens. Deposit freezes. Arbitrator reviews evidence. Proposes a split. Tenant accepts. Escrow settles. Agreement closes.
>
> Every action is on-chain. Every fund movement is real. The state machine enforces the rules. Nobody can cheat.

---

## OUTRO (14:00–14:30)

**[SCREEN: Back to camera or just the app]**

> So yeah, that's TrustRent. A decentralized rental escrow system on Stellar Soroban.
>
> The whole project is open source — link in the description. You can clone it, run it, play with it. `npm install`, `npm run dev`, and you're up.
>
> If you found this interesting, smash that like button and subscribe. I'll post updates as we deploy to testnet and go live.
>
> Thanks for watching. See you in the next one. Peace.

---

## SCREEN RECORDING CHECKLIST

Record these separately and edit them in:

- [ ] `npm install` running in terminal
- [ ] `npm run dev` starting the web app
- [ ] `npm run dev:api` starting the API
- [ ] `localhost:4000/health` in browser
- [ ] Full dashboard walkthrough (click around, scroll)
- [ ] Agreement detail page
- [ ] Role switcher toggle (landlord ↔ tenant)
- [ ] Move-out evidence page
- [ ] Disputes page
- [ ] Mobile responsive view (resize browser)
- [ ] `cd contracts && cargo test --workspace` running
- [ ] Test output showing all tests passing
- [ ] Code walkthrough — escrow contract
- [ ] Code walkthrough — rental agreement contract
- [ ] Code walkthrough — dispute contract
- [ ] Test harness code
- [ ] State machine diagram
- [ ] Architecture diagram
- [ ] GitHub Actions CI page
- [ ] Shared packages (types, shared, blockchain)

## YOUTUBE DESCRIPTION

```
TrustRent — A Decentralized Rental Escrow & Dispute Resolution Platform

Built with Stellar Soroban smart contracts, Next.js, React, Tailwind, Fastify, and TypeScript.

🔗 GitHub: https://github.com/manishkumar0802/Trustrent

⏱️ Timestamps:
0:00 — Intro
0:40 — How to Run the Project
3:00 — The Problem
4:00 — Architecture
5:30 — Smart Contracts Deep Dive
8:00 — Frontend Demo
10:30 — State Machine
11:30 — CI/CD Pipeline
12:15 — Shared Packages
12:45 — Full Flow Walkthrough
14:00 — Outro

🛠️ Tech Stack:
- Smart Contracts: Rust + Soroban SDK 22
- Frontend: Next.js 16 + React 19 + Tailwind CSS 4
- API: Fastify + TypeScript
- Blockchain: Stellar Soroban (Testnet)
- CI/CD: GitHub Actions
- Testing: Cargo tests + Vitest

#stellar #soroban #blockchain #web3 #smartcontracts #dapp #rust #nextjs
```

## TAGS

stellar, soroban, blockchain, smart contracts, rental escrow, web3, dapp, rust, next.js, react, typescript, decentralized, defi, stellar network, soroban contracts, monorepo, full stack, security deposit, escrow, dispute resolution
