// Untangle — pure logic. A scatter of dots joined by straight lines. The lines
// cross each other; the player drags (or taps) the dots until no two lines
// cross. Nothing here knows about the DOM, about pixels, or about colour.
//
// THE BOARD IS BUILT FROM A CROSSING-FREE DRAWING, AND THAT IS THE WHOLE
// DESIGN.
//
// A child cannot tell an unsolvable puzzle from a hard one. They keep trying,
// they lose, and the thing that lied to them is the game. So this never picks
// random pairs of dots and hopes the result can be untangled, and it never runs
// a planarity test to filter afterwards either — a test that answers "I could
// not find a crossing-free drawing" reads the same for a graph that has none
// and for a search that ran out of room, and taking that first reading is how
// an impossible board reaches a five-year-old.
//
// `deal` works backwards instead:
//
//   1. LAY THE DOTS OUT. One dot per cell of a coarse grid, jittered inside its
//      own cell, so no two can ever land on top of each other and the pass
//      cannot fail or retry.
//   2. JOIN THEM WITHOUT CROSSING. Every pair of dots is considered shortest
//      first, and a line is kept only when it crosses nothing already kept and
//      passes through no third dot. The result is a crossing-free drawing by
//      construction, judged by `segmentsCross` — the same predicate that judges
//      the player.
//   3. THIN IT OUT to the tier's line count, refusing any removal that would
//      strand a dot on fewer than two lines or split the picture in two.
//   4. SCRAMBLE. Every dot moves to a slot on a ring, in a random order.
//
// Step 4 is the only step that can be wrong, and it is wrong in exactly one
// way: a scramble can happen to land crossing-free, which hands the player a
// board that is already finished. So the ring order is redrawn until the board
// carries at least the tier's floor of crossings, and `logic.test.ts` plants an
// already-solved board as the control that proves the check can fire at all.
//
// The crossing-free drawing travels ON the state as `solution`, and it is a
// WITNESS rather than an answer: nothing renders it, no rule reads it, and its
// one job is to let a restored board prove it is still winnable. Pipe Flow
// deliberately does the opposite with its `plan`, and the difference is worth
// stating. There, the plan IS the answer — the route every pipe must take. Here
// the witness is one crossing-free drawing out of infinitely many, it says
// nothing about how to reach it by dragging, and the player can already see
// every dot and every line. What it buys is real: an edge list restored off a
// disk could have no crossing-free drawing at all, and that board would render
// perfectly and never be winnable. Carrying the witness turns "this is still a
// fair puzzle" from a claim into something `session.validate` can check.
import { randInt, shuffle } from "@shared/rng";

/** A point in logic space: integers, so every geometry test below is exact. */
export interface Point {
  x: number;
  y: number;
}

/** A line, as the two dot INDICES it joins. Always `[lower, higher]`. */
export type Edge = readonly [number, number];

export type LevelId = "easy" | "medium" | "hard";

/**
 * The field is `SPAN` x `SPAN` logic units and the renderer maps that onto
 * whatever square it has. Integers throughout: the crossing test is a sign
 * comparison over cross products, and on integers those signs are exact rather
 * than nearly exact. A float board would make two lines that visibly meet
 * report "no crossing" once in a while, which is a board that refuses to be
 * won for no reason a player can see.
 */
export const SPAN = 1000;

/** No dot may sit closer than this to the edge of the field. */
export const MARGIN = 44;

/** How far one arrow-key press moves the selected dot. */
export const NUDGE_STEP = 20;

export interface Level {
  /** How many dots. */
  dots: number;
  /**
   * The most lines to keep. A CEILING and not a promise: the crossing-free
   * drawing of a small scatter sometimes holds fewer, and inventing the
   * difference would mean adding a line that crosses something.
   */
  lines: number;
  /** The scramble is redrawn until the board carries at least this many crossings. */
  crossings: number;
}

/**
 * Three tiers, and the line count grows FASTER than the dot count on purpose.
 *
 * Adding dots alone makes a board bigger rather than harder: a sparse scatter
 * unties dot by dot, because moving one dot can only ever disturb the lines
 * that touch it. What makes a tier deep is how many lines each dot carries, so
 * the ratio climbs 1.5 -> 1.67 -> 1.75 across the three.
 */
