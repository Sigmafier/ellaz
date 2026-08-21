import type { Locale } from "../content/types";
import { AUTONYM, DEFAULT_LOCALE, OG_LOCALE, dirOf } from "../i18n/locales";
import { SITE } from "../content/site";
import { analyticsTag } from "./analytics";
import { html, raw, jsonLd, toHtml, type RawHtml } from "./html";
import type { HeadAssets } from "./assets";
import { LOCALES, canonicalUrl, homePath, href, OG_ROUTES } from "./routes";
import { OG_HEIGHT, OG_WIDTH, ogImagePath } from "./ogCard";
import { OFFER_CSS, offerBar } from "./langOffer";
// themes.ts imports nothing, which is what lets both the Vite config and this
// build-time renderer read the same theme list. See src/ui/themes.ts.
import { DEFAULT_THEME, themeBootScript, themeById } from "../ui/themes";
// The geometry only - never the React component. This file must stay DOM-free
// and React-free, and the icon set exports its paths for exactly this caller.
import { ICON_PATHS, ICON_STROKE } from "../ui/icons";

/**
 * The document shell every emitted page shares: head, header, footer.
 *
 * WHY THE STYLES ARE INLINE AND NOT THE APP'S STYLESHEET
 * Two reasons, and the second is the load-bearing one.
 *
 * 1. The app's `global.css` sets `body { overflow: hidden }`. It is an
 *    application shell, not a document - a page of prose under that rule has
 *    everything below the fold unreachable by scroll, while a crawler reads it
 *    perfectly. Silent, human-only, and exactly the kind of failure this
 *    project keeps shipping.
 * 2. A `<link href="assets/shell-<hash>.css">` couples all 46 emitted pages to
 *    a build hash. Inline means a page is one file with no second request, no
 *    cache dependency, and no way to render unstyled because an asset moved.
 *
 * The cost is ~2 KB per page, uncompressed, and these pages are not precached.
 */

const FONTS =
  "https://fonts.googleapis.com/css2?family=Heebo:wght@400;600;800&family=Fredoka:wght@500;600&display=swap";

/**
 * The document stylesheet. Logical properties throughout (`margin-inline`,
 * `padding-inline-start`, `text-align: start`) so one sheet serves the RTL
 * Hebrew tree and the LTR English tree with no mirroring work.
 */
