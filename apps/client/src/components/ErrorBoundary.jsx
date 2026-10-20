import { Component } from "react";

export class ErrorBoundary extends Component {
  state = {
    hasError: false,
  };

  static getDerivedStateFromError() {
    return {
      hasError: true,
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Unhandled React error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="project-error-page">
          <a className="brand" href="/">
            <span className="brand-logo">O</span>
            <span>Ordanly</span>
          </a>

          <div className="content-error" role="alert">
            <p className="eyebrow eyebrow--danger">Application error</p>
            <h1>Something went wrong.</h1>
            <p>
              The application could not display this page. Your saved data has
              not been changed.
            </p>

            <button
              className="button button--dark"
              onClick={() => window.location.reload()}
              type="button"
            >
              Reload application
            </button>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