export const LEVELS: Record<LevelId, Level> = {
  easy: { dots: 6, lines: 9, crossings: 3 },
  medium: { dots: 9, lines: 15, crossings: 10 },
  hard: { dots: 12, lines: 21, crossings: 20 },
};

export const LEVEL_IDS = ["easy", "medium", "hard"] as const;

/** A gesture in flight: which dot is held, and where it was picked up from. */
export interface Grab {
  dot: number;
  from: Point;
}

export interface UntangleState {
  /** Where every dot is right now. Index IS the dot's identity. */
  nodes: Point[];
  /** Which dots are joined. Never a self-loop, never a duplicate. */
  edges: Edge[];
  /**
   * A crossing-free drawing of `edges`. See the header: a witness, not an
   * answer. Nothing renders it and no rule consults it.
   */
  solution: Point[];
  /** The dot waiting to be placed by a second tap, or null. */
  selected: number | null;
  /** The dot being dragged, or null. Never reaches the disk — see `settle`. */
  grab: Grab | null;
  /** Committed placements. See `endGrab` for what counts as one. */
  moves: number;
}

/* ---------------------------------------------------------------- geometry */

/**
 * Which way you turn going a -> b -> c: 1 left, -1 right, 0 straight on.
 *
 * The whole crossing test is built on this one function, and it is exact
 * because the coordinates are integers. The largest product it can form is
 * bounded by `SPAN * SPAN`, which is a million — nowhere near where a double
 * starts losing whole numbers.
 */
export function orient(a: Point, b: Point, c: Point): -1 | 0 | 1 {
  const v = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  return v > 0 ? 1 : v < 0 ? -1 : 0;
}

/** Does `p` lie on the segment a-b? Only meaningful when the three are collinear. */
function onSegment(a: Point, b: Point, p: Point): boolean {
  return (
    Math.min(a.x, b.x) <= p.x &&
    p.x <= Math.max(a.x, b.x) &&
    Math.min(a.y, b.y) <= p.y &&
    p.y <= Math.max(a.y, b.y)
  );
}

/**
 * Do the two segments share ANY point at all?
 *
 * Written as "proper crossing, or an endpoint of one lying on the other",
 * rather than as the familiar four-orientation one-liner. That one-liner is
 * only correct when all four turns are non-zero, and every interesting case
 * here has a zero in it: a dot dropped exactly onto another line, two lines
 * lying along each other, a dot dropped exactly onto another dot. Those are the
 * cases a player produces by accident and then cannot understand, so they are
 * the cases this is written around rather than the ones it assumes away.
 *
 * Note what this does NOT decide: whether two segments sharing a DOT count as
 * crossing. That question is about identity, not geometry, so it belongs to
 * `edgesCross` one level up.
 */
export function segmentsCross(a: Point, b: Point, c: Point, d: Point): boolean {
  const o1 = orient(a, b, c);
  const o2 = orient(a, b, d);
  const o3 = orient(c, d, a);
  const o4 = orient(c, d, b);

  // A clean X: each segment has the other's ends strictly on opposite sides.
  if (o1 !== 0 && o2 !== 0 && o3 !== 0 && o4 !== 0 && o1 !== o2 && o3 !== o4) return true;

  // ...otherwise they meet only if an end of one sits on the other. This is
  // what makes a T-touch and a collinear overlap both count, and it is why two
  // collinear segments that merely point at each other from a distance do not.
  if (o1 === 0 && onSegment(a, b, c)) return true;
  if (o2 === 0 && onSegment(a, b, d)) return true;
  if (o3 === 0 && onSegment(c, d, a)) return true;
  if (o4 === 0 && onSegment(c, d, b)) return true;
  return false;
}

/**
 * Do these two lines of the board cross?
 *
 * TWO LINES THAT SHARE A DOT NEVER COUNT, whatever the geometry says. They meet
 * at that dot by definition, and a game that scored the meeting point as a
 * crossing would be unwinnable from the first frame. The check is on the dot
 * INDEX rather than on the position, so it holds even when a player has stacked
 * two dots on the same spot — and it is why the rule is stated here, over the
 * edge list, instead of down in `segmentsCross` where only coordinates exist.
 *
 * The cost of that rule, said out loud: two lines sharing a dot and lying along
 * each other overlap on screen and are not counted. It looks untidy for as long
 * as the player leaves it that way, and it is the only alternative to a board
 * that can never be finished.
 */
