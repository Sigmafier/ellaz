import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type RefObject,
} from "react";
import type { AppLocale } from "@i18n/locales";
import { makeT, textFor } from "@i18n/index";
import {
  audioPort,
  dailyStreak,
  nameEmoji,
  renderName,
  wallet,
  type DailyStateV1,
  type ProfileV1,
} from "@sdk/index";
import { Button, IconButton } from "@ui/components";
import { Icon } from "@ui/icons";
import { burst, popEl, shake } from "@juice/index";
import { Scene } from "./Scene";
import { Backup } from "./Backup";
import { loadRoomArtRest, roomArtRevision, shopItems, subscribeRoomArt } from "./roomArt";
import {
  CATEGORIES,
  defaultFor,
  isUnlocked,
  type ItemCategory,
  type ShopItem,
} from "./items";

/** What the two shop gates read: lifetime stars, and the best streak ever run. */
export interface Earned {
  stars: number;
  longestStreak: number;
}

// "My world" — the screen the coins are FOR.
//
// Kid-safe rules that shape every interaction below:
//   • Nothing is punishing. A tap you cannot afford wiggles the card and stops.
//     No modal, no error text, no "you don't have enough" scolding.
//   • No confirm dialog on a purchase. Items are kept forever and every
//     category has a free default to fall back to, so a mis-tap costs a few
//     coins and nothing irreversible. A confirm step would cost more (reading)
//     than the mistake it prevents.
//   • Icons over words on navigation, so a five-year-old who cannot read yet
//     can still find the hats.
//   • No real money, no external links, no text input anywhere on this screen.

const CATEGORY_EMOJI: Record<ItemCategory, string> = {
  wall: "🧱",
  floor: "🪵",
  rug: "🧶",
  window: "🪟",
  light: "💡",
  plant: "🪴",
  poster: "🖼️",
  toy: "🧸",
  outfit: "👕",
  hat: "🎩",
  pet: "🐾",
};

/** i18n key per category — the label under each tab icon. */
const CATEGORY_KEY: Record<ItemCategory, string> = {
  wall: "catWall",
  floor: "catFloor",
  rug: "catRug",
  window: "catWindow",
  light: "catLight",
  plant: "catPlant",
  poster: "catPoster",
  toy: "catToy",
  outfit: "catOutfit",
  hat: "catHat",
  pet: "catPet",
};

