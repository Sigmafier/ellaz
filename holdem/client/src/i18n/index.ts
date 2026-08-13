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
  return "he";
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
  return (key: StringKey): string => dict[key] ?? he[key];
}