export function edgesCross(nodes: readonly Point[], e1: Edge, e2: Edge): boolean {
  if (e1[0] === e2[0] || e1[0] === e2[1] || e1[1] === e2[0] || e1[1] === e2[1]) return false;
  return segmentsCross(nodes[e1[0]], nodes[e1[1]], nodes[e2[0]], nodes[e2[1]]);
}

/** Every pair of line indices that cross right now, lower index first. */
export function crossingPairs(nodes: readonly Point[], edges: readonly Edge[]): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let i = 0; i < edges.length; i++) {
    for (let j = i + 1; j < edges.length; j++) {
      if (edgesCross(nodes, edges[i], edges[j])) out.push([i, j]);
    }
  }
  return out;
}

/** How many crossings the board carries — the number the stat row shows. */
export function countCrossings(state: Pick<UntangleState, "nodes" | "edges">): number {
  return crossingPairs(state.nodes, state.edges).length;
}

/**
 * Which lines are involved in a crossing, as line indices.
 *
 * The renderer paints these differently, and that is the entire teaching
 * surface of this game: nothing tells a child WHERE to move a dot, but the
 * board is always honest about which lines are still in trouble.
 */
export function crossingEdges(state: Pick<UntangleState, "nodes" | "edges">): Set<number> {
  const out = new Set<number>();
  for (const [i, j] of crossingPairs(state.nodes, state.edges)) {
    out.add(i);
    out.add(j);
  }
  return out;
}

/** How many crossings touch a line that this dot carries. */
export function crossingsAtDot(state: Pick<UntangleState, "nodes" | "edges">, dot: number): number {
  let n = 0;
  for (const [i, j] of crossingPairs(state.nodes, state.edges)) {
    const a = state.edges[i];
    const b = state.edges[j];
    if (a[0] === dot || a[1] === dot || b[0] === dot || b[1] === dot) n++;
  }
  return n;
}

/** No two lines cross. That is the whole win condition. */
export function isSolved(state: Pick<UntangleState, "nodes" | "edges">): boolean {
  return countCrossings(state) === 0;
}

/**
 * What this game's record measures, in the one place that says so.
 *
 * IT IS THE CLOCK, and picking it over a move count was not a toss-up. A move
 * here is a dot put down somewhere, and putting a dot down is free: nothing is
 * spent, nothing is lost, and nudging the same dot four times to see what
 * happens is how the game is meant to be learned. So a move count would be
 * unbounded above, it would rank a cautious player below a lucky one, and worst
 * of all it would put a price on the exploring — which is the one thing a
 * puzzle for children must never do. A clock asks the same question of
 * everybody and answers it in a unit anyone can read.
 *
 * Only the VALUE is persisted, never the unit, so `sdk/score.ts` reads
 * `scoreUnit` off the DOM-free meta to decide that a faster time wins. The
 * board scopes the record to the tier: six dots and twelve dots are not the
 * same puzzle, so they are not the same record.
 */
export function scoreFor(level: LevelId, elapsedMs: number): { value: number; unit: "ms"; board: LevelId } {
  return { value: elapsedMs, unit: "ms", board: level };
}

/* ------------------------------------------------------------------- rules */

export type UntangleOutcome =
  | { kind: "ignored" }
  | { kind: "grabbed"; dot: number }
  | { kind: "dragged"; dot: number; to: Point }
  | { kind: "released"; dot: number; counted: boolean }
  | { kind: "selected"; dot: number }
  | { kind: "deselected"; dot: number }
  | { kind: "placed"; dot: number; to: Point; counted: boolean };

export interface UntangleStep {
  state: UntangleState;
  outcome: UntangleOutcome;
}

const IGNORED = { kind: "ignored" } as const;

const isDot = (state: UntangleState, dot: unknown): dot is number =>
  Number.isInteger(dot) && (dot as number) >= 0 && (dot as number) < state.nodes.length;

/**
 * Keep a point inside the field, on whole units.
 *
 * The margin is not decoration: a dot at the very corner of the field is half
 * off the screen once the renderer draws it centred on its own coordinate, and
 * a dot a finger cannot reach is a board that cannot be finished.
 */
export function clampPoint(p: Point): Point {
  const fit = (v: number) => Math.max(MARGIN, Math.min(SPAN - MARGIN, Math.round(v)));
  return { x: fit(p.x), y: fit(p.y) };
}