export function World({ locale }: { locale: AppLocale }) {
  const t = makeT(locale);
  const [profile, setProfile] = useState<ProfileV1>(() => wallet.snapshot());
  // The streak lives in its own key beside the profile, so the shop reads it
  // separately. `longest` is what the streak gate keys on — never `current`,
  // for the reason `requiresStreak` gives: a missed day must cost nothing.
  const [daily, setDaily] = useState<DailyStateV1>(() => dailyStreak.read());
  const [active, setActive] = useState<ItemCategory>("wall");
  // WHAT THE BIG ROOM IS SHOWING, which is not always what the player owns.
  //
  // The shop used to buy on the card tap: one tap, coins gone, item worn. That
  // is fine for three rugs and wrong for eighty items - the picture on a 132px
  // card is the only thing a child has to go on, and the only way to see a hat
  // properly was to own it. So a tap now SELECTS, the room above redraws with
  // that one slot swapped, and buying is a separate, named button.
  //
  // `undefined` means "showing the room as it is", which is the state the
  // screen opens in and returns to on every category change. It is deliberately
  // not "the equipped item of the active category": those render identically,
  // and only this one lets the action bar say nothing rather than inviting a
  // tap on something already worn.
  const [preview, setPreview] = useState<ShopItem | undefined>(undefined);

  // The catalogue GROWS, from 33 rows to 82, when the lazy chunk lands.
  //
  // Nothing here may import that chunk statically. `PageApp` imports this
  // module, so a static import would put the whole second shelf in `page` -
  // and `page` is fetched by every visitor who opens a GAME. Measured on the
  // artifact, that arrangement took a game page's runtime from 19.3 to 28.5 KB
  // gz to carry pictures of shop items no game will ever draw.
  //
  // So the shop asks for it on mount, IMMEDIATELY rather than on idle: `Scene`
  // waits for `requestIdleCallback` because the home screen's room can afford
  // to, and a shop cannot. Both calls reach the same idempotent loader.
  useSyncExternalStore(subscribeRoomArt, roomArtRevision, roomArtRevision);
  useEffect(loadRoomArtRest, []);
  const catalogue = shopItems();
  const sceneRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  // wallet.subscribe returns its own unsubscribe, so it IS the cleanup.
  useEffect(() => wallet.subscribe(setProfile), []);
  useEffect(() => dailyStreak.subscribe(setDaily), []);

  // Name the player on their first visit HERE, rather than at app boot: a child
  // who only ever plays games needs no name, and this is the first screen that
  // shows one. The wallet notifies, so the subscription above re-renders us.
  useEffect(() => {
    wallet.ensureName();
  }, []);

  const shown = catalogue.filter((item) => item.category === active);
  const earned: Earned = { stars: profile.stars, longestStreak: daily.longest };

  // The collection counter under each tab. Derived from the catalogue every
  // render rather than stored, so a shelf added tomorrow counts itself. A free
  // default is owned from the first boot, exactly as the cards read it.
  const counts = Object.fromEntries(
    CATEGORIES.map((category) => {
      const all = catalogue.filter((item) => item.category === category);
      return [
        category,
        {
          owned: all.filter(
            (item) => item.price === 0 || profile.owned.includes(item.id),
          ).length,
          total: all.length,
        },
      ];
    }),
  ) as Record<ItemCategory, { owned: number; total: number }>;

  const equippedId = (category: ItemCategory): string =>
    profile.equipped[category] ?? defaultFor(category).id;

  /** Tapping a card only ever LOOKS. Nothing is bought and nothing is spent. */
  const select = (item: ShopItem) => {
    audioPort.play("tap");
    setPreview(item);
    const scene = sceneRef.current;
    if (scene) popEl(scene);
  };

  /**
   * The one button that spends. Buys if it must, then always places.
   *
   * Kept as one action rather than a buy step and a wear step, because the
   * thing a child wants is the thing on the screen in front of them - being
   * asked to press a second button to put on the hat they just bought is a
   * step that exists only in the shop's head.
   */
  const buyOrPlace = (item: ShopItem) => {
    const bar = barRef.current;
    if (!wallet.owns(item.id)) {
      if (!isUnlocked(item, earned) || !wallet.canAfford(item.price)) {
        // The whole refusal: a gentle wiggle. Nothing is said, nothing is lost.
        if (bar) shake(bar, 5, 220);
        return;
      }
      const result = wallet.buy(item.id, item.price, item.category);
      if (!result.ok) {
        if (bar) shake(bar, 5, 220);
        return;
      }
      if (item.price > 0 && bar) {
        const box = bar.getBoundingClientRect();
        burst(box.left + box.width / 2, box.top + box.height / 2);
      }
    }
    wallet.equip(item.category, item.id);
    audioPort.play("pop");
    const scene = sceneRef.current;
    if (scene) popEl(scene);
  };

  return (
    <div className="ellaz-scroll" style={{ flex: 1 }}>
      <div
        style={{ maxWidth: 900, margin: "0 auto", padding: "8px 16px 32px" }}
      >
        {/* NO header row here, and that is the normalisation.
            The way out and the wallet are PLATFORM chrome, so they are in the
            page header - the same bar, in the same place, carrying the same
            controls as every game and the boards. This row used to draw its
            own back arrow and its own chip, which is how "where are my coins"
            came to have a different answer on every screen of one product.
            The screen's NAME is up there too, so the h2 goes with it.
            See .claude/rules/game-controls-and-platform-chrome-never-share-a-bar.md */}

        <NamePlate profile={profile} locale={locale} t={t} />

        {/* The room, showing the PREVIEW when one is selected. One picture,
            not a room beside a swatch: a child comparing two hats needs to see
            them on the same head in the same room, which is the whole reason
            the card thumbnails were already whole-room renders. */}
        <div ref={sceneRef}>
          <Scene
            equipped={
              preview
                ? { ...profile.equipped, [preview.category]: preview.id }
                : profile.equipped
            }
          />
        </div>

        {/* The bar's space is RESERVED whether or not it is showing. Without
            this the tabs and the whole grid jump 74px down on the first tap -
            under the finger that just tapped, which on a phone means the card
            below the one they wanted is now where their thumb is. The bar
            itself renders nothing until something is selected, because a
            permanent one would be a control that does nothing sitting exactly
            where the one that does something goes. */}
        <div style={{ minHeight: 74 }}>
          <ActionBar
            barRef={barRef}
            item={preview}
            profile={profile}
            earned={earned}
            equipped={
              preview ? equippedId(preview.category) === preview.id : false
            }
            locale={locale}
            t={t}
            onAct={buyOrPlace}
          />
        </div>

        <nav
          aria-label={t("shop")}
          style={{
            display: "flex",
            gap: 10,
            overflowX: "auto",
            padding: "18px 2px 14px",
            scrollbarWidth: "none",
          }}
        >
          {CATEGORIES.map((category) => {
            const on = category === active;
            return (
              <button
                key={category}
                aria-label={t(CATEGORY_KEY[category])}
                aria-pressed={on}
                onClick={() => {
                  audioPort.play("tap");
                  setActive(category);
                  // Back to the room as it is. Carrying a preview across tabs
                  // would leave the big picture wearing something from a
                  // shelf the player is no longer looking at.
                  setPreview(undefined);
                }}
                style={{
                  flex: "0 0 auto",
                  minWidth: "var(--tap-kids)",
                  minHeight: "var(--tap-kids)",
                  display: "grid",
                  placeItems: "center",
                  gap: 2,
                  border: "none",
                  borderRadius: "var(--radius-2)",
                  background: on ? "var(--brand)" : "var(--surface-2)",
                  color: "var(--text)",
                  boxShadow: on ? "var(--shadow-2)" : "var(--shadow-1)",
                  padding: "6px 10px",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{ fontSize: 28, lineHeight: 1 }}
                >
                  {CATEGORY_EMOJI[category]}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                  }}
                >
                  {t(CATEGORY_KEY[category])}
                </span>
                {/* How much of this shelf the player has. A collection is more
                    fun when you can see it filling up, and with eighty items
                    the shop is otherwise a wall with no sense of progress.
                    dir="ltr" so "3/9" is not reordered inside the Hebrew app. */}
                <span
                  dir="ltr"
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    opacity: 0.7,
                    letterSpacing: 0.2,
                  }}
                >
                  {counts[category].owned}/{counts[category].total}
                </span>
              </button>
            );
          })}
        </nav>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(132px, 1fr))",
            gap: 12,
          }}
        >
          {shown.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              profile={profile}
              earned={earned}
              equipped={equippedId(item.category) === item.id}
              previewing={preview?.id === item.id}
              locale={locale}
              t={t}
              onTap={select}
            />
          ))}
        </div>

        {/* Under the shop on purpose: this is the one thing here addressed to a
            grown-up, and it must not sit between a child and their room. */}
        <Backup t={t} />
      </div>
    </div>
  );
}

