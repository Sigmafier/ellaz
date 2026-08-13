import { createElement } from "react";
import { reactGame } from "../reactHost";
import { meta } from "./meta";
import { MusicGame } from "./MusicGame";

export default reactGame(meta, (ctx) => createElement(MusicGame, { ctx }));
