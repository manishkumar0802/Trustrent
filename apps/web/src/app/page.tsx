import Link from "next/link";
import type { ReactNode } from "react";
import { formatINR } from "@trustrent/shared";
import {
  IconCheck,
  IconChevronRight,
  IconKey,
  IconLock,
  IconMoveOut,
  IconScale,
  IconShield,
} from "@/components/icons";
import { ThemeToggle } from "@/components/theme-toggle";

const stats = [
  { label: "Deposit value", value: "₹30,000" },
  { label: "Escrow state", value: "Locked" },
  { label: "Release model", value: "Rule-based" },
];

const features = [
  {
    number: "01",
    title: "Create the lease",
    text: "Landlords define rent, deposit, and legal obligations in one shared agreement. Tenants join with their wallet securely.",
    icon: <IconKey className="size-5" />,
  },
  {
    number: "02",
    title: "Lock the deposit",
    text: "The deposit is moved into escrow and cannot be withdrawn unilaterally. The contract enforces the lock until release conditions are met.",
    icon: <IconLock className="size-5" />,
  },
  {
    number: "03",
    title: "Move out with evidence",
    text: "Evidence, deductions, and inspections are bundled into one transparent settlement flow so both sides can act from the same record.",
    icon: <IconMoveOut className="size-5" />,
  },
];

const contractCards = [
  {
    name: "rental_agreement",
    role: "orchestrator",
    text: "Owns the lifecycle from agreement creation to dispute resolution and final release. It guards valid state transitions before any escrow action fires.",
  },
  {
    name: "escrow",
    role: "custodian",
    text: "Locks the deposit and only releases it if the contract rules authorize that amount. It keeps the money safe, not in anyone’s personal control.",
  },
  {
    name: "dispute",
    role: "mediator",
    text: "Freezes funds when conflict begins and uses the registry to validate the arbitrator before releasing a final ruling or settlement.",
  },
  {
    name: "user_registry",
    role: "identity",
    text: "Maps wallet addresses to roles and reputation, reducing spoofing and ensuring parties are known before sensitive actions happen.",
  },
];