const BASE_CSS = `
/* Every custom property here is --doc-*, and that prefix is load-bearing.
   A page that boots the app also links tokens.css, so a bare --bg or --ink
   declared here would collide with an app token. Never reuse an app name.

   THE VALUES DERIVE FROM THE THEME, with a literal fallback.

   Custom properties resolve at computed-value time, AFTER every stylesheet
   has parsed - so var(--text) here picks up tokens.css even though this block
   is inlined above the app's <link>. On a page that carries no app runtime
   (the 404, the English index) the fallback applies instead, which is why
   every one of these has one.

   NO BACKTICKS IN THIS COMMENT. It lives inside a JS template literal, and a
   backtick closes the string - the file then fails to parse somewhere far
   below with an error naming a CSS word as an undefined variable. FOURTH time
   in this repo, most recently in the full-screen block at the bottom of this
   same stylesheet, so the warning applies to every comment in here and not
   just this one.

   Before this, a game page was a white article with a navy rectangle punched
   into it: the app was dark, the document was light, and they were two
   products on one screen. */
*,*::before,*::after{box-sizing:border-box}
:root{
  --doc-ink:var(--text,#1b1b2b);
  --doc-soft:var(--text-dim,#5a5a72);
  --doc-line:var(--line,#e4e2ef);
  --doc-bg:var(--bg,#fdfcff);
  --doc-card:var(--surface,#ffffff);
  --doc-brand:var(--brand-ink,#6c5ce7);
  --doc-sun:var(--yellow,#ffc730);
  --doc-stage:var(--stage-bg,#12142b);
}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--doc-bg);color:var(--doc-ink);
  font:400 17px/1.7 Heebo,Assistant,Rubik,system-ui,-apple-system,sans-serif}
main{max-width:44rem;margin-inline:auto;padding:0 20px 72px}
h1,h2,h3{font-family:Fredoka,Heebo,system-ui,sans-serif;line-height:1.25;margin:0;
  color:var(--doc-ink)}
h1{font-size:2rem;font-weight:600;margin-block:8px 12px}
h2{font-size:1.35rem;font-weight:600;margin-block:44px 12px}
h3{font-size:1.05rem;font-weight:600;margin-block:22px 4px}
p{margin-block:0 14px}
a{color:var(--doc-brand)}
.top{border-block-end:1px solid var(--doc-line);background:var(--doc-card)}
.top .in{max-width:44rem;margin-inline:auto;padding:12px 20px;display:flex;
  align-items:center;gap:12px}
.brand{font-family:Fredoka,system-ui,sans-serif;font-size:1.15rem;font-weight:600;
  color:var(--doc-ink);text-decoration:none}
.tagline{color:var(--doc-soft);font-size:.82rem;flex:1}
#wallet-slot{flex:0 0 auto}
.bc{font-size:.82rem;font-weight:600;color:var(--doc-soft);margin-block:18px 0}
.bc a{text-decoration:none}
/* The BREADCRUMB sits with the prose, under the stage, on every screen that
   has one. It used to float over the stage as a dark pill - which is where a
   44px row of buttons then landed on top of the board, because a game that
   fitStage has scaled reaches the top edge every time. Nothing floats now:
   the header is the only thing above the stage, and it is a real element. */
.lede{font-size:1.12rem;color:var(--doc-ink)}
.facts{list-style:none;display:flex;flex-wrap:wrap;gap:8px;padding:0;margin:18px 0 0}
.facts li{border:1px solid var(--doc-line);background:var(--doc-card);border-radius:999px;
  padding:5px 13px;font-size:.82rem;font-weight:600;color:var(--doc-soft)}
.cta{display:flex;flex-wrap:wrap;align-items:center;gap:14px;margin:26px 0 8px}
.play{display:inline-flex;align-items:center;justify-content:center;min-height:76px;
  padding:0 40px;border:none;border-radius:22px;background:var(--doc-sun);
  color:var(--doc-ink);text-decoration:none;font-family:Fredoka,system-ui,sans-serif;
  font-size:1.3rem;font-weight:600;box-shadow:0 4px 0 var(--doc-line);cursor:pointer}
.cta .note{color:var(--doc-soft);font-size:.86rem;flex:1 1 12rem}
ol,ul.steps{padding-inline-start:1.3em}
ol li,ul.steps li{margin-block-end:8px}
table{border-collapse:collapse;width:100%;margin-block:14px;font-size:.95rem}
th,td{border:1px solid var(--doc-line);padding:8px 12px;text-align:start}
th{background:var(--doc-card);font-weight:600}
.grid{list-style:none;padding:0;margin:20px 0 0;display:grid;gap:12px;
  grid-template-columns:repeat(auto-fill,minmax(9.5rem,1fr))}
.grid a{display:flex;align-items:center;gap:10px;padding:12px 14px;background:var(--doc-card);
  border:1px solid var(--doc-line);border-radius:16px;text-decoration:none;
  color:var(--doc-ink);font-weight:600}
.grid .em{font-size:1.5rem;line-height:1}
.grid .cat{display:block;font-size:.75rem;font-weight:400;color:var(--doc-soft)}
footer{border-block-start:1px solid var(--doc-line);margin-block-start:56px;
  padding:22px 20px 40px;color:var(--doc-soft);font-size:.85rem}
footer .in{max-width:44rem;margin-inline:auto;display:flex;flex-wrap:wrap;gap:14px}

/* --- the stage: the poster, then the game ---------------------------------
   Two SIBLINGS, never nested. React owns the children of #game-frame and of
   #wallet-slot and of nothing else on this page; the poster is ours, emitted
   here and hidden by the runtime once the game is up. Nesting the poster
   inside the frame would put a node React does not know about inside a tree
   it reconciles, which is the nested-root teardown bug wearing a hat. */
/* The stage breaks out of main's gutter on a phone. Games size themselves
   against the VIEWPORT (min(90vw, 60vh, ...)), not against their container, so
   a frame inset by 20px each side is a frame the game was never measured for.
   Giving it the full width is cheaper and more honest than teaching 21 games a
   new sizing rule. */
.stage{position:relative;margin-block:14px 6px;margin-inline:-20px}
@media (min-width:720px){.stage{margin-inline:0}}
/* MIN-height, not height, and that is the whole fix for the frame.

   A fixed height makes the box a viewport the game has to fit inside, and it
   cannot: a game sizes its board against the WINDOW (min(94vw, 60vh, ...))
   and then stacks its own stats, difficulty row and keypad on top, so the
   total exceeds a frame that is only a FRACTION of that window. Sudoku wanted
   778px inside 508px and answered with an inner scrollbar - a second one, in
   the same axis as the page's, which is what reads as broken rather than
   merely tall.

   Min-height instead: the box fills the window down to the fold (145px is the
   header, breadcrumb and margin above it) and GROWS for a game that needs
   more. Nothing is cut off, and there is only ever one scrollbar - the page's,
   which every visitor already understands. dvh, not vh, so a phone's
   collapsing address bar does not leave a gap.

   It also has to be min-height rather than height because the poster is
   absolutely positioned and contributes no height of its own: before the game
   mounts, this is the only thing holding the box open. */
.stage .box{position:relative;border-radius:22px;overflow:hidden;
  background:var(--doc-stage);box-shadow:0 5px 0 var(--doc-line);
  min-height:clamp(420px,calc(100dvh - 145px),860px);display:flex;flex-direction:column}
/* The room is a composed scene - a character, a wall, a floor, eight slots -
   so it wants the height a game wants and then some. Its own rule, restored:
   folding it into the line above was fine for the room and wrong for what
   came next. */
.stage.room .box{min-height:clamp(460px,calc(100dvh - 120px),880px)}
/* The BOARDS are a short column: three pickers and a handful of rows. Given a
   viewport-sized box they sit in the top third of a large empty rectangle,
   with the page's own heading stranded far below it. Sized to content instead,
   with a floor so a player holding one record still gets a real panel rather
   than a strip. */
.stage.boards .box{min-height:clamp(300px,46dvh,560px)}
#game-frame{flex:1;min-height:0;display:flex;flex-direction:column}
#game-poster{position:absolute;inset:0;display:flex;flex-direction:column;
  align-items:center;justify-content:center;gap:18px;text-align:center;padding:24px;
  color:var(--doc-ink);transition:opacity .25s ease}
#game-poster[hidden]{display:none}
#game-poster .em{font-size:64px;line-height:1}
#game-poster .msg{font-size:.95rem;opacity:.75;max-width:22ch}
.stage .noscript{position:absolute;inset-inline:0;bottom:0;padding:12px;
  background:var(--badge-fill,rgba(0,0,0,.55));color:var(--on-brand,#fff);font-size:.85rem;text-align:center}
@media (max-width:719px){.stage .box{border-radius:0;box-shadow:none;
  border-block:1px solid var(--doc-line)}}

/* --- the game gets the whole first screen --------------------------------

   Measured on a 1536x638 window: 2048's own content wants 680px and the
   header plus breadcrumb cost another 127px above it, so 169px of the game
   sat below the fold. The game is TALLER THAN THE WINDOW on its own, so no
   amount of tightening the page around it can make it fit - the only two
   levers are giving it the 127px back and scaling what is left.

   This does both. The header and breadcrumb float OVER the stage instead of
   sitting above it, and fitStage scales the mounted game to whatever is
   left. The measured effect on that window: 2048 goes from 169px past the
   fold to none, at 92% of its natural size instead of the 74% it would need
   if the header still cost its 127px.

   NOT 100vw. That unit includes the vertical scrollbar (1536) while the
   container excludes it (1521), so a 100vw bleed overhangs by half the
   scrollbar and the page really does scroll sideways by 8px - measured, and
   invisible unless you look for it. Instead main drops its own width limit
   on these pages and hands it to each prose child, which makes the stage
   full-bleed by construction with no viewport unit anywhere.

   Scoped to the two pages that hold a playable screen. The boards are a short
   column and the home index and 404 have no stage at all; all three keep the
   ordinary document layout, which is why every rule here is behind a
   [data-page] attribute rather than applied to .stage. */
body[data-page="game"] main,body[data-page="world"] main{max-width:none;padding-inline:0}
body[data-page="game"] main>:not(.stage),
body[data-page="world"] main>:not(.stage){max-width:44rem;margin-inline:auto;
  padding-inline:20px}
/* The ROOM's header used to float, transparent, over its scene, while the
   GAME's was a real tinted bar. They are one bar now - see the header section
   below - so the room pays var(--hh) exactly as the game does, and in exchange
   nothing on either page is drawn on top of anything else. */
body[data-page="game"] .stage,body[data-page="world"] .stage{margin-block:0;
  margin-inline:0}
/* The box is the screen MINUS the bar, because the bar is a real element.
   fitStage reads this height and scales the mounted screen to it, so nothing
   is clipped and nothing falls below the fold - it is simply drawn at the size
   that fits underneath the chrome instead of behind it. */
body[data-page="game"] .stage .box,body[data-page="world"] .stage .box{
  height:calc(100dvh - var(--hh) - var(--uh) - var(--oh));min-height:0;border-radius:0;
  box-shadow:none;border:0;justify-content:center}
/* Content-sized rather than flex:1, so fitStage can read the screen's NATURAL
   height. A frame that stretches to fill the box reports the box's height back
   and the scale factor comes out as 1 every time. */
body[data-page="game"] #game-frame,body[data-page="world"] #game-frame{flex:0 0 auto}

/* --- the UTILITY row ------------------------------------------------------

   The page's own line, between the bar and the screen: where you are on the
   reading side, and on the other the one control that belongs to the GAME and
   cannot fit inside the game's own panel.

   IN FLOW, and that is the whole of it. It floated over the stage as a dark
   pill for a day, which is what put a 44px row of buttons on top of a board:
   fitStage scales a screen to fill its box, so a game reaches the top edge
   every time and anything drawn over that edge is drawn over the game. The box
   pays for this row in var(--uh) exactly as it pays for the bar in var(--hh),
   so an overlap is impossible rather than merely avoided.

   RESTART IS HERE and not in the game panel, because four cells do not fit a
   390px phone. The panel's row is 350px wide inside, and difficulty plus two
   stats plus gaps already spends 344 - a 56px button takes it to 408, so the
   row wraps to two lines and the difficulty label ellipsises. Measured on the
   built artifact: 25 of 33 games wrapped with it there, 1 of 33 with it here.

   Home, sound and the wallet are in the header above. This row holds the
   breadcrumb, the game's own buttons and full screen - which is platform
   chrome sitting on the page's row, the one arrangement the operator acked.
   It is on EVERY screen here, so the row still has a rule you can learn.
   See .claude/rules/game-controls-and-platform-chrome-never-share-a-bar.md */
body.screen .urow{display:flex;align-items:center;gap:10px;height:var(--uh);
  padding-inline:var(--hpad);background:var(--doc-bg)}
/* A PILL, not a line of text - restored 2026-08-20 to the arrangement that was
   approved. It went plain when the row stopped floating over the board, and
   nothing needed it to: the reason the old one was removed was WHERE it sat,
   never what it looked like.

   The two colours are the doc tokens INVERTED, never literals. The app ships a
   cream theme and a night one, so a hardcoded dark chip with cream text is a
   dark chip on a dark ground for half the catalogue's readers - the same trap
   the pause cover carries a comment about. Inverting the pair cannot go wrong
   in either: whatever the page is, the pill is its opposite.

   flex:0 1 auto plus margin-inline-end:auto makes it hug its own words and
   push the tools to the far edge, and it still shrinks and ellipsises rather
   than overflowing when a locale spells the trail long (French runs longest).
   Logical properties, so RTL flips it for free. */
body.screen .urow .bc{margin:0;flex:0 1 auto;margin-inline-end:auto;min-width:0;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
  padding:7px 16px;border-radius:99px;font-weight:700;
  background:var(--doc-ink);
  background:color-mix(in srgb,var(--doc-ink) 82%,transparent);
  color:var(--doc-bg)}
/* The link takes the pill's colour - brand pink on this ground is unreadable -
   so colour cannot say which words are tappable and an underline does. The
   leaf stays plain because you are already there. (Comments in DOCUMENT_CSS
   are SERVED, unlike the ones in global.css; keep them short here.) */
/* The LINK carries the tap target, not the pill - these measured 20px tall
   against a 44px floor. Padding the pill leaves the link at 20 and only moves
   the picture, so the padding goes here and the negative margin keeps the
   pill the height it was. */
body.screen .urow .bc a{color:inherit;text-decoration:underline;
  text-underline-offset:3px;text-decoration-thickness:1px;
  display:inline-block;padding-block:12px;margin-block:-12px;
  text-decoration-color:color-mix(in srgb,currentColor 55%,transparent)}
body.screen .urow .tools{display:flex;align-items:center;gap:8px;flex:0 0 auto}
.ubtn{display:inline-flex;align-items:center;justify-content:center;
  width:var(--tap);height:var(--tap);flex:0 0 auto;border:0;padding:0;
  cursor:pointer;border-radius:var(--urad);background:var(--doc-card);
  color:var(--doc-ink);box-shadow:0 2px 0 var(--doc-line)}
.ubtn[hidden]{display:none}
.ubtn .gl{display:flex}
.ubtn svg{display:block;width:var(--hicon);height:var(--hicon);fill:none;
  stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}

/* --- the SCREEN header ----------------------------------------------------

   ONE bar, on every screen that holds a playable surface: a game, the room,
   the boards. It used to be three different bars - a tinted one on a game, a
   transparent floating one over the room, a white document row on the boards -
   and none of them offered the same controls, so "how do I get home" and "how
   do I mute" had a different answer on each screen of one product.

   Decided brick by brick against real production builds, one axis per round,
   with everything else frozen. What each round settled, and the trap in it:

   1 DRAWING - every control is a filled pill. The round ranked the pills LAST
     on my own metric and the operator picked them anyway, which was the
     finding: the previous header was already these same lozenges, so the
     pills were never what looked wrong. The bar was.

   2 SURFACE - a deep tone of THIS SCREEN's own ground. The old bar was
     rgba(0,0,0,.55), and black alpha over a saturated colour drops lightness
     and chroma TOGETHER: over 2048's rgb(255,199,48) it composites to
     rgb(115,90,22), olive, and a different mud on every game. Two ways out -
     raise lightness (white/glass) or drop it in a space that keeps the
     chroma. This is the second.

     PINNING lightness rather than mixing is the whole trick, and it is why
     this is safe across a catalogue nobody has finished writing: contrast is
     satisfied by CONSTRUCTION, not by luck, measured 7.84 to 10.68 over all
     21 grounds with none below AA. Mixing toward a near-black instead DRAGS
     THE HUE toward that black's cast - it turned snake's emerald navy,
     because #0C0812 is a purple-black. The color-mix line is only the
     fallback for a browser without relative colour syntax.

   3 CONTENTS - home | the screen's name | full screen, sound, wallet. Every
     one of those is PLATFORM chrome: it would mean the same thing on any of
     the three screens, which is the test
     (.claude/rules/game-controls-and-platform-chrome-never-share-a-bar.md).
     Difficulty and restart fail that test and live in the game panel. The
     coin and star are DRAWN, not typed - an emoji is a different picture on
     every device, is monochrome on some, and cannot take the header's ink.

   4 DENSITY - 60px bar, 44px controls. The only non-aesthetic axis in the
     four: 44 is Apple's stated minimum and 36 (what shipped) is about 9.5mm,
     under it. Android asks 48dp, which this still does not meet.

     Five controls do not fit a 390px phone at desktop spacing - measured, the
     name is left 20px and renders as a bare ellipsis. So the PHONE tightens
     the gap and the gutter and squares the icon-only buttons, and none of
     that touches the 44px height: an icon button becomes 44x44 rather than
     50x44, still square and still over the floor. Measured after: the name
     keeps ~75px, which holds "Snake" and ellipsises "Bubble Shooter" - and
     the h1 directly below says the full name either way.

   --g IS NOT AMBIENT. It is emitted per page from artGround(), because
   nothing in the app or the document defines it. Without that, every rule
   here resolves to the same fallback indigo and all 21 bars come out
   identical - a plausible picture, one flat colour, no error anywhere. */
/* Every number the shared chrome is laid out from, in ONE place, so the
   design bench can turn them. A knob cannot reach a literal. */
body.screen{--hh:60px;--uh:52px;--oh:0px;--tap:44px;--hgap:12px;--hpad:20px;
  --hbrand:22px;--hfont:14.5px;--hicon:22px;--hrad:99px;--urad:14px;
  --hdr-ink:#FFF6E9}
@media (max-width:719px){body.screen{--hh:58px;--uh:46px;--hbrand:20px;--hgap:8px;--hpad:12px}}

body.screen .top{position:relative;z-index:6;height:var(--hh);
  display:flex;align-items:center;padding:0;border-block-end:0;
  color:var(--hdr-ink);
  background:color-mix(in oklch, var(--g,#4F5BD5) 46%, #0C0812);
  background:oklch(from var(--g,#4F5BD5) .30 calc(c * 1.05) h)}
/* Full width, and the groups pushed apart. space-between is direction
   agnostic, so this is correct in Hebrew with no second rule. */
body.screen .top .in{max-width:none;margin:0;width:100%;
  padding:0 var(--hpad);gap:var(--hgap);justify-content:space-between}
body.screen .tagline{display:none}
/* The screen's NAME, which a phone has never shown. It takes the middle and
   ellipsises rather than wrapping: a two-line name makes the bar taller than
   the 58px every measurement here was taken against, and a wrapped label
   passes a clip check, an overflow check and a right-edge check while doing
   it. See a-diagnostic-that-truncates-what-it-compares. */
body.screen .gname{flex:1 1 0;min-width:0;
  font:600 16px/1 Fredoka,system-ui,sans-serif;color:var(--hdr-ink);
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding-inline:2px}
/* ONE way home, and it says where it goes: the arrow tells you it is a back
   affordance and the house tells you what is behind it. Two glyphs in one
   pill rather than two buttons - they are one destination, and this is the
   button that replaced four of them. */
.hbtn.home{gap:7px;padding:0 15px}

/* One height variable for the buttons AND the wallet. They used to be 36 and
   48, which is why they never sat on a line together. */
.hbtn{display:inline-flex;align-items:center;justify-content:center;gap:8px;
  height:var(--tap);
  border:0;margin:0;cursor:pointer;text-decoration:none;flex:0 0 auto;
  border-radius:var(--hrad);padding:0 calc(var(--tap) * .39);white-space:nowrap;
  font:600 var(--hfont)/1 inherit;
  background:rgba(255,255,255,.12);color:var(--hdr-ink)}
/* An icon-only control is SQUARE. At the pill padding it is 50 wide around a
   17px glyph, which is 33px of nothing either side of the thing you are
   aiming at - and five of those do not fit a phone. */
.hbtn.ico{width:var(--tap);padding:0}
.hbtn:hover{background:rgba(255,255,255,.2)}
.hbtn.pri{background:#FFF6E9;color:#241C2B}
.hbtn.pri:hover{background:#fff}
.hbtn[hidden]{display:none}
.hbtn .gl{display:flex;flex:0 0 auto}
/* No .gl in this selector, deliberately: the runtime appends a BARE svg for
   sound and the wallet, so a rule keyed on the wrapper missed exactly the two
   glyphs that were wrong. (Comments here are SERVED - keep them short.) */
.hbtn svg{width:var(--hicon);height:var(--hicon);
  display:block;fill:none;stroke:currentColor;stroke-width:2.2;
  stroke-linecap:round;stroke-linejoin:round}
/* The wallet chip. Size and stroke only - never fill: the star is filled. */
#wallet-slot svg{width:var(--hicon);height:var(--hicon);stroke-width:2.2}
/* An arrow is not bidi-mirrored by the renderer - U+2190 draws pointing left
   whatever the direction is - so a back affordance in Hebrew has to be
   flipped deliberately. Drawn rather than typed for the same reason the coin
   is: a glyph is a different picture per device, and the fullscreen glyph in
   particular is missing from plenty of fonts. */
[dir="rtl"] .hbtn .gl .arw{transform:scaleX(-1);transform-origin:center}

.wallet-wrap{display:inline-flex;align-items:center;height:var(--tap);
  border-radius:99px;padding:0 calc(var(--tap) * .34);
  background:rgba(255,255,255,.12)}
body.screen #wallet-slot>*{background:none;box-shadow:none;border:0;
  padding:0;color:var(--hdr-ink);height:var(--tap);gap:10px}

/* On a phone the labels go and the glyphs stay. The screen's NAME used to go
   with them, because the middle of a two-ended row only stays centred while
   the two ends are about equal - it is start-aligned now and no longer needs
   them to be. */
@media (max-width:719px){
  .hbtn .tx{display:none}
  .wallet-wrap{padding:0 10px}
}
@media (max-width:480px){body{font-size:16px}h1{font-size:1.6rem}.play{width:100%}
  .stage .box{min-height:clamp(420px,calc(100dvh - 120px),860px)}
  .tagline{display:none}}
`.trim();

