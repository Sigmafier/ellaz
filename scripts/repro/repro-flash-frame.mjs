#!/usr/bin/env node
/**
 * The frame a visitor sees BEFORE the app commits, shot at the phone viewport.
 *
 *   node scripts/repro/repro-flash-frame.mjs --url http://127.0.0.1:5176/ --out a.png
 *
 * `#home-doc` is the emitted document that stands in until React mounts, and
 * `global.css` hides it the instant `#root` is non-empty. So the only way to
 * photograph it is to stop the app from ever mounting: JavaScript is disabled
 * through CDP, which leaves exactly the frame a slow phone shows.
 *
 * Measured on the live site 2026-09-08, ten Lighthouse runs: this frame is on
 * screen in 2 of 10 loads (`docs/performance-and-cls.md`).
 *
 * NO PLAYWRIGHT AND NO DEPENDENCY. Every other probe here imports `playwright`,
 * which is not installed and pulls ~300 MB of browsers; Chrome's own
 * `--screenshot` flag is inert in this build (150.0.7871.128 - it writes
 * nothing, in either headless mode, with no error but a dbus warning). CDP over
 * node's built-in WebSocket is the third path and the only one that costs
 * nothing.
 *
 * The browser is ours, so it is killed by RESOLVED PID of our own process group
 * in a `finally` - never by pattern (`~/.claude/rules/process/safety-rules.md`).
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const arg = (n, d) => {
  const i = process.argv.indexOf(`--${n}`);
  return i === -1 ? d : process.argv[i + 1];
};

const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));

function killTree(pid) {
  if (!pid) return;
  try {
    process.kill(-pid, "SIGTERM");
  } catch {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      /* gone */
    }
  }
}

async function launchChrome() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "flash-chrome-"));
  const child = spawn(
    "google-chrome",
    [
      "--headless=new",
      "--no-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--no-first-run",
      "--no-default-browser-check",
      "--hide-scrollbars",
      "--remote-debugging-port=0",
      `--user-data-dir=${dir}`,
      "about:blank",
    ],
    { stdio: "ignore", detached: true },
  );
  child.unref();
  const portFile = path.join(dir, "DevToolsActivePort");
  for (let i = 0; i < 300; i += 1) {
    try {
      const first = fs.readFileSync(portFile, "utf8").split("\n")[0].trim();
      if (first) return { port: Number(first), pid: child.pid, dir };
    } catch {
      /* not written yet */
    }
    await sleep(100);
  }
  killTree(child.pid);
  throw new Error("chrome did not report a debugging port");
}

/** A CDP session on a fresh tab. */
async function session(port) {
  const made = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" });
  if (!made.ok) throw new Error(`could not open a tab: HTTP ${made.status}`);
  const { webSocketDebuggerUrl, id } = await made.json();
  const ws = new WebSocket(webSocketDebuggerUrl);
  await new Promise((ok, no) => {
    ws.addEventListener("open", ok, { once: true });
    ws.addEventListener("error", () => no(new Error("CDP websocket refused")), { once: true });
  });

  let next = 0;
  const pending = new Map();
  const listeners = new Map();
  ws.addEventListener("message", (ev) => {
    const msg = JSON.parse(String(ev.data));
    if (msg.id !== undefined && pending.has(msg.id)) {
      const { ok, no } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) no(new Error(`${msg.error.message} (${JSON.stringify(msg.error)})`));
      else ok(msg.result);
      return;
    }
    listeners.get(msg.method)?.forEach((f) => f(msg.params));
  });

  return {
    id,
    send(method, params = {}) {
      const mid = (next += 1);
      return new Promise((ok, no) => {
        pending.set(mid, { ok, no });
        ws.send(JSON.stringify({ id: mid, method, params }));
      });
    },
    once(method) {
      return new Promise((ok) => {
        const fs_ = listeners.get(method) ?? [];
        listeners.set(method, fs_);
        fs_.push(ok);
      });
    },
    close: () => ws.close(),
  };
}

async function main() {
  const url = arg("url");
  const out = arg("out");
  const width = Number(arg("width", "412"));
  const height = Number(arg("height", "823"));
  const scale = Number(arg("scale", "2"));
  const withJs = process.argv.includes("--with-js");
  if (!url || !out) {
    console.error("usage: --url <url> --out <file.png> [--width 412] [--height 823] [--scale 2] [--with-js]");
    return 2;
  }

  const chrome = await launchChrome();
  try {
    const cdp = await session(chrome.port);
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: scale,
      mobile: true,
    });
    // Before the navigation, or the app mounts and the document is hidden.
    if (!withJs) await cdp.send("Emulation.setScriptExecutionDisabled", { value: true });
    await cdp.send("Page.enable");
    const loaded = cdp.once("Page.loadEventFired");
    await cdp.send("Page.navigate", { url });
    await Promise.race([loaded, sleep(15_000)]);
    await sleep(1200); // let the webfont land, so both arms are shot in the same face
    const { data } = await cdp.send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(out, Buffer.from(data, "base64"));
    cdp.close();
    console.log(`${fs.statSync(out).size} B  ${out}   (${width}x${height} @${scale}x, js ${withJs ? "on" : "OFF"})`);
    return 0;
  } finally {
    killTree(chrome.pid);
    try {
      fs.rmSync(chrome.dir, { recursive: true, force: true });
    } catch {
      /* our own temp profile */
    }
  }
}

main().then((c) => process.exit(c), (e) => {
  console.error(e);
  process.exit(2);
});
