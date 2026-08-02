import { createElement } from "react";
import { reactGame } from "../reactHost";
import { meta } from "./meta";
import { ReactionGame } from "./ReactionGame";

export default reactGame(meta, (ctx) => createElement(ReactionGame, { ctx }));