/* The language offer's rules live in their own module beside its markup and its
   script - three pieces of one feature that have to agree about a class name,
   an attribute and a height, so they are read together or not at all. */
export const DOCUMENT_CSS = `${BASE_CSS}
${OFFER_CSS.trim()}`;

export interface DocumentOptions {
  locale: Locale;
  /** `<title>`. */
  title: string;
  description: string;
  /** Base-free canonical path, e.g. "/games/memory/". */
  path: string;
  /** The same page in the other language, if there is one. */
  alternates?: Array<{ locale: Locale; path: string }>;
  /** The JSON-LD `@graph`, already assembled. */
  schema?: unknown;
  /** Emitted into `<body>`, between the header and the footer. */
  body: RawHtml;
  base: string;
  /**
   * False on the GitHub Pages duplicate and on the 404, where an indexable body
   * would compete with the primary host or register as a soft 404.
   */
  indexable: boolean;
  /**
   * The app's own head tags, lifted verbatim off `index.html` (see `assets.ts`).
   * A page that carries them boots the same bundle the app does; a page that
   * does not - the 404 - stays a pure document.
   */
  headAssets?: HeadAssets;
  /**
   * This document IS the application, the way `index.html` is.
   *
   * True for the emitted home pages and nothing else. It changes three things,
   * and each one is a rule that is right for a document and wrong for an app:
   *
   * - `class="app-shell"` on `<body>`, which is what scopes the full-viewport
   *   rules in `global.css` (and, with `#home-doc` present, the `:has()`
   *   overrides that let a no-JavaScript visitor scroll the page).
   * - No `DOCUMENT_CSS`. ~300 lines styling a header, a footer and a card grid
   *   that this page does not have - the app draws all three itself.
   * - No emitted header, `<main>` or footer. The app owns the whole viewport,
   *   and a second wordmark row above its own reads as a bug.
   */
  shell?: boolean;

