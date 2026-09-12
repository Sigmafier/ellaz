import { createElement } from "react";
import { reactGame } from "../reactHost";
import { meta } from "./meta";
import { SurvivorsGame } from "./SurvivorsGame";

// Like snake, this is a React game that HOSTS a Phaser canvas rather than a bare
// Phaser GameModule. That is what lets it wear the same <GameChrome> as the rest
// of the roster - back, restart, sound, the stat row, the level toggle and the
// pause - instead of drawing its own numbers into a canvas corner.
//
// Phaser itself stays lazy: SurvivorsGame imports it inside an effect, so the
// engine is downloaded when this game mounts and never on a first visit.
export default reactGame(meta, (ctx) => createElement(SurvivorsGame, { ctx }));
