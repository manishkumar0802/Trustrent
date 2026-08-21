import { afterEach, describe, expect, it } from "vitest";
import {
  FREIGHTER_REQUEST_SOURCE,
  FREIGHTER_RESPONSE_SOURCE,
  buildNotDetectedLines,
  buildNotDetectedMessage,
  isEmbedded,
  probeFreighter,
} from "./freighter";

type WireMessage = Record<string, unknown> & { source?: unknown };

/**
 * Simulates the Freighter content script: listens for request postMessages and
 * answers with a response echoing the request id (Freighter's own spelling,
 * `messagedId`).
 */
function installFakeFreighter(overrides: Record<string, unknown> = {}) {
  const handler = (event: MessageEvent) => {
    const data = event.data as WireMessage | null;
    // jsdom reports event.source === null for same-window postMessage (real
    // browsers report window) — accept both, like the probe does.
    if ((event.source !== window && event.source !== null) || !data || data.source !== FREIGHTER_REQUEST_SOURCE) return;
    window.postMessage(
      {
        source: FREIGHTER_RESPONSE_SOURCE,
        messagedId: data.messageId,
        isConnected: true,
        ...overrides,
      },
      window.location.origin
    );
  };
  window.addEventListener("message", handler);
  return () => window.removeEventListener("message", handler);
}

afterEach(() => {
  delete (window as unknown as { freighter?: unknown }).freighter;
});

describe("probeFreighter", () => {
  it("resolves immediately when the legacy window.freighter global is set", async () => {
    (window as unknown as { freighter?: unknown }).freighter = true;
    const probe = await probeFreighter();
    expect(probe.contentScriptResponded).toBe(true);
    expect(probe.connected).toBe(true);
    expect(probe.windowFreighter).toBe(true);
    expect(probe.elapsedMs).toBe(0);
  });

  it("resolves when the content script answers with the messagedId echo", async () => {
    const remove = installFakeFreighter();
    try {
      const probe = await probeFreighter(1000);
      expect(probe.contentScriptResponded).toBe(true);
      expect(probe.connected).toBe(true);
      expect(probe.elapsedMs).toBeLessThan(1000);
    } finally {
      remove();
    }
  });

  it("accepts a response that echoes the id as messageId instead", async () => {
    const handler = (event: MessageEvent) => {
      const data = event.data as WireMessage | null;
      if (!data || data.source !== FREIGHTER_REQUEST_SOURCE) return;
      window.postMessage(
        { source: FREIGHTER_RESPONSE_SOURCE, messageId: data.messageId, isConnected: true },
        window.location.origin
      );
    };
    window.addEventListener("message", handler);
    try {
      const probe = await probeFreighter(1000);
      expect(probe.contentScriptResponded).toBe(true);
      expect(probe.connected).toBe(true);
    } finally {
      window.removeEventListener("message", handler);
    }
  });

  it("reports connected=false when the extension says isConnected=false", async () => {
    const remove = installFakeFreighter({ isConnected: false });
    try {
      const probe = await probeFreighter(1000);
      expect(probe.contentScriptResponded).toBe(true);
      expect(probe.connected).toBe(false);
    } finally {
      remove();
    }
  });

  it("times out with contentScriptResponded=false when nothing answers", async () => {
    const probe = await probeFreighter(100);
    expect(probe.contentScriptResponded).toBe(false);
    expect(probe.connected).toBe(false);
    expect(probe.elapsedMs).toBeGreaterThan(0);
  });

  it("ignores responses with a mismatched id and still times out", async () => {
    const handler = (event: MessageEvent) => {
      const data = event.data as WireMessage | null;
      if (!data || data.source !== FREIGHTER_REQUEST_SOURCE) return;
      window.postMessage(
        { source: FREIGHTER_RESPONSE_SOURCE, messagedId: "wrong-id", isConnected: true },
        window.location.origin
      );
    };
    window.addEventListener("message", handler);
    try {
      const probe = await probeFreighter(40);
      expect(probe.contentScriptResponded).toBe(false);
      expect(probe.connected).toBe(false);
    } finally {
      window.removeEventListener("message", handler);
    }
  });
});

describe("isEmbedded", () => {
  it("returns false for a top-level window", () => {
    expect(isEmbedded()).toBe(false);
  });
});

describe("buildNotDetectedLines", () => {
  it("includes install, site-access and test-mode guidance", () => {
    const msg = buildNotDetectedLines(false).join("\n");
    expect(msg).toContain("freighter.app");
    expect(msg).toContain("Site access");
    expect(msg).toContain("?wallet=test");
  });

  it("prepends an embedded-frame warning when running in a frame", () => {
    const msg = buildNotDetectedLines(true).join("\n");
    expect(msg).toContain("embedded frame");
    expect(msg.indexOf("embedded frame")).toBeLessThan(msg.indexOf("Freighter wallet"));
  });

  it("buildNotDetectedMessage joins the lines", () => {
    expect(buildNotDetectedMessage()).toContain("Freighter wallet extension not detected.");
  });
});
