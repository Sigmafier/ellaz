#!/usr/bin/env node
/**
 * How far is one frame from another, in pixels a person would notice?
 *
 *   node scripts/repro/repro-frame-distance.mjs --target app.png \
 *        --arm before=flash-before.png --arm after=flash-after.png
 *
 * Speed Index is an integral of exactly this quantity: Lighthouse scores every
 * filmstrip frame by how far it is from the LAST one. So when the question is
 * "does the frame a visitor sees before the app look more like the app now",
 * the honest instrument measures that distance directly rather than inferring
 * it from a metric that also carries network luck, CPU luck and a 2.8x spread.
 *
 * NO IMAGE DECODER AND NO DEPENDENCY. Chrome decodes the PNGs and diffs them on
 * a canvas; we only read the number back. `--threshold` is the per-channel
 * delta at which a pixel counts as different, 24 by default - below that two
 * renders of the same thing disagree on antialiasing and nothing else.
 *
 * THE CONTROL RUNS EVERY TIME AND IS NOT OPTIONAL: the target is diffed against
 * ITSELF and must read 0.00%. A comparator that reports a small number for
 * everything, including a thing and itself, is a comparator that is measuring
 * nothing, and its arms would still rank in a plausible order.
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));
const arg = (n, d) => {
  const i = process.argv.indexOf(`--${n}`);
  return i === -1 ? d : process.argv[i + 1];
};
const arms = process.argv.reduce((acc, v, i) => {
  if (v === "--arm") {
    const [name, file] = String(process.argv[i + 1] ?? "").split("=");
    if (name && file) acc.push({ name, file });
  }
  return acc;
}, []);

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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "diff-chrome-"));
  const child = spawn(
    "google-chrome",
    ["--headless=new", "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage", "--no-first-run", "--remote-debugging-port=0", `--user-data-dir=${dir}`, "about:blank"],
    { stdio: "ignore", detached: true },
  );
  child.unref();
  for (let i = 0; i < 300; i += 1) {
    try {
      const p = fs.readFileSync(path.join(dir, "DevToolsActivePort"), "utf8").split("\n")[0].trim();
      if (p) return { port: Number(p), pid: child.pid, dir };
    } catch {
      /* not yet */
    }
    await sleep(100);
  }
  killTree(child.pid);
  throw new Error("chrome did not report a debugging port");
}

async function session(port) {
  const made = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" });
  const { webSocketDebuggerUrl } = await made.json();
  const ws = new WebSocket(webSocketDebuggerUrl);
  await new Promise((ok, no) => {
    ws.addEventListener("open", ok, { once: true });
    ws.addEventListener("error", () => no(new Error("CDP refused")), { once: true });
  });
  let next = 0;
  const pending = new Map();
  ws.addEventListener("message", (ev) => {
    const m = JSON.parse(String(ev.data));
    if (m.id === undefined || !pending.has(m.id)) return;
    const { ok, no } = pending.get(m.id);
    pending.delete(m.id);
    if (m.error) no(new Error(m.error.message));
    else ok(m.result);
  });
  return {
    send(method, params = {}) {
      const id = (next += 1);
      return new Promise((ok, no) => {
        pending.set(id, { ok, no });
        ws.send(JSON.stringify({ id, method, params }));
      });
    },
    async js(expression) {
      const r = await this.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? "page threw");
      return r.result.value;
    },
    close: () => ws.close(),
  };
}

