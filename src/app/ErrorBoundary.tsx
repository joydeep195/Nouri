import { Component, type ErrorInfo, type ReactNode } from 'react';
import { TriangleAlert } from 'lucide-react';
import { APP_NAME } from '@/shared/config/app';
import { logger } from '@/shared/lib/logger';

interface State {
  failed: boolean;
}

/** Shows a friendly recovery screen instead of a blank page if something crashes while rendering. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  override state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    logger.error('Render error', error);
    if (info.componentStack) logger.info('Component stack', info.componentStack.slice(0, 500));
  }

  override render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="screen">
        <div className="state" role="alert">
          <div className="state-icon warn">
            <TriangleAlert size={36} />
          </div>
          <h2>Something went wrong</h2>
          <p>{APP_NAME} hit an unexpected problem. Your profile and scan history are safe on this phone.</p>
          <div className="btn-row">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                window.location.reload();
              }}
            >
              Reload {APP_NAME}
            </button>
          </div>
        </div>
      </main>
    );
  }
}
