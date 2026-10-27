import { Component, type ReactNode } from "react"

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo })
    console.error("[ErrorBoundary] Caught error:", error, errorInfo)

    // Report to error tracking service
    if (typeof window !== "undefined" && (window as any).__ERROR_REPORTER__) {
      (window as any).__ERROR_REPORTER__(error, errorInfo)
    }

    // Call custom onError handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-background">
          <div className="max-w-md w-full text-center">
            <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-8">
              <h1 className="text-2xl font-heading font-bold text-destructive mb-4">Something went wrong</h1>
              <p className="text-muted-foreground mb-6">
                We're sorry, but an unexpected error occurred. Our team has been notified.
              </p>
              <details className="text-left mb-6">
                <summary className="cursor-pointer text-sm text-muted-foreground">Error details</summary>
                <pre className="mt-2 p-3 bg-muted/50 rounded text-xs overflow-auto max-h-40">
                  {this.state.error?.message}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                Reload page
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Hook for components to report errors manually
export function useErrorReporter() {
  return (error: Error, errorInfo?: React.ErrorInfo) => {
    console.error("[ManualErrorReport]", error, errorInfo)
    if (typeof window !== "undefined" && (window as any).__ERROR_REPORTER__) {
      (window as any).__ERROR_REPORTER__(error, errorInfo)
    }
  }
}