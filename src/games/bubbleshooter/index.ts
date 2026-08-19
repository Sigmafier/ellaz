import { createElement } from "react";
import { reactGame } from "../reactHost";
import { meta } from "./meta";
import { BubbleShooterGame } from "./BubbleShooterGame";

export default reactGame(meta, (ctx) => createElement(BubbleShooterGame, { ctx }));
