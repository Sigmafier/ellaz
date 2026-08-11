import type { Locale } from "@i18n/index";
import { isPageLocale } from "@i18n/locales";

/**
 * What page am I on, and what should React mount into?
 *
 * READ FROM THE DOCUMENT, NOT FROM THE URL. The page emitter already knows
 * exactly what it wrote - the kind, the game, the language - so it stamps that
 * on `<body data-page data-game data-locale>` and the runtime reads it back.
 *
 * Parsing `location.pathname` instead would mean re-deriving the base at
 * runtime, on a site that ships under two of them ("/" and "/ellaz/"), and
 * getting it wrong on one host produces a page that renders prose and never
 * mounts a game - the exact green-build-broken-page shape this project keeps
 * hitting. The document cannot be wrong about what the document is.
 */

export type PageKind = "app" | "game" | "world" | "boards";

export interface PageContext {
  kind: PageKind;
  /** The game id, for `kind === "game"`. */
  gameId?: string;
  /**
   * On a content page the language is the page's own, from what the emitter
   * stamped. The app shell (`/`) has no language of its own - it keeps the
   * stored preference and its in-app toggle.
   */
  locale?: Locale;
  /** Where the game or the room mounts. Absent on the app shell. */
  frame?: HTMLElement;
  /** Where the wallet chip mounts. Absent on the app shell. */
  walletSlot?: HTMLElement;
}

/**
 * The `lang` on an emitted document, validated against the languages that
 * actually HAVE documents.
 *
 * `isPageLocale` rather than `isAppLocale` on purpose: this reads an attribute
 * off a page the emitter wrote, and the emitter only ever writes PAGE_LOCALES.
 * A `lang="fr"` here would mean somebody hand-wrote a file, and answering
 * `undefined` to that is the honest reading.
 */
function asLocale(value: string | undefined): Locale | undefined {
  return isPageLocale(value) ? value : undefined;
}

export function readPageContext(doc: Document = document): PageContext {
  const root = doc.getElementById("root");
  const frame = doc.getElementById("game-frame");
  const page = doc.body?.dataset.page;

  // The app shell is the page that has #root. Checked FIRST and by element
  // rather than by the data attribute, so a hand-edited or half-deployed
  // document still boots the app rather than silently mounting nothing.
  if (root || !frame) return { kind: "app" };

  const locale = asLocale(doc.documentElement.lang) ?? asLocale(doc.body.dataset.locale);
  const walletSlot = doc.getElementById("wallet-slot") ?? undefined;

  if (page === "world") return { kind: "world", locale, frame, walletSlot };
  if (page === "boards") return { kind: "boards", locale, frame, walletSlot };
  return { kind: "game", gameId: doc.body.dataset.game, locale, frame, walletSlot };
}
