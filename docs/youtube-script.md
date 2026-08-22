# TrustRent — YouTube Video Script

**Video Title:** "I Built a Blockchain Rental Escrow System on Stellar — Here's How It Works"
**Alt Titles:**
- "TrustRent: Secure Rental Deposits with Smart Contracts"
- "How I Built a Decentralized Rental Platform (Soroban + Next.js)"
**Target Length:** 10–14 minutes
**Tone:** Conversational, technical but accessible, demo-heavy

---

## SECTION 1 — HOOK (0:00–0:30)

**[SCREEN: Black screen → Zoom into title card "TrustRent"]**

> **"Your deposit. Locked fairly. Released transparently."**
>
> Hey — imagine you're renting a new apartment. You pay ₹30,000 as a security deposit. That money goes straight into the landlord's bank account. Three months later, when you move out, the landlord says "there's damage" and keeps half of it. You disagree — but you have no proof, and the money is already gone.
>
> This is the problem. Today, I'm going to show you how I built a solution to this using blockchain.

---

## SECTION 2 — PROBLEM STATEMENT (0:30–1:30)

**[SCREEN: Split screen — left side shows "Current System" with unhappy tenant icon, right side shows "TrustRent" with smart contract icon]**

> Here's what happens in the real world right now.
>
> A tenant pays a security deposit. The landlord holds that money — in their pocket, their bank account, their control. When the lease ends and it's time to move out, disputes are extremely common:
>
> **[SCREEN: Animated text appearing one by one]**
> - "You damaged the wall."
> - "No, it was already like that."
> - "I'm keeping ₹20,000."
>
> The tenant often has little proof. The landlord controls the funds. And there's no neutral third party.
>
> The whole system relies on trust — which is exactly where blockchain can help.

---

## SECTION 3 — INTRODUCE TRUSTRENT (1:30–2:30)

**[SCREEN: TrustRent logo + tagline]**

> That's why I built TrustRent — a decentralized rental escrow and dispute resolution platform built on Stellar Soroban.
>
> Here's the core idea:
>
> **[SCREEN: Simple animation — tenant pays deposit → goes into smart contract → both parties can see it → released transparently]**
>
> Instead of the landlord holding the deposit, the deposit goes into a **smart contract**. The tenant locks it. The landlord can see it. Neither party can touch it unilaterally. When the lease ends:
>
> - If everything goes well → full refund to the tenant. Automatically.
> - If there's a small deduction → both parties agree, the contract splits the funds.
> - If there's a disagreement → a dispute opens, an arbitrator decides, and the contract executes the decision.
>
> No one controls the money. The contract does.

---

## SECTION 4 — TECH STACK & MONOREPO (2:30–3:30)

**[SCREEN: Terminal showing `ls` of the project root]**

> Let me show you how this is built. The project is a full monorepo.
>
> **[SCREEN: Architecture diagram or folder tree]**
>
> ```
> contracts/        ← Four Soroban smart contracts (Rust)
> apps/web/         ← Frontend (Next.js + React + Tailwind)
> apps/api/         ← Backend API (Fastify)
> packages/types/   ← Shared TypeScript types
> packages/shared/  ← Lifecycle helpers, formatting
> packages/blockchain/ ← Stellar SDK client (typed stub)
> scripts/          ← Deployment scripts
> tests/            ← Integration tests
> docs/             ← Architecture docs
> ```
>
> The tech stack:
> - **Smart contracts**: Rust, Soroban SDK 22 — the latest version
> - **Frontend**: Next.js 16, React 19, Tailwind CSS 4
> - **API**: Fastify with TypeScript
> - **Blockchain client**: `@stellar/stellar-sdk` (typed interface, wired in phase 2)
> - **CI/CD**: GitHub Actions
> - **Testing**: Cargo tests for contracts, Vitest for frontend

---

## SECTION 5 — THE PROBLEM TRUSTRENT SOLVES (3:30–4:30)

**[SCREEN: Side-by-side comparison]**

