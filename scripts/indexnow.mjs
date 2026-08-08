#!/usr/bin/env node
/**
 * Tell Bing the site changed. Runs after a successful deploy.
 * ===========================================================================
 *
 * WHY BING, ON A SITE NOBODY SEARCHES BING FOR. ChatGPT Search and Copilot
 * lean on Bing's index, so being absent from it means being absent from the
 * answer engines regardless of how well Google is doing. IndexNow is the
 * cheapest way in: one POST, no account, no API key beyond a file this repo
 * publishes itself.
 *
 * BE HONEST ABOUT WHAT THIS BUYS. The index-coverage and freshness benefit is
 * documented. A causal lift in AI citations is NOT - that link is
 * correlational, and this file should not be read as a claim that it is more.
 *
 * ONLY WHAT ACTUALLY CHANGED. Resubmitting all 48 URLs on every deploy is
 * exactly the "everything changed today" noise `lastmod.ts` exists to avoid,
 * one layer out. The URLs are filtered by the sitemap's own <lastmod>, so a
 * deploy that touched one game pings one game. With no <lastmod> in the
 * sitemap there is nothing to filter on, and the whole set is submitted -
 * stated plainly below rather than hidden, because it is the loud case.
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const DIST = process.env.DIST_DIR ?? "dist";
const HOST = process.env.INDEXNOW_HOST ?? "ellaz.fun";
const ENDPOINT = process.env.INDEXNOW_ENDPOINT ?? "https://api.indexnow.org/indexnow";
const SINCE_HOURS = Number(process.env.INDEXNOW_SINCE_HOURS ?? 48);

/**
 * The key is PUBLIC by design - IndexNow verifies ownership by fetching
 * `https://<host>/<key>.txt` and checking it contains the key. It is a proof
 * of write access to the docroot, not a secret, so it belongs in the repo
 * where the emitter can publish it. Rotating it means changing it here; the
 * build publishes the new file on the next deploy.
 */
export const INDEXNOW_KEY = "92410e02f1e99deb9f7c751db9e59068";

/** `[{ loc, lastmod }]` from a sitemap. `lastmod` is "" when absent. */
export function parseSitemap(xml) {
  return [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => ({
    loc: (m[1].match(/<loc>([^<]+)<\/loc>/) ?? [, ""])[1].trim(),
    lastmod: (m[1].match(/<lastmod>([^<]+)<\/lastmod>/) ?? [, ""])[1].trim(),
  }));
}

/**
 * Which URLs to submit.
 *
 * No lastmod anywhere means the sitemap carries no change signal, so every
 * URL is a candidate - the honest fallback, not a silent one.
 */
export function urlsToSubmit(entries, sinceHours, now) {
  const dated = entries.filter((e) => e.lastmod);
  if (dated.length === 0) return { urls: entries.map((e) => e.loc), reason: "no <lastmod> in the sitemap" };
  const cutoff = now - sinceHours * 3600_000;
  const fresh = dated.filter((e) => {
    const t = Date.parse(e.lastmod);
    return Number.isFinite(t) && t >= cutoff;
  });
  return { urls: fresh.map((e) => e.loc), reason: `changed within ${sinceHours}h` };
}

async function main() {
  const file = join(DIST, "sitemap.xml");
  if (!existsSync(file)) {
    // The Pages build emits no sitemap on purpose, so this is a normal skip
    // rather than a failure - see siteFiles.ts.
    console.log(`indexnow: no ${file} — nothing to submit (expected on the Pages build)`);
    return;
  }

  const entries = parseSitemap(readFileSync(file, "utf8"));
  if (entries.length === 0) {
    console.error("indexnow: the sitemap parsed to zero URLs — refusing to report success");
    process.exit(1);
  }

  const { urls, reason } = urlsToSubmit(entries, SINCE_HOURS, Date.now());
  console.log(`indexnow: ${entries.length} URLs in the sitemap, ${urls.length} to submit (${reason})`);
  if (urls.length === 0) {
    console.log("indexnow: nothing changed recently — not pinging, which is the point of filtering");
    return;
  }

  if (process.env.INDEXNOW_DRY_RUN === "1") {
    console.log(urls.map((u) => `  ${u}`).join("\n"));
    console.log("indexnow: DRY RUN — nothing submitted");
    return;
  }

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: HOST, key: INDEXNOW_KEY, keyLocation: `https://${HOST}/${INDEXNOW_KEY}.txt`, urlList: urls }),
  });

  // 200 accepted, 202 accepted-pending-key-validation. Both are fine.
  if (res.status === 200 || res.status === 202) {
    console.log(`indexnow: submitted ${urls.length} URLs — HTTP ${res.status}`);
    return;
  }
  // Loud, but the CALLER decides whether this fails the deploy. A search-engine
  // ping is not worth reverting a good release over.
  console.error(`indexnow: HTTP ${res.status} — ${(await res.text()).slice(0, 200)}`);
  process.exit(1);
}

if (process.argv[1] && process.argv[1].endsWith("indexnow.mjs")) await main();
