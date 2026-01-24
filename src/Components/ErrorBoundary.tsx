import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("App crashed:", error, info);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="container">
        <div className="notice-banner error" role="alert">
          <div />
          <button type="button" className="ghost-button" onClick={() => window.location.reload()}>
            Ladda om
          </button>
        </div>
      </div>
    );
  }
}
