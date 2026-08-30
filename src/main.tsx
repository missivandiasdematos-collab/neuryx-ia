import React from "react";
import ReactDOM from "react-dom/client";
import { DerivShell } from "./components/deriv/DerivShell";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <DerivShell />
  </React.StrictMode>,
);
