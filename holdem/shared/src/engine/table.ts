// THE reducer. apply(state, command, rng) -> { state, events }.
//
// Pure and synchronous: no clocks (the server injects `timeout`), no I/O, no
// randomness except the injected rng (used only by startHand's shuffle and the
// first hand's button draw). Rejected commands throw EngineError — the caller
// maps that to an err message; the state is never left half-applied because
// apply works on a structuredClone.

import { shuffledDeck } from "./cards";
import type { Card } from "./cards";
import { computeLegal } from "./betting";
import { computePositions, nextSeatWhere } from "./blinds";
import { evaluate } from "./evaluator";
import { buildPots, splitPot } from "./pots";
import {
  type ApplyResult,
  type Command,
  type EngineEvent,
  EngineError,
  type HandState,
  type SeatState,
  type TableState,
} from "./types";

export function apply(state: TableState, cmd: Command, rng?: () => number): ApplyResult {
  const s = structuredClone(state) as TableState;
  const events: EngineEvent[] = [];
  switch (cmd.type) {
    case "sit":
      doSit(s, cmd, events);
      break;
    case "leave":
      doLeave(s, cmd.seat, events);
      break;
    case "sitOut":
      doSitOut(s, cmd.seat, events);
      break;
    case "sitIn":
      doSitIn(s, cmd.seat, events);
      break;
    case "rebuy":
      doRebuy(s, cmd.seat, cmd.amount, events);
      break;
    case "startHand": {
      if (!rng) throw new EngineError("BAD_STATE", "startHand needs an rng");
      doStartHand(s, rng, events);
      break;
    }
    case "act":
      doAct(s, cmd, events);
      break;
    case "timeout":
      doTimeout(s, cmd.seat, events);
      break;
    case "useTimeBank":
      doUseTimeBank(s, cmd.seat, events);
      break;
    case "setConfig":
      doSetConfig(s, cmd.patch, events);
      break;
  }
  return { state: s, events };
}

// ---------------------------------------------------------------------------
// Seat management

function seatAt(s: TableState, idx: number): SeatState {
  const seat = s.seats[idx];
  if (!seat) throw new EngineError("BAD_SEAT", `no seat ${idx}`);
  return seat;
}

function doSit(
  s: TableState,
  cmd: { seat: number; playerId: string; name: string; buyIn: number },
  events: EngineEvent[],
): void {
  const seat = seatAt(s, cmd.seat);
  if (seat.status !== "empty") throw new EngineError("SEAT_TAKEN", `seat ${cmd.seat} is taken`);
  if (s.seats.some((x) => x.playerId === cmd.playerId))
    throw new EngineError("BAD_STATE", "player already seated");
  if (cmd.buyIn <= 0) throw new EngineError("BAD_AMOUNT", "buy-in must be positive");
  if (s.config.chipsMode === "fresh") {
    if (cmd.buyIn < s.config.minBuyIn || cmd.buyIn > s.config.maxBuyIn)
      throw new EngineError("BAD_AMOUNT", `buy-in outside ${s.config.minBuyIn}..${s.config.maxBuyIn}`);
  }
  seat.playerId = cmd.playerId;
  seat.name = cmd.name;
  seat.stack = cmd.buyIn;
  seat.status = "active";
  seat.inHand = false;
  seat.folded = false;
  seat.allIn = false;
  seat.committed = 0;
  seat.totalCommitted = 0;
  seat.timeouts = 0;
  seat.owesBB = s.handCounter > 0;
  seat.pendingRebuy = 0;
  events.push({ type: "SeatChanged", seat: cmd.seat, change: "sit", name: cmd.name, stack: cmd.buyIn });
}

function doLeave(s: TableState, idx: number, events: EngineEvent[]): void {
  const seat = seatAt(s, idx);
  if (seat.status === "empty") throw new EngineError("BAD_SEAT", "seat is empty");
  if (s.hand && seat.inHand) {
    // Fold now, vacate at hand end: the seat's committed chips must stay in
    // the pot, and only the seat record keeps them countable.
    seat.pendingLeave = true;
    seat.status = "sittingOut";
    if (!seat.folded) forceFold(s, idx, events);
    return;
  }
  vacateSeat(s, idx, events);
}

