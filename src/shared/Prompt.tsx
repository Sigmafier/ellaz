// The instruction chip at the top of a kids game: a glyph, the instruction in
// the player's language, and a speaker that reads it aloud.
//
// SPEECH IS SUPPLEMENTARY HERE, BY CONSTRUCTION. The text is ALWAYS rendered;
// the speaker only ever repeats what is already on screen. Nothing in this chip
// is unreachable with the sound off, which is the hard rule at the top of
// `src/sdk/speech.ts` — a voice can be present, be selected, fire `onend` on
// time and still emit no sound, and that failure is invisible to JavaScript.
//
// Voices load ASYNCHRONOUSLY. Reading `available()` once at render is the
// documented bug: on Chrome `getVoices()` returns `[]` until `voiceschanged`
// fires, so a one-shot read concludes "no Hebrew voice" on a machine that has
// one and the speaker never appears. We seed with `available(ctx.locale)` (which
// also tells the port WHICH locale we care about) and then SUBSCRIBE.
import { useCallback, useEffect, useState, type ReactElement } from "react";
import type { GameContext } from "@sdk/index";
import { IconButton } from "@ui/index";

export interface PromptProps {
  ctx: GameContext;
  /** Optional decorative glyph. Hidden from screen readers — the text carries it. */
  glyph?: string;
  /** The instruction, already in the player's language. Always visible. */
  text: string;
  /** What to SAY, when it differs from what to show (e.g. drop a "?" or an emoji). */
  speak?: string;
}

export function Prompt({ ctx, glyph, text, speak }: PromptProps): ReactElement {
  const [canSpeak, setCanSpeak] = useState(false);

  useEffect(() => {
    // Order matters: `available()` sets the locale the port answers for, and the
    // subscription then fires immediately with that locale's real value.
    setCanSpeak(ctx.speech.available(ctx.locale));
    return ctx.speech.onAvailabilityChange(setCanSpeak);
  }, [ctx]);

  const say = useCallback(() => {
    // Inside the tap, so iOS opens its gate. Both calls are no-throw by contract.
    ctx.speech.unlock();
    void ctx.speech.speak(speak ?? text, { locale: ctx.locale });
  }, [ctx, speak, text]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-3)",
        // Logical properties only — this chip renders inside an RTL app by
        // default, and a hardcoded `paddingLeft` would land on the wrong side.
        paddingBlock: "var(--space-2)",
        paddingInline: "var(--space-4)",
        background: "var(--surface)",
        borderRadius: "var(--radius-3)",
        boxShadow: "var(--shadow-1)",
        maxWidth: "min(92vw, 560px)",
      }}
    >
      {glyph ? (
        <span aria-hidden="true" style={{ fontSize: 30, lineHeight: 1 }}>
          {glyph}
        </span>
      ) : null}
      <span
        style={{
          flex: 1,
          minWidth: 0,
          // `start`, not `left`: reads correctly in both directions.
          textAlign: "start",
          fontSize: 18,
          fontWeight: 700,
          lineHeight: 1.25,
        }}
      >
        {text}
      </span>
      {canSpeak ? (
        // IconButton is already a full `var(--tap)` target on both axes.
        <IconButton ariaLabel={ctx.locale === "he" ? "השמע" : "listen"} onClick={say}>
          🔊
        </IconButton>
      ) : null}
    </div>
  );
}
