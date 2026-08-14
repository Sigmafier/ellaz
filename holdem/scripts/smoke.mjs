#!/usr/bin/env node
// End-to-end smoke against a running server (default: wrangler dev on :8787).
//
//   node scripts/smoke.mjs [http://localhost:8787]
//
// Creates a room, connects three players, seats them, and lets them
// check/call/fold at random until HANDS hands complete. Asserts:
//   - every client saw a welcome and a room snapshot
//   - no client ever received another seat's HoleCardsDealt (privacy!)
//   - hands actually complete (HandEnded arrives)
//   - a mid-run reconnect gets a snapshot and can keep playing
// Exits 0 on success, 1 with a reason on failure. Node builtins only.

import { protocolVersion } from "./protocolVersion.mjs";

const PROTOCOL_VERSION = protocolVersion();
const BASE = process.argv[2] ?? "http://localhost:8787";
const WS_BASE = BASE.replace(/^http/, "ws");
const HANDS = Number(process.env.SMOKE_HANDS ?? 5);
const DEADLINE_MS = Number(process.env.SMOKE_DEADLINE_MS ?? 90_000);

const fail = (msg) => {
  console.error(`SMOKE FAIL: ${msg}`);
  process.exit(1);
};

const res = await fetch(`${BASE}/api/create`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ maxSeats: 6, sb: 1, bb: 2, startingStack: 200, minBuyIn: 40, maxBuyIn: 400, actionTimeMs: 20000 }),
});
if (!res.ok) fail(`create: HTTP ${res.status}`);
const { code } = await res.json();
if (!code) fail("create returned no code");
console.log(`room ${code}`);

class Player {
  constructor(name, seatIdx) {
    this.name = name;
    this.wantSeat = seatIdx;
    this.token = `tok-${name}-${Math.random().toString(36).slice(2)}`;
    this.mySeat = -1;
    this.handsEnded = 0;
    this.legal = null;
    this.actionSeq = -1;
    this.handNo = -1;
    this.sawWelcome = false;
    this.sawRoom = false;
    this.foreignHoleCards = 0;
    this.errors = [];
    this.holeSeen = 0;
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(`${WS_BASE}/ws/${code}`);
      this.ws.onopen = () => {
        this.sendMsg({ t: "hello", v: PROTOCOL_VERSION, token: this.token });
        resolve();
      };
      this.ws.onerror = (e) => reject(new Error(`${this.name} ws error: ${e.message ?? e}`));
      this.ws.onmessage = (ev) => this.onMessage(JSON.parse(ev.data));
    });
  }

  sendMsg(m) {
    this.ws.send(JSON.stringify(m));
  }

  onMessage(m) {
    switch (m.t) {
      case "welcome":
        this.sawWelcome = true;
        this.playerId = m.playerId;
        break;
      case "room":
        this.sawRoom = true;
        if (m.view.hand) this.handNo = m.view.hand.handNo;
        break;
      case "you":
        this.mySeat = m.you.seatIdx;
        this.legal = m.you.legal;
        this.handNo = m.you.handNo;
        this.actionSeq = m.you.actionSeq;
        if (m.you.hole) this.holeSeen++;
        this.maybeAct();
        break;
      case "ev":
        for (const e of m.events) {
          if (e.type === "HoleCardsDealt" && e.seat !== this.mySeat) this.foreignHoleCards++;
          if (e.type === "HandEnded") this.handsEnded++;
        }
        break;
      case "err":
        this.errors.push(`${m.code}: ${m.msg}`);
        break;
    }
  }

  maybeAct() {
    if (!this.legal || this.mySeat < 0) return;
    const legal = this.legal;
    this.legal = null;
    // Weighted: prefer check, then call, then fold; occasional small raise.
    const pick = Math.random();
    let action;
    let amount;
    if (legal.actions.includes("check") && pick < 0.7) action = "check";
    else if (legal.actions.includes("call") && pick < 0.8) action = "call";
    else if (legal.actions.includes("bet") && pick < 0.9) {
      action = "bet";
      amount = legal.minBetTo;
    } else if (legal.actions.includes("call")) action = "call";
    else if (legal.actions.includes("check")) action = "check";
    else action = "fold";
    const { handNo, actionSeq } = this;
    setTimeout(() => {
      this.sendMsg({ t: "act", handNo, actionSeq, action, amount });
    }, 10);
  }
}

const players = [new Player("Alice", 0), new Player("Bob", 1), new Player("Carol", 2)];
for (const p of players) await p.connect();
await new Promise((r) => setTimeout(r, 300));
for (const p of players) p.sendMsg({ t: "takeSeat", seatIdx: p.wantSeat, buyIn: 200 });

const start = Date.now();
let reconnected = false;
while (Date.now() - start < DEADLINE_MS) {
  await new Promise((r) => setTimeout(r, 500));
  const done = Math.min(...players.map((p) => p.handsEnded));
  if (!reconnected && done >= 2) {
    // Kill and revive Bob mid-run: the snapshot must restore him.
    reconnected = true;
    players[1].ws.close();
    await new Promise((r) => setTimeout(r, 400));
    await players[1].connect();
    console.log("reconnected Bob");
  }
  if (done >= HANDS) break;
}

const done = Math.min(...players.map((p) => p.handsEnded));
for (const p of players) {
  if (!p.sawWelcome) fail(`${p.name} never got welcome`);
  if (!p.sawRoom) fail(`${p.name} never got room`);
  if (p.foreignHoleCards > 0) fail(`${p.name} saw ${p.foreignHoleCards} foreign hole cards — PRIVACY BREACH`);
  if (p.holeSeen === 0) fail(`${p.name} never saw own hole cards`);
}
if (done < HANDS) {
  for (const p of players) console.error(`${p.name}: hands=${p.handsEnded} errors=${p.errors.slice(-3).join("; ")}`);
  fail(`only ${done}/${HANDS} hands completed in ${DEADLINE_MS}ms`);
}
if (!reconnected) fail("reconnect leg never ran");
console.log(`SMOKE OK: ${done} hands, privacy clean, reconnect clean`);
process.exit(0);
