import { createElement } from "react";
import { reactGame } from "../reactHost";
import { meta } from "./meta";
import { SnakeGame } from "./SnakeGame";

// Snake is a React game that HOSTS a Phaser canvas, rather than a bare Phaser
// GameModule. That is what lets it wear the same <GameChrome> as the other
// twenty - back, restart, sound, the stat row and the speed toggle - instead of
// drawing its own score in a canvas corner and hiding its speed picker on the
// ready screen.
//
// Phaser itself is still lazy: SnakeGame imports it inside an effect, so the
// engine is downloaded when this game mounts and never on a first visit.
export default reactGame(meta, (ctx) => createElement(SnakeGame, { ctx }));
