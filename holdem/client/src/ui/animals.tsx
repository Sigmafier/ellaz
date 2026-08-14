// The twenty animals a player can be called, drawn instead of typed.
//
// These are the only icons in this app that are NOT `currentColor`, and the
// reason is legibility rather than decoration. They render at 14-24px beside a
// name, and at that size the silhouettes of a tiger, a lion, a bear and a
// panda are the same circle with two ears. Colour is what separates them —
// which is exactly why the emoji they replace were coloured too. Shape alone
// would be a row of identical grey blobs.
//
// What the emoji could not do is be the same picture twice. `🐿️` is a
// different animal on Android, iOS and Windows, several of the twenty have no
// glyph at all in older system fonts and fall back to a hollow box, and
// `nameEmoji` returning undefined for an unknown word rendered as nothing at
// all. A player's avatar is their identity at the table; it cannot be a
// property of the phone they happen to own.
//
// Each is built from a handful of primitives on a 100x100 grid. Nothing here
// is finely detailed on purpose: detail below about 20px turns to mud, and
// these are seen at 14.

const FUR = {
  tiger: "#f0932b",
  lion: "#e6a23c",
  fox: "#e8590c",
  bear: "#8d6e52",
  rabbit: "#e8dcd2",
  turtle: "#2f9e44",
  dolphin: "#5ab4e0",
  owl: "#a9754f",
  falcon: "#7b6355",
  hedgehog: "#a08064",
  penguin: "#2b3440",
  squirrel: "#c96f3a",
  whale: "#3b7dd8",
  monkey: "#a5714c",
  badger: "#7e8a94",
  lizard: "#4caf50",
  giraffe: "#f0c14b",
  panda: "#f3f2ee",
  zebra: "#f3f2ee",
  heron: "#f28ba8",
} as const;

export type AnimalId = keyof typeof FUR;

const DARK = "#2b2118";
const WHITE = "#ffffff";

function A({ size = 20, children }: { size?: number; children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      aria-hidden
      style={{ display: "block", flex: "0 0 auto" }}
    >
      {children}
    </svg>
  );
}

/** Two dots, the same on nearly every face. Kept large — small eyes vanish. */
const Eyes = ({ cx = 18, cy = 52, r = 6 }: { cx?: number; cy?: number; r?: number }) => (
  <>
    <circle cx={50 - cx} cy={cy} r={r} fill={DARK} />
    <circle cx={50 + cx} cy={cy} r={r} fill={DARK} />
  </>
);

// ---------------------------------------------------------------------------

const Tiger = ({ size }: { size?: number }) => (
  <A size={size}>
    <circle cx="24" cy="26" r="13" fill={FUR.tiger} />
    <circle cx="76" cy="26" r="13" fill={FUR.tiger} />
    <circle cx="50" cy="55" r="36" fill={FUR.tiger} />
    <path d="M34 24l5 14M50 20l0 14M66 24l-5 14" stroke={DARK} strokeWidth="5" strokeLinecap="round" />
    <Eyes />
    <path d="M42 72h16" stroke={DARK} strokeWidth="5" strokeLinecap="round" />
  </A>
);

const Lion = ({ size }: { size?: number }) => (
  <A size={size}>
    {/* The mane is the whole tell: twelve points around a plain head. */}
    <g fill="#b9752a">
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return <circle key={i} cx={50 + Math.cos(a) * 34} cy={50 + Math.sin(a) * 34} r="14" />;
      })}
    </g>
    <circle cx="50" cy="50" r="30" fill={FUR.lion} />
    <Eyes cy={46} />
    <circle cx="50" cy="62" r="5" fill={DARK} />
  </A>
);

