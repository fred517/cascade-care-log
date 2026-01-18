import React from "react";

type ErrorBoundaryState = {
  hasError: boolean;
  message?: string;
  stack?: string;
  componentStack?: string;
};

export class ErrorBoundary extends React.Component<
  { fallback?: React.ReactNode; children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(err: any) {
    return {
      hasError: true,
      message: err?.message ?? String(err),
      stack: err?.stack ? String(err.stack) : undefined,
    };
  }

  componentDidCatch(err: any, info: any) {
    console.error("[OdourMap] crashed:", err);
    this.setState({ componentStack: info?.componentStack ? String(info.componentStack) : undefined });
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="rounded-xl border bg-card p-4">
            <h3 className="text-lg font-semibold">Odour Map failed to load</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              A dependency likely failed. Use the details below to pinpoint the source.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <div className="text-xs font-medium text-muted-foreground">Error message</div>
                <pre className="mt-1 whitespace-pre-wrap rounded-lg bg-muted/50 p-3 text-xs">
                  {this.state.message}
                </pre>
              </div>

              {this.state.stack ? (
                <div>
                  <div className="text-xs font-medium text-muted-foreground">Stack trace</div>
                  <pre className="mt-1 whitespace-pre-wrap rounded-lg bg-muted/50 p-3 text-xs">
                    {this.state.stack}
                  </pre>
                </div>
              ) : null}

              {this.state.componentStack ? (
                <div>
                  <div className="text-xs font-medium text-muted-foreground">Component stack</div>
                  <pre className="mt-1 whitespace-pre-wrap rounded-lg bg-muted/50 p-3 text-xs">
                    {this.state.componentStack}
                  </pre>
                </div>
              ) : null}
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
