import { createElement } from "react";
import { reactGame } from "../reactHost";
import { meta } from "./meta";
import { JigsawGame } from "./JigsawGame";

export default reactGame(meta, (ctx) => createElement(JigsawGame, { ctx }));
