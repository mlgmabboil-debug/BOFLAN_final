import React, { Component, ReactNode } from "react";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div style={{ padding: 20, color: "white", background: "black", height: "100vh", fontFamily: "monospace" }}>
          <h2>Application Error</h2>
          <pre style={{ whiteSpace: "pre-wrap", color: "red" }}>{this.state.error?.message}</pre>
          <pre style={{ whiteSpace: "pre-wrap", color: "gray", fontSize: "10px" }}>{this.state.error?.stack}</pre>
          <button 
            onClick={() => { localStorage.clear(); window.location.href = "/"; }}
            style={{ marginTop: 20, padding: "10px 20px", background: "red", color: "white", border: "none", borderRadius: 4 }}
          >
            Clear Data and Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