function vacateSeat(s: TableState, idx: number, events: EngineEvent[]): void {
  const seat = s.seats[idx];
  const cashOut = seat.stack + seat.pendingRebuy;
  Object.assign(seat, {
    playerId: null,
    name: "",
    stack: 0,
    status: "empty",
    inHand: false,
    folded: false,
    allIn: false,
    committed: 0,
    totalCommitted: 0,
    timeouts: 0,
    owesBB: false,
    pendingRebuy: 0,
    pendingLeave: false,
  });
  events.push({ type: "SeatChanged", seat: idx, change: "leave", stack: cashOut });
}

function doSitOut(s: TableState, idx: number, events: EngineEvent[]): void {
  const seat = seatAt(s, idx);
  if (seat.status !== "active") throw new EngineError("BAD_STATE", "not active");
  if (s.hand && seat.inHand && !seat.folded) forceFold(s, idx, events);
  seat.status = "sittingOut";
  events.push({ type: "SeatChanged", seat: idx, change: "sitOut" });
}

function doSitIn(s: TableState, idx: number, events: EngineEvent[]): void {
  const seat = seatAt(s, idx);
  if (seat.status !== "sittingOut") throw new EngineError("BAD_STATE", "not sitting out");
  seat.status = "active";
  seat.timeouts = 0;
  seat.owesBB = s.handCounter > 0;
  events.push({ type: "SeatChanged", seat: idx, change: "sitIn" });
}

function doRebuy(s: TableState, idx: number, amount: number, events: EngineEvent[]): void {
  const seat = seatAt(s, idx);
  if (seat.status === "empty") throw new EngineError("BAD_SEAT", "seat is empty");
  if (amount <= 0) throw new EngineError("BAD_AMOUNT", "rebuy must be positive");
  if (s.config.chipsMode === "fresh") {
    const projected = seat.stack + seat.pendingRebuy + amount;
    if (projected > s.config.maxBuyIn)
      throw new EngineError("BAD_AMOUNT", `stack would exceed max buy-in ${s.config.maxBuyIn}`);
  }
  if (s.hand && seat.inHand) {
    seat.pendingRebuy += amount; // applied when the hand ends
  } else {
    seat.stack += amount;
  }
  events.push({ type: "SeatChanged", seat: idx, change: "rebuy", stack: seat.stack + seat.pendingRebuy });
}

function doSetConfig(
  s: TableState,
  patch: Partial<Record<"sb" | "bb" | "actionTimeMs" | "minBuyIn" | "maxBuyIn", number>>,
  events: EngineEvent[],
): void {
  if (s.hand) throw new EngineError("BAD_STATE", "cannot change config mid-hand");
  const applied: Record<string, number> = {};
  for (const key of ["sb", "bb", "actionTimeMs", "minBuyIn", "maxBuyIn"] as const) {
    const v = patch[key];
    if (v === undefined) continue;
    if (!Number.isFinite(v) || v <= 0) throw new EngineError("BAD_AMOUNT", `bad ${key}`);
    s.config[key] = v;
    applied[key] = v;
  }
  if (Object.keys(applied).length > 0) events.push({ type: "ConfigChanged", patch: applied });
}

// ---------------------------------------------------------------------------
// Hand lifecycle