const SETUP = `
window.__px = {};
window.__load = async (key, b64) => {
  const img = new Image();
  img.src = "data:image/png;base64," + b64;
  await img.decode();
  const c = document.createElement("canvas");
  c.width = img.width; c.height = img.height;
  const x = c.getContext("2d", { willReadFrequently: true });
  x.drawImage(img, 0, 0);
  window.__px[key] = { d: x.getImageData(0, 0, img.width, img.height).data, w: img.width, h: img.height };
  return [img.width, img.height];
};
window.__band = (a, b, t, from, to) => {
  const A = window.__px[a], B = window.__px[b];
  const w = A.w;
  let differing = 0, n = 0;
  for (let y = Math.floor(A.h * from); y < Math.floor(A.h * to); y += 1) {
    for (let x = 0; x < w; x += 1) {
      const i = (y * w + x) * 4;
      const dr = Math.abs(A.d[i] - B.d[i]), dg = Math.abs(A.d[i+1] - B.d[i+1]), db = Math.abs(A.d[i+2] - B.d[i+2]);
      const m = dr > dg ? (dr > db ? dr : db) : (dg > db ? dg : db);
      if (m > t) differing += 1;
      n += 1;
    }
  }
  return differing / n;
};
window.__diff = (a, b, t) => {
  const A = window.__px[a], B = window.__px[b];
  if (!A || !B) throw new Error("missing image " + (A ? b : a));
  if (A.w !== B.w || A.h !== B.h) throw new Error("size mismatch " + A.w + "x" + A.h + " vs " + B.w + "x" + B.h);
  let differing = 0, sum = 0;
  const n = A.d.length / 4;
  for (let i = 0; i < A.d.length; i += 4) {
    const dr = Math.abs(A.d[i] - B.d[i]), dg = Math.abs(A.d[i+1] - B.d[i+1]), db = Math.abs(A.d[i+2] - B.d[i+2]);
    const m = dr > dg ? (dr > db ? dr : db) : (dg > db ? dg : db);
    if (m > t) differing += 1;
    sum += (dr + dg + db) / 3;
  }
  return { differing: differing / n, mean: sum / n };
};
"ready"`;

async function main() {
  const target = arg("target");
  const threshold = Number(arg("threshold", "24"));
  if (!target || arms.length === 0) {
    console.error("usage: --target <png> --arm <name>=<png> [--arm ...] [--threshold 24]");
    return 2;
  }
  const chrome = await launchChrome();
  try {
    const cdp = await session(chrome.port);
    await cdp.js(SETUP);
    const put = async (key, file) => {
      const b64 = fs.readFileSync(file).toString("base64");
      const size = await cdp.js(`window.__load(${JSON.stringify(key)}, ${JSON.stringify(b64)})`);
      return size;
    };
    const [w, h] = await put("target", target);
    for (const a of arms) await put(a.name, a.file);

    const t = (x) => `${(x.differing * 100).toFixed(2)}%`;
    console.log(`\ntarget:     ${target}  (${w}x${h}, threshold ${threshold}/255)`);
    console.log(`population: ${w * h} pixels per comparison\n`);

    const self = await cdp.js(`window.__diff("target","target",${threshold})`);
    console.log(`  CONTROL  target vs itself      ${t(self).padStart(7)}   mean ${self.mean.toFixed(2)}`);
    if (self.differing !== 0) {
      console.error("\nCONTROL FAILED - the comparator reports a difference between a thing and itself.");
      console.error("Every number above is worthless.");
      return 1;
    }
    console.log("");
    for (const a of arms) {
      const d = await cdp.js(`window.__diff("target",${JSON.stringify(a.name)},${threshold})`);
      console.log(`  ${a.name.padEnd(8)} vs target            ${t(d).padStart(7)}   mean ${d.mean.toFixed(2)}`);
    }
    console.log("\n  where the difference lives, by horizontal third of the viewport:\n");
    console.log("           top third   middle third   bottom third");
    for (const a of arms) {
      const b = [];
      for (const [f, t2] of [[0, 1 / 3], [1 / 3, 2 / 3], [2 / 3, 1]]) {
        b.push(await cdp.js(`window.__band("target",${JSON.stringify(a.name)},${threshold},${f},${t2})`));
      }
      console.log(`  ${a.name.padEnd(8)} ${b.map((x) => `${(x * 100).toFixed(1)}%`.padStart(9)).join("      ")}`);
    }

    if (arms.length === 2) {
      const [x, y] = arms;
      const d = await cdp.js(`window.__diff(${JSON.stringify(x.name)},${JSON.stringify(y.name)},${threshold})`);
      console.log(`\n  and the arms differ from each other: ${t(d)}  (0.00% would mean the change did nothing)\n`);
    }
    cdp.close();
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
