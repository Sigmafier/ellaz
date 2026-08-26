import { createElement } from "react";
import { reactGame } from "../reactHost";
import { meta } from "./meta";
import { FlowGame } from "./FlowGame";

export default reactGame(meta, (ctx) => createElement(FlowGame, { ctx }));
