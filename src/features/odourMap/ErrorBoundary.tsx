import React from "react";

export class ErrorBoundary extends React.Component<
  { fallback?: React.ReactNode; children: React.ReactNode },
  { hasError: boolean; message?: string }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(err: any) {
    return { hasError: true, message: err?.message ?? String(err) };
  }

  componentDidCatch(err: any, info: any) {
    // Keep it simple: log to console now, wire to Sentry later if you want.
    console.error("[OdourMap] crashed:", err, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div style={{ padding: 16, border: "1px solid #ddd", borderRadius: 12 }}>
            <h3 style={{ margin: 0 }}>Odour Map failed to load</h3>
            <p style={{ marginTop: 8, opacity: 0.8 }}>
              A dependency (map token / weather API / backend) likely failed. Check Console + Network.
            </p>
            <pre style={{ whiteSpace: "pre-wrap", opacity: 0.75 }}>
              {this.state.message}
            </pre>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
