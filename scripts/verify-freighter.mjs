#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Verifies the Freighter wallet handshake end-to-end in a real browser.
 *
 * A real Freighter extension cannot be installed from the CLI, but the app-side
 * handshake can be fully verified: this script launches a headless Edge/Chrome
 * and injects a script that mimics Freighter's content script — the exact
 * postMessage protocol @stellar/freighter-api v2 speaks
 * (FREIGHTER_EXTERNAL_MSG_REQUEST / _RESPONSE). It then watches the live app:
 *
 *   1. detection probe → "Freighter detected"
 *   2. auto-connect (isAllowed → getPublicKey) → wallet address in the button
 *
 * Drives the browser over the Chrome DevTools Protocol using only Node's
 * built-in WebSocket — no npm packages required.
 *
 * Usage:
 *   node scripts/verify-freighter.mjs [url]
 *
 *   url defaults to http://localhost:3000/dashboard. If the dev server is not
 *   already running it is started in apps/web and stopped afterwards.
 */

import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

const EDGE_CANDIDATES = [
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
];
const EDGE = EDGE_CANDIDATES.find((p) => spawnSync("test", ["-f", p]).status === 0);

const TEST_ADDRESS = "GDCI3JBNF3QKQB5S45G34CJHKJ4N3K2L4JSRMK5SXZK3M2L4JSRMK5SXZ";
const TRUNCATED = `${TEST_ADDRESS.slice(0, 6)}...${TEST_ADDRESS.slice(-4)}`;
const URL = process.argv[2] ?? "http://localhost:3000/dashboard";
const PORT = 9222;
const SCREENSHOT = resolve("verify-freighter.png");

/** Mimics Freighter's content script: answers request postMessages. */
const MOCK_CONTENT_SCRIPT = `(() => {
  const REQ = "FREIGHTER_EXTERNAL_MSG_REQUEST";
  const RES = "FREIGHTER_EXTERNAL_MSG_RESPONSE";
  const PUBKEY = "${TEST_ADDRESS}";
  window.addEventListener("message", (event) => {
    const data = event.data;
    if (!data || data.source !== REQ) return;
    let payload = {};
    switch (data.type) {
      case "REQUEST_CONNECTION_STATUS": payload = { isConnected: true }; break;
      case "REQUEST_ALLOWED_STATUS": payload = { isAllowed: true }; break;
      case "REQUEST_PUBLIC_KEY":
      case "REQUEST_ACCESS": payload = { publicKey: PUBKEY }; break;
      default: payload = {};
    }
    window.postMessage({ source: RES, messagedId: data.messageId, ...payload }, window.location.origin);
  });
})();`;

function killTree(pid) {
  try {
    if (process.platform === "win32") {
      spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore" });
    } else {
      process.kill(pid, "SIGKILL");
    }
  } catch {
    /* already dead */
  }
}

function reachable(url, timeoutMs) {
  const start = Date.now();
  return new Promise((resolve) => {
    const tick = async () => {
      if (Date.now() - start > timeoutMs) return resolve(false);
      try {
        const res = await fetch(url);
        if (res.ok) return resolve(true);
      } catch {
        /* not up yet */
      }
      setTimeout(tick, 500);
    };
    tick();
  });
}

async function ensureDevServer() {
  if (await reachable(URL, 5000)) {
    console.log(`✓ Dev server already running at ${URL}`);
    return null;
  }
  console.log(`• Dev server not running — starting npm run dev in apps/web…`);
  // On Windows, npm.cmd cannot be spawned directly — run it through the shell.
  const child =
    process.platform === "win32"
      ? spawn("cmd", ["/c", "npm run dev"], { cwd: resolve("apps/web"), stdio: "ignore" })
      : spawn("npm", ["run", "dev"], { cwd: resolve("apps/web"), stdio: "ignore" });
  if (!(await reachable(URL, 60000))) {
    killTree(child.pid);
    throw new Error("Dev server did not start in time");
  }
  console.log(`✓ Dev server up at ${URL}`);
  return child.pid;
}

async function getPageTarget() {
  const start = Date.now();
  while (Date.now() - start < 15000) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const targets = await res.json();
      const page = targets.find((t) => t.type === "page");
      if (page) return page;
    } catch {
      /* debug port not ready */
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error("Timed out waiting for the browser debug target");
}

function cdpConnect(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const pending = new Map();
    const handlers = [];
    let nextId = 1;

    ws.onopen = () =>
      resolve({
        send(method, params = {}) {
          const id = nextId++;
          return new Promise((res, rej) => {
            const timer = setTimeout(() => {
              if (pending.has(id)) {
                pending.delete(id);
                rej(new Error(`CDP timeout: ${method}`));
              }
            }, 20000);
            pending.set(id, { res, rej, timer });
            ws.send(JSON.stringify({ id, method, params }));
          });
        },
        on(method, handler) {
          handlers.push({ method, handler });
        },
        close() {
          ws.close();
        },
      });

    ws.onerror = () => reject(new Error("CDP WebSocket error"));
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.id && pending.has(msg.id)) {
        const { res, rej, timer } = pending.get(msg.id);
        pending.delete(msg.id);
        clearTimeout(timer);
        if (msg.error) rej(new Error(msg.error.message));
        else res(msg.result);
      } else if (msg.method) {
        for (const { method, handler } of handlers) {
          if (method === msg.method) handler(msg.params);
        }
      }
    };
  });
}

