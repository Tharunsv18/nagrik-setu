import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { AppStateProvider } from "./context/AppStateContext";
import { AssistantProvider } from "./context/AssistantContext";
import "./i18n";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppStateProvider>
        <AssistantProvider>
          <App />
        </AssistantProvider>
      </AppStateProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
