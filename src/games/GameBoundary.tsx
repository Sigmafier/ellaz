import { Component, type ErrorInfo, type ReactNode } from "react";
import type { AppLocale } from "@i18n/locales";
import { makeT } from "@i18n/index";
import { Button } from "@ui/index";
import type { Crash } from "@ui/crashTools";
import { canTellAboutCrash, tellAboutCrash } from "@ui/crashTools";

/* The first error boundary this app has ever had.
   ===========================================================================

   Measured 2026-09-02, before this file existed: grepping all of `src/` for
   `ErrorBoundary`, `componentDidCatch`, `getDerivedStateFromError`,
   `window.onerror` and `unhandledrejection` returned ZERO. Every module here is
   defensively try/caught - analytics never throws, the session validator never
   throws, `winMoment` banks before it animates - and the one thing none of that
   covers is a throw during a game's own render. React's answer to an uncaught
   throw is to unmount the whole tree, so what a child got was a blank rectangle
   where the game had been, no message, and nothing recorded anywhere.

   So this does two things, and the second is the reason it is worth having:

     1. Says something, in the child's language, with a way forward. The card is
        deliberately the same shape as `GameHost`'s load-failure card - one
        unfamiliar screen is enough.
     2. ARMS a report with the stack. It does not send one. Nothing leaves this
        device that somebody did not press a button to send, and a crash is
        exactly the moment when asking is most likely to work: the person is
        looking at the failure and knows what they were doing.

   `resetKey` is how it comes back. A boundary with no way out is a permanent
   card - changing the key (the game id, here) drops the error state, so leaving
   and returning is a real recovery rather than a reload. */

interface Props {
  locale: AppLocale;
  /** Changing this clears the error - the game id, so switching games recovers. */
  resetKey?: string;
  gameId?: string;
  children: ReactNode;
}

interface State {
  crashed: boolean;
  seenKey?: string;
}

export class GameBoundary extends Component<Props, State> {
  state: State = { crashed: false };
  /** Held until somebody asks for it. A crash is never sent on its own. */
  private crash: Crash | null = null;

  static getDerivedStateFromError(): Partial<State> {
    return { crashed: true };
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    // A different game means a different failure. Clearing here rather than in
    // an effect means the new game renders on the FIRST pass after the switch,
    // not after a flash of the old card.
    if (state.seenKey !== props.resetKey) {
      return { seenKey: props.resetKey, crashed: false };
    }
    return null;
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // The component stack is the half a bare stack trace does not have, and it
    // is usually what names the game.
    this.crash = {
      message: error.message,
      stack: `${error.stack ?? ""}\n--- component stack ---${info.componentStack ?? ""}`,
      gameId: this.props.gameId,
    };
    console.error("[ellaz] game crashed", error);
  }

  render(): ReactNode {
    if (!this.state.crashed) return this.props.children;
    const t = makeT(this.props.locale);

    return (
      <div
        style={{
          // NOT `position:absolute; inset:0`, which is what this shipped as and
          // what a card centred in a stage obviously wants. Measured 2026-09-03
          // on the built artifact, memory forced to throw: the mount node is
          // 0px tall when the game never rendered - the GAME is what gives the
          // stage its height - so `inset:0` resolved to a zero-height box and
          // `place-items:center` centred the content ABOUT that line. Half the
          // card overflowed UPWARD: the 😵 sat at y=22 behind the fixed top bar
          // and "Something went wrong" was sliced by the breadcrumb row.
          //
          // A self-sizing block instead. `max(320px, 100%)` is the whole trick:
          // a percentage min-height against an auto-height parent resolves to
          // nothing, so the 320px floor wins exactly when the stage collapsed,
          // and the parent's own height wins whenever there is one.
          display: "grid",
          placeItems: "center",
          alignContent: "center",
          minHeight: "max(320px, 100%)",
          gap: 14,
          padding: 24,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 40 }} aria-hidden>
          😵
        </div>
        <div style={{ fontSize: 18, fontWeight: 600, maxWidth: "22ch" }}>{t("reportCrash")}</div>
        {/* "It is not your fault" is not padding. A five-year-old whose game
            vanished assumes they broke it, and the next thing they do is stop
            playing rather than tell anybody. */}
        <div style={{ fontSize: 14, color: "var(--text-dim)", maxWidth: "26ch" }}>
          {t("reportCrashNote")}
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
          <Button onClick={() => this.setState({ crashed: false })}>{t("reportRetry")}</Button>
          {/* Offered ONLY when something is listening. A standalone bundle
              registers no handler and must never phone home, so it gets the
              card and the retry and no dead button. */}
          {canTellAboutCrash() && this.crash ? (
            <Button variant="ghost" onClick={() => tellAboutCrash(this.crash!)}>
              {t("reportOpen")}
            </Button>
          ) : null}
        </div>
      </div>
    );
  }
}
