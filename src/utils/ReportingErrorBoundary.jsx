import { Component } from 'react';
import { Alert } from 'antd';

import { reportError } from 'utils/errorReporting';

/**
 * Drop-in replacement for antd's `Alert.ErrorBoundary` (same look) that also reports the
 * crash via `reportError`.
 */
export default class ReportingErrorBoundary extends Component {
  state = { error: null, componentStack: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ componentStack: errorInfo?.componentStack });
    reportError(error, {
      area: 'error-boundary',
      componentStack: errorInfo?.componentStack,
    });
  }

  render() {
    const { error, componentStack } = this.state;
    if (!error) return this.props.children;
    return (
      <Alert
        type="error"
        title={error.toString()}
        description={<pre style={{ margin: 0 }}>{componentStack}</pre>}
      />
    );
  }
}
