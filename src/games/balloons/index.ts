import { createElement } from "react";
import { reactGame } from "../reactHost";
import { meta } from "./meta";
import { BalloonsGame } from "./BalloonsGame";

export default reactGame(meta, (ctx) => createElement(BalloonsGame, { ctx }));