function doStartHand(s: TableState, rng: () => number, events: EngineEvent[]): void {
  if (s.hand) throw new EngineError("BAD_STATE", "hand already running");
  const pos = computePositions(s, rng);
  if (!pos) {
    s.phase = "waiting";
    return;
  }

  s.handCounter += 1;
  s.buttonSeat = pos.buttonSeat;
  s.smallBlindSeat = pos.smallBlindSeat;
  s.bigBlindSeat = pos.bigBlindSeat;
  s.phase = "hand";

  const n = s.seats.length;
  for (const seat of s.seats) {
    seat.inHand = false;
    seat.folded = false;
    seat.allIn = false;
    seat.committed = 0;
    seat.totalCommitted = 0;
  }
  for (const idx of pos.dealtSeats) {
    const seat = s.seats[idx];
    seat.inHand = true;
    seat.owesBB = false;
  }

  const deck = shuffledDeck(rng);
  const holes: (readonly [Card, Card] | null)[] = new Array(n).fill(null);
  // Deal two cards to each dealt seat, one round at a time, starting left of
  // the button — cosmetically traditional and stable for a given deck order.
  const dealOrder: number[] = [];
  for (let k = 1; k <= n; k++) {
    const idx = (pos.buttonSeat + k) % n;
    if (pos.dealtSeats.includes(idx)) dealOrder.push(idx);
  }
  const firstCard: Record<number, Card> = {};
  for (const idx of dealOrder) firstCard[idx] = deck.pop()!;
  for (const idx of dealOrder) holes[idx] = [firstCard[idx], deck.pop()!] as const;

  const hand: HandState = {
    handNo: s.handCounter,
    deck,
    board: [],
    holes,
    street: "preflop",
    toAct: -1,
    betTo: s.config.bb,
    lastFullRaiseSize: s.config.bb,
    actedSinceFullRaise: new Array(n).fill(false),
    lastAggressor: -1,
    riverAggressor: -1,
    timeBankUsed: new Array(n).fill(false),
    actionSeq: 0,
    runout: false,
  };
  s.hand = hand;

  const stacks: Record<number, number> = {};
  for (const idx of pos.dealtSeats) stacks[idx] = s.seats[idx].stack;
  events.push({
    type: "HandStarted",
    handNo: hand.handNo,
    buttonSeat: pos.buttonSeat,
    smallBlindSeat: pos.smallBlindSeat,
    sbPosted: pos.sbPosted,
    bigBlindSeat: pos.bigBlindSeat,
    dealtSeats: pos.dealtSeats,
    stacks,
  });

  // Post blinds. A blind all-in for less posts what it has; betTo stays at the
  // full BB — the blind level defines the stakes, not the short stack.
  if (pos.sbPosted) postBlind(s, pos.smallBlindSeat, s.config.sb, "sb", events);
  postBlind(s, pos.bigBlindSeat, s.config.bb, "bb", events);
  for (const idx of pos.livePostSeats) postBlind(s, idx, s.config.bb, "post", events);

  for (const idx of pos.dealtSeats) {
    events.push({ type: "HoleCardsDealt", seat: idx, cards: holes[idx]! });
  }

  const first = findNextToAct(s, pos.bigBlindSeat);
  if (first < 0) {
    // Everyone is all-in from the blinds — run the board out immediately.
    closeStreetAndAdvance(s, events);
  } else {
    hand.toAct = first;
  }
}

function postBlind(
  s: TableState,
  idx: number,
  amount: number,
  kind: "sb" | "bb" | "post",
  events: EngineEvent[],
): void {
  const seat = s.seats[idx];
  const paid = Math.min(amount, seat.stack);
  commitChips(seat, paid);
  events.push({ type: "BlindPosted", seat: idx, kind, amount: paid, allIn: seat.allIn });
}

function commitChips(seat: SeatState, amount: number): void {
  seat.stack -= amount;
  seat.committed += amount;
  seat.totalCommitted += amount;
  if (seat.stack === 0) seat.allIn = true;
}

// ---------------------------------------------------------------------------
// Actions

