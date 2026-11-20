import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./features/prototype/app";
import "./app/globals.css";
import { AppErrorBoundary } from "./app/error-boundary";
import { installGlobalDiagnostics } from "./lib/diagnostics";
import { initializeAnalyticsFromStoredConsent } from "./lib/analytics";
installGlobalDiagnostics();
initializeAnalyticsFromStoredConsent();
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
);