const Fox = ({ size }: { size?: number }) => (
  <A size={size}>
    <path d="M14 12l20 22-16 16z" fill={FUR.fox} />
    <path d="M86 12L66 34l16 16z" fill={FUR.fox} />
    <path d="M50 92L12 40c10-8 24-12 38-12s28 4 38 12z" fill={FUR.fox} />
    <path d="M50 92L28 62h44z" fill={WHITE} />
    <Eyes cy={52} r={5} />
    <circle cx="50" cy="82" r="5" fill={DARK} />
  </A>
);

const Bear = ({ size }: { size?: number }) => (
  <A size={size}>
    <circle cx="22" cy="24" r="15" fill={FUR.bear} />
    <circle cx="78" cy="24" r="15" fill={FUR.bear} />
    <circle cx="50" cy="56" r="36" fill={FUR.bear} />
    <ellipse cx="50" cy="70" rx="18" ry="14" fill="#d8bb9c" />
    <Eyes cy={48} />
    <ellipse cx="50" cy="66" rx="7" ry="5" fill={DARK} />
  </A>
);

const Rabbit = ({ size }: { size?: number }) => (
  <A size={size}>
    <ellipse cx="34" cy="26" rx="10" ry="24" fill={FUR.rabbit} />
    <ellipse cx="66" cy="26" rx="10" ry="24" fill={FUR.rabbit} />
    <ellipse cx="34" cy="28" rx="5" ry="16" fill="#f4a6b8" />
    <ellipse cx="66" cy="28" rx="5" ry="16" fill="#f4a6b8" />
    <circle cx="50" cy="66" r="28" fill={FUR.rabbit} />
    <Eyes cx={13} cy={62} r={5} />
    <circle cx="50" cy="76" r="5" fill="#f4a6b8" />
  </A>
);

const Turtle = ({ size }: { size?: number }) => (
  <A size={size}>
    <circle cx="82" cy="56" r="13" fill="#7bc47f" />
    <circle cx="86" cy="52" r="3.5" fill={DARK} />
    <path d="M8 74c0-26 18-42 40-42s34 16 34 42z" fill={FUR.turtle} />
    <path d="M20 74c0-18 12-30 26-30s24 12 24 30z" fill="#8ce99a" />
    <path d="M46 44v30M28 58h36" stroke={FUR.turtle} strokeWidth="5" />
    <rect x="8" y="72" width="74" height="10" rx="5" fill="#5f9e63" />
  </A>
);

const Dolphin = ({ size }: { size?: number }) => (
  <A size={size}>
    <path d="M92 40c-16-16-42-18-58-6C22 43 14 52 6 54c8 6 10 16 8 26 14 4 34 2 48-8 12-8 22-20 30-32z" fill={FUR.dolphin} />
    <path d="M52 20c8 2 14 8 18 16-10-2-20-4-28-2 2-6 5-11 10-14z" fill="#8ed3ef" />
    <path d="M14 80c-6 8-8 14-6 16 8 0 16-4 22-10z" fill={FUR.dolphin} />
    <circle cx="78" cy="44" r="4.5" fill={DARK} />
  </A>
);

const Owl = ({ size }: { size?: number }) => (
  <A size={size}>
    <path d="M20 20l14 14zM80 20L66 34z" fill={FUR.owl} />
    <path d="M18 14l20 18-24 6z" fill={FUR.owl} />
    <path d="M82 14L62 32l24 6z" fill={FUR.owl} />
    <ellipse cx="50" cy="56" rx="36" ry="38" fill={FUR.owl} />
    <circle cx="33" cy="48" r="15" fill={WHITE} />
    <circle cx="67" cy="48" r="15" fill={WHITE} />
    <circle cx="33" cy="48" r="7" fill={DARK} />
    <circle cx="67" cy="48" r="7" fill={DARK} />
    <path d="M50 58l8 12H42z" fill="#f0a500" />
  </A>
);

