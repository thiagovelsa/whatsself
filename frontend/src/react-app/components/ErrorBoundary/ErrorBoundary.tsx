import { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  level?: 'page' | 'critical';
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    // Log error for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Here you could send to an error reporting service like Sentry
    // Example: Sentry.captureException(error, { extra: errorInfo });
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // If custom fallback provided, use it
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI based on level
      const { level = 'page' } = this.props;

      if (level === 'critical') {
        return (
          <CriticalErrorFallback
            error={this.state.error}
            onReload={this.handleReload}
          />
        );
      }

      return (
        <PageErrorFallback
          error={this.state.error}
          onRetry={this.handleReset}
          onReload={this.handleReload}
        />
      );
    }

    return this.props.children;
  }
}

// Critical Error Fallback - Full page error
interface CriticalErrorFallbackProps {
  error: Error | null;
  onReload: () => void;
}

function CriticalErrorFallback({ error, onReload }: CriticalErrorFallbackProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-gradient p-4">
      <div className="max-w-md w-full rounded-3xl border border-rose-500/30 bg-brand-surfaceElevated/80 p-8 text-center shadow-brand-soft">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/10">
          <svg
            className="h-8 w-8 text-rose-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-semibold text-white mb-2">
          Erro Crítico
        </h1>
        <p className="text-sm text-brand-muted mb-6">
          Ocorreu um erro inesperado na aplicação. Por favor, recarregue a página para continuar.
        </p>

        {error && process.env.NODE_ENV === 'development' && (
          <div className="mb-6 rounded-xl border border-brand-border/60 bg-brand-surface/70 p-4 text-left">
            <p className="text-xs font-mono text-rose-300 break-all">
              {error.message}
            </p>
          </div>
        )}

        <button
          onClick={onReload}
          className="w-full rounded-xl border border-brand-primary/40 bg-brand-primary/90 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-brand-primary/100"
        >
          Recarregar Página
        </button>
      </div>
    </div>
  );
}

// Page Error Fallback - Section error
interface PageErrorFallbackProps {
  error: Error | null;
  onRetry: () => void;
  onReload: () => void;
}

function PageErrorFallback({ error, onRetry, onReload }: PageErrorFallbackProps) {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="max-w-md w-full rounded-3xl border border-amber-500/30 bg-brand-surfaceElevated/80 p-6 text-center shadow-brand-soft">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
          <svg
            className="h-6 w-6 text-amber-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        <h2 className="text-lg font-semibold text-white mb-2">
          Algo deu errado
        </h2>
        <p className="text-sm text-brand-muted mb-4">
          Ocorreu um erro ao carregar este conteúdo. Tente novamente ou recarregue a página.
        </p>

        {error && process.env.NODE_ENV === 'development' && (
          <div className="mb-4 rounded-xl border border-brand-border/60 bg-brand-surface/70 p-3 text-left">
            <p className="text-xs font-mono text-amber-300 break-all">
              {error.message}
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onRetry}
            className="flex-1 rounded-xl border border-brand-border/60 bg-brand-surface/70 px-4 py-2 text-sm font-medium text-white transition hover:border-brand-primary/40 hover:text-brand-primary"
          >
            Tentar Novamente
          </button>
          <button
            onClick={onReload}
            className="flex-1 rounded-xl border border-brand-primary/40 bg-brand-primary/90 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-brand-primary/100"
          >
            Recarregar
          </button>
        </div>
      </div>
    </div>
  );
}

export default ErrorBoundary;
