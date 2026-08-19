"use client";

import { useCallback, useEffect, useState } from "react";
import { isEmbedded, probeFreighter, type FreighterProbe } from "@/lib/freighter";

interface DebugState {
  probe: FreighterProbe;
  embedded: boolean;
  timestamp: string;
}

export function WalletDebug() {
  const [debug, setDebug] = useState<DebugState | null>(null);
  const [checking, setChecking] = useState(false);

  const runCheck = useCallback(async () => {
    setChecking(true);
    try {
      const probe = await probeFreighter(2500);
      setDebug({
        probe,
        embedded: isEmbedded(),
        timestamp: new Date().toLocaleTimeString(),
      });
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const probe = await probeFreighter(2500);
      if (!cancelled) {
        setDebug({
          probe,
          embedded: isEmbedded(),
          timestamp: new Date().toLocaleTimeString(),
        });
      }
    };

    void run();
    const timer1 = window.setTimeout(() => void run(), 800);
    const timer2 = window.setTimeout(() => void run(), 3000);

    // Re-check when the user returns after granting site access.
    const onVisible = () => {
      if (document.visibilityState === "visible") void run();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      cancelled = true;
      window.clearTimeout(timer1);
      window.clearTimeout(timer2);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, []);

  if (!debug) return null;

  const { probe, embedded, timestamp } = debug;
  const present = probe.contentScriptResponded;

  return (
    <div className="fixed right-4 bottom-4 z-50 max-h-96 max-w-md overflow-y-auto rounded-lg border border-slate-700 bg-slate-900 p-4 font-mono text-xs text-slate-200 shadow-lg">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="font-bold text-slate-100">🔍 Wallet Debug</span>
        <button
          onClick={() => void runCheck()}
          disabled={checking}
          className="rounded border border-slate-600 px-2 py-0.5 text-[10px] text-slate-300 hover:bg-slate-800 disabled:opacity-50"
        >
          {checking ? "Checking..." : "Re-check"}
        </button>
      </div>

      <div className="space-y-1">
        <div>
          Extension reachable (content script):{" "}
          <span className={present ? "text-green-400" : "text-red-400"}>
            {present ? "✓ YES" : "✗ NO"}
          </span>
        </div>
        <div>
          Freighter connected:{" "}
          <span className={probe.connected ? "text-green-400" : "text-amber-400"}>
            {probe.connected ? "✓ YES" : "✗ NO"}
          </span>
        </div>
        {probe.windowFreighter !== undefined && (
          <div>
            window.freighter: <span className="text-slate-300">{String(probe.windowFreighter)}</span>
          </div>
        )}
        <div className="text-slate-400">
          Probe:{" "}
          {present ? `${probe.elapsedMs}ms round-trip` : `no response in ${probe.elapsedMs}ms`}
        </div>
        <div className="text-slate-400">Last checked: {timestamp}</div>
      </div>

      {embedded && (
        <div className="mt-2 rounded border border-amber-600/40 bg-amber-950/40 p-2 text-amber-300">
          ⚠ Embedded frame detected — browser extensions are blocked inside
          iframes. Open the app in its own browser tab and connect from there.
        </div>
      )}

      {!present && !embedded && (
        <div className="mt-3 text-slate-300">
          <strong>Troubleshooting:</strong>
          <div className="mt-1 space-y-1">
            <div>
              1. Is Freighter installed?{" "}
              <a
                href="https://freighter.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                freighter.app
              </a>
            </div>
            <div>
              2. Grant site access: click the Freighter icon in the toolbar, or
              chrome://extensions → Freighter → Details → Site access → &quot;On
              all sites&quot;
            </div>
            <div>3. Unlock Freighter (create/import an account)</div>
            <div>4. Restart the browser if the icon never appears</div>
          </div>
        </div>
      )}
    </div>
  );
}