const same = (a: Point, b: Point): boolean => a.x === b.x && a.y === b.y;

function withNode(state: UntangleState, dot: number, at: Point): Point[] {
  const nodes = state.nodes.slice();
  nodes[dot] = at;
  return nodes;
}

/** Pick a dot up. Also selects it, so lifting the finger without moving leaves it chosen. */
export function beginGrab(state: UntangleState, dot: number): UntangleStep {
  if (!isDot(state, dot)) return { state, outcome: IGNORED };
  return {
    state: { ...state, selected: dot, grab: { dot, from: state.nodes[dot] } },
    outcome: { kind: "grabbed", dot },
  };
}

/** Move the held dot. Never counts: a drag is one placement however far it wanders. */
export function dragTo(state: UntangleState, to: Point): UntangleStep {
  const grab = state.grab;
  if (grab === null) return { state, outcome: IGNORED };
  const at = clampPoint(to);
  if (same(at, state.nodes[grab.dot])) return { state, outcome: IGNORED };
  return {
    state: { ...state, nodes: withNode(state, grab.dot, at) },
    outcome: { kind: "dragged", dot: grab.dot, to: at },
  };
}

/**
 * The finger lifted.
 *
 * This is the split between a DRAG and a TAP, and it is the whole reason drag
 * can be optional here. A dot that ended somewhere new was dragged: the
 * placement counts and the selection is dropped, because the gesture said
 * everything it had to say. A dot that ended where it started was TAPPED: it
 * stays selected, so the next tap anywhere on the field puts it there. One
 * `<button>` and one pointer handler serve both.
 */
export function endGrab(state: UntangleState): UntangleStep {
  const grab = state.grab;
  if (grab === null) return { state, outcome: IGNORED };
  const moved = !same(state.nodes[grab.dot], grab.from);
  return {
    state: {
      ...state,
      grab: null,
      selected: moved ? null : grab.dot,
      moves: state.moves + (moved ? 1 : 0),
    },
    outcome: { kind: "released", dot: grab.dot, counted: moved },
  };
}

/** Choose a dot, or unchoose the one already chosen. The keyboard's way in. */
export function selectDot(state: UntangleState, dot: number): UntangleStep {
  if (!isDot(state, dot)) return { state, outcome: IGNORED };
  if (state.selected === dot) {
    return { state: { ...state, selected: null }, outcome: { kind: "deselected", dot } };
  }
  return { state: { ...state, selected: dot }, outcome: { kind: "selected", dot } };
}

/**
 * Put the chosen dot down here — the second half of the tap route.
 *
 * TAP IS A COMPLETE PATH THROUGH THIS GAME. Touch a dot, touch a spot, the dot
 * is there. Drag is layered on top of the same rules and is never required,
 * because a five-year-old on a phone and anyone using assistive input cannot
 * hold a sustained gesture, and a puzzle only they cannot play is a puzzle this
 * platform should not ship.
 */
export function placeSelected(state: UntangleState, to: Point): UntangleStep {
  const dot = state.selected;
  if (dot === null) return { state, outcome: IGNORED };
  const at = clampPoint(to);
  const counted = !same(at, state.nodes[dot]);
  return {
    state: {
      ...state,
      nodes: counted ? withNode(state, dot, at) : state.nodes,
      selected: null,
      grab: null,
      moves: state.moves + (counted ? 1 : 0),
    },
    outcome: { kind: "placed", dot, to: at, counted },
  };
}

/**
 * Shift the chosen dot by one step — the arrow keys.
 *
 * It counts, and a drag counts once, so a player who works entirely from the
 * keyboard will show a far bigger number than one with a finger. That is fine
 * BECAUSE the record is the clock: `moves` is something to watch, never
 * something to beat, and the two ways of playing were never going to produce
 * the same count.
 */
export function nudge(state: UntangleState, dx: number, dy: number): UntangleStep {
  const dot = state.selected;
  if (dot === null) return { state, outcome: IGNORED };
  const at = clampPoint({ x: state.nodes[dot].x + dx, y: state.nodes[dot].y + dy });
  if (same(at, state.nodes[dot])) return { state, outcome: IGNORED };
  return {
    state: { ...state, nodes: withNode(state, dot, at), moves: state.moves + 1 },
    outcome: { kind: "placed", dot, to: at, counted: true },
  };
}

