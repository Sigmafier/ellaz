import { createElement } from "react";
import { reactGame } from "../reactHost";
import { meta } from "./meta";
// Reuses 2048's renderer, which reuses its pure logic. Evolution IS 2048 with a
// creature ladder painted on: the merge rules are already written, pure and
// tested, so a second copy would only be a second thing to keep in sync. The
// `skin` prop is optional and absent for 2048 itself, which is unchanged.
import { Game2048 } from "../n2048/Game2048";
import { CREATURES } from "./skin";

export default reactGame(meta, (ctx) => createElement(Game2048, { ctx, skin: CREATURES }));
