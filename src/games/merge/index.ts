import { createElement } from "react";
import { reactGame } from "../reactHost";
import { meta } from "./meta";
import { MergeGame } from "./MergeGame";

export default reactGame(meta, (ctx) => createElement(MergeGame, { ctx }));
