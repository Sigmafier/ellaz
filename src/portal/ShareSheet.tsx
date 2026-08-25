import { useEffect, useMemo, useRef, useState } from "react";
import type { AppLocale } from "@i18n/locales";
import { DIR, makeT } from "@i18n/index";
import { audioPort } from "@sdk/index";
import { buildGameInvite, type GameInvite } from "@sdk/share";
import { CARD_SIZE, emojiFree, shareCardSvg } from "./shareCard";
import { renderCardPng, toShareFile } from "./shareCardRender";

/* The share sheet - a picture, a line of text, and an honest button.
   ===========================================================================

   THE STANDARD THIS SCREEN IS HELD TO
   `.claude/rules/destructive-actions-show-both-sides.md`: never present a
   promise the platform has not made. Sharing is not destructive, but it has the
   same shape - the thing that decides whether it works is outside this app, and
   the tempting UI is one button labelled "Share" that does something different
   on every device and says nothing when it does less.

   So the LABEL IS COMPUTED FROM CAPABILITY, before the tap:

     navigator.share missing        -> the button says "Copy link", because that
                                       is what it is going to do.
     share, but not with files      -> the button says "Share" and a line under
                                       it says this device sends the link only.
     both                           -> "Share", picture attached.

   And the card is rendered ON OPEN rather than on tap. Two reasons, and the
   second is the load-bearing one: the button cannot honestly say what it will
   do until the file exists, AND Safari drops transient activation across an
   await - so a handler that rasterises first and calls `navigator.share`
   afterwards is refused by iOS as a share with no user gesture behind it. */

export interface ShareSheetProps {
  locale: AppLocale;
  /**
   * ONE game, as an INVITE. Operator ruling 2026-08-25, asked which of two
   * shapes a per-game share should take: "An invite - just the game."
   *
   * `sdk/share.ts` has nowhere to put a score, and that absence is the ruling
   * expressed as a type. It is also what lets this open on all 34 games -
   * `coloring` deliberately keeps no score, and would otherwise be the one game
   * with nothing to share.
   */
  game: GameInvite;
  /** THIS GAME's page, already carrying the base. */
  url: string;
  onClose: () => void;
  onTap?: () => void;
}

/** What this device can actually do, once the file exists. */
type Ability = "pending" | "share-with-picture" | "share-link-only" | "copy" | "show";

