import type { Metadata } from "next";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Settings" };

const CONTRACTS = [
  { name: "rental_agreement", address: "CCQJZ6MOVE3UPPERAGREEMENTDEMO0001" },
  { name: "escrow", address: "CCQJZ6MOVE3UPPERESCROWDEMO000001" },
  { name: "dispute", address: "CCQJZ6MOVE3UPPERDISPUTEDEMO000002" },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Settings</h1>
        <p className="mt-1 text-sm text-ink-400">
          Network, storage and contract configuration. Placeholder values in phase 1.
        </p>
      </header>

      <Card>
        <CardHeader
          title="Stellar network"
          action={<Badge tone="sage">Testnet</Badge>}
        />
        <CardBody className="space-y-1.5 text-sm">
          <Row label="Network" value="Test SDF Network ; September 2015" />
          <Row label="RPC" value="https://soroban-testnet.stellar.org" mono />
          <Row label="Policy" value="Mainnet is disabled during development" />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Evidence storage" action={<Badge tone="neutral">local</Badge>} />
        <CardBody>
          <p className="text-sm leading-relaxed text-ink-500">
            Files are stored off-chain through a pluggable provider; only content
            references land on-chain. The provider can be swapped for IPFS,
            Arweave or S3 in phase 2 (see docs/storage.md).
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Contracts" subtitle="Placeholder testnet addresses — replaced at deploy time" />
        <CardBody className="space-y-2">
          {CONTRACTS.map((c) => (
            <div key={c.name} className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium text-ink-700">{c.name}</span>
              <span className="truncate font-mono text-xs text-ink-400">{c.address}</span>
            </div>
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Danger zone" />
        <CardBody className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink-400">Account actions arrive with wallet auth in phase 2.</p>
          <Button variant="danger" size="sm" disabled title="Arrives in phase 2">
            Disconnect demo
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-ink-400">{label}</span>
      <span className={mono ? "font-mono text-xs text-ink-700" : "font-medium text-ink-800"}>
        {value}
      </span>
    </div>
  );
}
