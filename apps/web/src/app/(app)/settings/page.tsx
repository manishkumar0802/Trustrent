"use client";

import { useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRole } from "@/components/role-provider";
import { useWallet } from "@/hooks";
import { ReputationBadge } from "@/components/ui/reputation-badge";
import { MOCK_AGREEMENTS, MOCK_USERS } from "@/data/mock-data";
import { formatINR, shortAddress } from "@trustrent/shared";

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
  const wallet = useWallet();
  const [disconnected, setDisconnected] = useState(false);
  const [notifications, setNotifications] = useState({
    depositLocked: true,
    moveOutRequested: true,
    evidenceSubmitted: true,
    disputeOpened: true,
    settlementReady: true,
  });

  const agreement = MOCK_AGREEMENTS[0];
  const activeParty = role === "landlord" ? agreement.landlord : agreement.tenant;
  const userRecord = MOCK_USERS.find((u) => u.address === activeParty.address);
  const reputation = userRecord?.reputation ?? 50;

  function handleDisconnect() {
    setRole("tenant");
    window.localStorage.removeItem("trustrent.role");
    window.localStorage.removeItem("trustrent.theme");
    setDisconnected(true);
  }

  function toggleNotification(key: keyof typeof notifications) {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const displayAddress =
    wallet.address && wallet.isConnected
      ? `${wallet.address.slice(0, 8)}...${wallet.address.slice(-6)}`
      : null;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          Settings
        </h1>
        <p className="mt-1 text-sm text-ink-400">
          Profile, network, storage and preferences.
        </p>
      </header>

      {/* ── User Profile ── */}
      <Card>
        <CardHeader
          title="Profile"
          subtitle="Your demo identity and reputation"
        />
        <CardBody className="space-y-4">
          <div className="flex items-center gap-4">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-forest-100 text-lg font-semibold text-forest-700">
              {activeParty.name.charAt(0)}
            </span>
            <div className="min-w-0">
              <p className="text-base font-semibold text-ink-900">
                {activeParty.name}
              </p>
              <p className="text-sm text-ink-400">
                {role === "landlord" ? "Landlord" : "Tenant"}
              </p>
            </div>
            <div className="ml-auto">
              <ReputationBadge score={reputation} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-ivory-50/60 p-3">
              <p className="text-xs text-ink-400">Wallet address</p>
              <p className="mt-1 truncate font-mono text-sm text-ink-800">
                {displayAddress || activeParty.address}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-ivory-50/60 p-3">
              <p className="text-xs text-ink-400">Active agreement</p>
              <p className="mt-1 text-sm font-medium text-ink-800">
                {agreement.id} · {agreement.property.locality}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-ivory-50/60 p-3">
              <p className="text-xs text-ink-400">Deposit</p>
              <p className="mt-1 text-sm font-medium text-ink-800">
                {formatINR(agreement.deposit.value)} · {agreement.depositStatus}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-ivory-50/60 p-3">
              <p className="text-xs text-ink-400">Reputation score</p>
              <p className="mt-1 text-sm font-medium text-ink-800">
                {reputation}/100 ·{" "}
                {reputation >= 70
                  ? "Trusted"
                  : reputation >= 45
                    ? "Steady"
                    : "Building"}
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* ── Wallet ── */}
      <Card>
        <CardHeader
          title="Wallet"
          action={
            wallet.isConnected ? (
              <Badge tone="forest">Connected</Badge>
            ) : (
              <Badge tone="neutral">Not connected</Badge>
            )
          }
        />
        <CardBody className="space-y-3">
          <Row
            label="Extension"
            value={
              wallet.freighterChecked
                ? wallet.freighterDetected
                  ? "Freighter detected"
                  : "Not detected"
                : "Checking..."
            }
          />
          <Row
            label="Status"
            value={
              wallet.isConnected
                ? `Connected · ${shortAddress(wallet.address ?? "")}`
                : "Disconnected"
            }
            mono
          />
          <Row
            label="Network"
            value={process.env.NEXT_PUBLIC_SOROBAN_NETWORK ?? "testnet"}
          />
        </CardBody>
      </Card>

      {/* ── Notification Preferences ── */}
      <Card>
        <CardHeader
          title="Notifications"
          subtitle="Control which events trigger alerts"
        />
        <CardBody className="space-y-1">
          {(
            [
              ["depositLocked", "Deposit locked in escrow"],
              ["moveOutRequested", "Move-out request initiated"],
              ["evidenceSubmitted", "Evidence submitted by either party"],
              ["disputeOpened", "New dispute filed"],
              ["settlementReady", "Settlement ready for review"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => toggleNotification(key)}
              className="flex w-full items-center justify-between gap-4 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-ivory-50"
            >
              <span className="text-ink-700">{label}</span>
              <span
                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                  notifications[key] ? "bg-forest-600" : "bg-ink-200"
                }`}
              >
                <span
                  className={`inline-block size-3.5 rounded-full bg-white shadow-sm transition-transform ${
                    notifications[key] ? "translate-x-4.5" : "translate-x-0.5"
                  }`}
                />
              </span>
            </button>
          ))}
        </CardBody>
      </Card>

      {/* ── Stellar Network ── */}
      <Card>
        <CardHeader
          title="Stellar network"
          action={
            <Badge tone="sage">
              {process.env.NEXT_PUBLIC_SOROBAN_NETWORK ?? "testnet"}
            </Badge>
          }
        />
        <CardBody className="space-y-1.5 text-sm">
          <Row
            label="Network"
            value={
              process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE ??
              "Test SDF Network ; September 2015"
            }
          />
          <Row
            label="RPC"
            value={
              process.env.NEXT_PUBLIC_SOROBAN_RPC_URL ??
              "https://soroban-testnet.stellar.org"
            }
            mono
          />
          <Row label="Policy" value="Mainnet is disabled during development" />
        </CardBody>
      </Card>

      {/* ── Evidence Storage ── */}
      <Card>
        <CardHeader
          title="Evidence storage"
          action={<Badge tone="neutral">local</Badge>}
        />
        <CardBody>
          <p className="text-sm leading-relaxed text-ink-500">
            Files are stored off-chain through a pluggable provider; only
            content references land on-chain. The provider can be swapped for
            IPFS, Arweave or S3.
          </p>
        </CardBody>
      </Card>

      {/* ── Contracts ── */}
      <Card>
        <CardHeader
          title="Contracts"
          subtitle="Addresses from the environment config"
        />
        <CardBody className="space-y-2">
          {CONTRACTS.map((c) => (
            <div
              key={c.name}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <span className="font-medium text-ink-700">{c.name}</span>
              <span className="truncate font-mono text-xs text-ink-400">
                {c.address}
              </span>
            </div>
          ))}
        </CardBody>
      </Card>

      {/* ── Current Session ── */}
      <Card>
        <CardHeader title="Current session" />
        <CardBody className="space-y-1.5 text-sm">
          <Row
            label="Active role"
            value={role === "landlord" ? "Landlord" : "Tenant"}
          />
          <Row
            label="Theme"
            value={
              typeof window !== "undefined" &&
              window.localStorage.getItem("trustrent.theme") === "dark"
                ? "Dark"
                : "Light"
            }
          />
        </CardBody>
      </Card>

      {/* ── Danger Zone ── */}
      <Card>
        <CardHeader title="Danger zone" />
        <CardBody className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink-400">
            {disconnected
              ? "Session cleared. Refresh the page to start fresh."
              : "This will reset the demo session: role, theme, and local state."}
          </p>
          <Button
            variant="danger"
            size="sm"
            onClick={handleDisconnect}
            disabled={disconnected}
          >
            {disconnected ? "Disconnected" : "Disconnect demo"}
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}

function Row({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-ink-400">{label}</span>
      <span
        className={
          mono ? "font-mono text-xs text-ink-700" : "font-medium text-ink-800"
        }
      >
        {value}
      </span>
    </div>
  );
}
