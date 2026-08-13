import { MAX_STAGE, type Pet } from "./logic";

/**
 * The creature, drawn from scratch in one 100x100 viewBox.
 *
 * ORIGINAL SHAPES AND ORIGINAL NAMES. Everything here is an ellipse, an arc and
 * a hand-written path; nothing quotes a character anybody owns, and the three
 * creatures differ only in colour and in the tuft on top - see the legal rule
 * in CLAUDE.md.
 *
 * IT GROWS BY BEING BIGGER AND BY GAINING PARTS, not by turning into something
 * else. A child who looks away for a week and comes back has to recognise the
 * same friend - so the face, the eyes and the belly are constant, and each
 * stage adds cheeks, then arms, then freckles, then a sparkle.
 *
 * Purely decorative and marked `aria-hidden`: the creature's NAME is on the
 * button around it, because an SVG blob reads as nothing to a screen reader.
 */
export function PetArt({
  pet,
  stage,
  delighted,
}: {
  pet: Pet;
  stage: number;
  delighted: boolean;
}) {
  // Half size as a newborn, full size fully grown. Derived from MAX_STAGE so a
  // sixth stage added to `logic.ts` re-spaces the whole ladder on its own.
  const k = 0.5 + (0.5 * Math.min(stage, MAX_STAGE)) / MAX_STAGE;

  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true" focusable="false">
      {/* The shadow sits OUTSIDE the scaled group so it stays on the ground
          rather than being lifted with the creature. */}
      <ellipse cx="50" cy="94" rx={26 * k} ry={4.6 * k} fill="rgba(0,0,0,0.11)" />

      {/* Scaled about the feet, using the SVG transform ATTRIBUTE rather than a
          CSS transform: `transform-box: view-box` is the newer spelling and a
          browser that ignores it would scale the pet about the top-left corner
          and send it off screen. A plausible wrong picture with no error is
          exactly the failure this repo keeps writing rules about. */}
      <g transform={`translate(50 94) scale(${k}) translate(-50 -94)`}>
        {/* feet */}
        <ellipse cx="40" cy="91" rx="8" ry="4.6" fill={pet.ink} />
        <ellipse cx="60" cy="91" rx="8" ry="4.6" fill={pet.ink} />

        {/* the tuft on top - the one silhouette difference between the three */}
        {pet.crest === "tuft" && (
          <path
            d="M50 39 C44 32 53 29 49 21 C60 25 59 34 50 39 Z"
            fill={pet.ink}
            opacity="0.82"
          />
        )}
        {pet.crest === "leaf" && (
          <>
            <path d="M50 40 L50 28" stroke="#3f8f5c" strokeWidth="2.6" strokeLinecap="round" />
            <path d="M50 30 C42 28 41 20 50 19 C57 23 56 29 50 30 Z" fill="#5cc487" />
          </>
        )}
        {pet.crest === "horns" && (
          <>
            <path d="M40 40 C36 33 38 27 43 25 C43 31 43 35 45 39 Z" fill={pet.ink} opacity="0.8" />
            <path d="M60 40 C64 33 62 27 57 25 C57 31 57 35 55 39 Z" fill={pet.ink} opacity="0.8" />
          </>
        )}

        {/* arms, from the middle stage on */}
        {stage >= 2 && (
          <>
            <ellipse cx="23" cy="70" rx="6" ry="9.5" fill={pet.body} transform="rotate(-16 23 70)" />
            <ellipse cx="77" cy="70" rx="6" ry="9.5" fill={pet.body} transform="rotate(16 77 70)" />
          </>
        )}

        {/* body + belly */}
        <ellipse cx="50" cy="64" rx="27" ry="29" fill={pet.body} />
        <ellipse cx="50" cy="72" rx="17" ry="17" fill={pet.belly} />

        {/* freckles, once it is nearly grown */}
        {stage >= 3 && (
          <>
            <circle cx="30" cy="56" r="1.9" fill={pet.ink} opacity="0.28" />
            <circle cx="35" cy="50" r="1.5" fill={pet.ink} opacity="0.24" />
            <circle cx="70" cy="56" r="1.9" fill={pet.ink} opacity="0.28" />
            <circle cx="65" cy="50" r="1.5" fill={pet.ink} opacity="0.24" />
          </>
        )}

        {/* cheeks */}
        {stage >= 1 && (
          <>
            <circle cx="32" cy="68" r="4.2" fill="#ff7fa6" opacity="0.5" />
            <circle cx="68" cy="68" r="4.2" fill="#ff7fa6" opacity="0.5" />
          </>
        )}

        {/* eyes - open normally, happily shut the moment it is delighted */}
        {delighted ? (
          <>
            <path
              d="M36.4 61.5 q4.6 -6 9.2 0"
              stroke={pet.ink}
              strokeWidth="2.7"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M54.4 61.5 q4.6 -6 9.2 0"
              stroke={pet.ink}
              strokeWidth="2.7"
              fill="none"
              strokeLinecap="round"
            />
          </>
        ) : (
          <>
            <ellipse cx="41" cy="60" rx="4.6" ry="5.4" fill={pet.ink} />
            <ellipse cx="59" cy="60" rx="4.6" ry="5.4" fill={pet.ink} />
            <circle cx="42.7" cy="58.1" r="1.7" fill="#ffffff" />
            <circle cx="60.7" cy="58.1" r="1.7" fill="#ffffff" />
          </>
        )}

        {/* mouth */}
        {delighted ? (
          <path d="M43 70 q7 8.5 14 0 z" fill={pet.ink} opacity="0.9" />
        ) : (
          <path
            d="M44 70.5 q6 6 12 0"
            stroke={pet.ink}
            strokeWidth="2.4"
            fill="none"
            strokeLinecap="round"
          />
        )}

        {/* fully grown: a few sparks, so the last stage looks like an arrival */}
        {stage >= MAX_STAGE && (
          <>
            <circle cx="20" cy="44" r="2.2" fill="#ffd43b" />
            <circle cx="80" cy="48" r="1.8" fill="#ffd43b" />
            <circle cx="74" cy="34" r="1.4" fill="#ffd43b" />
          </>
        )}
      </g>
    </svg>
  );
}
