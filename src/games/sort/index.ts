import { createElement } from "react";
import { reactGame } from "../reactHost";
import { meta } from "./meta";
import { SortGame } from "./SortGame";

export default reactGame(meta, (ctx) => createElement(SortGame, { ctx }));
