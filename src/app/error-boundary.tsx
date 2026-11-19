import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { downloadDiagnostics, recordDiagnostic } from "@/lib/diagnostics";

export class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    recordDiagnostic("render-error");
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="prototype-section max-w-4xl" role="alert">
        <h1>Nie udało się wyświetlić makiety</h1>
        <p>Spróbuj odświeżyć stronę. Jeśli problem wróci, pobierz raport techniczny.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={() => window.location.reload()}>Odśwież stronę</Button>
          <Button variant="outline" onClick={downloadDiagnostics}>
            Pobierz raport techniczny
          </Button>
        </div>
      </main>
    );
  }
}
