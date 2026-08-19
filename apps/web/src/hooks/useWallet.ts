"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getPublicKey, isAllowed, requestAccess } from "@stellar/freighter-api";
import { buildNotDetectedMessage, isEmbedded, probeFreighter } from "@/lib/freighter";

export interface WalletState {
  isConnected: boolean;
  address: string | null;
  isLoading: boolean;
  error: string | null;
  /** true when the Freighter content script is reachable (extension present). */
  freighterDetected: boolean;
  /** true after the first detection probe has completed. */
  freighterChecked: boolean;
}

/**
 * Hook to manage Freighter wallet connection.
 *
 * Detection goes through the official @stellar/freighter-api where possible.
 * The critical signal is whether the extension's content script ANSWERS our
 * probe: it only does so when the extension is installed AND has permission
 * for this site. Once present we call requestAccess(), which also covers the
 * "installed but locked" case — the popup will ask the user to unlock.
 */
export function useWallet() {
  const [state, setState] = useState<WalletState>({
    isConnected: false,
    address: null,
    isLoading: false,
    error: null,
    freighterDetected: false,
    freighterChecked: false,
  });

  const checkingRef = useRef(false);

  const isTestMode = useCallback(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("wallet") === "test";
  }, []);

  const sleep = useCallback((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)), []);

  // Wait until the extension's content script answers a probe. A response
  // means the extension is installed AND has permission for this site.
  const waitForFreighter = useCallback(
    async (retries = 5, intervalMs = 300) => {
      if (typeof window === "undefined") return false;

      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          const probe = await probeFreighter(1600);
          if (probe.contentScriptResponded) {
            console.log(
              `✓ [Freighter] Content script answered (attempt ${attempt}/${retries})`,
              probe
            );
            return true;
          }
          console.warn(`[Freighter] No response (attempt ${attempt}/${retries})`);
        } catch (err) {
          console.warn("[Freighter] probe failed:", err);
        }
        if (attempt < retries) await sleep(intervalMs);
      }
      return false;
    },
    [sleep]
  );

  // Auto-connect when the extension is present and already authorized.
  const autoConnectIfAuthorized = useCallback(async () => {
    if (checkingRef.current) return;
    checkingRef.current = true;
    try {
      if (isTestMode()) {
        setState((prev) => ({ ...prev, freighterDetected: true, freighterChecked: true }));
        return;
      }

      const present = await waitForFreighter(3, 300);
      setState((prev) => ({ ...prev, freighterDetected: present, freighterChecked: true }));
      if (!present) return;

      try {
        const allowed = await isAllowed();
        if (allowed) {
          const publicKey = await getPublicKey();
          if (publicKey) {
        setState({
          isConnected: true,
          address: publicKey,
          isLoading: false,
          error: null,
          freighterDetected: true,
          freighterChecked: true,
        });
        console.log("✓ [Freighter] Wallet auto-connected:", publicKey);
          }
        }
      } catch {
        console.log("[Freighter] Not yet authorized — user will approve on connect");
      }
    } finally {
      checkingRef.current = false;
    }
  }, [isTestMode, waitForFreighter]);

  // Initial detection. NOTE: no persistent ref guard here — React StrictMode
  // runs effect → cleanup → effect in dev, and a ref that survives the cleanup
  // would cancel the only check (that bug silently disabled auto-detection).
  // The timer + cancelled flag is StrictMode-safe.
  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (!cancelled) void autoConnectIfAuthorized();
    }, 800);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [autoConnectIfAuthorized]);

  // Re-detect whenever the tab becomes visible again — the user just granted
  // site access (extension icon / chrome://extensions) or installed Freighter.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void autoConnectIfAuthorized();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [autoConnectIfAuthorized]);

  const connect = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // Test mode: simulate wallet connection
      if (isTestMode()) {
        console.log("[Freighter] Test mode - simulating connection");
        await sleep(800);
        const testAddress = "GDCI3JBNF3QKQB5S45G34CJHKJ4N3K2L4JSRMK5SXZK3M2L4JSRMK5SXZ";
        setState({
          isConnected: true,
          address: testAddress,
          isLoading: false,
          error: null,
          freighterDetected: true,
          freighterChecked: true,
        });
        console.log("✓ [Test Mode] Wallet connected:", testAddress);
        return testAddress;
      }

      if (isEmbedded()) {
        throw new Error(buildNotDetectedMessage());
      }

      console.log("[Freighter] Waiting for the extension's content script...");
      const present = await waitForFreighter(6, 300);
      setState((prev) => ({ ...prev, freighterDetected: present, freighterChecked: true }));
      if (!present) {
        throw new Error(buildNotDetectedMessage());
      }

      console.log("[Freighter] Content script present, requesting access...");
      // requestAccess() shows the Freighter popup and returns the public key.
      const publicKey = await requestAccess();

      if (!publicKey) {
        throw new Error("Failed to retrieve wallet address");
      }

      setState({
        isConnected: true,
        address: publicKey,
        isLoading: false,
        error: null,
        freighterDetected: true,
        freighterChecked: true,
      });

      console.log("✓ [Freighter] Wallet connected:", publicKey);
      return publicKey;
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : typeof err === "string" && err
            ? err
            : "Failed to connect wallet. Please try again.";
      // Keep freighterDetected as-is: the extension may be present but the
      // user rejected the popup, which is a different problem than "not found".
      setState((prev) => ({
        ...prev,
        isConnected: false,
        address: null,
        isLoading: false,
        error: errorMessage,
        freighterChecked: true,
      }));
      console.error("❌ [Freighter] Connection error:", err);
      throw err;
    }
  }, [isTestMode, sleep, waitForFreighter]);

  const disconnect = useCallback(() => {
    setState({
      isConnected: false,
      address: null,
      isLoading: false,
      error: null,
      freighterDetected: false,
      freighterChecked: true,
    });
  }, []);

  return {
    ...state,
    connect,
    disconnect,
  };
}
