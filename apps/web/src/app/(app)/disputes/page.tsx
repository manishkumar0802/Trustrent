import type { Metadata } from "next";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { IconScale } from "@/components/icons";

export const metadata: Metadata = { title: "Disputes" };

export default function DisputesPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Disputes</h1>
        <p className="mt-1 text-sm text-ink-400">
          When sides disagree, the deposit stays locked until the dispute resolves — by design.
        </p>
      </header>

      <EmptyState
        icon={<IconScale className="size-8" />}
        title="No open disputes"
        description="Demo data has no disputes. Open disputes appear here with their evidence, proposed deductions and resolution status."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <ExplainCard n="1" title="Deposit stays locked" text="While a dispute is open, the escrow contract releases nothing to either side." />
        <ExplainCard n="2" title="Both sides submit evidence" text="References to off-chain files are recorded on-chain with submitter and timestamp." />
        <ExplainCard n="3" title="Resolution releases funds" text="Agreed deduction splits the deposit; amounts are released by the contract, not by hand." />
      </div>

      <Card>
        <CardHeader title="Dispute contract" subtitle="Stellar Testnet · placeholder address" />
        <CardBody>
          <p className="font-mono text-sm text-ink-500">CCQJZ6MOVE3UPPERDISPUTEDEMO000002</p>
          <p className="mt-2 text-xs text-ink-400">
            Deployed and bound via the dispute contract in phase 2 (see docs/contracts.md).
          </p>
        </CardBody>
      </Card>
    </div>
  );
}

function ExplainCard({ n, title, text }: { n: string; title: string; text: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
      <span className="flex size-6 items-center justify-center rounded-full bg-sage-100 text-xs font-semibold text-sage-600">
        {n}
      </span>
      <p className="mt-3 text-sm font-semibold text-ink-900">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-ink-400">{text}</p>
    </div>
  );
}