/**
 * The board with every gesture closed — what gets stored, never what gets shown.
 *
 * A snapshot caught mid-drag would come back with a dot held by nobody: the
 * next touch anywhere near it would finish a gesture the player has no memory
 * of starting, and a stored `selected` would put a dot under the first tap on
 * empty space. Both are boards that render perfectly and behave strangely, and
 * both are impossible if the transient half is stripped at SAVE time rather
 * than at load time — because then the disk can never hold one at all.
 */
export function settle(state: UntangleState): UntangleState {
  if (state.selected === null && state.grab === null) return state;
  return { ...state, selected: null, grab: null };
}

/* -------------------------------------------------------------- the deal */

/**
 * The jitter box inside each grid cell, as a fraction of the cell.
 *
 * 0.5 puts every dot somewhere in the middle half of its own cell, so two dots
 * in neighbouring cells are always at least half a cell apart. That is what
 * makes the layout pass need no rejection and no retry: separation is a
 * property of the arithmetic rather than something the loop keeps checking for.
 */
const JITTER = 0.5;

/** One dot per cell of a coarse grid, jittered inside its own cell. */
function layout(dots: number, rng: () => number): Point[] {
  const cols = Math.ceil(Math.sqrt(dots));
  const rows = Math.ceil(dots / cols);
  const usable = SPAN - 2 * MARGIN;
  const cellW = usable / cols;
  const cellH = usable / rows;
  const inset = (1 - JITTER) / 2;

  const cells = shuffle(
    Array.from({ length: cols * rows }, (_, i) => i),
    rng,
  ).slice(0, dots);

  return cells.map((cell) => {
    const cx = MARGIN + (cell % cols) * cellW;
    const cy = MARGIN + Math.floor(cell / cols) * cellH;
    return clampPoint({
      x: cx + cellW * inset + randInt(0, Math.round(cellW * JITTER), rng),
      y: cy + cellH * inset + randInt(0, Math.round(cellH * JITTER), rng),
    });
  });
}

/** Does the segment a-b run through some third dot? */
function throughAnotherDot(pts: readonly Point[], a: number, b: number): boolean {
  for (let k = 0; k < pts.length; k++) {
    if (k === a || k === b) continue;
    if (orient(pts[a], pts[b], pts[k]) === 0 && onSegment(pts[a], pts[b], pts[k])) return true;
  }
  return false;
}

/**
 * Join the dots without a single crossing, shortest pair first.
 *
 * Taking the shortest candidate first is what makes the picture look like a
 * web rather than a fan: long lines only survive where nothing shorter has
 * already claimed the space. It also fills the drawing in — the result is a
 * maximal crossing-free set, so every dot is joined to something and the
 * picture is in one piece before anything is thinned out.
 *
 * A candidate that runs THROUGH a third dot is refused as well as one that
 * crosses a line. Three dots in a row is rare and perfectly possible on a
 * lattice, and a line drawn straight over a dot is a picture nobody can read.
 */
function joinWithoutCrossing(pts: readonly Point[]): Edge[] {
  const candidates: Array<{ a: number; b: number; d2: number }> = [];
  for (let a = 0; a < pts.length; a++) {
    for (let b = a + 1; b < pts.length; b++) {
      const dx = pts[a].x - pts[b].x;
      const dy = pts[a].y - pts[b].y;
      candidates.push({ a, b, d2: dx * dx + dy * dy });
    }
  }
  // Ties broken by index so one seed always produces one board.
  candidates.sort((p, q) => p.d2 - q.d2 || p.a - q.a || p.b - q.b);

  const kept: Edge[] = [];
  for (const c of candidates) {
    const edge: Edge = [c.a, c.b];
    if (throughAnotherDot(pts, c.a, c.b)) continue;
    if (kept.some((e) => edgesCross(pts, e, edge))) continue;
    kept.push(edge);
  }
  return kept;
}

/** Is every dot reachable from every other along these lines? */
function connected(dots: number, edges: readonly Edge[]): boolean {
  if (dots === 0) return true;
  const adj: number[][] = Array.from({ length: dots }, () => []);
  for (const [a, b] of edges) {
    adj[a].push(b);
    adj[b].push(a);
  }
  const seen = new Set<number>([0]);
  const queue = [0];
  for (let head = 0; head < queue.length; head++) {
    for (const next of adj[queue[head]]) {
      if (seen.has(next)) continue;
      seen.add(next);
      queue.push(next);
    }
  }
  return seen.size === dots;
}

