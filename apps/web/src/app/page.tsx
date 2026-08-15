import Link from "next/link";
import type { ReactNode } from "react";
import { formatINR } from "@trustrent/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { IconCheck, IconLock, IconShield, IconScale, IconChevronRight } from "@/components/icons";

export default function LandingPage() {
  return (
    <div className="min-h-dvh">
      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-forest-700 text-ivory-50">
            <span className="text-sm font-bold tracking-tight">T</span>
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-ink-900">TrustRent</span>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 rounded-lg bg-forest-700 px-4 py-2 text-sm font-medium text-ivory-50 shadow-card transition-colors hover:bg-forest-800"
        >
          Enter the app <IconChevronRight className="size-4" />
        </Link>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-20 pt-12 sm:pt-20">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <Badge tone="forest" className="mb-5">
              <IconShield className="size-3" /> Escrowed on Stellar Soroban
            </Badge>
            <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight text-ink-900 sm:text-5xl lg:text-6xl">
              Your deposit. Locked fairly. Released transparently.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-500 sm:text-lg">
              TrustRent holds rental security deposits in a smart-contract escrow. Tenants know
              their money is safe; landlords get an evidence-backed move-out process. No more
              he-said, she-said over a deposit.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/dashboard">
                <Button size="lg">View demo dashboard</Button>
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex h-12 items-center px-2 text-sm font-medium text-ink-700 hover:text-ink-900"
              >
                How it works
              </a>
            </div>
            <p className="mt-6 text-xs text-ink-300">
              Development preview on the Stellar <span className="text-ink-500">Testnet</span> ·
              mainnet disabled.
            </p>
          </div>

          {/* Deposit visual */}
          <div className="relative mx-auto w-full max-w-md">
            <div className="absolute -inset-6 rounded-[2rem] bg-forest-100/60" aria-hidden />
            <div className="relative rounded-2xl border border-border bg-surface p-7 shadow-pop">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">
                  Security deposit
                </span>
                <Badge tone="forest">
                  <IconLock className="size-3" /> LOCKED IN ESCROW
                </Badge>
              </div>
              <p className="mt-4 text-5xl font-semibold tracking-tight text-ink-900">
                {formatINR(30000)}
              </p>
              <p className="mt-2 text-sm text-ink-400">1BHK · Indiranagar, Bengaluru</p>

              <div className="mt-6 space-y-2.5 border-t border-border pt-5 text-sm">
                <HeroLine ok label="Agreement active" />
                <HeroLine ok label="Rent paid on time" />
                <HeroLine ok label="Deposit contract-protected" />
                <HeroLine pending label="Move-out process ready when you are" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Lifecycle strip */}
      <section className="border-y border-border bg-ivory-50/70">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">
            One state machine, end to end
          </p>
          <ol className="mt-6 flex flex-wrap items-center justify-center gap-x-2 gap-y-3 text-xs text-ink-500">
            {[
              "Created",
              "Active",
              "Move-out requested",
              "Evidence submitted",
              "Inspection pending",
              "Approved",
              "Disputed",
              "Settlement",
              "Closed",
            ].map((step, i) => (
              <li key={step} className="flex items-center gap-2">
                <span className="flex size-5 items-center justify-center rounded-full bg-surface text-[10px] font-semibold text-forest-700 ring-1 ring-border">
                  {i + 1}
                </span>
                {step}
                {i < 8 ? <span className="ml-2 h-px w-4 bg-border" aria-hidden /> : null}
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
        <h2 className="text-center text-2xl font-semibold tracking-tight text-ink-900 sm:text-3xl">
          How TrustRent works
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          <HowCard
            n="1"
            title="Create & join"
            text="The landlord creates a rental agreement with rent and deposit terms. The tenant joins it with their Stellar account."
          />
          <HowCard
            n="2"
            title="Deposit locked in escrow"
            text="The tenant funds the deposit into the escrow contract. Neither side can touch it — only the contract's rules can release it."
          />
          <HowCard
            n="3"
            title="Move out & settle"
            text="Evidence-backed move-out: final dues, room condition. Clean move-out refunds in full; agreed deductions split the deposit; disputes keep it locked until resolved."
          />
        </div>
      </section>

      {/* Why */}
      <section className="border-t border-border bg-surface">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <div className="grid gap-8 sm:grid-cols-3">
            <WhyBlock
              icon={<IconShield className="size-5" />}
              title="Fair by default"
              text="A neutral smart contract, not one party's word, controls the money."
            />
            <WhyBlock
              icon={<IconCheck className="size-5" />}
              title="Transparent by design"
              text="Every event — lock, move-out, evidence, release — is on-chain and visible."
            />
            <WhyBlock
              icon={<IconScale className="size-5" />}
              title="Dispute-ready"
              text="If sides disagree, the deposit stays locked while evidence is reviewed."
            />
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-6 text-xs text-ink-300">
          <span>TrustRent · Phase 1 scaffold — demo UI, contracts are placeholders.</span>
          <span>Stellar Testnet</span>
        </div>
      </footer>
    </div>
  );
}

function HeroLine({
  ok = false,
  pending = false,
  label,
}: {
  ok?: boolean;
  pending?: boolean;
  label: string;
}) {
  return (
    <p className="flex items-center gap-2.5">
      {ok ? (
        <span className="flex size-5 items-center justify-center rounded-full bg-forest-100 text-forest-700">
          <IconCheck className="size-3" />
        </span>
      ) : (
        <span className="size-5 rounded-full border-2 border-amber-500/70" aria-hidden />
      )}
      <span className={pending ? "text-amber-600" : "text-ink-700"}>{label}</span>
    </p>
  );
}

function HowCard({ n, title, text }: { n: string; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-border bg-ivory-50/60 p-6">
      <span className="flex size-7 items-center justify-center rounded-full bg-forest-700 text-xs font-semibold text-ivory-50">
        {n}
      </span>
      <h3 className="mt-4 text-base font-semibold text-ink-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-500">{text}</p>
    </div>
  );
}

function WhyBlock({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div>
      <span className="flex size-10 items-center justify-center rounded-xl bg-forest-100 text-forest-700">
        {icon}
      </span>
      <h3 className="mt-4 text-base font-semibold text-ink-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-500">{text}</p>
    </div>
  );
}
