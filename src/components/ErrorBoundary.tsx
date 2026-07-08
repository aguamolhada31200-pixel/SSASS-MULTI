import { Component, type ErrorInfo, type ReactNode } from "react";
import { TriangleAlert, RotateCcw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Apanha erros de render em qualquer página e mostra um fallback amigável
 * em vez de deixar a app inteira em ecrã branco.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[decogest] Erro de render apanhado pelo ErrorBoundary:", error, info.componentStack);
  }

  private recarregar = () => {
    window.location.reload();
  };

  private inicio = () => {
    window.location.href = "/";
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-danger/10 text-danger">
          <TriangleAlert size={26} />
        </span>
        <div>
          <h1 className="font-display text-xl font-semibold text-ink">Algo correu mal nesta página</h1>
          <p className="mt-1 max-w-md text-sm text-muted">
            Os seus dados estão guardados — foi apenas a apresentação desta página que falhou.
            Recarregue para continuar.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={this.recarregar}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            <RotateCcw size={14} /> Recarregar
          </button>
          <button
            onClick={this.inicio}
            className="inline-flex items-center gap-2 rounded-xl border border-line bg-card px-4 py-2 text-sm font-medium text-ink hover:bg-accent"
          >
            <Home size={14} /> Voltar ao início
          </button>
        </div>
        <p className="max-w-md truncate text-[11px] text-muted/70">{String(this.state.error.message || this.state.error)}</p>
      </div>
    );
  }
}
