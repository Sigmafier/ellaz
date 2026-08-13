import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Locale } from "@i18n/index";
import { backArrow, makeT } from "@i18n/index";
import {
  audioPort,
  dailyStreak,
  nameEmoji,
  renderName,
  wallet,
  type DailyStateV1,
  type ProfileV1,
} from "@sdk/index";
import { IconButton } from "@ui/components";
import { Icon } from "@ui/icons";
import { burst, popEl, shake } from "@juice/index";
import { WalletChip } from "../WalletChip";
import { Scene } from "./Scene";
import { Backup } from "./Backup";
import {
  ALL_ITEMS,
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
  plant: "🪴",
  poster: "🖼️",
  outfit: "👕",
  hat: "🎩",
  pet: "🐾",
};

/** i18n key per category — the label under each tab icon. */
const CATEGORY_KEY: Record<ItemCategory, string> = {
  wall: "catWall",
  floor: "catFloor",
  rug: "catRug",
  plant: "catPlant",
  poster: "catPoster",
  outfit: "catOutfit",
  hat: "catHat",
  pet: "catPet",
};

export function World({ locale, onExit }: { locale: Locale; onExit: () => void }) {
  const t = makeT(locale);
  const [profile, setProfile] = useState<ProfileV1>(() => wallet.snapshot());
  // The streak lives in its own key beside the profile, so the shop reads it
  // separately. `longest` is what the streak gate keys on — never `current`,
  // for the reason `requiresStreak` gives: a missed day must cost nothing.
  const [daily, setDaily] = useState<DailyStateV1>(() => dailyStreak.read());
  const [active, setActive] = useState<ItemCategory>("wall");
  const sceneRef = useRef<HTMLDivElement>(null);

  // wallet.subscribe returns its own unsubscribe, so it IS the cleanup.
  useEffect(() => wallet.subscribe(setProfile), []);
  useEffect(() => dailyStreak.subscribe(setDaily), []);

  // Name the player on their first visit HERE, rather than at app boot: a child
  // who only ever plays games needs no name, and this is the first screen that
  // shows one. The wallet notifies, so the subscription above re-renders us.
  useEffect(() => {
    wallet.ensureName();
  }, []);

  const shown = ALL_ITEMS.filter((item) => item.category === active);
  const earned: Earned = { stars: profile.stars, longestStreak: daily.longest };

  const equippedId = (category: ItemCategory): string =>
    profile.equipped[category] ?? defaultFor(category).id;

  const tap = (item: ShopItem, card: HTMLElement) => {
    if (!wallet.owns(item.id)) {
      if (!isUnlocked(item, earned) || !wallet.canAfford(item.price)) {
        // The whole refusal: a gentle wiggle. Nothing is said, nothing is lost.
        shake(card, 5, 220);
        return;
      }
      const result = wallet.buy(item.id, item.price, item.category);
      if (!result.ok) {
        shake(card, 5, 220);
        return;
      }
      if (item.price > 0) {
        const box = card.getBoundingClientRect();
        burst(box.left + box.width / 2, box.top + box.height / 2);
      }
    }
    // Buying always places the thing too — one tap, one visible result.
    wallet.equip(item.category, item.id);
    audioPort.play("pop");
    const scene = sceneRef.current;
    if (scene) popEl(scene);
  };

  return (
    <div className="ellaz-scroll" style={{ flex: 1 }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "8px 16px 32px" }}>
        <header style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0 16px" }}>
          <IconButton ariaLabel={t("back")} onClick={onExit}>
            {backArrow(locale)}
          </IconButton>
          {/* h2 — the emitted page already has the h1. See Boards.tsx. */}
          <h2 style={{ flex: 1, fontSize: 26, lineHeight: 1, margin: 0 }}>{t("world")}</h2>
          <WalletChip />
        </header>

        <NamePlate profile={profile} locale={locale} t={t} />

        <div ref={sceneRef}>
          <Scene equipped={profile.equipped} />
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
                <span aria-hidden="true" style={{ fontSize: 28, lineHeight: 1 }}>
                  {CATEGORY_EMOJI[category]}
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>
                  {t(CATEGORY_KEY[category])}
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
              locale={locale}
              t={t}
              onTap={tap}
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
  locale: Locale;
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
        <div style={{ fontSize: 12, color: "var(--text-dim)" }}>{t("yourName")}</div>
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

function ItemCard({
  item,
  profile,
  earned,
  equipped,
  locale,
  t,
  onTap,
}: {
  item: ShopItem;
  profile: ProfileV1;
  earned: Earned;
  equipped: boolean;
  locale: Locale;
  t: (key: string) => string;
  onTap: (item: ShopItem, card: HTMLElement) => void;
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
    !owned && item.requiresStars !== undefined && earned.stars < item.requiresStars;
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
  const spoken = owned
    ? `${item.name[locale]}, ${equipped ? t("place") : t("owned")}`
    : starLocked
      ? `${item.name[locale]}, ${t("needStars")} ${item.requiresStars}`
      : streakLocked
        ? `${item.name[locale]}, ${t("needStreak")} ${item.requiresStreak}`
        : `${item.name[locale]}, ${t("buy")} ${item.price} ${t("coins")}`;

  return (
    <button
      onClick={(e) => onTap(item, e.currentTarget)}
      aria-label={spoken}
      style={{
        border: equipped ? "3px solid var(--brand-2)" : "3px solid transparent",
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
        {item.name[locale]}
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
