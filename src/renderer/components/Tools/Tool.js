import React, { useEffect } from 'react';
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
  setDefaultToolParams
} from '../../actions/tools';
import { createJob } from '../../actions/jobs';
import parameter from './parameter';
import { withErrorBoundary } from '../../utils/ErrorBoundary';

export const ToolRoute = ({ match }) => {
  return <Tool script={match.params.script} />;
};

const Tool = withErrorBoundary(({ script, formButtons = ToolFormButtons }) => {
  const { isFetching, error, params } = useSelector(state => state.toolParams);
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
  }, [script]);

  if (isFetching) return <Skeleton active />;
  if (error) {
    return (
      <Result
        status="warning"
        title="Something went wrong:"
        extra={
          <div>
            <pre>{error.message}</pre>
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
        return parameter(param, form);
      });
    }

    let categoricalParams = null;
    if (!categoricalParameters || !Object.keys(categoricalParameters).length) {
      categoricalParams = null;
    } else {
      const categories = Object.keys(categoricalParameters).map(category => {
        const { Panel } = Collapse;
        const Parameters = categoricalParameters[category].map(param =>
          parameter(param, form)
        );
        return (
          <Panel header={category} key={category}>
            {Parameters}
          </Panel>
        );
      });
      categoricalParams = <Collapse>{categories}</Collapse>;
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
