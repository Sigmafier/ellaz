import { useEffect, useRef, useState } from "react";
import type { Locale } from "@i18n/index";
import { makeT } from "@i18n/index";
import { audioPort, wallet, type ProfileV1 } from "@sdk/index";
import { IconButton } from "@ui/components";
import { burst, popEl, shake } from "@juice/index";
import { WalletChip } from "../WalletChip";
import { Scene } from "./Scene";
import { ALL_ITEMS, CATEGORIES, defaultFor, type ItemCategory, type ShopItem } from "./items";

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
  const [active, setActive] = useState<ItemCategory>("wall");
  const sceneRef = useRef<HTMLDivElement>(null);

  // wallet.subscribe returns its own unsubscribe, so it IS the cleanup.
  useEffect(() => wallet.subscribe(setProfile), []);

  const shown = ALL_ITEMS.filter((item) => item.category === active);

  const equippedId = (category: ItemCategory): string =>
    profile.equipped[category] ?? defaultFor(category).id;

  const tap = (item: ShopItem, card: HTMLElement) => {
    if (!wallet.owns(item.id)) {
      const starLocked = item.requiresStars !== undefined && profile.stars < item.requiresStars;
      if (starLocked || !wallet.canAfford(item.price)) {
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
            {locale === "he" ? "→" : "←"}
          </IconButton>
          <h1 style={{ flex: 1, fontSize: 26, lineHeight: 1 }}>{t("world")}</h1>
          <WalletChip />
        </header>

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
              equipped={equippedId(item.category) === item.id}
              locale={locale}
              t={t}
              onTap={tap}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ItemCard({
  item,
  profile,
  equipped,
  locale,
  t,
  onTap,
}: {
  item: ShopItem;
  profile: ProfileV1;
  equipped: boolean;
  locale: Locale;
  t: (key: string) => string;
  onTap: (item: ShopItem, card: HTMLElement) => void;
}) {
  // A free default is owned the moment the game boots, whether or not the
  // player has ever tapped it — otherwise the room's starting look would read
  // as something they still have to buy.
  const owned = item.price === 0 || profile.owned.includes(item.id);
  const starLocked =
    !owned && item.requiresStars !== undefined && profile.stars < item.requiresStars;
  const affordable = profile.coins >= item.price;
  const dim = !owned && (starLocked || !affordable);

  // The thumbnail is the whole room with THIS slot swapped in, so the picture
  // on the card is exactly the picture the tap produces.
  const preview = { ...profile.equipped, [item.category]: item.id };

  const badge = owned
    ? equipped
      ? "✓"
      : t("owned")
    : starLocked
      ? `⭐ ${item.requiresStars}`
      : `🪙 ${item.price}`;

  // Spoken separately from the badge: a screen reader should hear words, not
  // "star 10".
  const spoken = owned
    ? `${item.name[locale]}, ${equipped ? t("place") : t("owned")}`
    : starLocked
      ? `${item.name[locale]}, ${t("needStars")} ${item.requiresStars}`
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
          color: owned ? "var(--green)" : starLocked ? "var(--yellow)" : "var(--text-dim)",
        }}
      >
        {badge}
      </span>
    </button>
  );
}
