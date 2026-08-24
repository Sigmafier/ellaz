import { createElement } from "react";
import { reactGame } from "../reactHost";
import { meta } from "./meta";
import { Lettercross } from "./Lettercross";

export default reactGame(meta, (ctx) => createElement(Lettercross, { ctx }));
