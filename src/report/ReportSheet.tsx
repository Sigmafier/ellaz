import { useEffect, useMemo, useRef, useState } from "react";
import type { AppLocale } from "@i18n/locales";
import { DIR, makeT } from "@i18n/index";
import { captureContext, type ReportEnv } from "./context";
import { captureShot } from "./shot";
import { themePort } from "@ui/theme";
import { audioPort } from "@sdk/audio";
import { createReporter, MAX_SHOT, type SendOutcome } from "./send";
import { lookFor } from "./outcome";

/* The sheet. Three steps, and the third one is the point.
   ===========================================================================

   THE STANDARD THIS SCREEN IS HELD TO
   `.claude/rules/destructive-actions-show-both-sides.md`. Sending is not
   destructive, but it carries the same trap: the thing that decides whether it
   worked is outside this app, and the tempting UI is one button that says
   "Thanks!" the moment it is tapped. So nothing here claims a send until the
   write has come back, and the four outcomes render as four different things -
   only `failed` offers a retry, because a throttle and a refusal are both
   states a second identical tap cannot change.

   STEP 3 IS NOT DECORATION. A child may be holding this device. Everything that
   will leave is listed in words before the button, because "we collect
   diagnostic information" is not consent anybody can act on. The picture has
   its own switch, because it is the one item somebody might reasonably not want
   to send.

   NO TYPING IS EVER REQUIRED. The reasons are taps. A five-year-old cannot
   describe a bug and should not have to, and the free-text box is the part that
   can carry something personal - so it is optional, bounded, and last. */

/** What a report is about. Ids are persisted in the inbox and read by the
 *  triage script, so they are never renamed - same law as shop item ids. */
const REASONS = [
  { id: "broke", emoji: "\u{1F41E}", key: "reportBroke", kind: "bug" },
  { id: "hard", emoji: "\u{1F615}", key: "reportHard", kind: "bug" },
  { id: "picture", emoji: "\u{1F3A8}", key: "reportPicture", kind: "bug" },
  { id: "sound", emoji: "\u{1F507}", key: "reportSound", kind: "bug" },
  { id: "idea", emoji: "\u{1F4A1}", key: "reportIdea", kind: "idea" },
] as const;

export const MAX_MESSAGE = 300;

export interface ReportSheetProps {
  locale: AppLocale;
  /** Absent on home, the room and the boards. */
  gameId?: string;
  /** The play surface, so a canvas game can hand us its pixels. */
  frame?: ParentNode | null;
  /** A crash that armed this sheet, if the crash card opened it. */
  errors?: { message: string; stack?: string }[];
  onClose: () => void;
}

/**
 * `locale` is passed IN rather than read, because the component already knows
 * it and that is the whole point: the sheet used to preview the prop and send
 * whatever storage held, and the two disagreed on every default visit. One
 * source. See `ReportEnv.app`.
 */
function readEnv(locale: AppLocale): ReportEnv {
  return {
    app: {
      locale,
      // The RESOLVED theme and mute, not their storage keys - neither key
      // exists until the player changes something, so storage answers
      // "undefined" for the ordinary case rather than "market" and "not muted".
      theme: themePort.current,
      muted: audioPort.muted,
    },
    storage: {
      read: (k) => {
        try {
          return localStorage.getItem(k);
        } catch {
          return null;
        }
      },
      keys: () => [],
    },
    view: {
      w: window.innerWidth,
      h: window.innerHeight,
      dpr: window.devicePixelRatio || 1,
      orientation: window.innerHeight >= window.innerWidth ? "portrait" : "landscape",
    },
    client: {
      userAgent: navigator.userAgent,
      language: navigator.language,
      online: navigator.onLine,
    },
    now: Date.now(),
    base: import.meta.env.BASE_URL,
    buildStamp: __BUILD_STAMP__,
  };
}

