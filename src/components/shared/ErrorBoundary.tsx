import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-bg-primary p-6">
          <span className="text-5xl mb-4">⚠️</span>
          <h2 className="text-text-primary text-xl font-semibold mb-2">
            应用出现错误
          </h2>
          <p className="text-text-secondary text-sm mb-2 text-center max-w-xs">
            {this.state.error?.message || '发生了未知错误'}
          </p>
          <p className="text-text-secondary text-xs mb-6 text-center max-w-xs">
            请刷新页面或重新启动应用
          </p>
          <button
            onClick={this.handleReset}
            className="px-6 py-2 bg-accent-blue text-white rounded-md font-medium"
          >
            重试
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