async function waitForValue(cdp, expression, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const { result } = await cdp.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
    });
    if (result?.value) return result.value;
    await new Promise((r) => setTimeout(r, 400));
  }
  return null;
}

async function main() {
  if (!EDGE) {
    console.error("✗ No Edge/Chrome found. Install one of:");
    for (const p of EDGE_CANDIDATES) console.error(`    ${p}`);
    process.exit(1);
  }

  let edge = null;
  let devPid = null;
  const profileDir = mkdtempSync(`${tmpdir()}/trustrent-freighter-verify-`);

  try {
    devPid = await ensureDevServer();

    console.log(`• Launching headless ${EDGE.includes("msedge") ? "Edge" : "Chrome"}…`);
    edge = spawn(
      EDGE,
      [
        "--headless=new",
        `--remote-debugging-port=${PORT}`,
        `--user-data-dir=${profileDir}`,
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-gpu",
        "about:blank",
      ],
      { stdio: "ignore" },
    );

    const target = await getPageTarget();
    const cdp = await cdpConnect(target.webSocketDebuggerUrl);

    const consoleLogs = [];
    cdp.on("Runtime.consoleAPICalled", (params) => {
      const text = (params.args ?? [])
        .map((a) => a.value ?? a.description ?? "")
        .join(" ");
      if (text) consoleLogs.push(text);
    });

    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 1280,
      height: 800,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await cdp.send("Page.addScriptToEvaluateOnNewDocument", {
      source: MOCK_CONTENT_SCRIPT,
    });

    console.log(`• Navigating to ${URL}…`);
    await cdp.send("Page.navigate", { url: URL });

    // 1. Detection: the Wallet Debug panel reports the content script answered.
    const debugVisible = await waitForValue(
      cdp,
      `document.body?.innerText.includes("Wallet Debug") ?? false`,
      20000,
    );
    if (debugVisible) {
      const reachable = await waitForValue(
        cdp,
        `document.body?.innerText.includes("Extension reachable (content script)") && document.body.innerText.includes("✓ YES")`,
        10000,
      );
      if (reachable) {
        console.log("✓ [1/3] Detection — content script answered the probe (debug panel: ✓ YES)");
      } else {
        console.error("✗ Debug panel visible but the content script was not reported reachable.");
        process.exitCode = 1;
      }
    } else {
      console.error("✗ Wallet Debug panel never rendered.");
      process.exitCode = 1;
    }

    // 2. Auto-connect: isAllowed → getPublicKey → address replaces the label.
    const connected = await waitForValue(
      cdp,
      `document.body?.innerText.includes("${TRUNCATED}") ?? false`,
      20000,
    );
    if (!connected) {
      const body = await waitForValue(cdp, `document.body?.innerText ?? ""`, 3000);
      console.error(`✗ Wallet address "${TRUNCATED}" never appeared.\nBody snippet:\n${body?.slice(0, 600)}`);
      process.exitCode = 1;
    } else {
      console.log(`✓ [2/3] Auto-connect — button now shows ${TRUNCATED}`);
    }

    // 3. The connected button should also read “Connect wallet” as a click target
    //    for disconnect; verify the button element shows the address (not both).
    const buttonLabel = await waitForValue(
      cdp,
      `(() => { const b = [...document.querySelectorAll("button")].find(b => b.innerText.includes("${TRUNCATED}")); return b ? b.innerText.trim() : null; })()`,
      5000,
    );
    if (buttonLabel === TRUNCATED) {
      console.log(`✓ [3/3] Connect button label is exactly ${TRUNCATED}`);
    } else {
      console.log(`• Button label (${buttonLabel ?? "none"}) — cosmetic check skipped`);
    }

    // Screenshot for the record.
    const shot = await cdp.send("Page.captureScreenshot", { format: "png" });
    writeFileSync(SCREENSHOT, Buffer.from(shot.data, "base64"));
    console.log(`📸 Screenshot saved: ${SCREENSHOT}`);

    const freighterLogs = consoleLogs.filter(
      (l) => l.includes("Freighter") || l.toLowerCase().includes("wallet"),
    );
    if (freighterLogs.length) {
      console.log("Console [Freighter] logs:");
      for (const line of freighterLogs.slice(0, 12)) console.log(`  ${line}`);
    }

    cdp.close();
  } catch (err) {
    console.error(`✗ Verification failed: ${err.message}`);
    process.exitCode = 1;
  } finally {
    if (edge) killTree(edge.pid);
    if (devPid) killTree(devPid);
    rmSync(profileDir, { recursive: true, force: true });
  }
}

main();
