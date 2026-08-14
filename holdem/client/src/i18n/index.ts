import { he, type StringKey } from "./he";
import { en } from "./en";

export type Locale = "he" | "en";
export type { StringKey };

export const DIR: Record<Locale, "rtl" | "ltr"> = { he: "rtl", en: "ltr" };

const DICTS: Record<Locale, Record<StringKey, string>> = { he, en };

const STORE_KEY = "holdem:locale";

export function loadLocale(): Locale {
  try {
    const v = localStorage.getItem(STORE_KEY);
    if (v === "he" || v === "en") return v;
  } catch {
    /* incognito */
  }
  // English, not Hebrew (operator's call, 2026-08-14). Must stay in step with
  // index.html's lang/dir, which is what a visitor sees before React mounts.
  return "en";
}

export function saveLocale(locale: Locale): void {
  try {
    localStorage.setItem(STORE_KEY, locale);
  } catch {
    /* incognito */
  }
}

export function makeT(locale: Locale) {
  const dict = DICTS[locale];
  // Fall back to ENGLISH, never Hebrew. A missing string should degrade to a
  // language the reader may know rather than to an alphabet they cannot read —
  // the same reasoning ellaz uses for its own lazy locale chunks.
  return (key: StringKey): string => dict[key] ?? en[key];
}
