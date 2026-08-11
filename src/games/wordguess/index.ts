import { createElement } from "react";
import { reactGame } from "../reactHost";
import { meta } from "./meta";
import { WordGuess } from "./WordGuess";

export default reactGame(meta, (ctx) => createElement(WordGuess, { ctx }));