  /**
   * Whether this document may carry the analytics tag. True everywhere except
   * the 404.
   *
   * The 404 is the one PURE document left - served for URLs that do not exist,
   * where booting anything is a download nobody asked for - and
   * `assert-pages.mjs` has enforced "a document should fetch nothing eagerly"
   * on it since long before there was a tag to exclude. That gate caught this
   * on the first run and it was right: an error page pulling a third-party
   * script is exactly what it exists to prevent.
   *
   * Explicit rather than derived from `indexable`. On the primary host those two
   * happen to coincide today, and a coincidence is not a rule - the day another
   * noindex page is emitted, deriving it would silently stop measuring a page
   * somebody does want measured.
   */
  analytics?: boolean;
  /**
   * `<link rel="modulepreload">` for the chunks THIS page will go on to fetch
   * by itself - the content-page runtime, and on a game page that one game.
   *
   * Kept separate from `headAssets.tags` on purpose: those are lifted verbatim
   * off `index.html` and must stay byte-identical across every page, while
   * these differ per page and are the whole point of the split. Built by
   * `lazyPreloadTags` in `assets.ts`, empty when there is no bundle.
   */
  preloads?: string[];
  /**
   * `data-*` on `<body>`. This is how the runtime learns what page it is on
   * without re-deriving the base from `location.pathname` at runtime.
   */
  bodyData?: Record<string, string>;
  /**
   * Rendered inside the header, on the trailing edge. The wallet chip's mount
   * point on pages that boot the app.
   */
  headerSlot?: RawHtml;
  /**
   * The SCREEN chrome: present on the three pages that hold a playable
   * surface - every game, the room, the boards - and absent everywhere else.
   * Its presence is also what puts `class="screen"` on the body, so the bar
   * and its scoping can never disagree about which pages have one.
   *
   * The pages without it - the home index and the 404 - still render the
   * plain wordmark-and-tagline row, which is the right header for a document.
   */
  headerChrome?: HeaderChrome;
}

