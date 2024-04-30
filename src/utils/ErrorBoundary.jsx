import { Component } from 'react';

export default class DefaultErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, errorInfo: null };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo,
    });
  }

  render() {
    if (this.state.errorInfo) {
      return (
        <DefaultErrorComponent
          error={this.state.error}
          errorInfo={this.state.errorInfo}
        />
      );
    }
    return this.props.children;
  }
}

export const withErrorBoundary = (
  WrappedComponent,
  onError = () => {},
  ErrorComponent = DefaultErrorComponent,
) =>
  class withErrorBoundary extends Component {
    constructor(props) {
      super(props);
      this.state = { error: null, errorInfo: null };
    }

    componentDidCatch(error, errorInfo) {
      this.setState({
        error: error,
        errorInfo: errorInfo,
      });
      onError(error, errorInfo);
    }

    render() {
      if (this.state.errorInfo) {
        return (
          <ErrorComponent
            error={this.state.error}
            errorInfo={this.state.errorInfo}
          />
        );
      }
      return <WrappedComponent {...this.props} />;
    }
  };

export const DefaultErrorComponent = ({ error, errorInfo, style = {} }) => (
  <div style={style}>
    <h2>Something went wrong.</h2>
    <details style={{ whiteSpace: 'pre-wrap' }}>
      {error && error.toString()}
      <br />
      {errorInfo.componentStack}
    </details>
  </div>
);
