import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { IconChevronRight, IconLock, IconShield } from "@/components/icons";
import { formatINR } from "@trustrent/shared";

export default function LandingPage() {
  return (
    <main className="min-h-dvh bg-ivory-50">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <span className="text-lg font-semibold tracking-tight text-ink-900">TrustRent</span>
        <Link href="/dashboard" className="text-sm font-medium text-forest-700 hover:text-forest-800">
          Enter the app
        </Link>
      </header>
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 sm:py-24 lg:grid-cols-2">
        <div>
          <Badge tone="forest" className="mb-5">
            <IconShield className="size-3" /> Escrowed on Stellar Soroban
          </Badge>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-ink-900 sm:text-6xl">
            Your deposit. Locked fairly. Released transparently.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-500 sm:text-lg">
            TrustRent makes rental deposits visible, evidence-backed, and contract-controlled.
          </p>
          <Link href="/dashboard" className="mt-8 inline-block">
            <Button size="lg">View demo dashboard <IconChevronRight className="size-4" /></Button>
          </Link>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-7 shadow-pop">
          <div className="flex items-center justify-between text-sm text-ink-400">
            <span>Security deposit</span>
            <IconLock className="size-5 text-forest-700" />
          </div>
          <p className="mt-4 text-5xl font-semibold tracking-tight text-ink-900">{formatINR(30000)}</p>
          <p className="mt-2 text-sm text-forest-700">Locked in escrow · Stellar Testnet</p>
        </div>
      </section>
    </main>
  );
}
