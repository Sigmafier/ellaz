/**
 * Lettercross - the words this game is allowed to SHOW a player.
 *
 * `words.ts` may never be used for this, and its own header says so: it is
 * ENABLE1 with a blocklist over it, and a blocklist is not provably complete -
 * the first generated build still carried four slurs after filtering. That is
 * survivable only because of what the list is FOR. It VALIDATES what a child
 * built out of their own tiles, so a child who spells something unpleasant
 * already knew the word and the game merely declines to score it.
 *
 * A puzzle that shows a word inverts that completely. Four of BONUS's five
 * bonus screens put a word on the screen and ask the player to complete it, and
 * a puzzle generator drawing from 28,515 filtered entries would eventually put
 * one in front of a five-year-old with nobody in the loop. So the rule from
 * NOTICE.md, which was written before any of these existed:
 *
 *   > The moment anything displays a dictionary word - a hint button, an AI
 *   > opponent's move, a "possible words" panel - that surface must draw from an
 *   > affirmative allowlist, not from this file.
 *
 * This is that allowlist. Same argument as `name-pool-convention.md`: constrain
 * the space so the bad output is NOT REPRESENTABLE, rather than filtering it
 * afterwards. A child cannot be shown a word that is not in this file, and this
 * file is short enough to read.
 *
 * THREE RULES, all of them pinned by `puzzle-words.test.ts`:
 *
 * 1. IT IS AUTHORED, NEVER DERIVED. Nothing here imports `words.ts`, and no
 *    script generates this file. An allowlist filtered out of the dictionary is
 *    the dictionary, and inherits every gap in its blocklist.
 * 2. EVERY WORD IS ALSO IN THE DICTIONARY, so a player who learns a word from a
 *    bonus round can lay it on the board and score it. The two lists disagreeing
 *    is a game that teaches a word and then refuses it.
 * 3. IT IS GROUPED, so it can be audited by reading. A flat array of 346 strings
 *    is not something anyone checks; fifteen labelled rows of things a small
 *    child can picture is.
 *
 * Concrete and picturable is the selection rule, not frequency. Every entry is
 * something a five-year-old could point at, do, or feel - which is also what
 * makes a missing letter guessable rather than a vocabulary test.
 *
 * ONE MEASURED GAP, worth knowing before adding to this list: `knife` is NOT in
 * `words.ts`, although `knifed`, `knifer` and `knifes` all are. That is a hole
 * in the ENABLE mirror NOTICE.md already warns about rather than anything this
 * repo did, and it is why the kitchen row says `fork`. Rule 2's test is what
 * caught it - a word added here without running that test can be a word the
 * game shows and then refuses.
 */
export const PUZZLE_WORDS: readonly string[] = [
  // animals
  "cat", "dog", "pig", "cow", "hen", "fox", "bat", "owl", "ant", "bee", "ape", "rat", "bird", "fish", "frog", "bear", "lion",
  "wolf", "goat", "duck", "crab", "worm", "mole", "deer", "seal", "swan", "crow", "moth", "wasp", "hare", "lamb", "calf",
  "foal", "mouse", "horse", "sheep", "tiger", "zebra", "snake", "whale", "shark", "camel", "puppy", "panda",
  "otter", "eagle", "robin", "snail", "spider", "monkey", "rabbit", "turtle", "donkey", "parrot", "beetle",

  // food and drink
  "egg", "jam", "pie", "ice", "bun", "nut", "oat", "fig", "bread", "apple", "grape", "lemon", "melon", "peach", "onion",
  "salad", "juice", "honey", "candy", "cocoa", "toast", "pasta", "olive", "berry", "sugar", "water", "milk",
  "rice", "bean", "corn", "cake", "soup", "fruit", "plum", "pear", "beet",

  // the body
  "arm", "ear", "eye", "leg", "lip", "toe", "hip", "jaw", "hand", "head", "foot", "knee", "nose", "hair", "face", "chin",
  "neck", "back", "tooth", "thumb", "heart", "brain", "elbow", "ankle", "wrist", "finger",

  // around the house
  "bed", "cup", "pot", "pan", "jug", "mug", "key", "mat", "rug", "box", "tap", "bag", "door", "wall", "roof", "lamp", "desk",
  "sofa", "book", "chair", "table", "spoon", "fork", "plate", "clock", "towel", "brush", "broom", "shelf", "stair",
  "window", "garden", "mirror", "basket", "pillow",

  // outside
  "sun", "sky", "sea", "mud", "fog", "ivy", "oak", "elm", "fir", "bud", "log", "sand", "leaf", "tree", "rock", "hill", "lake",
  "wind", "rain", "snow", "star", "moon", "cloud", "grass", "river", "beach", "stone", "storm", "plant", "field",
  "flower", "forest", "island", "valley", "meadow", "desert",

  // colours
  "red", "blue", "pink", "grey", "green", "black", "white", "brown", "cream",

  // clothes
  "hat", "cap", "sock", "shoe", "coat", "vest", "belt", "scarf", "glove", "shirt", "dress", "skirt", "jeans", "boot",

  // school and drawing
  "pen", "ink", "map", "art", "sum", "page", "word", "line", "ruler", "paper", "pencil", "crayon", "number", "letter",
  "school", "lesson",

  // things you do
  "run", "hop", "sit", "eat", "cut", "dig", "fly", "hug", "rub", "nap", "sip", "win", "add", "mix", "jump", "walk", "read",
  "sing", "swim", "draw", "ride", "skip", "clap", "wash", "cook", "bake", "grow", "open", "shut", "hold", "climb",
  "catch", "throw", "dance", "smile", "laugh", "sleep", "paint", "build", "think", "count", "spell",

  // getting about
  "bus", "car", "van", "jet", "ship", "boat", "bike", "road", "train", "plane", "truck", "wheel", "sail", "ferry",

  // music
  "drum", "bell", "horn", "song", "note", "flute", "piano", "violin", "banjo", "tune", "choir",

  // toys and objects
  "toy", "ball", "kite", "game", "rope", "card", "coin", "flag", "doll", "block", "puzzle", "bubble", "ribbon",
  "button", "candle",

  // weather
  "hot", "dry", "wet", "icy", "warm", "cool", "windy", "sunny", "rainy", "cloudy", "stormy", "frosty",

  // people
  "mum", "dad", "son", "boy", "girl", "baby", "aunt", "twin", "uncle", "sister", "cousin", "friend",

  // time, and the small words
  "day", "off", "out", "top", "new", "old", "fun", "sad", "night", "week", "year", "month", "today",
];

/** The pool by length, which is how every bonus screen wants to ask for it. */
export const PUZZLE_BY_LENGTH: ReadonlyMap<number, readonly string[]> = (() => {
  const m = new Map<number, string[]>();
  for (const w of PUZZLE_WORDS) (m.get(w.length) ?? m.set(w.length, []).get(w.length)!).push(w);
  return m;
})();
