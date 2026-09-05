// The one harness every studio gate runs its controls through.
//
// A gate nobody has watched fail is not a gate. Every assert-*.mjs in this
// directory exports its predicates once and uses them from BOTH the real check
// and a `--control` block that plants each defect it claims to catch, requires
// each to fire, and ALSO runs a positive control that must NOT fire - a gate
// that refuses everything passes every negative test ever written.
//
// Three things this harness insists on, learned in the root repo's gates:
//
//   1. Every control PRINTS its own verdict line. A verdict derived from the
//      absence of a message cannot tell "passed" from "never ran".
//   2. Operands are printed WHOLE. A message that truncates the values it
//      compares can truncate away the exact part that differs.
//   3. The summary line names the population. "0 failures" over 0 files is
//      not a pass.

/**
 * Run a list of named controls. Each control is `{ name, expect, run }` where
 * `expect` is "FIRE" (the predicate must report a defect) or "PASS" (it must
 * not), and `run()` returns the predicate's failure list (empty = passed).
 *
 * Prints one line per control and a summary; returns true when every control
 * behaved. Never throws on a control's own error - an erroring control is a
 * broken instrument, reported as such, never read as a pass.
 */
export function runControls(gateName, controls) {
  let bad = 0;
  for (const c of controls) {
    let failures;
    try {
      failures = c.run();
    } catch (err) {
      bad++;
      console.log(`  control  ${c.name}: ERROR - the control itself threw: ${err?.stack ?? err}`);
      continue;
    }
    const fired = failures.length > 0;
    const ok = c.expect === "FIRE" ? fired : !fired;
    if (!ok) bad++;
    const shown = fired ? ` (${failures.map(String).join(" | ")})` : "";
    console.log(`  control  ${c.name}: ${fired ? "FIRED" : "quiet"} - expected ${c.expect} - ${ok ? "ok" : "WRONG"}${shown}`);
  }
  console.log(`${gateName} controls: ${controls.length} run · ${bad} misbehaved`);
  return bad === 0;
}

/** Print a gate's population + verdict and return the exit code. */
export function report(gateName, population, failures) {
  console.log(`${gateName}: ${population}`);
  for (const f of failures) console.log(`  FAIL  ${f}`);
  console.log(failures.length === 0 ? `${gateName}: ok` : `${gateName}: ${failures.length} failure(s)`);
  return failures.length === 0 ? 0 : 1;
}
