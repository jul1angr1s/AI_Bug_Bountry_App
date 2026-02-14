import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

function isChunkLoadError(error: Error): boolean {
  return (
    error.name === 'ChunkLoadError' ||
    error.message.includes('Loading chunk') ||
    error.message.includes('Failed to fetch dynamically imported module') ||
    error.message.includes('Importing a module script failed')
  );
}

export default class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const chunkError = this.state.error && isChunkLoadError(this.state.error);

    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="max-w-md w-full bg-navy-800 border border-navy-700 rounded-lg p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-status-critical/10">
            <span className="material-symbols-outlined text-3xl text-status-critical">
              error
            </span>
          </div>

          <h2 className="text-xl font-heading font-semibold text-white mb-2">
            {chunkError ? 'Update Available' : 'Something went wrong'}
          </h2>

          <p className="text-sm text-slate-400 mb-6">
            {chunkError
              ? 'A new version of the application is available. Please reload to get the latest updates.'
              : 'An unexpected error occurred while loading this page.'}
          </p>

          <div className="flex items-center justify-center gap-3">
            {chunkError ? (
              <button
                onClick={this.handleReload}
                className="px-5 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-medium rounded-lg transition-colors"
              >
                Reload Page
              </button>
            ) : (
              <>
                <button
                  onClick={this.handleRetry}
                  className="px-5 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={this.handleReload}
                  className="px-5 py-2 bg-navy-700 hover:bg-navy-700/80 text-slate-300 text-sm font-medium rounded-lg transition-colors"
                >
                  Reload Page
                </button>
              </>
            )}
          </div>

          {!chunkError && this.state.error && (
            <details className="mt-6 text-left">
              <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-400 transition-colors">
                Error details
              </summary>
              <pre className="mt-2 p-3 bg-background-dark rounded text-xs text-slate-500 overflow-auto max-h-32 font-mono">
                {this.state.error.message}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }
}