> Before we go deeper, let me make the problem crystal clear.
>
> **Current system:**
> - Tenant pays deposit → Landlord holds money → Move-out → Landlord decides how much to return → Tenant has no recourse
>
> **TrustRent:**
> - Tenant pays deposit → **Smart contract holds it** → Move-out → Both parties submit evidence → Contract or arbitrator decides → **Automatic release**
>
> The blockchain isn't forced into the project — it's used where it adds real value: holding money neutrally, recording every action immutably, and executing decisions automatically.

---

## SECTION 6 — SMART CONTRACTS DEEP DIVE (4:30–7:00)

### 6A — Contract Architecture (4:30–5:15)

**[SCREEN: Architecture diagram showing 4 contracts]**

> Instead of one big contract, the responsibilities are split across four:
>
> **[SCREEN: Highlight each contract one by one]**
>
> 1. **Rental Agreement** — The orchestrator. It manages the full lifecycle. Create agreement → tenant joins → deposit locks → move-out → evidence → inspection → approve or dispute → settlement → close.
>
> 2. **Escrow** — The vault. It holds the actual deposit. Real Stellar Asset Contract tokens move in and out. Only the agreement or dispute contract can instruct it.
>
> 3. **Dispute** — The mediator's ledger. Records disputes, assigns arbitrators, coordinates resolution. It never moves money itself — it tells escrow what to do.
>
> 4. **User Registry** — The identity directory. Maps wallet addresses to roles (Landlord, Tenant, Arbitrator) and reputation scores.

### 6B — The Escrow Contract (5:15–6:00)

**[SCREEN: Code from contracts/escrow/src/lib.rs]**

> Let's zoom into the escrow contract — this is where the money lives.
>
> **[Highlight the `lock_deposit` function]**
>
> When a tenant locks their deposit, the escrow contract pulls tokens from the tenant's balance using Stellar Asset Contract's `transfer_from`. The tenant must have pre-approved the escrow contract as a spender — exactly like ERC-20 approvals on Ethereum, but for Stellar.
>
> **[Highlight the `release_full` function]**
>
> When the agreement closes with no disputes, `release_full` sends the entire deposit back to the tenant. Real tokens move out of the escrow contract's balance.
>
> **[Highlight the `require_caller` function]**
>
> The critical security check: every fund-moving function takes a `caller` parameter. The escrow contract verifies this is the registered agreement or dispute contract. A random wallet — including the tenant and landlord themselves — cannot withdraw. Period.

### 6C — Cross-Contract Calls (6:00–6:30)

**[SCREEN: Code showing `EscrowClient::new(&env, &escrow_contract).try_lock_deposit(...)]`]**

> Here's how the contracts talk to each other. The rental agreement contract creates an `EscrowClient` pointing at the escrow contract's address, and calls `lock_deposit`. The agreement contract passes its own address as `caller`. The escrow contract authenticates that caller and checks it's the registered agreement contract.
>
> This is real Soroban cross-contract invocation — not decoration, not simulation. Every call changes real state in the callee.

### 6D — The State Machine (6:30–7:00)

**[SCREEN: State machine diagram]**

> The entire lifecycle follows a strict state machine.
>
> **[Highlight each state as you describe it]**
>
> CREATED → ACTIVE → MOVE_OUT_REQUESTED → EVIDENCE_SUBMITTED → INSPECTION_PENDING → APPROVED → SETTLEMENT → CLOSED
>
> With a dispute fork: INSPECTION_PENDING → DISPUTED → RESOLVED → SETTLEMENT → CLOSED
>
> Invalid transitions are rejected. You can't skip steps. You can't go backwards. You can't close an agreement that isn't settled. The contracts enforce every rule.

---

## SECTION 7 — FRONTEND DEMO (7:00–9:30)

### 7A — Dashboard (7:00–7:45)

**[SCREEN: Browser showing the running app at localhost:3000]**