/** Below this a dot is a dead end, and a dead end can never be part of a crossing. */
const MIN_DEGREE = 2;

/**
 * Thin the drawing down to the tier's line count.
 *
 * Two refusals, and both of them are about the puzzle rather than about the
 * picture. A dot left carrying one line can be dropped anywhere at all and
 * still be right, so it is a dot that does not participate; and a drawing in
 * two pieces is two smaller puzzles side by side, which is easier than one
 * puzzle of the same size.
 */
function thin(dots: number, edges: readonly Edge[], target: number, rng: () => number): Edge[] {
  const degree = new Array<number>(dots).fill(0);
  for (const [a, b] of edges) {
    degree[a]++;
    degree[b]++;
  }
  const dropped = new Set<number>();
  let live = edges.length;

  for (const i of shuffle(
    edges.map((_, idx) => idx),
    rng,
  )) {
    if (live <= target) break;
    const [a, b] = edges[i];
    if (degree[a] <= MIN_DEGREE || degree[b] <= MIN_DEGREE) continue;
    const rest = edges.filter((_, j) => j !== i && !dropped.has(j));
    if (!connected(dots, rest)) continue;
    dropped.add(i);
    live--;
    degree[a]--;
    degree[b]--;
  }

  return edges.filter((_, j) => !dropped.has(j));
}

/**
 * How many ring orders to try before settling for the most tangled one seen.
 *
 * A bound rather than a loop until it works. The floor is a property of the
 * particular drawing, so a pathological one could in principle never reach it,
 * and a deal that hangs is worse than a deal that starts a little tidier than
 * intended. In practice the first order clears the floor almost every time —
 * `scripts/sim/untangle-graphs.mjs` reports how often it does not.
 */
const SCRAMBLE_ATTEMPTS = 40;

/** The slots a scrambled dot can occupy: evenly spaced around a ring, starting at the top. */
export function ringSlots(dots: number): Point[] {
  const radius = SPAN / 2 - MARGIN - 16;
  return Array.from({ length: dots }, (_, i) => {
    const angle = (2 * Math.PI * i) / dots - Math.PI / 2;
    return clampPoint({
      x: SPAN / 2 + radius * Math.cos(angle),
      y: SPAN / 2 + radius * Math.sin(angle),
    });
  });
}

/**
 * Put every dot on the ring, in a random order, until the board is tangled.
 *
 * The ring is doing three jobs at once, which is why it beats scattering the
 * dots at random: no two dots can land on top of each other, nothing lands off
 * the field or under the frame, and every dot is the same comfortable distance
 * from its neighbours whatever tier is being played — so the smallest gap a
 * finger has to hit is a number this file decides rather than one the dice do.
 */
function scramble(dots: number, edges: readonly Edge[], floor: number, rng: () => number): Point[] {
  const slots = ringSlots(dots);
  let best: Point[] = slots.slice();
  let bestCrossings = -1;

  for (let attempt = 0; attempt < SCRAMBLE_ATTEMPTS; attempt++) {
    const order = shuffle(
      Array.from({ length: dots }, (_, i) => i),
      rng,
    );
    const nodes = new Array<Point>(dots);
    order.forEach((dot, slot) => {
      nodes[dot] = slots[slot];
    });
    const n = crossingPairs(nodes, edges).length;
    if (n >= floor) return nodes;
    if (n > bestCrossings) {
      bestCrossings = n;
      best = nodes;
    }
  }
  return best;
}

/**
 * A board: a tangled drawing, and the crossing-free one it was cut from.
 *
 * `rng` is injectable and LAST, so the tests and
 * `scripts/sim/untangle-graphs.mjs` drive the same deal a player gets.
 */
export function deal(level: LevelId, rng: () => number = Math.random): UntangleState {
  const spec = LEVELS[level];
  const solution = layout(spec.dots, rng);
  const edges = thin(spec.dots, joinWithoutCrossing(solution), spec.lines, rng);
  const nodes = scramble(spec.dots, edges, spec.crossings, rng);
  return { nodes, edges, solution, selected: null, grab: null, moves: 0 };
}

export function newGame(level: LevelId, rng: () => number = Math.random): UntangleState {
  return deal(level, rng);
}
