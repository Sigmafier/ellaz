#!/usr/bin/env node
// Interactive terminal player — the P1 harness and reconnect test rig.
//
//   node scripts/cli-client.mjs create "Yossi"            # new room, prints code
//   node scripts/cli-client.mjs ABCDE "Dani" [seat]       # join room ABCDE
//   HOLDEM_URL=https://holdem-server.<acct>.workers.dev node scripts/cli-client.mjs ...
//
// Commands at the prompt: f(old) k/check c(all) b <to> r <to> t(imebank)
//   seat <n> <buyIn> · out · in · rebuy <n> · start · hist · ledger · q

import { createInterface } from "node:readline";

const BASE = process.env.HOLDEM_URL ?? "http://localhost:8787";
const WS_BASE = BASE.replace(/^http/, "ws");
const RANKS = "23456789TJQKA";
const SUITS = ["♣", "♦", "♥", "♠"];
const card = (c) => RANKS[(c / 4) | 0] + SUITS[c % 4];

let [, , codeArg, name = "Player", seatArg] = process.argv;
if (!codeArg) {
  console.error("usage: cli-client.mjs <create|CODE> <name> [seat]");
  process.exit(1);
}

let code = codeArg;
if (codeArg === "create") {
  const res = await fetch(`${BASE}/api/create`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ maxSeats: 6, sb: 1, bb: 2, startingStack: 200, minBuyIn: 40, maxBuyIn: 400 }),
  });
  ({ code } = await res.json());
  console.log(`room code: ${code}`);
}

const token = process.env.HOLDEM_TOKEN ?? `cli-${name}-${Math.random().toString(36).slice(2)}`;
let you = null;
let view = null;

const ws = new WebSocket(`${WS_BASE}/ws/${code}`);
const send = (m) => ws.send(JSON.stringify(m));

ws.onopen = () => {
  // v2: a name is two word ids from the shared pool, never text. Sending none
  // lets the server assign one; `name` here only picks the local token label.
  send({ t: "hello", v: 2, token });
  if (seatArg !== undefined) setTimeout(() => send({ t: "takeSeat", seatIdx: Number(seatArg), buyIn: 200 }), 300);
};
ws.onclose = () => {
  console.log("(disconnected)");
  process.exit(0);
};
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  switch (m.t) {
    case "welcome":
      console.log(
        `hello ${m.name.adj} ${m.name.noun}${m.isHost ? " (host)" : ""} — room ${code}`,
      );
      break;
    case "name":
      console.log(`you are now ${m.name.adj} ${m.name.noun}`);
      break;
    case "room":
      view = m.view;
      drawTable();
      break;
    case "you":
      you = m.you;
      if (you.hole) process.stdout.write(`  your cards: ${you.hole.map(card).join(" ")}\n`);
      if (you.legal) {
        const l = you.legal;
        const bits = l.actions.map((a) =>
          a === "call" ? `call ${l.callAmount}` : a === "raise" ? `raise ${l.minRaiseTo}-${l.maxRaiseTo}` : a === "bet" ? `bet ${l.minBetTo}-${l.maxBetTo}` : a,
        );
        console.log(`  YOUR TURN: ${bits.join(" | ")}`);
      }
      break;
    case "ev":
      for (const e of m.events) printEvent(e);
      break;
    case "timer":
      if (you && e_seat(m) === you.seatIdx) {
        const secs = Math.round((m.deadlineEpochMs - m.serverNow) / 1000);
        console.log(`  (${secs}s to act${m.timeBank ? ", time bank running" : ""})`);
      }
      break;
    case "chat":
      console.log(`  [${m.name}] ${m.emote}`);
      break;
    case "history":
      for (const h of m.hands) console.log(`  #${h.handNo} pot ${h.potTotal} → ${h.winners.map((w) => h.names[w]).join(", ")}`);
      break;
    case "ledger":
      for (const r of m.rows) console.log(`  ${r.name}: net ${r.net >= 0 ? "+" : ""}${r.net} (in ${r.buyIn}, ${r.handsPlayed} hands)`);
      break;
    case "err":
      console.log(`  !! ${m.code}: ${m.msg}`);
      break;
  }
};
const e_seat = (m) => m.seatIdx;

function drawTable() {
  if (!view) return;
  const h = view.hand;
  const line = view.seats
    .filter((s) => s.status !== "empty")
    .map((s) => {
      const tags = [
        s.seat === view.buttonSeat ? "D" : "",
        h && h.toAct === s.seat ? "←" : "",
        s.folded ? "folded" : "",
        s.allIn ? "ALL-IN" : "",
        s.sittingOut ? "out" : "",
      ]
        .filter(Boolean)
        .join(" ");
      return `${s.seat}:${s.name} ${s.stack}${s.committed ? `(+${s.committed})` : ""} ${tags}`;
    })
    .join("  |  ");
  console.log(`— ${line}`);
  if (h) console.log(`  board: ${h.board.map(card).join(" ") || "(preflop)"}  pot ${h.potTotal}  toCall ${h.betTo}`);
}

function printEvent(e) {
  switch (e.type) {
    case "HandStarted":
      console.log(`\n=== hand #${e.handNo} — button seat ${e.buttonSeat} ===`);
      break;
    case "BlindPosted":
      console.log(`  seat ${e.seat} posts ${e.kind} ${e.amount}`);
      break;
    case "ActionTaken":
      console.log(`  seat ${e.seat}: ${e.kind}${e.to ? ` (to ${e.to})` : ""}${e.allIn ? " ALL-IN" : ""}`);
      break;
    case "StreetDealt":
      console.log(`  ${e.street}: ${e.cards.map(card).join(" ")}`);
      break;
    case "ShowdownReveal":
      console.log(`  seat ${e.seat}: ${e.mucked ? "mucks" : e.cards.map(card).join(" ")}`);
      break;
    case "PotAwarded":
      console.log(`  pot ${e.amount} → seats ${e.winners.join(", ")}`);
      break;
    case "Refund":
      console.log(`  seat ${e.seat} takes back ${e.amount}`);
      break;
    case "HandEnded":
      console.log(`=== hand over ===`);
      break;
  }
}

const rl = createInterface({ input: process.stdin, output: process.stdout });
rl.on("line", (line) => {
  const [cmd, arg1, arg2] = line.trim().split(/\s+/);
  const actNow = (action, amount) =>
    you && send({ t: "act", handNo: you.handNo, actionSeq: you.actionSeq, action, amount });
  switch (cmd) {
    case "f": actNow("fold"); break;
    case "k": case "check": actNow("check"); break;
    case "c": actNow("call"); break;
    case "b": actNow("bet", Number(arg1)); break;
    case "r": actNow("raise", Number(arg1)); break;
    case "t": send({ t: "useTimeBank" }); break;
    case "seat": send({ t: "takeSeat", seatIdx: Number(arg1), buyIn: Number(arg2 ?? 200) }); break;
    case "out": send({ t: "sitOut" }); break;
    case "in": send({ t: "sitIn" }); break;
    case "rebuy": send({ t: "rebuy", amount: Number(arg1 ?? 100) }); break;
    case "start": send({ t: "startNow" }); break;
    case "hist": send({ t: "getHistory" }); break;
    case "ledger": send({ t: "getLedger" }); break;
    case "q": process.exit(0);
    default: if (cmd) console.log("f k c b <to> r <to> t seat <n> <buy> out in rebuy <n> start hist ledger q");
  }
});
