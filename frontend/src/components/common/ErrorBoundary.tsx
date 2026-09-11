import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ServerErrorPage } from '../../pages/errors/StatusPages';

type Props = { children: ReactNode };
type State = { hasError: boolean };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(JSON.stringify({ level: 'error', message: 'ui_error', name: error.name }));
    void info;
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return <ServerErrorPage />;
    }
    return this.props.children;
  }
}
