import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Button } from './components/ui/Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App error:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-4">
          <h1 className="text-xl font-semibold text-slate-900">Something went wrong</h1>
          <p className="max-w-md text-center text-sm text-slate-500">{this.state.message}</p>
          <Link to="/">
            <Button>Go Home</Button>
          </Link>
        </div>
      );
    }
    return this.props.children;
  }
}