export function ShareSheet({ locale, game, url, onClose, onTap }: ShareSheetProps) {
  const t = makeT(locale);
  const rtl = DIR[locale] === "rtl";

  const payload = useMemo(
    () => buildGameInvite(game, { note: t("shareNote"), invite: t("shareInvite") }, url),
    // `t` is rebuilt every render; the labels behind it change only with the
    // locale, which is what this actually depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [game, url, locale],
  );

  const [ability, setAbility] = useState<Ability>("pending");
  const [preview, setPreview] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const fileRef = useRef<File | null>(null);

  useEffect(() => {
    if (!payload) return;
    let alive = true;
    let objectUrl = "";

    void (async () => {
      let file: File | null = null;
      try {
        const svg = shareCardSvg({
          headline: payload.headline,
          // The picture draws plain titles; the MESSAGE keeps the emoji. See
          // `emojiFree` for why a rasterised glyph is a bad idea.
          lines: payload.items.map(emojiFree),
          url: payload.url,
          artId: game.gameId,
          rtl,
        });
        const png = await renderCardPng(svg, CARD_SIZE);
        if (png) {
          file = toShareFile(png, game.gameId);
          objectUrl = URL.createObjectURL(png);
        }
      } catch {
        // A card that cannot be drawn costs the picture and nothing else. The
        // link still travels, and the button below will say so.
        file = null;
      }

      if (!alive) {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        return;
      }

      fileRef.current = file;
      if (objectUrl) setPreview(objectUrl);
      setAbility(decideAbility(file));
    })();

    return () => {
      alive = false;
      // Revoked on unmount as well as on the early return: an object URL is
      // pinned for the life of the document, so a sheet opened five times would
      // hold five cards until the tab closed.
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload, rtl]);

  if (!payload) return null;

  const primaryLabel =
    ability === "copy" ? t("shareCopy") : ability === "show" ? t("shareCopy") : t("share");

  async function act() {
    onTap?.();
    if (!payload) return;

    // NO AWAIT BEFORE `navigator.share`. Safari treats an await as the end of
    // the user gesture and refuses the call, which is why the file was
    // rasterised when the sheet opened rather than here.
    if (ability === "share-with-picture" || ability === "share-link-only") {
      const data: ShareData =
        ability === "share-with-picture" && fileRef.current
          ? { files: [fileRef.current], text: payload.text }
          : { text: payload.text, url: payload.url };
      try {
        await navigator.share(data);
        onClose();
      } catch (err) {
        // AbortError is the player tapping "cancel" in the OS sheet. That is
        // not a failure and must not be reported as one.
        if (!(err instanceof Error) || err.name !== "AbortError") setNote(t("shareFailed"));
      }
      return;
    }

    if (ability === "copy") {
      try {
        await navigator.clipboard.writeText(payload.text);
        setNote(t("shareCopied"));
      } catch {
        setNote(t("shareFailed"));
        setAbility("show");
      }
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("share")}
      dir={rtl ? "rtl" : "ltr"}
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        // `--badge-fill` rather than a literal. There is no `--scrim` token,
        // and adding one means editing `ui/tokens.css`, which is outside this
        // change - so this reuses the one translucent dark the theme already
        // declares in both palettes. A literal here would be a colour the
        // theme cannot reach, which is what `ui/token-hygiene.test.ts` exists
        // to refuse. A real `--scrim` is worth adding next time that file is open.
        background: "var(--badge-fill)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(100%, 420px)",
          maxHeight: "90vh",
          overflowY: "auto",
          borderRadius: "var(--radius-3)",
          background: "var(--surface)",
          boxShadow: "var(--shadow-1)",
          padding: 16,
          color: "var(--text)",
        }}
      >
        <h2 style={{ fontSize: 20, margin: "0 0 12px" }}>{t("share")}</h2>

        {/* The picture, at the size it will be sent. A preview that differs
            from the artifact is the whole class of bug this repo keeps
            finding, so this IS the artifact - the same PNG blob. */}
        <div
          style={{
            aspectRatio: "1 / 1",
            borderRadius: "var(--radius-2)",
            overflow: "hidden",
            background: "var(--surface-2)",
            marginBottom: 12,
          }}
        >
          {preview ? (
            <img
              src={preview}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          ) : null}
        </div>

        {/* The message, shown rather than described. It is also the fallback
            surface: a device with no share and no clipboard still lets somebody
            select this and send it themselves. */}
        <p
          dir="auto"
          style={{
            whiteSpace: "pre-wrap",
            userSelect: "text",
            fontSize: 14.5,
            lineHeight: 1.5,
            color: "var(--text-dim)",
            margin: "0 0 12px",
          }}
        >
          {payload.text}
        </p>

        {ability === "share-link-only" ? (
          <p style={{ fontSize: 13, color: "var(--text-dim)", margin: "0 0 10px" }}>
            {t("shareLinkOnly")}
          </p>
        ) : null}

        {note ? (
          <p role="status" style={{ fontSize: 13, color: "var(--text-dim)", margin: "0 0 10px" }}>
            {note}
          </p>
        ) : null}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <button
            onClick={() => void act()}
            disabled={ability === "pending" || ability === "show"}
            style={{
              flex: "1 1 auto",
              minHeight: "var(--tap)",
              border: "none",
              borderRadius: "var(--radius-pill)",
              background: "var(--brand)",
              color: "var(--on-brand)",
              fontWeight: 800,
              fontSize: 15,
              opacity: ability === "pending" || ability === "show" ? 0.5 : 1,
            }}
          >
            {ability === "pending" ? t("loading") : primaryLabel}
          </button>
          <button
            onClick={() => {
              audioPort.play("tap");
              onClose();
            }}
            style={{
              flex: "0 0 auto",
              minHeight: "var(--tap)",
              padding: "0 16px",
              border: "none",
              borderRadius: "var(--radius-pill)",
              background: "var(--surface-2)",
              color: "var(--text)",
              fontWeight: 700,
              fontSize: 15,
            }}
          >
            {t("back")}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * What this device can do, decided ONCE and before the button is labelled.
 *
 * `navigator.canShare` is asked with the REAL file rather than a probe object:
 * it answers per payload, and a browser that shares text happily can refuse a
 * PNG. Asking with anything other than what we are about to send is asking a
 * different question.
 */
export function decideAbility(file: File | null): Ability {
  const nav = typeof navigator === "undefined" ? undefined : navigator;
  if (nav && typeof nav.share === "function") {
    if (file && typeof nav.canShare === "function" && nav.canShare({ files: [file] })) {
      return "share-with-picture";
    }
    return "share-link-only";
  }
  if (nav && nav.clipboard && typeof nav.clipboard.writeText === "function") return "copy";
  // Nothing to promise. The message is on screen and selectable, and the button
  // is inert rather than lying about what it does.
  return "show";
}
