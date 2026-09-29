import { Component } from 'react';
import { Alert } from 'antd';

import { reportError } from 'utils/errorReporting';

const describeValue = (value) => {
  if (value === null) return 'null';
  if (Array.isArray(value)) {
    return `array<${[...new Set(value.map(describeValue))].join('|')}>`;
  }
  if (value instanceof File) return 'File';
  if (typeof value === 'object') return `object{${Object.keys(value)}}`;
  return typeof value;
};

const isPrimitiveShape = (shape) => !shape.includes('object');

/**
 * Describes each parameter's value/choices by shape only (never the values themselves), so
 * the offending field of a "Objects are not valid as a React child" crash can be identified.
 */
const summariseFields = (parameters = [], formValues = {}) =>
  parameters.map((p) => ({
    name: p.name,
    type: p.type,
    valueShape: describeValue(p.value),
    formValueShape: describeValue(formValues[p.name]),
    choicesShape: Array.isArray(p.choices)
      ? describeValue(p.choices)
      : undefined,
  }));

export default class ToolFormErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    const { script, parameters, form } = this.props;
    let fields = [];
    try {
      fields = summariseFields(parameters, form?.getFieldsValue(true));
    } catch {
      // Diagnostics are best-effort.
    }
    reportError(error, {
      area: 'tool-form',
      script,
      suspectFields: fields.filter(
        (f) =>
          !isPrimitiveShape(f.valueShape) ||
          !isPrimitiveShape(f.formValueShape) ||
          (f.choicesShape && !f.choicesShape.match(/^array<(string|)>$/)),
      ),
      componentStack: errorInfo?.componentStack,
    });
  }

  componentDidUpdate(prevProps) {
    // A different tool or freshly loaded parameters may render fine, so retry.
    if (
      this.state.error &&
      (prevProps.script !== this.props.script ||
        prevProps.parameters !== this.props.parameters)
    ) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <Alert
        type="error"
        showIcon
        style={{ margin: 12 }}
        message="This tool's form failed to display"
        description="Try resetting the parameters to their defaults or reloading the page. The problem has been logged."
      />
    );
  }
}
