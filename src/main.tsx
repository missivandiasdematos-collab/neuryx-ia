import React from "react";
import ReactDOM from "react-dom/client";
import { DerivShell } from "./components/deriv/DerivShell";
import "./styles.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Elemento #root nao encontrado.");
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <DerivShell />
  </React.StrictMode>,
);