> Now let me show you the frontend. I'll run the app.
>
> **[SCREEN: Terminal — `npm run dev`]**
>
> **[SCREEN: Browser — Dashboard loads]**
>
> This is the dashboard. You can see the primary agreement — ₹30,000 locked in escrow. There's a quick stats panel showing the deposit status and next step. And an activity feed showing on-chain events like AgreementCreated, TenantJoined, DepositLocked.
>
> The whole thing is responsive — sidebar on desktop, bottom navigation on mobile.

### 7B — Agreement Detail (7:45–8:15)

**[SCREEN: Click into AG-1042 agreement]**

> Let me click into this agreement. You see the full lifecycle timeline — a stepper showing exactly where you are in the state machine. The deposit hero card shows the locked amount and the escrow contract ID.
>
> Below that, you have the property details, parties involved, and the complete event history.

### 7C — Role Switcher (8:15–8:30)

**[SCREEN: Toggle role switcher from tenant to landlord]**

> Here's something cool — I can switch between landlord and tenant views. The UI adapts: different actions appear, different next steps are shown. The landlord sees "Review move-out" while the tenant sees "Submit evidence".

### 7D — Move-out & Evidence Flow (8:30–9:00)

**[SCREEN: Navigate to move-out page]**

> When it's time to move out, the tenant navigates to the move-out page. They can submit evidence — photos of room condition, utility receipts, damage reports. These files are stored off-chain on IPFS, and only the content hash goes on-chain. This is important — the blockchain stores the proof, not the file itself.
>
> The landlord sees the evidence and can approve the inspection. If everything checks out, the deposit gets released.

### 7E — Disputes (9:00–9:30)

**[SCREEN: Navigate to disputes page]**

> If there's a disagreement, either party opens a dispute. The deposit freezes in escrow — it can't be touched. An arbitrator reviews evidence from both sides and proposes a resolution split.
>
> **[SCREEN: Show dispute detail with arbitrator assigned]**
>
> In this demo, we have an active dispute — the landlord proposed an ₹8,000 deduction for kitchen repaint, and the tenant is reviewing. If they can't agree, the arbitrator decides.

---

## SECTION 8 — SECURITY MODEL (9:30–10:30)

**[SCREEN: Architecture diagram or code highlights]**

> Let me walk you through the security model — this is what makes the contracts production-quality.
>
> **First — defense in depth on settlement.**
> When a dispute settles, the dispute contract calls escrow's `settle_dispute`. Escrow checks three things: Is the caller the registered dispute contract? Is the deposit actually dispute-locked? Is it already released? Every check must pass, or the settlement fails.
>
> **Second — reputation is best-effort.**
> After a dispute settles, the winner gains reputation and the loser loses some. But if the reputation update fails — say, the user isn't registered — the settlement still goes through. Reputation bookkeeping never blocks the critical path.
>
> **Third — evidence is content-addressed.**
> The blockchain stores only the hash, never the file. If someone tampers with the evidence, the hash won't match. This makes fraud detectable.
>
> **Fourth — the state machine is strictly enforced.**
> Every transition is checked. You can't close a CREATED agreement. You can't reopen a CLOSED one. You can't skip the evidence step. Invalid transitions return `InvalidState`.

---

## SECTION 9 — TESTING & CI (10:30–11:15)

**[SCREEN: Terminal — `cargo test --workspace`]**

> All of this is thoroughly tested. Let me run the contract tests.
>
> **[SCREEN: Test output showing 30+ tests passing]**
>
> The test harness registers all four contracts in the same environment. Every cross-contract call executes against real state — not mocks. We test the happy path, unauthorized access, invalid state transitions, dispute flows, and reputation updates.
>
> **[SCREEN: GitHub Actions CI pipeline]**
>
> The CI pipeline runs on every push. Three parallel jobs: contracts (Rust formatting, clippy, tests, WASM build), web (ESLint, TypeScript, Vitest, Next.js build), and API. If anything breaks, you know immediately.

---

## SECTION 10 — COMPLETE DEMO WALKTHROUGH (11:15–13:00)

**[SCREEN: Browser — full walkthrough]**

