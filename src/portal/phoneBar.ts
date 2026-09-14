/**
 * One bar on a phone game page: home, the game's name, pause, restart, sound,
 * and a "more" button holding everything else.
 *
 * Operator ruling 2026-09-14, picked off a render (hall `20260914-021853`):
 * the header and the utility row cost a 390x844 phone 114px, and the game was
 * left 244px of empty page under it. One 52px bar gives that height to the game.
 *
 * WHY THIS MOVES NODES INSTEAD OF EMITTING A SECOND BAR. Every control here is
 * wired once, by `PageApp`, with `querySelector` - which finds ONE node. A bar
 * emitted with its own copies would be a row of buttons with no listeners, and
 * nothing about a dead button looks dead. Moving the emitted node keeps its
 * listener, its `hidden` state and its label, whatever wires them later.
 *
 * WHY A MEDIA QUERY LISTENER AND NOT A ONE-OFF. A phone rotates and a desktop
 * window narrows, so the width is not decided once. Every move leaves a comment
 * where the node came from, and crossing back swaps it home - so the wide page
 * is the emitted page, byte for byte (`phone-bar.test.ts` compares the HTML).
 *
 * The layout half - the bar's height, the utility row hidden, the box as tall as
 * what is left - is CSS in `src/build/layout.ts`, so a phone paints the right
 * geometry before any of this runs and the move shifts nothing below the bar.
 */

/** Under 720px - the breakpoint the emitted header already switches on. */
export const PHONE_BAR_QUERY = "(max-width: 719px)";

/** Game controls that join the bar, in this order, before sound. */
const INTO_BAR = ["[data-pause]", "[data-restart]"];

/** Everything else a player reaches for less often, behind the more button. */
const INTO_SHEET = [".top .lang", "[data-share]", "[data-fullscreen]", "[data-report]", ".top .wallet-wrap"];

const HOME = "phone-bar-home";

/** Put the controls where they belong for this width. Safe to call repeatedly. */
export function applyPhoneBar(doc: Document, phone: boolean): void {
  const bar = doc.querySelector<HTMLElement>(".top .in");
  const more = bar?.querySelector<HTMLElement>(":scope > .more");
  const sheet = more?.querySelector<HTMLElement>(".moresheet");
  const sound = bar?.querySelector<HTMLElement>(":scope > [data-sound]");
  if (!bar || !more || !sheet) return;

  if (!phone) {
    // Walk the markers, not the moved nodes: a marker IS the emitted position.
    const markers: Comment[] = [];
    const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_COMMENT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if ((n as Comment).data.startsWith(HOME)) markers.push(n as Comment);
    }
    for (const marker of markers) {
      const sel = marker.data.slice(HOME.length + 1);
      const node = [...doc.querySelectorAll("[data-phone-moved]")].find(
        (el) => el.getAttribute("data-phone-moved") === sel,
      );
      if (node) {
        node.removeAttribute("data-phone-moved");
        marker.replaceWith(node);
      } else {
        marker.remove();
      }
    }
    return;
  }

  const move = (sel: string, place: (node: Element) => void) => {
    const node = doc.querySelector(sel);
    if (!node || node.hasAttribute("data-phone-moved")) return;
    node.before(doc.createComment(`${HOME} ${sel}`));
    node.setAttribute("data-phone-moved", sel);
    place(node);
  };

  for (const sel of INTO_BAR) move(sel, (node) => (sound ?? more).before(node));
  for (const sel of INTO_SHEET) move(sel, (node) => sheet.append(node));
}

/** Follow the width for the life of the page. Returns the teardown. */
export function wirePhoneBar(doc: Document = document): () => void {
  if (typeof window.matchMedia !== "function") return () => {};
  const mq = window.matchMedia(PHONE_BAR_QUERY);
  const sync = () => applyPhoneBar(doc, mq.matches);
  sync();
  mq.addEventListener("change", sync);
  // The sheet is a <details>, which stays open until its own button is pressed
  // again. So it closes when anything in it is chosen - a share sheet opening
  // over a still-open menu reads as two menus - and when a tap lands outside
  // it. The language row's own disclosure is the one press that must not close
  // it, or the list of languages could never be reached.
  const more = doc.querySelector<HTMLDetailsElement>(".top .more");
  const close = (e: Event) => {
    if (!more?.open) return;
    const t = e.target as Element | null;
    if (t?.closest(".lang > summary")) return;
    if (!t?.closest(".more") || t.closest(".moresheet button, .moresheet a")) more.open = false;
  };
  doc.addEventListener("click", close);
  return () => {
    mq.removeEventListener("change", sync);
    doc.removeEventListener("click", close);
    applyPhoneBar(doc, false);
  };
}
