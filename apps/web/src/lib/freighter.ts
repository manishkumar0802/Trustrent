/**
 * Low-level Freighter extension detection.
 *
 * `@stellar/freighter-api` v2 detects the extension two ways:
 *   1. the legacy `window.freighter` global (older extensions), or
 *   2. a postMessage probe: the page posts `FREIGHTER_EXTERNAL_MSG_REQUEST`
 *      and the extension's content script answers with
 *      `FREIGHTER_EXTERNAL_MSG_RESPONSE`.
 *
 * The postMessage probe only gets answered when the content script is actually
 * injected into the page, which requires the extension to be installed AND to
 * have permission for this site. Chrome's Manifest V3 extensions default to
 * "on click" site access, so `localhost` is NOT probed until the user clicks
 * the Freighter icon once or sets Site access to "On all sites".
 *
 * `probeFreighter` distinguishes those failure modes so the UI can tell the
 * user what to actually fix: "extension not installed" vs "grant site access".
 */
export const FREIGHTER_REQUEST_SOURCE = "FREIGHTER_EXTERNAL_MSG_REQUEST";
export const FREIGHTER_RESPONSE_SOURCE = "FREIGHTER_EXTERNAL_MSG_RESPONSE";
export const FREIGHTER_CONNECTION_STATUS = "REQUEST_CONNECTION_STATUS";

export interface FreighterProbe {
  /** Value of the legacy window.freighter global, when present. */
  windowFreighter: unknown;
  /** true if the extension's content script answered the probe. */
  contentScriptResponded: boolean;
  /** isConnected flag reported by the extension. */
  connected: boolean;
  /** Probe round-trip duration in ms. */
  elapsedMs: number;
}

export const NO_PROBE: FreighterProbe = {
  windowFreighter: undefined,
  contentScriptResponded: false,
  connected: false,
  elapsedMs: 0,
};

/**
 * True when this page runs inside an embedded frame. Browser extensions do not
 * inject content scripts into cross-origin iframes, so Freighter can never be
 * detected there — the app must be opened in its own tab.
 */
export function isEmbedded(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.self !== window.top;
  } catch {
    // Cross-origin frame: window.top access throws — still embedded.
    return true;
  }
}

/**
 * Probe whether the Freighter content script is reachable. Resolves as soon as
 * the extension answers, or after `timeoutMs` with contentScriptResponded false.
 */
export function probeFreighter(timeoutMs = 2000): Promise<FreighterProbe> {
  if (typeof window === "undefined") return Promise.resolve(NO_PROBE);

  const windowFreighter = (window as unknown as { freighter?: unknown }).freighter;
  if (windowFreighter) {
    return Promise.resolve({
      windowFreighter,
      contentScriptResponded: true,
      connected: true,
      elapsedMs: 0,
    });
  }

  const start = Date.now();
  return new Promise((resolve) => {
    const messageId = Date.now() + Math.random();
    let settled = false;

    const settle = (probe: FreighterProbe) => {
      if (settled) return;
      settled = true;
      window.removeEventListener("message", onMessage);
      window.clearTimeout(timer);
      resolve(probe);
    };

    const onMessage = (event: MessageEvent) => {
      // Browsers report `window` for same-window postMessage; jsdom reports
      // `null`. Accept both — the unique messageId is the real spoof guard.
      if (event.source !== window && event.source !== null) return;
      const data = event.data as Record<string, unknown> | null;
      if (!data || data.source !== FREIGHTER_RESPONSE_SOURCE) return;
      // The SDK sends `messageId`; Freighter echoes it back as `messagedId`
      // (their spelling) — accept both spellings to be safe.
      const id = data.messagedId ?? data.messageId;
      if (id !== messageId) return;
      settle({
        windowFreighter: undefined,
        contentScriptResponded: true,
        connected: Boolean(data.isConnected),
        elapsedMs: Date.now() - start,
      });
    };

    const timer = window.setTimeout(() => {
      settle({ ...NO_PROBE, elapsedMs: Date.now() - start });
    }, timeoutMs);

    window.addEventListener("message", onMessage);
    window.postMessage(
      { source: FREIGHTER_REQUEST_SOURCE, messageId, type: FREIGHTER_CONNECTION_STATUS },
      window.location.origin
    );
  });
}

/** Troubleshooting lines shown when the extension cannot be reached. */
export function buildNotDetectedLines(embedded: boolean): string[] {
  const lines = [
    "Freighter wallet extension not detected.",
    "",
    "Troubleshooting steps:",
    "1. Install Freighter from https://freighter.app/",
    "2. Create or import a Stellar account and unlock the wallet",
    "3. Grant this site access: click the Freighter icon in the toolbar,",
    '   OR set chrome://extensions → Freighter → Details → Site access → "On all sites"',
    "4. This page re-checks automatically when you come back — no refresh needed",
    "5. Still stuck? Open the browser console (F12) and look for [Freighter] logs",
    "",
    "TEST MODE: add ?wallet=test to the URL to try the UI without the extension.",
  ];
  if (embedded) {
    lines.unshift(
      "This app is running inside an embedded frame, where browser extensions are blocked.",
      "Open the app in its own browser tab, then connect.",
      ""
    );
  }
  return lines;
}

/** Human-readable troubleshooting shown when the extension cannot be reached. */
export function buildNotDetectedMessage(): string {
  return buildNotDetectedLines(isEmbedded()).join("\n");
}
