import { createElement } from "react";
import { reactGame } from "../reactHost";
import { meta } from "./meta";
import { SortSize } from "./SortSize";

export default reactGame(meta, (ctx) => createElement(SortSize, { ctx }));