const Falcon = ({ size }: { size?: number }) => (
  <A size={size}>
    {/* In flight. A falcon FACE is a brown circle with a beak, which at 14px
        is a bear. The spread-wing outline is shared with nothing else here,
        so the shape carries it rather than the colour. */}
    <path d="M50 40L14 12c-6 16-4 34 8 46z" fill={FUR.falcon} />
    <path d="M50 40l36-28c6 16 4 34-8 46z" fill={FUR.falcon} />
    <path d="M50 30c8 0 14 8 14 20s-6 34-14 44c-8-10-14-32-14-44s6-20 14-20z" fill="#5d4a3e" />
    <circle cx="50" cy="34" r="10" fill={FUR.falcon} />
    <path d="M50 30l12 6-12 5z" fill="#f0a500" />
    <circle cx="45" cy="32" r="3" fill={DARK} />
  </A>
);

const Hedgehog = ({ size }: { size?: number }) => (
  <A size={size}>
    {/* PAINT ORDER is the whole animal here, and it has been wrong twice.
        First the spikes were generated wedges that overlapped into a smooth
        dome; then they were an explicit zig-zag drawn FIRST and painted over
        by the body, which is the same hill again. The body goes down first
        now and the spikes sit on top of it, above its own outline. */}
    <path d="M74 70c10-3 20 1 24 9-8 7-19 8-28 4z" fill="#e0c8ab" />
    <circle cx="94" cy="78" r="3.5" fill={DARK} />
    <rect x="8" y="56" width="72" height="30" rx="15" fill={FUR.hedgehog} />
    <path
      d="M8 68l10-26 6 18 8-28 8 26 8-28 8 26 8-24 8 26 6-16 4 26z"
      fill="#54402f"
    />
    <circle cx="70" cy="72" r="4.5" fill={DARK} />
    <path d="M22 86v8M40 88v6M58 86v8" stroke="#54402f" strokeWidth="7" strokeLinecap="round" />
  </A>
);

const Penguin = ({ size }: { size?: number }) => (
  <A size={size}>
    <ellipse cx="50" cy="54" rx="34" ry="42" fill={FUR.penguin} />
    <ellipse cx="50" cy="62" rx="22" ry="32" fill={WHITE} />
    <circle cx="38" cy="36" r="5" fill={DARK} />
    <circle cx="62" cy="36" r="5" fill={DARK} />
    <path d="M50 42l10 8-10 8-10-8z" fill="#f0a500" />
    <path d="M34 92l-14 6h26zM66 92l14 6H54z" fill="#f0a500" />
  </A>
);

const Squirrel = ({ size }: { size?: number }) => (
  <A size={size}>
    {/* The tail is most of the animal, and most of the recognition. */}
    <path d="M78 92c-2-22 6-40 18-46-16-14-38-4-42 16-2 12 4 24 14 30z" fill="#e08a4e" />
    <ellipse cx="40" cy="64" rx="24" ry="28" fill={FUR.squirrel} />
    <circle cx="30" cy="30" r="9" fill={FUR.squirrel} />
    <circle cx="52" cy="28" r="9" fill={FUR.squirrel} />
    <circle cx="40" cy="44" r="20" fill={FUR.squirrel} />
    <circle cx="33" cy="42" r="4.5" fill={DARK} />
    <circle cx="47" cy="42" r="4.5" fill={DARK} />
    <circle cx="40" cy="52" r="4" fill={DARK} />
  </A>
);

const Whale = ({ size }: { size?: number }) => (
  <A size={size}>
    <path d="M60 22c-6-6-8-12-6-16 6 2 10 8 12 16z" fill="#9ecbf5" />
    <path d="M10 58c0-18 18-30 40-30s42 10 42 26c0 8-4 14-10 18-14 8-40 10-56 2-10-4-16-10-16-16z" fill={FUR.whale} />
    <path d="M14 76c-6 8-10 16-8 18 8 0 18-6 24-14z" fill={FUR.whale} />
    <path d="M22 66c14 8 46 8 62-2-6 10-24 16-40 14-10-2-18-6-22-12z" fill="#a8cff0" />
    <circle cx="74" cy="48" r="4.5" fill={DARK} />
  </A>
);

