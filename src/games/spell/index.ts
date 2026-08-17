import { createElement } from "react";
import { reactGame } from "../reactHost";
import { meta } from "./meta";
import { Spell } from "./Spell";

export default reactGame(meta, (ctx) => createElement(Spell, { ctx }));
