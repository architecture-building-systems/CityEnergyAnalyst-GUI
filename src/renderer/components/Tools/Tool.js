import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Skeleton,
  Result,
  Divider,
  Form,
  Collapse,
  Button,
  Spin as AntSpin
} from 'antd';
import {
  fetchToolParams,
  saveToolParams,
  setDefaultToolParams,
  resetToolParams
} from '../../actions/tools';
import { createJob } from '../../actions/jobs';
import Parameter from './parameter';
import { withErrorBoundary } from '../../utils/ErrorBoundary';

export const ToolRoute = ({ match }) => {
  return <Tool script={match.params.script} />;
};

const Tool = withErrorBoundary(({ script, formButtons = ToolFormButtons }) => {
  const { status, error, params } = useSelector(state => state.toolParams);
  const dispatch = useDispatch();
  const {
    category,
    label,
    description,
    parameters,
    categorical_parameters: categoricalParameters
  } = params;

  useEffect(() => {
    dispatch(fetchToolParams(script));
    return () => dispatch(resetToolParams());
  }, [script]);

  if (status == 'fetching') return <Skeleton active />;
  if (status == 'failed') {
    return (
      <Result
        status="warning"
        title="Something went wrong with CEA"
        extra={
          <div style={{ textAlign: 'left' }}>
            Error Message:
            <pre>{error.data && error.data.message}</pre>
            <details>
              <pre style={{ backgroundColor: '#f1f1f1', margin: 10 }}>
                {error.data && error.data.trace}
              </pre>
            </details>
          </div>
        }
      />
    );
  }
  if (!label) return null;

  return (
    <div>
      <Spin>
        <h1>{category}</h1>
        <h2 style={{ display: 'inline' }}>{label}</h2>
        <small> - {description}</small>
        <Divider />
        <div>
          <ToolForm
            parameters={parameters}
            categoricalParameters={categoricalParameters}
            script={script}
            formButtons={formButtons}
          />
        </div>
      </Spin>
    </div>
  );
});

const ToolForm = Form.create()(
  ({ parameters, categoricalParameters, script, formButtons, form }) => {
    const dispatch = useDispatch();
    const [activeKey, setActiveKey] = useState([]);

    const getForm = () => {
      let out = null;
      form.validateFields((err, values) => {
        if (!err) {
          const index = parameters.findIndex(
            x => x.type === 'ScenarioParameter'
          );
          let scenario = {};
          if (index >= 0) scenario = { scenario: parameters[index].value };
          out = {
            ...scenario,
            ...values
          };
          console.log('Received values of form: ', out);
        } // Expand collapsed categories if errors are found inside
        else if (categoricalParameters) {
          let categoriesWithErrors = [];
          for (const parameterName in err) {
            for (const category in categoricalParameters) {
              if (
                typeof categoricalParameters[category].find(
                  x => x.name === parameterName
                ) !== 'undefined'
              ) {
                categoriesWithErrors.push(category);
                break;
              }
            }
          }
          categoriesWithErrors.length &&
            setActiveKey(oldValue => oldValue.concat(categoriesWithErrors));
        }
      });
      return out;
    };

    const withFormFunctions = FormButtons => props => {
      if (FormButtons === null) return null;

      const runScript = () => {
        const values = getForm();
        values && dispatch(createJob(script, values));
      };

      const saveParams = () => {
        const values = getForm();
        values && dispatch(saveToolParams(script, values));
      };

      const setDefault = () => dispatch(setDefaultToolParams(script));

      return (
        <FormButtons
          {...props}
          getForm={getForm}
          runScript={runScript}
          saveParams={saveParams}
          setDefault={setDefault}
        />
      );
    };

    let toolParams = null;
    if (parameters) {
      toolParams = parameters.map(param => {
        if (param.type === 'ScenarioParameter') return null;
        return <Parameter key={param.name} form={form} parameter={param} />;
      });
    }

    let categoricalParams = null;
    if (categoricalParameters && Object.keys(categoricalParameters).length) {
      const categories = Object.keys(categoricalParameters).map(category => {
        const { Panel } = Collapse;
        const Parameters = categoricalParameters[category].map(param => (
          <Parameter key={param.name} form={form} parameter={param} />
        ));
        return (
          <Panel header={category} key={category} forceRender>
            {Parameters}
          </Panel>
        );
      });
      categoricalParams = (
        <Collapse activeKey={activeKey} onChange={setActiveKey}>
          {categories}
        </Collapse>
      );
    }

    return (
      <Form layout="horizontal">
        {toolParams}
        {categoricalParams}
        <br />
        <Form.Item className="formButtons">
          {withFormFunctions(formButtons)()}
        </Form.Item>
      </Form>
    );
  }
);

const ToolFormButtons = ({ runScript, saveParams, setDefault }) => {
  return (
    <React.Fragment>
      <Button type="primary" onClick={runScript}>
        Run Script
      </Button>
      <Button type="primary" onClick={saveParams}>
        Save to Config
      </Button>
      <Button type="primary" onClick={setDefault}>
        Default
      </Button>
    </React.Fragment>
  );
};

const Spin = ({ children }) => {
  const { isSaving } = useSelector(state => state.toolSaving);
  return <AntSpin spinning={isSaving}>{children}</AntSpin>;
};

export default Tool;
