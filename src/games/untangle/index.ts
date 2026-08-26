import { createElement } from "react";
import { reactGame } from "../reactHost";
import { meta } from "./meta";
import { UntangleGame } from "./UntangleGame";

export default reactGame(meta, (ctx) => createElement(UntangleGame, { ctx }));