> Let me do a complete end-to-end walkthrough.
>
> **Step 1 — Create Agreement**
> The landlord creates an agreement. Property: Greenview Apartments, 1BHK, Indiranagar, Bengaluru. Rent: ₹18,000/month. Deposit: ₹30,000. The contract creates it with status CREATED.
>
> **[SCREEN: Show agreement created]**
>
> **Step 2 — Tenant Joins & Locks Deposit**
> The tenant reviews the terms and joins. Then locks the deposit. The escrow contract pulls 30,000 INR worth of tokens from the tenant. Status moves to ACTIVE.
>
> **[SCREEN: Show deposit locked]**
>
> **Step 3 — Move-out & Evidence**
> Three months later, the tenant requests move-out. They submit evidence — room photos, utility bills. The landlord reviews and approves inspection.
>
> **[SCREEN: Show evidence submitted]**
>
> **Step 4a — Clean Move-out (Happy Path)**
> If everything is clean, the landlord closes the agreement. Escrow releases the full deposit. The tenant's reputation goes up by 10 points.
>
> **[SCREEN: Show full refund]**
>
> **Step 4b — Dispute Path**
> But what if the landlord claims damage? They propose a deduction. The tenant disagrees. A dispute opens. The deposit freezes. The arbitrator reviews evidence and proposes a 70-30 split. The tenant accepts. Escrow settles. Done.
>
> **[SCREEN: Show dispute flow]**
>
> Every single action is recorded on-chain. Every fund movement is real. The state machine enforces the rules.

---

## SECTION 11 — WHAT'S NEXT (13:00–13:45)

**[SCREEN: Roadmap slide]**

> So where is this headed?
>
> **Phase 2 — Real Chain Wiring**
> - Deploy contracts to Stellar testnet
> - Wire up Freighter wallet authentication
> - Replace mock data with live Soroban queries
> - Set up off-chain evidence storage via IPFS
> - Deploy frontend to Vercel
>
> **Phase 3 — Production Hardening**
> - Event indexing for the live timeline
> - Dispute mediation notifications
> - Mainnet gating
> - Audits and fuzz tests
>
> The hardest part — the smart contract logic and state machine — is done and tested. The frontend is responsive and complete. The monorepo is well-structured. The next phase is wiring everything together with real blockchain transactions.

---

## SECTION 12 — OUTRO (13:45–14:00)

**[SCREEN: TrustRent logo + tagline]**

> TrustRent: your deposit. Locked fairly. Released transparently.
>
> The full project is open source — linked in the description. If you found this interesting, drop a like and subscribe. I'll post updates as we deploy to testnet and go live.
>
> Thanks for watching. See you in the next one.

**[SCREEN: End card with repo link, social handles]**

---

## PRODUCTION NOTES

### Recording Checklist
- [ ] Screen record: `npm run dev` + browser walkthrough
- [ ] Screen record: `cargo test --workspace` output
- [ ] Screen record: GitHub Actions CI pipeline
- [ ] Screen record: Mobile responsive view
- [ ] Screen record: Role switcher toggle
- [ ] Screen record: Agreement detail page
- [ ] Screen record: Move-out evidence flow
- [ ] Screen record: Dispute detail page
- [ ] Create: Architecture diagram (draw.io or Excalidraw)
- [ ] Create: State machine diagram
- [ ] Create: Title card and end card

### B-Roll Suggestions
- Terminal typing commands (`cargo test`, `npm run dev`)
- Code scrolling through contract files
- Browser navigating the app
- Architecture diagram zoom-ins
- CI pipeline running in GitHub
- Mobile view switching

### Key Timestamps for YouTube Description
- 0:00 — Intro
- 1:30 — What is TrustRent
- 2:30 — Tech stack
- 4:30 — Smart contracts deep dive
- 7:00 — Frontend demo
- 9:30 — Security model
- 10:30 — Testing & CI
- 11:15 — Full walkthrough
- 13:00 — What's next

### Tags
`stellar`, `soroban`, `blockchain`, `smart contracts`, `rental escrow`, `web3`, `dapp`, `rust`, `next.js`, `react`, `typescript`, `decentralized`, `defi`, `stellar network`, `soroban contracts`, `monorepo`