/** What the screen header needs that the document itself does not know. */
export interface HeaderChrome {
  /**
   * This screen's own ground colour: `artGround` for a game, the room's and
   * the boards' own for those. Emitted as `--g` on the header, because
   * nothing else on the page defines it and the tint rule reads it - without
   * the attribute every bar falls back to one indigo, which is a perfectly
   * plausible header that happens to be identical on all 35 screens.
   */
  ground: string;
  /** The screen's name, already in this page's language. */
  title: string;
  /** Its category, already localised. Optional: not every page has one. */
  cat?: string;
  backLabel: string;
  /** For the header's mute control, which the runtime reveals. */
  soundLabel: string;
  /** For the header's full-screen control, which the runtime reveals. */
  fullLabel: string;
}

/**
 * `class="app-shell"`, `class="screen"`, or nothing.
 *
 * DERIVED from the same fields that decide what the page IS, rather than
 * passed in beside them: `screen` scopes every header rule, so a page that
 * carries the chrome and not the class renders the bar with none of its
 * styling - a white row of unstyled links, on a page that looks otherwise
 * perfect. Two flags for one fact is how that ships.
 */
function bodyClass(opts: DocumentOptions): string {
  if (opts.shell) return 'class="app-shell"';
  return opts.headerChrome ? 'class="screen"' : "";
}

