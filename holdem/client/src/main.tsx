import { createRoot } from "react-dom/client";
import { App } from "./App";
import { attachUnlockOnFirstGesture } from "./audio/audio";
import { applyStoredLook } from "./look/lookStore";
import "./ui/global.css";

// BEFORE the first render, not in an effect. These are attributes on <html>
// that select which look the stylesheet paints, so applying them after mount
// would show every returning player one frame of the default table before
// their own — a flash on every single load, for a saving of nothing.
applyStoredLook();
attachUnlockOnFirstGesture();
createRoot(document.getElementById("root")!).render(<App />);