function doAct(
  s: TableState,
  cmd: Extract<Command, { type: "act" }>,
  events: EngineEvent[],
): void {
  const hand = s.hand;
  if (!hand || s.phase !== "hand") throw new EngineError("BAD_STATE", "no hand running");
  if (hand.toAct !== cmd.seat) throw new EngineError("NOT_YOUR_TURN", `seat ${cmd.seat} is not to act`);
  if (cmd.actionSeq !== hand.actionSeq) throw new EngineError("STALE_SEQ", "stale action");
  const seat = seatAt(s, cmd.seat);
  const legal = computeLegal(s, cmd.seat);
  if (!legal) throw new EngineError("BAD_STATE", "no legal actions");

  const a = cmd.action;
  if (!legal.actions.includes(a.kind))
    throw new EngineError(
      a.kind === "raise" || a.kind === "bet" ? "CANNOT_RAISE" : "BAD_STATE",
      `${a.kind} is not legal here`,
    );

  switch (a.kind) {
    case "fold":
      seat.folded = true;
      break;
    case "check":
      break;
    case "call":
      commitChips(seat, legal.callAmount ?? 0);
      break;
    case "bet": {
      validateTo(a.to, legal.minBetTo!, legal.maxBetTo!, seat);
      const size = a.to - seat.committed;
      commitChips(seat, size);
      // A full opening bet (>= BB) sets the raise increment and reopens the
      // action; an all-in short of the min bet leaves the increment at BB and
      // reopens nothing (the per-wager rule at bet time) — so after a short
      // all-in bet of 5 under a BB of 10, the minimum raise is to 15.
      const fullBet = a.to >= s.config.bb;
      if (fullBet) hand.lastFullRaiseSize = a.to;
      hand.betTo = a.to;
      hand.lastAggressor = cmd.seat;
      reopenOthers(s, cmd.seat, fullBet);
      break;
    }
    case "raise": {
      validateTo(a.to, legal.minRaiseTo!, legal.maxRaiseTo!, seat);
      const fullRaise = a.to >= hand.betTo + hand.lastFullRaiseSize;
      if (!fullRaise && a.to !== legal.maxRaiseTo)
        throw new EngineError("BAD_AMOUNT", "a raise below the minimum must be all-in");
      const add = a.to - seat.committed;
      commitChips(seat, add);
      if (fullRaise) {
        hand.lastFullRaiseSize = a.to - hand.betTo;
        reopenOthers(s, cmd.seat, true);
      }
      hand.betTo = a.to;
      hand.lastAggressor = cmd.seat;
      break;
    }
  }

  hand.actedSinceFullRaise[cmd.seat] = true;
  seat.timeouts = 0;
  const seq = hand.actionSeq;
  hand.actionSeq += 1;
  events.push({
    type: "ActionTaken",
    seat: cmd.seat,
    kind: a.kind,
    to: seat.committed,
    allIn: seat.allIn,
    actionSeq: seq,
  });

  afterAction(s, cmd.seat, events);
}

function validateTo(to: number, min: number, max: number, seat: SeatState): void {
  if (!Number.isInteger(to)) throw new EngineError("BAD_AMOUNT", "amount must be an integer");
  if (to < min || to > max)
    throw new EngineError("BAD_AMOUNT", `amount ${to} outside ${min}..${max}`);
  if (to - seat.committed > seat.stack) throw new EngineError("BAD_AMOUNT", "not enough chips");
}

/** A full bet/raise reopens the action for every other live seat. */
function reopenOthers(s: TableState, actor: number, full: boolean): void {
  if (!full || !s.hand) return;
  for (let i = 0; i < s.seats.length; i++) {
    if (i === actor) continue;
    s.hand.actedSinceFullRaise[i] = false;
  }
}

function doTimeout(s: TableState, idx: number, events: EngineEvent[]): void {
  const hand = s.hand;
  if (!hand || hand.toAct !== idx) throw new EngineError("BAD_STATE", "seat is not to act");
  const seat = seatAt(s, idx);
  const legal = computeLegal(s, idx);
  if (!legal) throw new EngineError("BAD_STATE", "no legal actions");
  const kind = legal.actions.includes("check") ? "check" : "fold";
  if (kind === "fold") seat.folded = true;
  hand.actedSinceFullRaise[idx] = true;
  seat.timeouts += 1;
  const seq = hand.actionSeq;
  hand.actionSeq += 1;
  events.push({ type: "ActionTaken", seat: idx, kind, to: seat.committed, allIn: seat.allIn, actionSeq: seq });
  afterAction(s, idx, events);
}

function doUseTimeBank(s: TableState, idx: number, events: EngineEvent[]): void {
  const hand = s.hand;
  if (!hand || hand.toAct !== idx) throw new EngineError("BAD_STATE", "seat is not to act");
  if (hand.timeBankUsed[idx]) throw new EngineError("NO_TIME_BANK", "time bank already used");
  hand.timeBankUsed[idx] = true;
  events.push({ type: "TimeBankUsed", seat: idx });
}

/** Fold a seat outside its turn (leave/sit-out mid-hand). */
function forceFold(s: TableState, idx: number, events: EngineEvent[]): void {
  const hand = s.hand!;
  const seat = s.seats[idx];
  seat.folded = true;
  hand.actedSinceFullRaise[idx] = true;
  const seq = hand.actionSeq;
  hand.actionSeq += 1;
  events.push({ type: "ActionTaken", seat: idx, kind: "fold", to: seat.committed, allIn: seat.allIn, actionSeq: seq });
  if (hand.toAct === idx) {
    afterAction(s, idx, events);
  } else if (liveSeats(s).length === 1) {
    settle(s, events);
  }
}

// ---------------------------------------------------------------------------
// Turn order, street advancement, settlement

