#!/usr/bin/env bash
# TrustRent bootstrap: lift staged files into their final locations and clean up.
# Run from the repo root. Requires bash (Git for Windows provides it).
set -euo pipefail
shopt -s dotglob

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "Lifting staged files into place…"

# 1. Root config files
cp -f .staging-root/package.json \
      .staging-root/.gitignore \
      .staging-root/.prettierrc.json \
      .staging-root/.prettierignore \
      .staging-root/.editorconfig \
      .staging-root/.env.example ./

# 2. Root docs
cp -f bootstrap/docs-root/README.md staging2/ARCHITECTURE.md ./

# 3. Web config (overwrites the placeholder package.json written during setup)
cp -f bootstrap/web-root/* apps/web/

# 4. Landing page (src/app was write-locked during setup)
cp -f bootstrap/landing/page.tsx apps/web/src/app/page.tsx

# 5. Contracts workspace files
cp -f bootstrap/contracts-root/Cargo.toml bootstrap/contracts-root/rustfmt.toml contracts/

# 6. Docs
cp -f bootstrap/docs/*.md docs/

# 7. Package READMEs
cp -f bootstrap/package-readmes/types.md packages/types/README.md
cp -f bootstrap/package-readmes/shared.md packages/shared/README.md
cp -f bootstrap/package-readmes/blockchain.md packages/blockchain/README.md

# 8. Clean up probes and staging dirs
rm -f apps/web/probe.txt apps/web/src/probe.ts
rm -f packages/types/probe.json packages/types/probe.md packages/types/probe.txt
rm -f packages/shared/probe.json
rm -f packages/blockchain/doc-notes.md
rm -f docs/probe.md
rm -f contracts/probe.toml
rm -rf .staging-root bootstrap lift staging2

echo "Done. Staged files lifted, probes removed."
