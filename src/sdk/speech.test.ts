import { describe, it, expect } from "vitest";
import { pickVoice } from "./speech";

// pickVoice is deliberately PURE so it is testable in the node vitest env —
// there is no `speechSynthesis` global here, and none is needed. The fixtures
// are plain objects cast to the DOM type; only `lang`, `localService` and
// `name` are ever read.
function v(lang: string, localService = false, name = lang): SpeechSynthesisVoice {
  return { lang, localService, name, default: false, voiceURI: name } as SpeechSynthesisVoice;
}

describe("pickVoice — Hebrew", () => {
  it("prefers an exact he-IL voice over a he-prefix one", () => {
    const voices = [v("he"), v("en-US"), v("he-IL")];
    expect(pickVoice(voices, "he")?.lang).toBe("he-IL");
  });

  it("falls back to any he-* voice when there is no exact he-IL", () => {
    const voices = [v("en-US"), v("he-XX")];
    expect(pickVoice(voices, "he")?.lang).toBe("he-XX");
  });

  it("matches a bare 'he' tag as the prefix fallback", () => {
    expect(pickVoice([v("en-GB"), v("he")], "he")?.lang).toBe("he");
  });

  it("returns null when no Hebrew voice exists at all", () => {
    expect(pickVoice([v("en-US", true), v("fr-FR"), v("ru-RU")], "he")).toBeNull();
  });

  it("does not match a look-alike tag that merely starts with the letters", () => {
    // "hea"/"her" are not Hebrew — the match is anchored to the subtag boundary.
    expect(pickVoice([v("hea-XX"), v("her-DE")], "he")).toBeNull();
  });
});

describe("pickVoice — English chain", () => {
  it("prefers en-US first", () => {
    const voices = [v("en-AU"), v("en-GB"), v("en-US")];
    expect(pickVoice(voices, "en")?.lang).toBe("en-US");
  });

  it("falls back to en-GB when en-US is missing", () => {
    const voices = [v("en-AU"), v("en-GB")];
    expect(pickVoice(voices, "en")?.lang).toBe("en-GB");
  });

  it("falls back to any en-* when neither en-US nor en-GB exists", () => {
    expect(pickVoice([v("he-IL"), v("en-AU")], "en")?.lang).toBe("en-AU");
  });

  it("returns null when no English voice exists at all", () => {
    expect(pickVoice([v("he-IL", true), v("fr-FR")], "en")).toBeNull();
  });
});

describe("pickVoice — localService preference", () => {
  it("prefers a local voice over a remote one of equal specificity", () => {
    const voices = [v("he-IL", false, "remote-he"), v("he-IL", true, "local-he")];
    expect(pickVoice(voices, "he")?.name).toBe("local-he");
  });

  it("prefers local within the prefix fallback tier too", () => {
    const voices = [v("he-XX", false, "remote"), v("he-XX", true, "local")];
    expect(pickVoice(voices, "he")?.name).toBe("local");
  });

  it("does NOT let a local voice from a lower tier beat a remote exact match", () => {
    // en-GB local must not outrank en-US remote — specificity wins, then locality.
    const voices = [v("en-GB", true, "local-gb"), v("en-US", false, "remote-us")];
    expect(pickVoice(voices, "en")?.name).toBe("remote-us");
  });
});

describe("pickVoice — degenerate input", () => {
  it("returns null (and does not throw) on an empty voice list", () => {
    expect(pickVoice([], "he")).toBeNull();
    expect(pickVoice([], "en")).toBeNull();
  });

  it("is case-insensitive about the BCP-47 tag", () => {
    expect(pickVoice([v("HE-il")], "he")?.lang).toBe("HE-il");
    expect(pickVoice([v("EN-US")], "en")?.lang).toBe("EN-US");
  });

  it("tolerates a voice with a missing lang", () => {
    const broken = { name: "x", localService: true } as unknown as SpeechSynthesisVoice;
    expect(pickVoice([broken], "he")).toBeNull();
  });
});