function liveSeats(s: TableState): number[] {
  const out: number[] = [];
  for (let i = 0; i < s.seats.length; i++) {
    const seat = s.seats[i];
    if (seat.inHand && !seat.folded) out.push(i);
  }
  return out;
}

/** Next seat after `from` that still owes a decision this street, or -1. */
function findNextToAct(s: TableState, from: number): number {
  const hand = s.hand!;
  return nextSeatWhere(s.seats, from, (seat, idx) => {
    if (!seat.inHand || seat.folded || seat.allIn) return false;
    return seat.committed < hand.betTo || !hand.actedSinceFullRaise[idx];
  });
}

function afterAction(s: TableState, actor: number, events: EngineEvent[]): void {
  const hand = s.hand!;
  const live = liveSeats(s);
  if (live.length === 1) {
    settle(s, events);
    return;
  }
  const next = findNextToAct(s, actor);
  if (next >= 0) {
    hand.toAct = next;
    return;
  }
  closeStreetAndAdvance(s, events);
}

function dealStreet(s: TableState, events: EngineEvent[]): void {
  const hand = s.hand!;
  if (hand.street === "preflop") {
    hand.street = "flop";
    const cards = [hand.deck.pop()!, hand.deck.pop()!, hand.deck.pop()!];
    hand.board.push(...cards);
    events.push({ type: "StreetDealt", street: "flop", cards });
  } else if (hand.street === "flop") {
    hand.street = "turn";
    const card = hand.deck.pop()!;
    hand.board.push(card);
    events.push({ type: "StreetDealt", street: "turn", cards: [card] });
  } else {
    hand.street = "river";
    const card = hand.deck.pop()!;
    hand.board.push(card);
    events.push({ type: "StreetDealt", street: "river", cards: [card] });
  }
}

function closeStreetAndAdvance(s: TableState, events: EngineEvent[]): void {
  const hand = s.hand!;
  hand.toAct = -1;
  if (hand.street === "river") {
    hand.riverAggressor = hand.lastAggressor;
    settle(s, events);
    return;
  }

  // Reset per-street state.
  for (const seat of s.seats) seat.committed = 0;
  hand.betTo = 0;
  hand.lastFullRaiseSize = s.config.bb;
  hand.actedSinceFullRaise.fill(false);
  hand.lastAggressor = -1;

  // Can anyone still bet? Fewer than two live seats with chips = run it out.
  const canAct = liveSeats(s).filter((i) => !s.seats[i].allIn);
  if (canAct.length <= 1 && !hand.runout) hand.runout = true;

  dealStreet(s, events);

  if (hand.runout) {
    while (hand.board.length < 5) dealStreet(s, events);
    settle(s, events);
    return;
  }

  const first = findNextToAct(s, s.buttonSeat);
  if (first < 0) {
    // Everyone remaining is all-in (should have been caught above) — run out.
    hand.runout = true;
    while (hand.board.length < 5) dealStreet(s, events);
    settle(s, events);
    return;
  }
  hand.toAct = first;
}

