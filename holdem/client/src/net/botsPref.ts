// Whether this device wants to see the house's table at all.
//
// The practice table was built to be always there, and "always there" was
// implemented as: create it on every visit to the home screen, and list it
// like any other room. So the first thing on the operator's lobby, every time
// he opened the site, was a table of robots — his words, "it keeps popping
// again and again i dont want it to come up unless we are on testing mod".
//
// OFF is the default, and that is the whole change. A table with nobody at it
// is a quiet lobby; a table full of machines pretending otherwise is worse
// than a quiet lobby, because it is the thing you have to look past to find
// your friends.
//
// Nothing here reaches the server. The practice table is still created on
// demand and still sleeps when empty (see server/src/botSeats.ts) — this
// decides whether this browser asks for it and whether it shows it.

const KEY = "holdem:bots";

export function botsWanted(): boolean {
  try {
    // Absent means off. A first visit has never asked for robots.
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function setBotsWanted(on: boolean): void {
  try {
    localStorage.setItem(KEY, on ? "1" : "0");
  } catch {
    /* incognito — the switch still works for this session */
  }
}