/** `data-page="game" data-game="2048"`, escaped, or nothing at all. */
function bodyAttrs(data: Record<string, string> | undefined): string {
  if (!data) return "";
  return Object.entries(data)
    .map(([k, v]) => ` data-${k}="${escapeAttribute(v)}"`)
    .join("");
}

function escapeAttribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

/**
 * `--g` on the header, and nowhere else.
 *
 * The tint rule reads this. Nothing in the app or in the emitted document
 * defines it - it only ever existed on the tournament's own scaffold - so
 * without this attribute every game's bar falls back to one indigo, which is
 * a perfectly plausible header that happens to be the same on all 21 games.
 */
function groundStyle(chrome: HeaderChrome | undefined): string {
  return chrome ? ` style="--g:${escapeAttribute(chrome.ground)}"` : "";
}

/**
 * One glyph from the app's icon set, drawn rather than typed.
 *
 * The emitted header is built at BUILD time as a string, so it cannot call
 * the React `Icon` - but it must not draw its own arrow either, or the set
 * stops being one set. Both come from `ICON_PATHS`, so a glyph redrawn in the
 * app is redrawn here with no second edit.
 */
export function icon(
  name: "back" | "expand" | "home" | "pause" | "play" | "redo" | "sound",
  cls = "",
): RawHtml {
  // Every subpath its own <path>: `home` is three of them concatenated, and a
  // single `d` holding all three still draws - so this is not a bug you would
  // see, only one you would measure. Splitting on the absolute M is what
  // `Icon` does in React, from the same table.
  const paths = ICON_PATHS[name]
    .split(/(?=M)/)
    .map((d) => `<path d="${d}"/>`)
    .join("");
  return raw(
    `<span class="gl"><svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true" ` +
      `fill="none" stroke="currentColor" stroke-width="${ICON_STROKE}" ` +
      `stroke-linecap="round" stroke-linejoin="round">` +
      `${paths}</svg></span>`,
  );
}

