import { createRoot } from "react-dom/client";
import { StrictMode } from "react";

import { App } from "./App";
import "./ui/global.css";

const root = document.getElementById("root");
if (!root) throw new Error("no #root to mount into");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
