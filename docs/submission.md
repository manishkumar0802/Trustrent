# Orange Belt Submission Pack

## Goal

Ship a working TrustRent demo that proves:
- the app is mobile responsive,
- the smart contracts enforce the rental-deposit lifecycle,
- the contract test suite passes,
- the project can be deployed to a public demo URL,
- the repo is documented and reviewable.

## Required proof checklist

### Repository and docs
- [ ] Public GitHub repo is live
- [ ] README contains setup instructions
- [ ] README contains architecture summary
- [ ] README contains deployment/testnet notes
- [ ] README contains contract address(es) and transaction hash(es)
- [ ] At least 10 meaningful commits are in the repo history

### Frontend and UX
- [ ] Desktop + mobile responsive UI is working
- [ ] Dashboard and agreement flows render cleanly
- [ ] Loading and error states are visible
- [ ] Demo is easy to follow in under 2 minutes

### Contracts and testing
- [ ] `cargo test --workspace` passes
- [ ] Frontend `npm run test` passes
- [ ] Contract deployment workflow is documented
- [ ] At least 3 passing test screenshots are captured

### CI / deployment
- [ ] GitHub Actions pipeline is configured and running
- [ ] Frontend is deployed to Vercel or Netlify
- [ ] Demo URL is recorded in the README
- [ ] Deployment address and contract interaction hash are recorded

### Presentation evidence
- [ ] Screenshot of mobile-responsive UI
- [ ] Screenshot of CI pipeline successfully running
- [ ] Screenshot of test output
- [ ] 1–2 minute demo video link

## Recommended demo flow

1. Open the landing page.
2. Show the dashboard with the deposit data and status cards.
3. Open an agreement detail.
4. Show lifecycle / timeline and evidence panel.
5. Explain the escrow and dispute flow.
6. Summarize the contract logic and security model.
7. Mention that the app is testnet-based and demo-only.

## Commands to capture for evidence

```powershell
cd "C:\Users\manishh\OneDrive\Desktop\Trustrent"
npm run build --workspace @trustrent/web
npm run test --workspace @trustrent/web
$env:CARGO_TARGET_DIR='C:\trustrent-target'
cd contracts
cargo test --workspace
```

## Public demo notes

- Frontend: deploy to Vercel or Netlify
- Contracts: deploy to Stellar Testnet with funded keypair
- Record final variables in `.env` or deployment notes
- Keep the answer short and clear when presenting

## Short submission summary

TrustRent is a Stellar Soroban rental-deposit escrow dApp that demonstrates:
- deposit locking,
- evidence-backed move-out,
- dispute/settlement flow,
- user registry and reputation updates,
- real contract logic and test coverage,
- responsive product UI.

This is enough for the Orange Belt submission when packaged clearly and demoed confidently.
