// The protocol version, READ OUT OF THE SOURCE.
//
// The three scripts here are .mjs and cannot import a .ts module, so each one
// used to carry its own `v: 1` literal. That is three copies of a number, and
// they went stale in the worst possible way: a bump made every harness send a
// version the server refuses, so the CLI client, the smoke test and the deploy
// gate all failed at once with "refresh the app" — an error message about a
// browser, from three things that are not browsers.
//
// One reader, one list. A bump moves the constant and nothing else.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PROTOCOL_TS = join(dirname(fileURLToPath(import.meta.url)), "..", "shared", "src", "protocol.ts");

export function protocolVersion() {
  const src = readFileSync(PROTOCOL_TS, "utf8");
  const m = src.match(/export const PROTOCOL_VERSION\s*=\s*(\d+)/);
  // Throw rather than default. A default would let a harness quietly send the
  // wrong number after a refactor moved the constant, which is the failure
  // this file exists to remove.
  if (!m) throw new Error(`could not read PROTOCOL_VERSION from ${PROTOCOL_TS}`);
  return Number(m[1]);
}
