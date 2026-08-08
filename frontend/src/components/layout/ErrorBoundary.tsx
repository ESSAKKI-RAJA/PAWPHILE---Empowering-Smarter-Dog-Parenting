import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 mb-2">Something went wrong</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-6">
            A rendering error occurred in this view. Please try refreshing the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-6 py-3 rounded-xl font-bold hover:opacity-90 transition-opacity"
          >
            <RefreshCw className="w-4 h-4" />
            Reload Page
          </button>
          
          {this.state.error && process.env.NODE_ENV === 'development' && (
            <div className="mt-8 p-4 bg-slate-100 dark:bg-slate-900 rounded-xl text-left overflow-auto max-w-full">
              <p className="font-mono text-xs text-red-600 dark:text-red-400 break-words">
                {this.state.error.toString()}
              </p>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
