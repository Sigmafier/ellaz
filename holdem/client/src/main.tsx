import { createRoot } from "react-dom/client";
import { App } from "./App";
import { attachUnlockOnFirstGesture } from "./audio/audio";
import "./ui/global.css";

attachUnlockOnFirstGesture();
createRoot(document.getElementById("root")!).render(<App />);
