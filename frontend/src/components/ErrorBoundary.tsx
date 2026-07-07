import React from 'react';

interface Props { children: React.ReactNode; }
interface State { hasError: boolean; error: Error | null; }

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 max-w-2xl mx-auto">
          <h2 className="text-lg font-bold text-red-600 mb-2">Erro inesperado</h2>
          <p className="text-sm text-gray-600 mb-4">Ocorreu um erro ao renderizar esta página.</p>
          <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-40 border">
            {this.state.error?.message}
          </pre>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
            className="mt-4 px-4 py-2 bg-primary-600 text-white text-sm rounded hover:bg-primary-700"
          >
            Recarregar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