export function ReportSheet({ locale, gameId, frame, errors, onClose }: ReportSheetProps) {
  const t = makeT(locale);
  const rtl = DIR[locale] === "rtl";

  const [reason, setReason] = useState<(typeof REASONS)[number]["id"]>("broke");
  const [message, setMessage] = useState("");
  const [withShot, setWithShot] = useState(true);
  const [phase, setPhase] = useState<"compose" | "sending" | "sent">("compose");
  const [outcome, setOutcome] = useState<SendOutcome | null>(null);
  const box = useRef<HTMLTextAreaElement>(null);

  // Captured ON OPEN, not on send: by the time somebody has typed a sentence
  // the board has moved on, and the board they were looking at is the evidence.
  const snapshot = useMemo(() => readEnv(locale), [locale]);
  const shot = useMemo(() => captureShot(frame ?? null), [frame]);
  const ctx = useMemo(() => {
    const base = captureContext(gameId, snapshot);
    return errors?.length
      ? { ...base, errors: errors.slice(0, 3).map((e) => ({ message: e.message.slice(0, 300), stack: e.stack?.slice(0, 2000) })) }
      : base;
  }, [gameId, snapshot, errors]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const picked = REASONS.find((r) => r.id === reason)!;

  async function send() {
    setPhase("sending");
    const shotTooBig = shot.ok && shot.dataUrl.length > MAX_SHOT;
    const reporter = createReporter();
    const result = await reporter.send({
      kind: picked.kind,
      reason: picked.id,
      message: message.trim().slice(0, MAX_MESSAGE) || undefined,
      ctx: { ...ctx, shot: undefined, shotWhy: shotTooBig ? "too-big" : shot.ok ? "captured" : shot.why },
      // Never the picture at the cost of the report - see MAX_SHOT.
      shot: withShot && shot.ok && !shotTooBig ? shot.dataUrl : undefined,
    });
    setOutcome(result);
    setPhase("sent");
  }

  const S = styles(rtl);

  return (
    <div style={S.scrim} onClick={onClose}>
      {/* `data-report-sheet` is a STABLE hook for the live probe. Binding a
          probe to a caption ties it to prose that ships in eleven languages and
          gets rewritten; the probe then fails on the rename and reads exactly
          like a broken feature. The consent bar is a `role="dialog"` too, and
          it is the one a role selector finds first on a first visit - which is
          precisely how this hook came to exist. */}
      <div
        style={S.card}
        role="dialog"
        aria-modal="true"
        data-report-sheet
        aria-label={t("reportTitle")}
        dir={rtl ? "rtl" : "ltr"}
        onClick={(e) => e.stopPropagation()}
      >
        {phase === "sent" ? (
          <Result outcome={outcome} t={t} onClose={onClose} onRetry={() => setPhase("compose")} />
        ) : (
          <>
            <h2 style={S.h2}>{t("reportTitle")}</h2>
            <p style={S.sub}>{t("reportSub")}</p>

            <p style={S.step}>1 &middot; {t("reportWhat")}</p>
            <div style={S.chips}>
              {REASONS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  aria-pressed={r.id === reason}
                  onClick={() => setReason(r.id)}
                  style={{ ...S.chip, ...(r.id === reason ? S.chipOn : null) }}
                >
                  <span aria-hidden="true">{r.emoji}</span>
                  {t(r.key)}
                </button>
              ))}
            </div>

            <p style={S.step}>
              2 &middot; {t("reportMore")} <span style={S.hint}>({t("reportSkip")})</span>
            </p>
            <textarea
              ref={box}
              style={S.box}
              maxLength={MAX_MESSAGE}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              aria-label={t("reportMore")}
            />
            <p style={S.count}>
              {message.length} / {MAX_MESSAGE}
            </p>

            <p style={S.step}>3 &middot; {t("reportSends")}</p>
            <ul style={S.list}>
              {ctx.game ? (
                <Row k={t("reportGame")} v={[ctx.game.id, ctx.game.level].filter(Boolean).join(" · ")} rtl={rtl} />
              ) : null}
              {ctx.game && !ctx.game.sessionDropped ? (
                <Row k={t("reportBoard")} v={t("reportBoardNow")} rtl={rtl} />
              ) : null}
              <Row k={t("reportScreen")} v={`${ctx.view.w} × ${ctx.view.h}`} rtl={rtl} />
              {/* No `?? locale` any more. The fallback WAS the bug: it made
                  this line right and the payload wrong, and nothing on screen
                  could show the difference. The preview reads the thing it is
                  previewing. */}
              <Row k={t("reportApp")} v={`${ctx.app.locale} · ${ctx.app.buildStamp.slice(0, 8)}`} rtl={rtl} />
            </ul>

            {shot.ok ? (
              <label style={S.shotRow}>
                <img src={shot.dataUrl} alt="" style={S.thumb} />
                <span style={S.shotLabel}>{t("reportShot")}</span>
                <input
                  type="checkbox"
                  checked={withShot}
                  onChange={(e) => setWithShot(e.target.checked)}
                  style={S.check}
                />
              </label>
            ) : null}

            <p style={S.priv}>{t("reportPrivacy")}</p>

            <div style={S.row}>
              <button type="button" style={{ ...S.btn, ...S.ghost }} onClick={onClose}>
                {t("reportCancel")}
              </button>
              {/* A STABLE hook, like `data-report-sheet` above and for the same
                  reason: a probe bound to the caption breaks when the caption is
                  translated or reworded, and then it fails for the wrong reason
                  (`.claude/rules/a-threshold-tuned-against-todays-tree-goes-stale.md`
                  § the SELECTOR). This one lets a harness drive a real send. */}
              <button type="button" data-report-send style={S.btn} onClick={() => void send()} disabled={phase === "sending"}>
                {phase === "sending" ? t("reportSending") : t("reportSend")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** One line of "what we'll send". Description, NOT a control - it carries no
 *  imperative and must not look tappable. */
function Row({ k, v, rtl }: { k: string; v: string; rtl: boolean }) {
  return (
    <li style={{ display: "flex", gap: 9, alignItems: "flex-start", textAlign: rtl ? "right" : "left" }}>
      <span style={{ color: "var(--text-dim)", flex: "0 0 92px" }}>{k}</span>
      <span>{v}</span>
    </li>
  );
}

/** The four outcomes, as four different screens, and only ONE of them offers a
 *  retry. A throttle cannot succeed for another minute; a refusal is the rules
 *  block rejecting the SHAPE of this report - an oversized field - so the same
 *  bytes will be refused again however many times they are sent. Only `failed`
 *  (no network, a timeout, a 500) is worth a second attempt.
 *
 *  Before 2026-09-03 `refused` and `failed` shared one screen and one button:
 *  a player whose report could never land was invited to keep trying forever,
 *  which is the same lie the throttle screen already refused to tell. */
function Result({
  outcome,
  t,
  onClose,
  onRetry,
}: {
  outcome: SendOutcome | null;
  t: (k: string) => string;
  onClose: () => void;
  onRetry: () => void;
}) {
  const S = styles(false);
  // The decision lives in `outcome.ts` because nothing here can render - see
  // that file. This component draws the answer and does not compute it.
  const look = lookFor(outcome);

  // THE COUNTDOWN. The operator, reporting four things in four minutes and
  // being told "give it a minute" each time: "Let user see a countdown or
  // something to their second message" (issue #26).
  //
  // It ticks against ELAPSED time, never against a deadline computed from
  // `Date.now()`, because `waitFor` was measured on the server's clock and
  // this device's may be minutes out. A phone that sleeps mid-wait resumes
  // with the correct remainder for the same reason.
  const [left, setLeft] = useState(look.waitFor);
  useEffect(() => {
    if (look.waitFor === null) return;
    const startedAt = Date.now();
    setLeft(look.waitFor);
    const id = window.setInterval(() => {
      const remaining = look.waitFor! - (Date.now() - startedAt);
      setLeft(remaining > 0 ? remaining : 0);
      if (remaining <= 0) window.clearInterval(id);
    }, 250);
    return () => window.clearInterval(id);
    // The wait is the whole identity of this effect: a NEW throttled outcome
    // restarts the clock, and any other outcome tears it down.
  }, [look.waitFor]);

  const waiting = look.waitFor !== null && left !== null && left > 0;
  // Retry is offered when the outcome allows it, OR once a throttle's wait has
  // actually elapsed - at which point the same tap CAN succeed, so the button
  // is no longer the lie this file exists to have removed.
  const canRetry = look.retry || (look.waitFor !== null && !waiting);

  return (
    <div style={{ textAlign: "center", padding: "18px 4px 4px" }}>
      <div style={{ fontSize: 48 }} aria-hidden="true">
        {look.emoji}
      </div>
      <p role="status" style={{ ...S.sub, fontSize: "1rem", margin: "10px 0 20px" }}>
        {t(look.key)}
        {waiting ? (
          <>
            {" "}
            {/* A LIVE REGION, so the seconds are not read aloud on every tick -
                the parent is role=status and would announce each one. The
                number is decoration over the sentence above, which already
                says what happened. */}
            <span aria-hidden="true" style={{ fontWeight: 700, color: "var(--brand-ink)" }}>
              {Math.ceil(left / 1000)}s
            </span>
          </>
        ) : null}
      </p>
      <div style={S.row}>
        {canRetry ? (
          <button type="button" style={{ ...S.btn, ...S.ghost }} onClick={onRetry}>
            {t("reportRetry")}
          </button>
        ) : null}
        {/* CLOSE, never Cancel. The compose screen has something to cancel -
            a draft you are abandoning. This screen does not: the report has
            already been sent, refused or throttled, and there is nothing left
            to call off. Offering to cancel a thing that already happened is
            the same class of untruth as the retry button that could not work.
            Operator, seeing the four result screens side by side on
            2026-09-03: "why cancel?? show different button". */}
        <button type="button" style={S.btn} onClick={onClose}>
          {t("reportClose")}
        </button>
      </div>
    </div>
  );
}

/** Tokens only - `token-hygiene.test.ts` refuses a colour literal here. */
function styles(rtl: boolean) {
  return {
    scrim: {
      position: "fixed",
      inset: 0,
      // ABOVE the consent bar, which is `z-index: 60` and pinned to the bottom
      // of the viewport. At 50 it sat on top of this sheet and covered the Send
      // button on a first visit - found by the live probe, invisible to every
      // other gate here, and only ever true for somebody who has not yet
      // answered the cookie question. Which is every new player.
      zIndex: 70,
      background: "var(--badge-fill)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 12,
    },
    card: {
      width: "min(100%, 420px)",
      maxHeight: "94vh",
      overflowY: "auto",
      borderRadius: "var(--radius-3)",
      background: "var(--surface)",
      boxShadow: "var(--shadow-1)",
      padding: "20px 18px 18px",
      textAlign: rtl ? "right" : "left",
    },
    h2: { fontFamily: "var(--font-display)", fontSize: "1.35rem", margin: "0 0 4px" },
    sub: { margin: "0 0 16px", color: "var(--text-dim)", fontSize: ".88rem" },
    step: {
      fontSize: ".72rem",
      fontWeight: 700,
      letterSpacing: ".08em",
      textTransform: "uppercase",
      color: "var(--text-dim)",
      margin: "0 0 8px",
    },
    hint: { textTransform: "none", letterSpacing: 0, fontWeight: 600 },
    chips: { display: "flex", flexWrap: "wrap", gap: 8, margin: "0 0 18px" },
    chip: {
      display: "inline-flex",
      alignItems: "center",
      gap: 7,
      minHeight: "var(--tap)",
      padding: "0 14px",
      borderRadius: "var(--radius-pill)",
      border: "1.5px solid var(--line)",
      background: "var(--surface-2)",
      color: "var(--text)",
      font: "600 .9rem var(--font)",
      cursor: "pointer",
    },
    // A LABEL, so it takes the flat fill and the white ink, not --brand-fill.
    // Measured 2026-09-02: --text on --brand-fill reads 5.34 in market and
    // 2.53 in night, and it looks like a highlighter in both. See tokens.css.
    chipOn: {
      background: "var(--brand-strong)",
      borderColor: "var(--brand-strong)",
      color: "var(--on-brand)",
      fontWeight: 700,
    },
    box: {
      width: "100%",
      minHeight: 70,
      borderRadius: "var(--radius-2)",
      padding: "11px 12px",
      border: "1.5px solid var(--line)",
      background: "var(--surface-2)",
      color: "var(--text)",
      font: "400 .95rem var(--font)",
      resize: "none",
    },
    count: { textAlign: "end", color: "var(--text-dim)", fontSize: ".74rem", margin: "4px 0 18px" },
    list: {
      margin: "0 0 6px",
      padding: "12px 14px",
      borderRadius: "var(--radius-2)",
      background: "var(--surface-2)",
      border: "1px solid var(--line)",
      listStyle: "none",
      fontSize: ".87rem",
      lineHeight: 1.8,
    },
    shotRow: { display: "flex", alignItems: "center", gap: 11, margin: "10px 0 4px", cursor: "pointer" },
    thumb: {
      width: 64,
      height: 46,
      objectFit: "cover",
      borderRadius: 8,
      border: "1px solid var(--line)",
      background: "var(--surface)",
    },
    shotLabel: { fontSize: ".87rem" },
    check: { marginInlineStart: "auto", width: 22, height: 22, accentColor: "var(--brand)" },
    priv: { color: "var(--text-dim)", fontSize: ".78rem", margin: "12px 0 14px", textAlign: "center" },
    row: { display: "flex", gap: 10 },
    btn: {
      flex: 1,
      minHeight: 52,
      border: 0,
      borderRadius: "var(--radius-2)",
      cursor: "pointer",
      font: "600 1.02rem var(--font-display)",
      background: "var(--brand-strong)",
      color: "var(--on-brand)",
      // The 4px lip is what makes this read as a button rather than a swatch,
      // and it has to be DARKER than the fill in both themes - which --line
      // (pale cream in market) is not. Derived from the fill so it cannot
      // drift from it; an engine without color-mix drops this one declaration
      // and keeps a flat button, which is the right way to fail.
      boxShadow: "0 4px 0 color-mix(in srgb, var(--brand-strong) 72%, #000)",
    },
    ghost: {
      flex: "0 0 96px",
      background: "transparent",
      color: "var(--text-dim)",
      boxShadow: "none",
      border: "1.5px solid var(--line)",
    },
  } as const satisfies Record<string, React.CSSProperties>;
}
