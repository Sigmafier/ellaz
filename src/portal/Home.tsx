import type { Locale } from "@i18n/index";
import { makeT } from "@i18n/index";
import { CATALOG, CATEGORY_ORDER, type CatalogEntry } from "./catalog";
import { audioPort, speechPort } from "@sdk/index";
import { WalletChip } from "./WalletChip";

// Section order lives in catalog.ts (pure, so the catalog test can check every
// category in use has a section here). Sections with zero games are SKIPPED, so
// a category can be declared long before its first game ships.

// Home grid: icon-first game cards grouped by category. Tapping a card opens the
// game; hovering/touching prefetches its chunk for instant load.
export function Home({
  locale,
  onOpen,
  onOpenWorld,
  onToggleLocale,
}: {
  locale: Locale;
  onOpen: (id: string) => void;
  onOpenWorld: () => void;
  onToggleLocale: () => void;
}) {
  const t = makeT(locale);
  const sections = CATEGORY_ORDER.map(({ category, titleKey }) => ({
    category,
    title: t(titleKey),
    entries: CATALOG.filter((e) => e.meta.category === category),
  })).filter((s) => s.entries.length > 0);

  return (
    <div className="ellaz-scroll" style={{ flex: 1 }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "8px 16px 32px" }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 4px 20px",
        }}
      >
        <div style={{ fontSize: 40 }}>🎮</div>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 30, lineHeight: 1 }}>{t("appName")}</h1>
          <div style={{ color: "var(--text-dim)", fontSize: 14 }}>{t("tagline")}</div>
        </div>
        <WalletChip />
        <button
          aria-label={t("world")}
          onClick={() => {
            audioPort.play("tap");
            onOpenWorld();
          }}
          style={{
            minHeight: "var(--tap)",
            minWidth: "var(--tap)",
            padding: "0 12px",
            borderRadius: "var(--radius-pill)",
            border: "none",
            background: "var(--surface-2)",
            color: "var(--text)",
            fontSize: 24,
            lineHeight: 1,
          }}
        >
          <span aria-hidden="true">🏝️</span>
        </button>
        <button
          aria-label={t("language")}
          onClick={onToggleLocale}
          style={{
            minHeight: "var(--tap)",
            padding: "0 16px",
            borderRadius: "var(--radius-pill)",
            border: "none",
            background: "var(--surface-2)",
            color: "var(--text)",
            fontWeight: 800,
            fontSize: 15,
          }}
        >
          {locale === "he" ? "EN" : "עב"}
        </button>
      </header>

      {sections.map((s) => (
        <Section
          key={s.category}
          title={s.title}
          entries={s.entries}
          locale={locale}
          onOpen={onOpen}
        />
      ))}

      <p style={{ color: "var(--text-dim)", fontSize: 13, textAlign: "center", marginTop: 28 }}>
        📲 {t("installHint")}
      </p>
      </div>
    </div>
  );
}

function Section({
  title,
  entries,
  locale,
  onOpen,
}: {
  title: string;
  entries: CatalogEntry[];
  locale: Locale;
  onOpen: (id: string) => void;
}) {
  return (
    <section style={{ marginBottom: 24 }}>
      <h2 style={{ fontSize: 18, margin: "0 4px 12px", color: "var(--text-dim)" }}>{title}</h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: 14,
        }}
      >
        {entries.map((e) => (
          <GameCard key={e.meta.id} entry={e} locale={locale} onOpen={onOpen} />
        ))}
      </div>
    </section>
  );
}

function GameCard({
  entry,
  locale,
  onOpen,
}: {
  entry: CatalogEntry;
  locale: Locale;
  onOpen: (id: string) => void;
}) {
  const { meta } = entry;
  // Warm the chunk on hover/touch so opening is instant.
  const prefetch = () => void entry.load().catch(() => {});
  return (
    <button
      onPointerEnter={prefetch}
      onTouchStart={prefetch}
      onClick={() => {
        // First gesture of the session: unlock BOTH audio engines here, before any
        // game mounts. iOS refuses the first utterance outside a user gesture, so
        // without this line Hebrew speech stays silently locked all session.
        audioPort.unlock();
        speechPort.unlock();
        audioPort.play("tap");
        onOpen(meta.id);
      }}
      style={{
        border: "none",
        borderRadius: "var(--radius-3)",
        padding: 0,
        overflow: "hidden",
        background: "var(--surface)",
        boxShadow: "var(--shadow-1)",
        textAlign: "center",
        aspectRatio: "1 / 1",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          flex: 1,
          display: "grid",
          placeItems: "center",
          fontSize: 56,
          background: `radial-gradient(120px 90px at 50% 30%, ${meta.color}33, transparent), var(--surface)`,
        }}
      >
        {meta.emoji}
      </div>
      <div
        style={{
          padding: "10px 6px",
          fontWeight: 800,
          fontSize: 17,
          background: meta.color,
          color: "#1b1b2b",
        }}
      >
        {meta.title[locale]}
      </div>
    </button>
  );
}