const Monkey = ({ size }: { size?: number }) => (
  <A size={size}>
    <circle cx="14" cy="52" r="14" fill={FUR.monkey} />
    <circle cx="86" cy="52" r="14" fill={FUR.monkey} />
    <circle cx="14" cy="52" r="7" fill="#d3a179" />
    <circle cx="86" cy="52" r="7" fill="#d3a179" />
    <circle cx="50" cy="50" r="32" fill={FUR.monkey} />
    <ellipse cx="50" cy="62" rx="22" ry="20" fill="#e2b892" />
    <Eyes cx={13} cy={44} r={5} />
    <ellipse cx="43" cy="62" rx="3" ry="4" fill={DARK} />
    <ellipse cx="57" cy="62" rx="3" ry="4" fill={DARK} />
    <path d="M42 72q8 6 16 0" stroke={DARK} strokeWidth="4" fill="none" strokeLinecap="round" />
  </A>
);

const Badger = ({ size }: { size?: number }) => (
  <A size={size}>
    {/* Side-on, and grey rather than white. Head-on it was a third
        black-and-white FACE beside the panda and the zebra, and at 14px the
        three were one animal. The profile plus the slate coat separates it
        on both shape and colour. */}
    <ellipse cx="46" cy="62" rx="38" ry="24" fill={FUR.badger} />
    <path d="M14 44c14 0 26 8 32 18-8 8-22 12-34 10z" fill="#9aa6b0" />
    <ellipse cx="78" cy="46" rx="20" ry="17" fill={FUR.badger} />
    <circle cx="70" cy="30" r="7" fill={FUR.badger} />
    <circle cx="88" cy="32" r="7" fill={FUR.badger} />
    <path d="M78 30c6 0 10 6 10 16s-4 16-10 16-10-6-10-16 4-16 10-16z" fill={WHITE} />
    <circle cx="70" cy="44" r="4" fill={DARK} />
    <circle cx="88" cy="44" r="4" fill={DARK} />
    <ellipse cx="79" cy="60" rx="6" ry="4" fill={DARK} />
    <path d="M22 82v10M44 84v8M64 82v10" stroke={FUR.badger} strokeWidth="9" strokeLinecap="round" />
  </A>
);

const Lizard = ({ size }: { size?: number }) => (
  <A size={size}>
    <path d="M92 22c-14-6-26 0-30 12-4 14 4 22 0 30-6 12-22 10-30 4-10-8-8-24 4-28 8-2 14 2 14 8" fill="none" stroke={FUR.lizard} strokeWidth="13" strokeLinecap="round" />
    <ellipse cx="80" cy="26" rx="16" ry="12" fill="#66bb6a" />
    <circle cx="86" cy="22" r="4" fill={DARK} />
    <path d="M52 44l-12 10M60 62l12 8M34 66l-12 8M40 84l8 10" stroke="#66bb6a" strokeWidth="7" strokeLinecap="round" />
  </A>
);

const Giraffe = ({ size }: { size?: number }) => (
  <A size={size}>
    <rect x="40" y="34" width="20" height="60" fill={FUR.giraffe} />
    <circle cx="38" cy="14" r="5" fill="#7a5a2b" />
    <circle cx="62" cy="14" r="5" fill="#7a5a2b" />
    <path d="M38 18v10M62 18v10" stroke="#7a5a2b" strokeWidth="5" />
    <ellipse cx="50" cy="36" rx="24" ry="18" fill={FUR.giraffe} />
    <ellipse cx="50" cy="46" rx="13" ry="10" fill="#e0a94f" />
    <circle cx="38" cy="30" r="4.5" fill={DARK} />
    <circle cx="62" cy="30" r="4.5" fill={DARK} />
    <g fill="#b5761f">
      <circle cx="45" cy="62" r="5" />
      <circle cx="57" cy="74" r="5" />
      <circle cx="45" cy="86" r="5" />
    </g>
  </A>
);