/**
 * Who the player is — an animal face and a two-word name, with a button that
 * gives them another one.
 *
 * There is no text input here and there never will be: names come from a fixed
 * word list, which is why the button says "another name" rather than "edit".
 * That single decision removes moderation from this platform entirely — there
 * is nothing a child can type, so there is nothing to review or report.
 *
 * A name that does not resolve (a profile written by a newer build, met by a
 * stale tab) renders as the placeholder rather than crashing or being
 * overwritten. The reroll button is right there, which is the honest fix.
 */
function NamePlate({
  profile,
  locale,
  t,
}: {
  profile: ProfileV1;
  locale: AppLocale;
  t: (key: string) => string;
}) {
  const plateRef = useRef<HTMLDivElement>(null);
  const name = renderName(profile.name, locale);
  const emoji = nameEmoji(profile.name);

  const reroll = () => {
    audioPort.play("pop");
    wallet.rerollName();
    if (plateRef.current) popEl(plateRef.current);
  };

  return (
    <div
      ref={plateRef}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 14px",
        marginBottom: 12,
        borderRadius: "var(--radius-2)",
        background: "var(--surface-2)",
        boxShadow: "var(--shadow-1)",
      }}
    >
      <span aria-hidden="true" style={{ fontSize: 34, lineHeight: 1 }}>
        {emoji ?? "🙂"}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
          {t("yourName")}
        </div>
        {/* dir="auto" per string, not per container: one name is one script, so
            each resolves its own direction and an English name inside the
            Hebrew app still reads correctly. */}
        <div
          dir="auto"
          style={{
            fontSize: 20,
            fontWeight: 800,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {name ?? "—"}
        </div>
      </div>
      <IconButton ariaLabel={t("newName")} onClick={reroll}>
        🎲
      </IconButton>
    </div>
  );
}

