import React, { useEffect } from 'react';
import { ipcRenderer } from 'electron';
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
import parameter from './parameter';

const Tool = ({ match }) => {
  const { script } = match.params;
  const { isFetching, error, params } = useSelector(state => state.toolParams);
  const dispatch = useDispatch();
  const {
    category,
    label,
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
  const WrappedToolForm = Form.create()(ToolForm);

  return (
    <div>
      <Spin>
        <h1>{category}</h1>
        <h2>{label}</h2>
        <Divider />
        <div>
          <WrappedToolForm
            parameters={parameters}
            categoricalParameters={categoricalParameters}
            script={script}
          />
        </div>
      </Spin>
    </div>
  );
};

const ToolForm = props => {
  const { parameters, categoricalParameters, script, form } = props;
  const dispatch = useDispatch();

  useEffect(() => {
    ipcRenderer.on('selected-path', (event, id, path) => {
      form.setFieldsValue({ [id]: path[0] });
    });
    return () => ipcRenderer.removeAllListeners(['selected-path']);
  }, []);

  const getForm = () => {
    let out = {};
    form.validateFields((err, values) => {
      if (!err) {
        const index = parameters.findIndex(x => x.type === 'ScenarioParameter');
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
        <Button type="primary" onClick={() => getForm()}>
          Run Script
        </Button>
        <Button
          type="primary"
          onClick={() => dispatch(saveToolParams(script, getForm()))}
        >
          Save to Config
        </Button>
        <Button
          type="primary"
          onClick={() => dispatch(setDefaultToolParams(script))}
        >
          Default
        </Button>
      </Form.Item>
    </Form>
  );
};

const Spin = ({ children }) => {
  const { isSaving } = useSelector(state => state.toolSaving);
  return <AntSpin spinning={isSaving}>{children}</AntSpin>;
};

export default Tool;
