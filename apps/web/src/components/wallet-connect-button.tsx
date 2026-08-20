"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/hooks";
import { cn } from "@/lib/utils";
import { isEmbedded } from "@/lib/freighter";

interface WalletConnectButtonProps {
  className?: string;
  /** Show the small detection hint under the button (default true). */
  showStatusHint?: boolean;
  /** Render the error banner as an absolutely-positioned dropdown (topbar style). */
  errorAsDropdown?: boolean;
}

/**
 * Connect/disconnect button for the Freighter wallet.
 *
 * Surfaces the actual detection state so users aren't left guessing:
 *  - probe still running      → "Checking for Freighter…"
 *  - extension not reachable  → amber dot + "not detected" hint
 *  - extension reachable      → green dot + "detected" hint
 *  - connected                → truncated address, click to disconnect
 *
 * When Freighter is not detected (especially in embedded iframes), a "Try Demo"
 * button is shown so users can still explore the UI.
 */
export function WalletConnectButton({
  className,
  showStatusHint = true,
  errorAsDropdown = false,
}: WalletConnectButtonProps) {
  const wallet = useWallet();
  const router = useRouter();
  const [showError, setShowError] = useState(false);

  const embedded = isEmbedded();

  const handleClick = async () => {
    try {
      setShowError(false);
      if (wallet.isConnected) {
        wallet.disconnect();
      } else {
        await wallet.connect();
      }
    } catch (err) {
      setShowError(true);
      console.error("Wallet error:", err);
    }
  };

  const handleDemoMode = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("wallet", "test");
    router.push(url.pathname + url.search);
    window.location.reload();
  };

  const displayAddress =
    wallet.address && wallet.isConnected
      ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`
      : null;

  const displayError =
    showError && wallet.error
      ? wallet.error
          .split("\n")
          .filter((line) => line.trim())
          .join("\n")
      : null;

  const detected = wallet.freighterDetected;
  const notDetected = wallet.freighterChecked && !detected && !wallet.isConnected;

  const title =
    wallet.error ||
    (wallet.isConnected
      ? "Disconnect wallet"
      : !wallet.freighterChecked
        ? "Checking for the Freighter extension…"
        : detected
          ? "Freighter detected — connect your wallet"
          : "Freighter extension not detected — try Demo Mode");

  return (
    <div className={cn("flex flex-wrap items-center gap-2", errorAsDropdown && "relative", className)}>
      <div className="flex flex-col items-end">
        <Button
          variant={wallet.isConnected ? "primary" : "secondary"}
          size="sm"
          type="button"
          onClick={handleClick}
          disabled={wallet.isLoading}
          title={title}
        >
          {wallet.isLoading ? (
            "Connecting..."
          ) : (
            <>
              {!wallet.isConnected && (
                <span
                  aria-hidden
                  className={cn(
                    "inline-block size-1.5 shrink-0 rounded-full",
                    !wallet.freighterChecked
                      ? "bg-ink-300"
                      : detected
                        ? "bg-emerald-500"
                        : "bg-amber-500",
                  )}
                />
              )}
              {displayAddress || "Connect wallet"}
            </>
          )}
        </Button>

        {showStatusHint && !wallet.isConnected && !wallet.isLoading && (
          <p
            className={cn(
              "mt-1 max-w-52 text-right text-[11px] leading-tight",
              !wallet.freighterChecked
                ? "text-ink-400"
                : detected
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-amber-600 dark:text-amber-400",
            )}
          >
            {!wallet.freighterChecked
              ? "Checking for Freighter…"
              : detected
                ? "Freighter detected"
                : embedded
                  ? "Extension blocked in embedded view"
                  : "Freighter not detected"}
          </p>
        )}
      </div>

      {/* Demo Mode button — shown when Freighter is not detected */}
      {notDetected && (
        <div className="flex flex-col items-start gap-1">
          <Button
            variant="secondary"
            size="sm"
            type="button"
            onClick={handleDemoMode}
            title="Try the app with a simulated wallet (no extension needed)"
          >
            <span className="inline-block size-1.5 shrink-0 rounded-full bg-violet-500" />
            Try Demo
          </Button>
          {embedded && (
            <p className="max-w-52 text-left text-[11px] leading-tight text-ink-400">
              Open in a{" "}
              <a
                href={typeof window !== "undefined" ? window.location.href : "/"}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-ink-600"
              >
                new tab
              </a>{" "}
              for real wallet
            </p>
          )}
        </div>
      )}

      {displayError && (
        <div
          className={cn(
            errorAsDropdown
              ? "absolute top-full right-0 z-50 mt-1.5 w-72"
              : "mt-2 w-full",
          )}
        >
          <div className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2.5 text-xs whitespace-pre-wrap text-danger-800 shadow-card">
            {displayError}
            <button
              onClick={() => setShowError(false)}
              className="mt-1.5 block text-xs underline opacity-75 hover:opacity-100"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