const Panda = ({ size }: { size?: number }) => (
  <A size={size}>
    <circle cx="22" cy="24" r="14" fill={DARK} />
    <circle cx="78" cy="24" r="14" fill={DARK} />
    <circle cx="50" cy="56" r="36" fill={FUR.panda} />
    <ellipse cx="33" cy="48" rx="12" ry="15" fill={DARK} transform="rotate(-18 33 48)" />
    <ellipse cx="67" cy="48" rx="12" ry="15" fill={DARK} transform="rotate(18 67 48)" />
    <circle cx="34" cy="49" r="5" fill={WHITE} />
    <circle cx="66" cy="49" r="5" fill={WHITE} />
    <ellipse cx="50" cy="70" rx="8" ry="6" fill={DARK} />
  </A>
);

const Zebra = ({ size }: { size?: number }) => (
  <A size={size}>
    <path d="M26 16l16 20-22 2z" fill={FUR.zebra} />
    <path d="M74 16L58 36l22 2z" fill={FUR.zebra} />
    <path d="M50 94c-15 0-26-14-26-34S35 24 50 24s26 16 26 36-11 34-26 34z" fill={FUR.zebra} />
    {/* The mane is the tell that separates it from the panda: a black crest
        on top, where the panda has two black ears. */}
    <path d="M38 26c4-8 20-8 24 0-4 6-20 6-24 0z" fill={DARK} />
    <g stroke={DARK} strokeWidth="7" strokeLinecap="round">
      <path d="M28 42h16M26 56h13M30 70h14M72 42H56M74 56H61M70 70H56" />
    </g>
    <circle cx="37" cy="50" r="4.5" fill={WHITE} />
    <circle cx="63" cy="50" r="4.5" fill={WHITE} />
    <ellipse cx="50" cy="82" rx="9" ry="7" fill={DARK} />
  </A>
);

const Heron = ({ size }: { size?: number }) => (
  <A size={size}>
    <path d="M40 94c0-24 4-38 12-46" stroke={FUR.heron} strokeWidth="16" fill="none" strokeLinecap="round" />
    <path d="M52 48c-12-6-14-20-6-28 8-8 20-4 22 6" stroke={FUR.heron} strokeWidth="12" fill="none" strokeLinecap="round" />
    <circle cx="66" cy="22" r="11" fill={FUR.heron} />
    <path d="M76 22l20 8-20 6z" fill="#f0a500" />
    <circle cx="70" cy="19" r="3.5" fill={DARK} />
    <path d="M30 94h22M46 94l14 4" stroke="#f0a500" strokeWidth="6" strokeLinecap="round" />
  </A>
);

// ---------------------------------------------------------------------------

const BY_ID: Record<AnimalId, (p: { size?: number }) => JSX.Element> = {
  tiger: Tiger,
  lion: Lion,
  fox: Fox,
  bear: Bear,
  rabbit: Rabbit,
  turtle: Turtle,
  dolphin: Dolphin,
  owl: Owl,
  falcon: Falcon,
  hedgehog: Hedgehog,
  penguin: Penguin,
  squirrel: Squirrel,
  whale: Whale,
  monkey: Monkey,
  badger: Badger,
  lizard: Lizard,
  giraffe: Giraffe,
  panda: Panda,
  zebra: Zebra,
  heron: Heron,
};

export const ANIMAL_IDS = Object.keys(BY_ID) as AnimalId[];

/**
 * A player's animal, or nothing.
 *
 * Returns null rather than a placeholder for an id this build has never heard
 * of — the same answer `nameEmoji` gave, and for the same reason: a profile
 * written by a newer build carries words this one cannot draw, and a question
 * mark in a seat is worse than a name with no picture.
 */
export function Animal({ id, size = 20 }: { id: string | undefined; size?: number }) {
  if (!id) return null;
  const El = BY_ID[id as AnimalId];
  return El ? <El size={size} /> : null;
}