/**
 * The page's own line, under the bar and above the screen.
 *
 * The breadcrumb, which says where you are, then the buttons. Emitting it
 * once, here, rather than inside each screen is what makes the three screens
 * agree - the room and the boards pass no `tools` and still get the same row
 * with the same full-screen button at the same edge.
 *
 * FULL SCREEN LIVES HERE, not in the header above, and that is the operator's
 * call of 2026-08-21 - the arrangement they acked in `mockups/mobile-header.html`
 * puts `expand` on this row and nothing else in the header changed. It is
 * still PLATFORM chrome by the rule's own test (it means the same thing on a
 * game, in the room and on the boards), which is why `fullLabel` is what
 * decides whether it is drawn: every screen passes one, and a document passes
 * none. That keeps the "one bar, every screen" corollary intact - the bar it
 * is on simply moved down by one row.
 * See .claude/rules/game-controls-and-platform-chrome-never-share-a-bar.md
 *
 * Emitted `hidden`, exactly as it was in the header and for the same reason:
 * iOS Safari has no Fullscreen API for an arbitrary element, so the runtime
 * reveals it only where it will work. A control that does nothing when tapped
 * is worse than one that arrives a frame later.
 *
 * LAST in the row, after the game's own buttons. The mock draws it at the far
 * edge, and it is also the one button here a player presses once a session -
 * pause and restart are the ones reached for mid-run, so they take the
 * positions nearer the thumb.
 */
export function utilityRow(
  crumb: RawHtml,
  opts: { tools?: RawHtml; fullLabel?: string } = {},
): RawHtml {
  const full = opts.fullLabel
    ? html`<button type="button" class="ubtn" data-fullscreen aria-label="${opts.fullLabel}" hidden>
        ${icon("expand")}
      </button>`
    : raw("");
  const tools = opts.tools ?? raw("");
  return html`<div class="urow">
    ${crumb}${opts.tools || opts.fullLabel ? html`<div class="tools">${tools}${full}</div>` : raw("")}
  </div>`;
}

/**
 * The header row every playable screen wears: home | its name | sound, wallet.
 *
 * PLATFORM CONTROLS ONLY, and that is the whole test - every one of these
 * means the same thing on a game, in the room and on the boards, which is why
 * one row can serve all three. Difficulty and restart do not, so they live in
 * the game panel.
 * See .claude/rules/game-controls-and-platform-chrome-never-share-a-bar.md
 *
 * ONE way home, drawn as arrow-plus-house. There used to be four on a game
 * page - the wordmark, this arrow, the breadcrumb's Home link and a house
 * button in the row below - which is what a bar with no rule about what
 * belongs in it turns into. The room and the boards had the opposite problem:
 * their only way out was a back button drawn inside the scene, so the answer
 * to "how do I leave" was in a different place on every screen.
 *
 * Sound is emitted `hidden` and revealed by the runtime, because the build
 * cannot know whether this player is muted and a control drawn in the wrong
 * state is worse than one that arrives a frame later. Full screen used to sit
 * beside it and now sits on the utility row - see `utilityRow` for why, and
 * note that it is still platform chrome, just one row lower.
 */
function screenChrome(chrome: HeaderChrome, homeHref: string, slot: RawHtml | undefined): RawHtml {
  return html`
    <a class="hbtn home" href="${homeHref}" aria-label="${chrome.backLabel}">
      ${icon("back", "arw")}${icon("home")}
    </a>
    <b class="gname">${chrome.title}</b>
    <button type="button" class="hbtn ico" data-sound aria-label="${chrome.soundLabel}" hidden>
      ${icon("sound")}
    </button>
    <div class="wallet-wrap">${slot ?? raw("")}</div>
  `;
}

