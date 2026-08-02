// Musical pitches for games that make their own sound via `ctx.audio.tone()`.

/**
 * C major pentatonic — C4 D4 E4 G4 A4 C5, in Hz.
 *
 * Pentatonic because it contains no semitone and no tritone, so ANY random
 * order of these notes is consonant. A repeat-the-sequence game can therefore
 * pick pitches at random and still sound musical, with no scale logic in the
 * game itself.
 */
export const PENTATONIC = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25] as const;

/** Human-readable names, index-aligned with PENTATONIC (for debugging/labels). */
export const PENTATONIC_NAMES = ["C4", "D4", "E4", "G4", "A4", "C5"] as const;
