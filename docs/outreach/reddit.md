# Reddit - three posts, and a destination check that came back blind

**Status**: drafts. Nothing is posted. The operator posts these from their own account.

---

## The destination check failed, and how it failed matters

Every subreddit below was fetched on 2026-08-11 and every one returned **HTTP 200 with an
identical 8.4 KB shell**. So did `r/kidsgames`, which was put in the batch as a control
and which may well not exist. The rules endpoints (`/about/rules.json`) returned HTML
rather than JSON under both a browser user agent and a script one.

**So this file cannot claim its destinations are verified.** A 200 that is the same size
for a real sub and an invented one carries no information about either - the same lesson
this repo learned when a status sweep over ellaz.fun reported four healthy pages during a
total outage, because a 200 document whose JavaScript 404s is a blank page.

What the operator has that this session does not is a logged-in browser. Before posting:

1. Open each sub and confirm it exists and is active this month.
2. **Read the sidebar rules.** Two of these subs are known historically to require a
   specific title format and to remove posts from accounts with no other activity.
3. Check whether a "self-promotion" rule applies, and whether there is a weekly thread
   where this belongs instead of as its own post.

A removed post costs nothing but a shadowbanned account costs everything, so this is the
one lane where the reading is not optional.

---

## r/incremental_games is the wrong sub and is dropped

The original plan named it. It is for idle and incremental games - the genre where a
number goes up while you are not playing. **None of the 33 games is one.** 2048 gets
posted there occasionally and is tolerated rather than welcome.

Replaced below with r/InternetIsBeautiful, which fits a free ad-free site far better and
is also far stricter. Treat that third post as optional.

---

## Post 1 - r/WebGames

Their audience is people who want a link to click right now. Short, no story.

**Title**:

```
Ellaz - 33 free browser games, no ads, no account, works offline
```

**Body**:

```
https://ellaz.fun

I built this for my own kids and then kept going. 33 games, sudoku and minesweeper and
2048 and snake at one end, colouring and shape-matching for four-year-olds at the other.

No ads, no account, no download. Nothing to type anywhere - you get given a name from a
fixed list, so there is no text field for anybody to put anything in. It works offline
after the first load, and the whole site is about 90 KB before you pick a game.

The interface is in 11 languages. Hebrew is the default because that is where I am, but
it opens in English for you.

The honest bit: everything saves on the device, so a phone and a tablet are two separate
players. There is a backup code to move progress across, and that is the whole solution -
there are no accounts and I am not building any.
```

---

## Post 2 - r/playmygame

Their audience is other developers, and they expect you to say what you want feedback on.
Historically this sub also expects you to give feedback on other posts, so do that first.

**Title**:

```
[Feedback wanted] 33 browser games for kids and adults, Hebrew-first, no backend at all
```

**Body**:

```
https://ellaz.fun

Free browser games, no ads, no account, no backend. Everything runs on the device and
saves there.

What I would like eyes on, in order:

1. The home screen on a phone. Does 33 games in a grid read as "plenty" or as "too many
   to choose from"? That is my open question and I do not know the answer.
2. Whether it is obvious that the coins the games pay out are spent in the room screen. I
   suspect it is not.
3. Anything that feels slow. Every game is either plain web pages or, in one case, a game
   engine, and the difference should not be visible to a player.

Some numbers, since this crowd asks: about 90 KB gzipped on a first visit before you pick
a game; each game loads on demand. 11 interface languages, each its own lazy chunk of
about 1.5 KB. Real URLs per game rather than a hash router, so every game is linkable.

The honest bit: there is no server, so there are no cross-device saves and no
leaderboards against other people. You compete with yourself. That was a deliberate
choice for a kids' platform and it does cost the game something.
```

---

## Post 3 - r/InternetIsBeautiful (optional, strictest)

This sub removes anything that reads as marketing, and it wants one link that is
interesting in itself. Post it only if the first two go well, and only after reading the
rules - they have changed more than once.

**Title**:

```
A free games site with no ads, no accounts and no server - everything saves on your own device
```

**Body**:

```
https://ellaz.fun

33 games. Nothing to sign up for, nothing to install, no advertisement anywhere, and no
back end at all - your progress lives in your own browser rather than on someone's
database.

That last part is the whole design. There is no account because there is nothing to log
in to, and there is nothing to type anywhere, so a child cannot enter a name that an adult
would then have to moderate. You get a name from a fixed list of words.

It works offline once it has loaded, and it is about 90 KB on a first visit.

The trade-off, stated plainly: because it is all on your device, clearing your browser
data erases the progress, and a phone and a tablet are two separate players. There is a
backup code to move between them.
```

---

## Rules that apply to all three

- **Post from a real account with history.** A brand-new account posting a link is
  removed by an automated filter in most gaming subs before a human sees it.
- **Answer every comment for the first few hours.** A post you abandon reads as an
  advertisement even when it is not.
- **Never post all three the same day.** Space them across a week.
- **Do not edit the link into a different one later.** That is the fastest route to a
  domain ban, and this domain is the asset.

---

## Provenance

| Claim in the copy | Where it comes from |
|---|---|
| 33 games | `src/portal/catalog.ts`, counted 2026-08-18 |
| about 90 KB first visit | `scripts/assert-payload.mjs` ceiling 90,500 B gz; measured 90,356 on 2026-08-18 |
| 11 interface languages, ~1.5 KB each | `APP_LOCALES` in `src/i18n/locales.ts`; the per-locale chunk sizes measured on the artifact |
| nothing to type anywhere | `src/sdk/names.ts` - a name is two word ids from a fixed pool |
| works offline | the PWA precaches the shell (`vite.config.ts` workbox) |
| real URL per game | `src/build/routes.ts` emits a document per game per page-language (52 on 2026-08-11; the count moves when a language is promoted, so do not quote it in copy). The hash router is retired |
| device-local saves, backup code | `localStorage` plus `src/sdk/cloud.ts`; `CLAUDE.md` § Known traps |
| one game uses an engine | snake is the only Phaser importer (`grep -rln 'from "phaser"' src/`) |
