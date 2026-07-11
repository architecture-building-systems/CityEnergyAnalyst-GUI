import { Component } from 'react';

import { DefaultErrorComponent } from './ErrorBoundary';

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
