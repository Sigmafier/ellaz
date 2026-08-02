import { createElement } from "react";
import { reactGame } from "../reactHost";
import { meta } from "./meta";
import { FindDiff } from "./FindDiff";

export default reactGame(meta, (ctx) => createElement(FindDiff, { ctx }));
