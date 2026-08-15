// What is the practice table's ACTUAL state, and why is it not dealing?
//
// `play-a-few.mjs` answers "did hands happen" and, when the answer is no, says
// nothing about why. This connects as an ordinary player, sits if asked to,
// and dumps the seats: who is there, how many chips each has, who is sitting
// out, and who is connected. That is the whole input to the deal decision.
//
// Node builtins only.

import { protocolVersion } from "../protocolVersion.mjs";

const BASE = process.env.SERVER ?? "https://holdem-server.yatiroffer.workers.dev";
const CODE = process.env.CODE ?? "PRACT";
const SIT = process.env.SIT === "1";
const WATCH_MS = Number(process.env.WATCH_MS ?? 45_000);
const WS_BASE = BASE.replace(/^http/, "ws");

const ws = new WebSocket(`${WS_BASE}/ws/${CODE}`);
const token = `probe-${Math.random().toString(36).slice(2)}`;
let room = null;
const events = [];

ws.onopen = () => ws.send(JSON.stringify({ t: "hello", v: protocolVersion(), token }));

ws.onmessage = (e) => {
  let m;
  try {
    m = JSON.parse(String(e.data));
  } catch {
    return;
  }
  if (m.t === "room") room = m;
  else if (m.t === "ev" || m.t === "events") events.push(...(m.ev ?? m.events ?? [m]));
  else events.push(m);
};

ws.onerror = (e) => console.error("ws error", String(e?.message ?? e));

await new Promise((r) => setTimeout(r, 6000));

function dump(label) {
  if (!room) {
    console.log(`${label}: no room snapshot yet`);
    return;
  }
  const t = room.table ?? room.state ?? room;
  const seats = t.seats ?? [];
  console.log(`\n=== ${label} ===`);
  console.log(`street=${t.street ?? "-"} handNo=${t.handNo ?? "-"} button=${t.button ?? "-"} pot=${JSON.stringify(t.pots ?? t.pot ?? "-")}`);
  console.log("seat  name                 chips  sittingOut  connected  bot   cards");
  seats.forEach((s, i) => {
    if (!s) {
      console.log(`  ${i}   (empty)`);
      return;
    }
    const name = typeof s.name === "object" ? `${s.name.adj ?? ""}-${s.name.noun ?? ""}` : String(s.name ?? "");
    console.log(
      `  ${i}   ${name.padEnd(20).slice(0, 20)} ${String(s.chips ?? "-").padStart(5)}  ${String(s.sittingOut ?? "-").padEnd(10)} ${String(s.connected ?? "-").padEnd(9)} ${String(s.bot ?? "-").padEnd(5)} ${JSON.stringify(s.cards ?? s.hole ?? null)}`,
    );
  });
  // THE DEAL PRECONDITION, computed the way the engine computes it: a seat
  // with no chips is not a player, and a seat sitting out is not a player.
  const live = seats.filter((s) => s && (s.chips ?? 0) > 0 && !s.sittingOut);
  console.log(`\nseats occupied: ${seats.filter(Boolean).length}`);
  console.log(`ELIGIBLE to be dealt (chips > 0 and not sitting out): ${live.length}  ${live.length < 2 ? "<-- CANNOT DEAL, needs 2" : ""}`);
  const zero = seats.filter((s) => s && (s.chips ?? 0) === 0);
  if (zero.length) console.log(`seats at ZERO chips: ${zero.length}`);
  const out = seats.filter((s) => s && s.sittingOut);
  if (out.length) console.log(`seats SITTING OUT: ${out.length}`);
}

dump("on arrival (spectating)");

if (SIT) {
  const t = room?.table ?? room?.state ?? room;
  const seats = t?.seats ?? [];
  const free = seats.findIndex((s) => !s);
  if (free >= 0) {
    console.log(`\nsitting at ${free}…`);
    ws.send(JSON.stringify({ t: "sit", seat: free, buyIn: 200 }));
    await new Promise((r) => setTimeout(r, 4000));
    dump("after sitting");
  } else {
    console.log("\nno free seat to sit in");
  }
}

console.log(`\nwatching for ${WATCH_MS / 1000}s…`);
const before = events.length;
await new Promise((r) => setTimeout(r, WATCH_MS));
const fresh = events.slice(before);
const kinds = {};
for (const e of fresh) kinds[e.type ?? e.t ?? "?"] = (kinds[e.type ?? e.t ?? "?"] ?? 0) + 1;
console.log(`events while watching: ${fresh.length} ${JSON.stringify(kinds)}`);
dump("after watching");

ws.close();
process.exit(0);
