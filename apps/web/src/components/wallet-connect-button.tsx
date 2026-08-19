"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/hooks";
import { cn } from "@/lib/utils";

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
 */
export function WalletConnectButton({
  className,
  showStatusHint = true,
  errorAsDropdown = false,
}: WalletConnectButtonProps) {
  const wallet = useWallet();
  const [showError, setShowError] = useState(false);

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

  const title =
    wallet.error ||
    (wallet.isConnected
      ? "Disconnect wallet"
      : !wallet.freighterChecked
        ? "Checking for the Freighter extension…"
        : detected
          ? "Freighter detected — connect your wallet"
          : "Freighter extension not detected — see the Wallet Debug panel");

  return (
    <div className={cn(errorAsDropdown && "relative", className)}>
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
              : "Freighter not detected"}
        </p>
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