const steps = [
  "Create agreement",
  "Lock deposit",
  "Move-out request",
  "Evidence review",
  "Inspection",
  "Settlement",
  "Close",
];

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-background text-ink-900">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl border border-border bg-ivory-50 text-sm font-black tracking-tight text-ink-900 shadow-card">
              TR
            </div>
            <div>
              <div className="text-[15px] font-semibold tracking-tight text-ink-900">TrustRent</div>
            </div>
          </Link>

          <nav className="hidden items-center gap-7 text-sm text-ink-500 md:flex">
            <a href="#product" className="transition-colors hover:text-ink-900">
              Product
            </a>
            <a href="#flow" className="transition-colors hover:text-ink-900">
              Flow
            </a>
            <a href="#contracts" className="transition-colors hover:text-ink-900">
              Contracts
            </a>
          </nav>

          <div className="flex items-center gap-2.5">
            <ThemeToggle />
            <Link
              href="/dashboard"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-forest-700 px-4 text-sm font-medium text-ivory-50 shadow-card transition-colors hover:bg-forest-800"
            >
              Open app
              <IconChevronRight className="size-4" />
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section id="product" className="relative isolate overflow-hidden">
          <div className="landing-dot-grid absolute inset-0" aria-hidden />
          <div className="absolute inset-x-0 top-0 -z-10 h-80 bg-[radial-gradient(circle_at_top,_rgba(24,24,27,0.08),_transparent_68%)]" aria-hidden />

          <div className="relative mx-auto grid max-w-6xl gap-12 px-6 pb-16 pt-16 sm:pt-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:pb-20">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-700 shadow-card">
                <span className="size-2 rounded-full bg-forest-700" aria-hidden />
                Stellar escrow demo
              </span>

              <h1 className="mt-6 max-w-xl text-4xl font-semibold leading-[1.04] tracking-tight sm:text-5xl lg:text-6xl">
                Rental deposits that stay fair, visible, and locked until the rules are met.
              </h1>

              <p className="mt-6 max-w-xl text-base leading-8 text-ink-500 sm:text-lg">
                TrustRent gives tenants and landlords a shared source of truth for the rent deposit —
                with evidence-backed move-outs, automatic escrow logic, and dispute-safe settlement
                rules built right into the flow.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/dashboard"
                  className="inline-flex h-12 items-center gap-2 rounded-xl bg-forest-700 px-6 text-sm font-medium text-ivory-50 shadow-card transition-colors hover:bg-forest-800"
                >
                  Explore
                  <IconChevronRight className="size-4" />
                </Link>
                <a
                  href="#flow"
                  className="inline-flex h-12 items-center rounded-xl border border-border bg-surface px-6 text-sm font-medium text-ink-800 shadow-card transition-colors hover:bg-ivory-100"
                >
                  See the flow
                </a>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-6 text-xs text-ink-400">
                <span className="font-mono">stellar testnet</span>
                <span className="font-mono">on-chain escrow</span>
                <span className="font-mono">evidence-backed</span>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-4 rounded-[2rem] bg-forest-50 blur-2xl" aria-hidden />
              <div className="relative overflow-hidden rounded-[28px] border border-border bg-surface shadow-pop">
                <div className="flex items-center justify-between border-b border-border px-5 py-3">
                  <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-400">
                    escrow status
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-border bg-ivory-50 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-700">
                    <IconLock className="size-3" />
                    locked
                  </span>
                </div>

                <div className="p-5 sm:p-6">
                  <div className="rounded-2xl border border-border bg-ivory-50 p-5">
                    <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-400">
                      security deposit
                    </p>
                    <p className="mt-3 text-4xl font-semibold tracking-tight text-ink-900 sm:text-5xl">
                      {formatINR(30000)}
                    </p>
                    <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-sm text-ink-500">
                      <span>Agreement</span>
                      <span className="font-medium text-ink-800">AG-1042</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm text-ink-500">
                      <span>Contract</span>
                      <span className="font-medium text-ink-800">Escrow#1</span>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    {stats.map((metric) => (
                      <div key={metric.label} className="rounded-xl border border-border bg-ivory-50 p-3">
                        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-400">
                          {metric.label}
                        </p>
                        <p className="mt-2 text-sm font-semibold text-ink-900">{metric.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 rounded-xl border border-border p-4">
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-400">
                      latest event
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-4">
                      <p className="text-sm font-medium text-ink-800">Move-out evidence submitted</p>
                      <span className="inline-flex items-center rounded-full bg-forest-50 px-2 py-1 text-[10px] font-medium text-forest-800">
                        verified
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-border bg-ivory-50">
          <div className="mx-auto grid max-w-6xl gap-4 px-6 py-12 sm:grid-cols-3 sm:py-14">
            <MetricCard label="tenant confidence" value="100%" note="Rules before release" />
            <MetricCard label="landlord clarity" value="3-step" note="Create • lock • settle" />
            <MetricCard label="smart contract trust" value="4" note="core modules active" />
          </div>
        </section>

        <section id="flow" className="border-b border-border bg-background">
          <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
            <div className="max-w-2xl">
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-ink-300">How it works</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                A deposit lifecycle designed to reduce drama and increase trust.
              </h2>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {features.map((feature) => (
                <FeatureCard
                  key={feature.number}
                  number={feature.number}
                  title={feature.title}
                  text={feature.text}
                  icon={feature.icon}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-border bg-ivory-50">
          <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-ink-300">Lifecycle</p>
            <div className="mt-8 flex flex-wrap gap-3">
              {steps.map((step, index) => (
                <div key={step} className="flex items-center gap-3">
                  <span className="flex size-8 items-center justify-center rounded-full border border-border bg-surface font-mono text-[10px] font-medium text-ink-800 shadow-card">
                    {index + 1}
                  </span>
                  <span className="text-sm text-ink-600">{step}</span>
                  {index < steps.length - 1 ? <span className="h-px w-5 bg-ink-300" aria-hidden /> : null}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="contracts" className="bg-background">
          <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
            <div className="max-w-2xl">
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-ink-300">On-chain contracts</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                Built around a single trusted state machine.
              </h2>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-2">
              {contractCards.map((contract) => (
                <ContractCard
                  key={contract.name}
                  name={contract.name}
                  role={contract.role}
                  text={contract.text}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border bg-ink-900">
          <div className="mx-auto max-w-6xl px-6 py-16 text-center sm:py-24">
            <h2 className="mx-auto max-w-3xl text-3xl font-semibold tracking-tight text-ivory-50 sm:text-5xl">
              Lock the deposit. Prove the evidence. Release only what is fair.
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-ink-300">
              TrustRent brings clarity to a frustrating rental problem by turning agreement terms,
              evidence, and settlement into one transparent escrow process.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/dashboard"
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-ivory-50 px-6 text-sm font-medium text-ink-900 transition-colors hover:bg-surface"
              >
                Launch the app
                <IconChevronRight className="size-4" />
              </Link>
              <a
                href="#contracts"
                className="inline-flex h-12 items-center rounded-xl border border-ink-700 px-6 text-sm font-medium text-ink-300 transition-colors hover:border-ink-500 hover:text-ivory-50"
              >
                Review the contracts
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-ink-800 bg-ink-900">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-6 text-xs text-ink-400">
          <span className="font-mono">TrustRent · rental escrow demo</span>
          <span className="font-mono">stellar testnet</span>
        </div>
      </footer>
    </div>
  );
}

function MetricCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-card">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-ink-900">{value}</p>
      <p className="mt-2 text-sm text-ink-500">{note}</p>
    </div>
  );
}

function FeatureCard({
  number,
  title,
  text,
  icon,
}: {
  number: string;
  title: string;
  text: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-card">
      <div className="flex items-center justify-between">
        <span className="flex size-10 items-center justify-center rounded-xl border border-border bg-ivory-50 text-ink-800">
          {icon}
        </span>
        <span className="font-mono text-xs text-ink-300">{number}</span>
      </div>
      <h3 className="mt-5 text-lg font-semibold text-ink-900">{title}</h3>
      <p className="mt-2 text-sm leading-7 text-ink-500">{text}</p>
    </div>
  );
}

function ContractCard({ name, role, text }: { name: string; role: string; text: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-sm font-semibold text-ink-900">{name}</span>
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-400">{role}</span>
      </div>
      <p className="mt-4 text-sm leading-7 text-ink-500">{text}</p>
    </div>
  );
}
