import "@fontsource-variable/geist";
import "./index.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@/app/App";
import { startUpdates } from "@/app/updates";

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
startUpdates();
