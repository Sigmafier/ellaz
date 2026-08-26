import { createElement } from "react";
import { reactGame } from "../reactHost";
import { meta } from "./meta";
import { ParkingGame } from "./ParkingGame";

export default reactGame(meta, (ctx) => createElement(ParkingGame, { ctx }));