/**
 * The one control on this screen that spends a coin.
 *
 * IT IS THE WHOLE POINT OF THE 2026-08-25 REWORK. Before it, tapping a shop
 * card bought the item — so with three rugs on a shelf a child could look at
 * their room, and with eighty items they could not look at anything without
 * paying for it. Preview and purchase were one gesture, and the cheaper of the
 * two was the one nobody could do.
 *
 * Four states, one button, and the word on it is always the thing that will
 * happen next:
 *
 *   nothing selected  the bar is not rendered at all
 *   locked            the requirement, and a shake if pressed
 *   not owned         Buy · <coins>, and a shake if the wallet is short
 *   owned             Place, or Placed when it is already on
 *
 * NO DISABLED BUTTONS, and that is a rule rather than a style: this platform
 * answers "you have not earned that yet" with a gentle wiggle and no words, so
 * a locked item stays pressable and simply wiggles. A greyed-out control that
 * refuses a tap tells a five-year-old they did something wrong; a wiggle tells
 * them the same thing without saying it. See `Button`'s own note on `disabled`.
 *
 * The shake lands on the BAR rather than the card, because the bar is what was
 * pressed. Shaking a card the player is not looking at is a refusal aimed at
 * the wrong place on the screen.
 */
function ActionBar({
  barRef,
  item,
  profile,
  earned,
  equipped,
  locale,
  t,
  onAct,
}: {
  barRef: RefObject<HTMLDivElement>;
  item: ShopItem | undefined;
  profile: ProfileV1;
  earned: Earned;
  equipped: boolean;
  locale: AppLocale;
  t: (key: string) => string;
  onAct: (item: ShopItem) => void;
}) {
  if (!item) {
    // Nothing selected: the room is simply the room. A permanent empty bar
    // would be a control that does nothing, sitting where the one that does
    // something goes.
    return null;
  }

  const owned = item.price === 0 || profile.owned.includes(item.id);
  const unlocked = isUnlocked(item, earned);
  const affordable = profile.coins >= item.price;
  const ready = owned || (unlocked && affordable);

  const label: ReactNode = owned ? (
    equipped ? (
      <>✓ {t("placed")}</>
    ) : (
      t("place")
    )
  ) : !unlocked && item.requiresStars !== undefined ? (
    <>
      <Icon name="star" filled /> {item.requiresStars}
    </>
  ) : !unlocked && item.requiresStreak !== undefined ? (
    <>
      <span aria-hidden="true">🔥</span> {item.requiresStreak}
    </>
  ) : (
    <>
      {t("buy")} <Icon name="coin" /> {item.price}
    </>
  );

  // Spoken separately from the label, so a screen reader hears words rather
  // than "star 10" — the same split the cards already make.
  const spoken = owned
    ? equipped
      ? `${textFor(item.name, locale)}, ${t("placed")}`
      : `${textFor(item.name, locale)}, ${t("place")}`
    : !unlocked && item.requiresStars !== undefined
      ? `${textFor(item.name, locale)}, ${t("needStars")} ${item.requiresStars}`
      : !unlocked && item.requiresStreak !== undefined
        ? `${textFor(item.name, locale)}, ${t("needStreak")} ${item.requiresStreak}`
        : `${textFor(item.name, locale)}, ${t("buy")} ${item.price} ${t("coins")}`;

  return (
    <div
      ref={barRef}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        margin: "12px auto 0",
        maxWidth: "min(90vw, 60vh, 420px)",
        padding: "10px 12px",
        borderRadius: "var(--radius-2)",
        background: "var(--surface-2)",
        boxShadow: "var(--shadow-1)",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          dir="auto"
          style={{
            fontSize: 16,
            fontWeight: 800,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {textFor(item.name, locale)}
        </div>
        <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
          {owned ? t("owned") : t("preview")}
        </div>
      </div>
      <Button
        kids
        ariaLabel={spoken}
        variant={ready && !equipped ? "primary" : "ghost"}
        onClick={() => onAct(item)}
        style={{
          // The glyph is an SVG block, so the row has to be a flex line or the
          // icon and the number sit on different baselines.
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          flex: "0 0 auto",
          fontSize: 18,
          opacity: ready ? 1 : 0.55,
        }}
      >
        {label}
      </Button>
    </div>
  );
}

function ItemCard({
  item,
  profile,
  earned,
  equipped,
  previewing,
  locale,
  t,
  onTap,
}: {
  item: ShopItem;
  profile: ProfileV1;
  earned: Earned;
  equipped: boolean;
  /** This card is the one the big room is currently showing. */
  previewing: boolean;
  locale: AppLocale;
  t: (key: string) => string;
  onTap: (item: ShopItem) => void;
}) {
  // A free default is owned the moment the game boots, whether or not the
  // player has ever tapped it — otherwise the room's starting look would read
  // as something they still have to buy.
  const owned = item.price === 0 || profile.owned.includes(item.id);
  // Which gate is shut decides what the badge SAYS, so the two are read
  // separately here even though `isUnlocked` answers the yes/no. An item held
  // by both would show the stars, which is the older and better-understood of
  // the two; nothing carries both today.
  const starLocked =
    !owned &&
    item.requiresStars !== undefined &&
    earned.stars < item.requiresStars;
  const streakLocked =
    !owned &&
    !starLocked &&
    item.requiresStreak !== undefined &&
    earned.longestStreak < item.requiresStreak;
  const affordable = profile.coins >= item.price;
  const dim = !owned && (starLocked || streakLocked || !affordable);

  // The thumbnail is the whole room with THIS slot swapped in, so the picture
  // on the card is exactly the picture the tap produces.
  const preview = { ...profile.equipped, [item.category]: item.id };

  // A price is the SAME currency the wallet chip shows, so it is the same
  // drawing - an emoji here beside an SVG in the chip is one coin rendered two
  // ways on one screen, which reads as two different things to a child.
  const badge: ReactNode = owned ? (
    equipped ? (
      "✓"
    ) : (
      t("owned")
    )
  ) : starLocked ? (
    <>
      <Icon name="star" filled /> {item.requiresStars}
    </>
  ) : streakLocked ? (
    // The same flame the streak chip shows, so a child who has seen one knows
    // what the other is asking for without reading a word.
    <>
      <span aria-hidden="true">🔥</span> {item.requiresStreak}
    </>
  ) : (
    <>
      <Icon name="coin" /> {item.price}
    </>
  );

  // Spoken separately from the badge: a screen reader should hear words, not
  // "star 10".
  // A tap SHOWS - it does not buy - so the label says so. It used to promise
  // "buy, 30 coins" on a control that charged the moment it was pressed; the
  // button under the room is what charges now, and it carries that wording.
  const spoken = owned
    ? `${textFor(item.name, locale)}, ${equipped ? t("placed") : t("owned")}, ${t("preview")}`
    : starLocked
      ? `${textFor(item.name, locale)}, ${t("needStars")} ${item.requiresStars}, ${t("preview")}`
      : streakLocked
        ? `${textFor(item.name, locale)}, ${t("needStreak")} ${item.requiresStreak}, ${t("preview")}`
        : `${textFor(item.name, locale)}, ${item.price} ${t("coins")}, ${t("preview")}`;

  return (
    <button
      onClick={() => onTap(item)}
      aria-label={spoken}
      aria-pressed={previewing}
      style={{
        // Two different marks, because they are two different facts. The solid
        // ring is "this is what you are wearing"; the dashed one is "this is
        // what the room above is showing you". A player comparing four hats has
        // one of each on screen and must be able to tell them apart.
        border: equipped
          ? "3px solid var(--brand-2)"
          : previewing
            ? "3px dashed var(--brand)"
            : "3px solid transparent",
        borderRadius: "var(--radius-3)",
        padding: 8,
        background: "var(--surface)",
        boxShadow: "var(--shadow-1)",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        opacity: dim ? 0.45 : 1,
        minHeight: "var(--tap-kids)",
        cursor: "pointer",
      }}
    >
      <Scene equipped={preview} size="100%" />
      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
        {textFor(item.name, locale)}
      </span>
      <span
        // The price reads left-to-right even inside the Hebrew RTL shell.
        dir="ltr"
        style={{
          fontSize: 14,
          fontWeight: 800,
          color: owned
            ? "var(--green)"
            : starLocked
              ? "var(--yellow)"
              : streakLocked
                ? "var(--orange-ink)"
                : "var(--text-dim)",
          // The glyph is an SVG block now, so the row has to be a flex line or
          // the icon and the number sit on different baselines.
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        {badge}
      </span>
    </button>
  );
}
