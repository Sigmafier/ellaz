import { createElement } from "react";
import { reactGame } from "../reactHost";
import { meta } from "./meta";
import { Memory } from "./Memory";

export default reactGame(meta, (ctx) => createElement(Memory, { ctx }));