function settle(s: TableState, events: EngineEvent[]): void {
  const hand = s.hand!;
  hand.toAct = -1;
  const n = s.seats.length;

  // 1) Refund the uncalled part of the highest total, if any.
  const totals = s.seats.map((seat) => (seat.inHand ? seat.totalCommitted : 0));
  let maxIdx = -1;
  let max = -1;
  let second = -1;
  for (let i = 0; i < n; i++) {
    if (!s.seats[i].inHand) continue;
    if (totals[i] > max) {
      second = max;
      max = totals[i];
      maxIdx = i;
    } else if (totals[i] > second) {
      second = totals[i];
    }
  }
  if (maxIdx >= 0 && max > second && second >= 0) {
    const refund = max - second;
    s.seats[maxIdx].stack += refund;
    s.seats[maxIdx].totalCommitted -= refund;
    totals[maxIdx] -= refund;
    events.push({ type: "Refund", seat: maxIdx, amount: refund });
  }

  const live = liveSeats(s);
  const pots = buildPots({
    totalCommitted: totals,
    inHand: s.seats.map((seat) => seat.inHand),
    folded: s.seats.map((seat) => seat.folded),
  });
  const potSum = pots.reduce((a, p) => a + p.amount, 0);
  const committedSum = totals.reduce((a, b) => a + b, 0);
  if (potSum !== committedSum)
    throw new EngineError("BAD_STATE", `pot layering leaked chips: ${potSum} != ${committedSum}`);

  if (live.length === 1) {
    // Everyone else folded — no showdown, no reveal.
    const winner = live[0];
    let total = 0;
    for (const pot of pots) total += pot.amount;
    if (total > 0) {
      s.seats[winner].stack += total;
      events.push({
        type: "PotAwarded",
        potIndex: 0,
        amount: total,
        winners: [winner],
        shares: { [winner]: total },
      });
    }
  } else {
    // Showdown.
    const scores: Record<number, number> = {};
    for (const idx of live) {
      scores[idx] = evaluate([...hand.holes[idx]!, ...hand.board]);
    }
    emitShowdownReveals(s, live, scores, pots, events);
    for (let p = 0; p < pots.length; p++) {
      const pot = pots[p];
      let best = -1;
      for (const idx of pot.eligible) best = Math.max(best, scores[idx]);
      const winners = pot.eligible.filter((idx) => scores[idx] === best);
      const shares = splitPot(pot.amount, winners, s.buttonSeat, n);
      for (const [seatStr, share] of Object.entries(shares)) {
        s.seats[Number(seatStr)].stack += share;
      }
      events.push({ type: "PotAwarded", potIndex: p, amount: pot.amount, winners, shares });
    }
  }

  finishHand(s, events);
}

/**
 * Showdown reveal order: on a contested river, the last river aggressor shows
 * first (or the first live seat left of the button if it checked through);
 * clockwise from there each hand shows only if it ties/beats the best shown so
 * far OR wins any pot — otherwise it mucks and its cards are never emitted.
 * On an all-in runout every live hand shows, from left of the button.
 */
function emitShowdownReveals(
  s: TableState,
  live: number[],
  scores: Record<number, number>,
  pots: ReturnType<typeof buildPots>,
  events: EngineEvent[],
): void {
  const hand = s.hand!;
  const n = s.seats.length;
  const winsAPot = new Set<number>();
  for (const pot of pots) {
    let best = -1;
    for (const idx of pot.eligible) best = Math.max(best, scores[idx]);
    for (const idx of pot.eligible) if (scores[idx] === best) winsAPot.add(idx);
  }

  const startFrom =
    !hand.runout && hand.riverAggressor >= 0 && live.includes(hand.riverAggressor)
      ? hand.riverAggressor
      : nextSeatWhere(s.seats, s.buttonSeat, (_seat, idx) => live.includes(idx));

  const order: number[] = [];
  for (let k = 0; k < n; k++) {
    const idx = (startFrom + k) % n;
    if (live.includes(idx)) order.push(idx);
  }

  let bestShown = -1;
  for (const idx of order) {
    const show = hand.runout || scores[idx] >= bestShown || winsAPot.has(idx);
    if (show) {
      bestShown = Math.max(bestShown, scores[idx]);
      events.push({
        type: "ShowdownReveal",
        seat: idx,
        cards: hand.holes[idx]!,
        mucked: false,
        score: scores[idx],
      });
    } else {
      events.push({ type: "ShowdownReveal", seat: idx, mucked: true });
    }
  }
}

function finishHand(s: TableState, events: EngineEvent[]): void {
  const hand = s.hand!;
  const stacks: Record<number, number> = {};
  for (let i = 0; i < s.seats.length; i++) {
    const seat = s.seats[i];
    if (!seat.inHand) continue;
    seat.committed = 0;
    seat.totalCommitted = 0;
    seat.inHand = false;
    seat.folded = false;
    seat.allIn = false;
    if (seat.pendingLeave) {
      vacateSeat(s, i, events);
      continue;
    }
    if (seat.pendingRebuy > 0) {
      seat.stack += seat.pendingRebuy;
      seat.pendingRebuy = 0;
      events.push({ type: "SeatChanged", seat: i, change: "rebuy", stack: seat.stack });
    }
    if (seat.timeouts >= 2 && seat.status === "active") {
      seat.status = "sittingOut";
      seat.timeouts = 0;
      events.push({ type: "SeatChanged", seat: i, change: "autoSitOut" });
    }
    stacks[i] = seat.stack;
  }
  events.push({ type: "HandEnded", handNo: hand.handNo, stacks });
  s.hand = null;
  s.phase = "interHand";
}

export { computeLegal };