export function renderDocument(opts: DocumentOptions): string {
  const { locale, base } = opts;
  const site = SITE[locale];
  const dir = dirOf(locale);
  const canonical = canonicalUrl(opts.path);
  // The share card, found by PATH rather than passed down. Every caller
  // already knows its own path and the route table already knows every card,
  // so threading an extra argument through five page builders would be a
  // second place for the two to disagree.
  //
  // ABSOLUTE, and pointing at ellaz.fun on both hosts - the same rule the
  // canonical follows. A scraper is handed a URL with no page context, so a
  // base-relative one is unusable, and the Pages duplicate is noindex anyway.
  // OG_ROUTES, not ROUTES: the 404 deliberately has no card, because a
  // "not found" page is never deliberately shared and a picture for it
  // would promise content that does not exist. Looking it up in the full
  // route table instead advertises a file the build never writes.
  const ogRoute = OG_ROUTES.find((r) => r.path === opts.path);
  const ogImage = ogRoute ? canonicalUrl(ogImagePath(ogRoute)) : "";
  const alternates = opts.alternates ?? [];
  /**
   * `x-default` answers "we have no page in your language", so it points at
   * THIS page in `DEFAULT_LOCALE` - English.
   *
   * Two things were wrong before and they compounded. It pointed at Hebrew,
   * which is the wrong answer for everyone on earth except Hebrew speakers,
   * and they are matched by `hreflang="he"` long before x-default is ever
   * consulted. And it pointed at the HOME page from every document, so a
   * Turkish reader who found the snake article was sent to a home page in a
   * language they do not read, rather than to the snake article they wanted.
   */
  const xDefault = alternates.find((a) => a.locale === DEFAULT_LOCALE);
  /**
   * The other languages, for the footer.
   *
   * Falls back to each language's HOME when this page has no siblings, which
   * is the 404 and only the 404 - there is one 404 document for the whole
   * site, so it has no per-language twin to point at. Without the fallback it
   * silently loses its language link: no error, no failing test, just a page
   * that quietly stops offering English. Caught by diffing two real builds.
   */
  const siblings =
    alternates.length > 0 ? alternates : LOCALES.map((l) => ({ locale: l, path: homePath(l) }));
  const otherLocales = siblings.filter((a) => a.locale !== locale);

  /**
   * The document's own chrome: wordmark row, `<main>`, footer.
   *
   * An app shell gets none of it. It renders the home page as bare markup that
   * the runtime removes, and the app draws its own header, its own wallet and
   * its own language picker over the top - so an emitted header here would be a
   * second wordmark that only a visitor with no JavaScript ever stops seeing.
   * The footer's language links are not lost with it: `homeShellBody` carries
   * them inside `#home-doc`, where they belong to the page's own content.
   */
  const chrome = html`
    ${offerBar(locale, alternates, (p) => href(p, base))}
    <header class="top" ${raw(groundStyle(opts.headerChrome))}>
      <div class="in">
        ${opts.headerChrome
          ? screenChrome(opts.headerChrome, href(homePath(locale), base), opts.headerSlot)
          : html`<a class="brand" href="${href(homePath(locale), base)}">${site.brand}</a>
              <span class="tagline">${site.tagline}</span>
              ${opts.headerSlot}`}
      </div>
    </header>
    <main>${opts.body}</main>
    <footer>
      <div class="in">
        <span>${site.footer}</span>
        ${otherLocales.map(
          (a) =>
            // The autonym, never a flag: Spanish is not Spain, Arabic is
            // twenty-odd countries, and a flag beside a language is a claim
            // about nationality this site has no business making.
            //
            // It links to THIS page in that language rather than to that
            // language's home, so a reader who wants the snake article in
            // English gets the snake article. Only the languages that actually
            // have this page appear, so a crawlable link can never promise a
            // document nobody wrote.
            // One line on purpose. A line break inside the tag is emitted
            // verbatim into all 52 documents - `</a\n>` is legal HTML and
            // still noise in every page on the site.
            html`<a href="${href(a.path, base)}" hreflang="${a.locale}" lang="${a.locale}">${AUTONYM[a.locale]}</a>`,
        )}
      </div>
    </footer>
  `;

  return (
    "<!doctype html>\n" +
    toHtml(html`<html lang="${locale}" dir="${dir}">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <!-- FIRST, and synchronous. data-theme is deliberately never baked into
             these documents - they are cached and it would be wrong for whoever
             chose the other theme - so this is what sets it before the first
             paint. A module import runs far too late and the page visibly
             flashes the other theme. Generated from themes.ts, never written
             out here, so adding a theme cannot leave it behind. -->
        <script>
          ${raw(themeBootScript())}
        </script>
        <meta name="theme-color" content="${themeById(DEFAULT_THEME).browserChrome}" />
        <title>${opts.title}</title>
        <meta name="description" content="${opts.description}" />
        <link rel="canonical" href="${canonical}" />
        ${alternates.map(
          (a) =>
            html`<link rel="alternate" hreflang="${a.locale}" href="${canonicalUrl(a.path)}" />`,
        )}
        ${xDefault &&
        html`<link rel="alternate" hreflang="x-default" href="${canonicalUrl(xDefault.path)}" />`}
        ${!opts.indexable && html`<meta name="robots" content="noindex, follow" />`}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="${site.brand}" />
        <meta property="og:locale" content="${OG_LOCALE[locale]}" />
        ${alternates
          .filter((a) => a.locale !== locale)
          .map((a) => html`<meta property="og:locale:alternate" content="${OG_LOCALE[a.locale]}" />`)}
        <meta property="og:title" content="${opts.title}" />
        <meta property="og:description" content="${opts.description}" />
        <meta property="og:url" content="${canonical}" />
        ${ogImage &&
        html`<meta property="og:image" content="${ogImage}" />
          <meta property="og:image:width" content="${String(OG_WIDTH)}" />
          <meta property="og:image:height" content="${String(OG_HEIGHT)}" />
          <meta property="og:image:alt" content="${opts.title}" />
          <meta name="twitter:image" content="${ogImage}" />`}
        <meta name="twitter:card" content="${ogImage ? "summary_large_image" : "summary"}" />
        <link rel="icon" type="image/svg+xml" href="${base}favicon.svg" />
        <!-- Measurement, on EVERY emitted document and not only the app shell.
             Search Console says the arrivals land on GAME pages from Hebrew
             queries, so a shell-only tag would have measured almost none of
             them. Empty on any non-primary base, so the noindex mirror never
             reports. Config and its deliberate limits: src/build/analytics.ts. -->
        
${raw(opts.analytics === false ? "" : analyticsTag(base))}
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
        <link rel="stylesheet" href="${FONTS}" />
        ${!opts.shell &&
        html`<style>
          ${raw(DOCUMENT_CSS)}
        </style>`}
        ${opts.schema &&
        html`<script type="application/ld+json">
          ${jsonLd(opts.schema)}
        </script>`}
        ${(opts.headAssets?.tags ?? []).map((t) => raw(t))}
        ${(opts.preloads ?? []).map((t) => raw(t))}
      </head>
      <body ${raw(bodyClass(opts))}${raw(bodyAttrs(opts.bodyData))}>
        ${opts.shell ? opts.body : chrome}
      </body>
    </html>`)
  );
}
