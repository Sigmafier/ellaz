// Breaking an amount into chips.
//
// Pure, and separate from the drawing, for the reason everything in this repo
// is: the arithmetic is the part that can be wrong in a way nobody sees. A
// stack that does not sum to the bet it represents is a picture of a lie at a
// poker table, and it looks completely normal.
//
// The NUMBER is always drawn beside the chips and is the authority. The chips
// are there so a glance tells you roughly how big a bet is without reading.

/** Largest first — the decomposition is greedy and relies on this order. */
export const DENOMS = [100, 25, 5, 1] as const;

export interface ChipColumn {
  /** The denomination this column is made of. */
  value: number;
  /** How many chips of it. Always >= 1; a zero column is never emitted. */
  count: number;
}

/**
 * Exact greedy decomposition, largest denomination first.
 *
 * Exact rather than capped: capping belongs to the renderer, which knows how
 * much room it has. A pure function that quietly drops chips would make
 * `sum(columns) === amount` false, and then no caller could rely on it —
 * including the test that proves it.
 *
 * Anything that is not a positive whole number gives an EMPTY stack rather
 * than a guess. Amounts reach here from the wire, and the honest picture of
 * "I cannot represent this" is no chips beside the number, not a wrong pile.
 */
export function chipStack(amount: number): ChipColumn[] {
  if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount <= 0) return [];
  const out: ChipColumn[] = [];
  let left = amount;
  for (const value of DENOMS) {
    const count = Math.floor(left / value);
    if (count > 0) {
      out.push({ value, count });
      left -= count * value;
    }
  }
  return out;
}

/** What a stack is worth. The invariant the tests hold `chipStack` to. */
export function stackValue(cols: readonly ChipColumn[]): number {
  return cols.reduce((n, c) => n + c.value * c.count, 0);
}

/**
 * The columns a renderer should draw, given how many it can fit.
 *
 * Keeps the LARGEST denominations, because those carry the value and are what
 * a glance is reading. Dropping the small change from the picture is fine —
 * the number beside it is exact — whereas dropping the black chips would make
 * a 300 bet look like a 12.
 */
export function visibleColumns(cols: readonly ChipColumn[], max: number): ChipColumn[] {
  if (max <= 0) return [];
  return cols.slice(0, max);
}

/** Chip face colour, by denomination. Themed, so a theme can restyle them. */
export function chipVar(value: number): string {
  return `var(--chip-${value})`;
}
