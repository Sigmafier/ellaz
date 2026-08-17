export { Button, IconButton, Stat } from "./components";
export { DifficultySelector, type DifficultyOption } from "./DifficultySelector";
// `DirectionPad` is deliberately NOT re-exported here, exactly as `GameChrome`
// is not. Both live in the `page` chunk, and this barrel is imported by the
// shell — a re-export would make the SHELL import from the page chunk, which is
// the failure `assert-first-visit.mjs` exists to catch. Games import it by its
// own path: `@ui/DirectionPad`.
import "./global.css";
