"use client";

import { useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRole } from "@/components/role-provider";

const CONTRACTS = [
  {
    name: "rental_agreement",
    address: process.env.NEXT_PUBLIC_AGREEMENT_CONTRACT_ID ?? "Not configured",
  },
  {
    name: "escrow",
    address: process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ID ?? "Not configured",
  },
  {
    name: "dispute",
    address: process.env.NEXT_PUBLIC_DISPUTE_CONTRACT_ID ?? "Not configured",
  },
];

export default function SettingsPage() {
  const { role, setRole } = useRole();
  const [disconnected, setDisconnected] = useState(false);

  function handleDisconnect() {
    // Clear role back to tenant
    setRole("tenant");
    // Clear persisted role
    window.localStorage.removeItem("trustrent.role");
    // Clear theme
    window.localStorage.removeItem("trustrent.theme");
    setDisconnected(true);
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Settings</h1>
        <p className="mt-1 text-sm text-ink-400">
          Network, storage and contract configuration.
        </p>
      </header>

      <Card>
        <CardHeader
          title="Stellar network"
          action={<Badge tone="sage">{process.env.NEXT_PUBLIC_SOROBAN_NETWORK ?? "testnet"}</Badge>}
        />
        <CardBody className="space-y-1.5 text-sm">
          <Row
            label="Network"
            value={process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE ?? "Test SDF Network ; September 2015"}
          />
          <Row label="RPC" value={process.env.NEXT_PUBLIC_SOROBAN_RPC_URL ?? "https://soroban-testnet.stellar.org"} mono />
          <Row label="Policy" value="Mainnet is disabled during development" />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Evidence storage" action={<Badge tone="neutral">local</Badge>} />
        <CardBody>
          <p className="text-sm leading-relaxed text-ink-500">
            Files are stored off-chain through a pluggable provider; only content references land
            on-chain. The provider can be swapped for IPFS, Arweave or S3.
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Contracts" subtitle="Addresses from the environment config" />
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
        <CardHeader title="Current session" />
        <CardBody className="space-y-1.5 text-sm">
          <Row label="Active role" value={role === "landlord" ? "Landlord" : "Tenant"} />
          <Row label="Theme" value={typeof window !== "undefined" && window.localStorage.getItem("trustrent.theme") === "dark" ? "Dark" : "Light"} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Danger zone" />
        <CardBody className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink-400">
            {disconnected
              ? "Session cleared. Refresh the page to start fresh."
              : "This will reset the demo session: role, theme, and local state."}
          </p>
          <Button variant="danger" size="sm" onClick={handleDisconnect} disabled={disconnected}>
            {disconnected ? "Disconnected" : "Disconnect demo"}
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
