import { createElement } from "react";
import { reactGame } from "../reactHost";
import { meta } from "./meta";
import { Coloring } from "./Coloring";

export default reactGame(meta, (ctx) => createElement(Coloring, { ctx }));
