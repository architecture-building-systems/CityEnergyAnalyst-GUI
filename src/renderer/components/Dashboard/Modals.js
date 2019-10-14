import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useContext
} from 'react';
import { Modal, Form, Select, Input, Radio } from 'antd';
import axios from 'axios';
import parameter from '../Tools/parameter';
import { ModalContext } from '../../utils/ModalManager';

const { Option } = Select;

export const ModalNewDashboard = ({
  fetchDashboards,
  setDashIndex,
  dashboardNames
}) => {
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [newDashIndex, setNewDashIndex] = useState(null);
  const { modals, setModalVisible, visible } = useContext(ModalContext);
  const formRef = useRef();

  const handleOk = e => {
    formRef.current.validateFields((err, values) => {
      if (!err) {
        setConfirmLoading(true);
        console.log('Received values of form: ', values);
        axios
          .post(`http://localhost:5050/api/dashboards/`, values)
          .then(response => {
            if (response) {
              console.log(response.data);
              fetchDashboards();
              setConfirmLoading(false);
              setModalVisible(modals.newDashboard, false);
              setNewDashIndex(response.data.new_dashboard_index);
            }
          })
          .catch(error => {
            setConfirmLoading(false);
            console.log(error.response);
          });
      }
    });
  };

  const handleCancel = e => {
    setModalVisible(modals.newDashboard, false);
  };

  useEffect(() => {
    if (newDashIndex !== null) {
      setDashIndex(newDashIndex);
      setNewDashIndex(null);
    }
  }, [dashboardNames]);

  return (
    <Modal
      title="New Dashboard"
      visible={visible.newDashboard}
      width={800}
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={confirmLoading}
      destroyOnClose
    >
      <DashForm ref={formRef} />
    </Modal>
  );
};

const DashForm = Form.create()(({ form }) => {
  const { getFieldDecorator } = form;

  return (
    <Form layout="horizontal">
      <Form.Item
        label="Name"
        key="name"
        labelCol={{ span: 6 }}
        wrapperCol={{ span: 11, offset: 1 }}
      >
        {getFieldDecorator('name', {
          initialValue: '',
          rules: [{ required: true }]
        })(<Input />)}
      </Form.Item>
      <Form.Item
        label="Layout"
        key="layout"
        labelCol={{ span: 6 }}
        wrapperCol={{ span: 11, offset: 1 }}
      >
        {getFieldDecorator('layout', {
          initialValue: 'row'
        })(
          <Radio.Group>
            <Radio value="row" style={{ display: 'block' }}>
              Row
            </Radio>
            <Radio value="grid-1">
              Grid 1<div className="grid-1-image"></div>
            </Radio>
            <Radio value="grid-2">
              Grid 2<div className="grid-2-image"></div>
            </Radio>
            <Radio value="grid-3">
              Grid 3<div className="grid-3-image"></div>
            </Radio>
            <Radio value="grid-4">
              Grid 4<div className="grid-4-image"></div>
            </Radio>
          </Radio.Group>
        )}
      </Form.Item>
    </Form>
  );
});

export const ModalDuplicateDashboard = ({
  fetchDashboards,
  dashIndex,
  setDashIndex,
  dashboardNames
}) => {
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [newDashIndex, setNewDashIndex] = useState(null);
  const { modals, setModalVisible, visible } = useContext(ModalContext);
  const formRef = useRef();

  const handleOk = e => {
    formRef.current.validateFields((err, values) => {
      if (!err) {
        setConfirmLoading(true);
        console.log('Received values of form: ', values);
        axios
          .post(`http://localhost:5050/api/dashboards/duplicate`, {
            ...values,
            dashboard_index: dashIndex
          })
          .then(response => {
            if (response) {
              console.log(response.data);
              fetchDashboards();
              setConfirmLoading(false);
              setModalVisible(modals.duplicateDashboard, false);
              setNewDashIndex(response.data.new_dashboard_index);
            }
          })
          .catch(error => {
            setConfirmLoading(false);
            console.log(error.response);
          });
      }
    });
  };

  const handleCancel = e => {
    setModalVisible(modals.duplicateDashboard, false);
  };

  useEffect(() => {
    if (newDashIndex !== null) {
      setDashIndex(newDashIndex);
      setNewDashIndex(null);
    }
  }, [dashboardNames]);

  return (
    <Modal
      title="Duplicate Dashboard"
      visible={visible.duplicateDashboard}
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={confirmLoading}
      destroyOnClose
    >
      <DashDuplicateForm
        ref={formRef}
        dashIndex={dashIndex}
        dashboardNames={dashboardNames}
      />
    </Modal>
  );
};

const DashDuplicateForm = Form.create()(
  ({ form, dashIndex, dashboardNames }) => {
    const { getFieldDecorator } = form;

    return (
      <Form layout="horizontal">
        <Form.Item
          label="Name"
          key="name"
          labelCol={{ span: 6 }}
          wrapperCol={{ span: 11, offset: 1 }}
        >
          {getFieldDecorator('name', {
            initialValue: `${dashboardNames[dashIndex]}(Copy)`,
            rules: [{ required: true }]
          })(<Input />)}
        </Form.Item>
      </Form>
    );
  }
);

export const ModalSetScenario = ({ fetchDashboards, dashIndex }) => {
  const [scenarios, setScenarios] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const { modals, setModalVisible, visible } = useContext(ModalContext);
  const formRef = useRef();

  const handleOk = e => {
    formRef.current.validateFields((err, values) => {
      if (!err) {
        setConfirmLoading(true);
        console.log('Received values of form: ', values);
        axios
          .patch(`http://localhost:5050/api/dashboards/${dashIndex}`, values)
          .then(response => {
            if (response) {
              console.log(response.data);
              fetchDashboards();
              setConfirmLoading(false);
              setModalVisible(modals.setScenario, false);
            }
          })
          .catch(error => {
            setConfirmLoading(false);
            console.log(error.response);
          });
      }
    });
  };

  const handleCancel = e => {
    setModalVisible(modals.setScenario, false);
  };

  useEffect(() => {
    if (visible.setScenario) {
      axios.get('http://localhost:5050/api/project/').then(response => {
        const { scenario, scenarios } = response.data;
        setScenarios({
          type: 'ScenarioNameParameter',
          name: 'scenario',
          value: scenario,
          help: 'Change the scenario parameter of all plots in this dashboard',
          choices: scenarios
        });
      });
    } else setScenarios(null);
  }, [visible.setScenario]);

  return (
    <Modal
      title="Set Scenario"
      visible={visible.setScenario}
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={confirmLoading}
    >
      <SetScenarioForm ref={formRef} scenarios={scenarios} />
    </Modal>
  );
};

const SetScenarioForm = Form.create()(({ form, scenarios }) => {
  return (
    <Form layout="horizontal">
      {scenarios ? parameter(scenarios, form) : 'Fetching Data...'}
    </Form>
  );
});

export const ModalDeleteDashboard = ({
  fetchDashboards,
  dashIndex,
  setDashIndex
}) => {
  const [confirmLoading, setConfirmLoading] = useState(false);
  const { modals, setModalVisible, visible } = useContext(ModalContext);

  const handleOk = e => {
    setConfirmLoading(true);
    axios
      .delete(`http://localhost:5050/api/dashboards/${dashIndex}`)
      .then(response => {
        if (response) {
          console.log(response.data);
          setDashIndex(0);
          fetchDashboards();
          setConfirmLoading(false);
          setModalVisible(modals.deleteDashboard, false);
        }
      })
      .catch(error => {
        setConfirmLoading(false);
        console.log(error.response);
      });
  };

  const handleCancel = e => {
    setModalVisible(modals.deleteDashboard, false);
  };

  return (
    <Modal
      title="Delete Dashboard"
      visible={visible.deleteDashboard}
      width={800}
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={confirmLoading}
      okText="Delete"
      okButtonProps={{ type: 'danger' }}
    >
      Are you sure you want to delete this dashboard?
    </Modal>
  );
};

const modalAddPlotTemplate = type => ({
  fetchDashboards,
  dashIndex,
  activePlotRef
}) => {
  const [categories, setCategories] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const { modals, setModalVisible, visible } = useContext(ModalContext);
  const [values, setValues] = useState({ category: null, plot_id: null });

  const handleValue = useCallback(values => setValues(values), []);

  const handleOk = e => {
    setConfirmLoading(true);
    axios
      .put(
        `http://localhost:5050/api/dashboards/${dashIndex}/plots/${activePlotRef.current}`,
        values
      )
      .then(response => {
        if (response) {
          console.log(response.data);
          fetchDashboards();
          setConfirmLoading(false);
          setModalVisible(
            type === 'add' ? modals.addPlot : modals.changePlot,
            false
          );
        }
      })
      .catch(error => {
        setConfirmLoading(false);
        console.log(error.response);
      });
  };

  const handleCancel = e => {
    setModalVisible(type === 'add' ? modals.addPlot : modals.changePlot, false);
  };

  useEffect(() => {
    axios
      .get('http://localhost:5050/api/dashboards/plot-categories')
      .then(response => {
        setCategories(response.data);
      });
  }, []);

  return (
    <Modal
      title={type === 'add' ? 'Add Plot' : 'Change Plot'}
      visible={type === 'add' ? visible.addPlot : visible.changePlot}
      width={800}
      onOk={handleOk}
      onCancel={handleCancel}
      okButtonProps={{ disabled: categories === null }}
      confirmLoading={confirmLoading}
    >
      <CategoriesForm categories={categories} setValues={handleValue} />
    </Modal>
  );
};

export const ModalAddPlot = modalAddPlotTemplate('add');
export const ModalChangePlot = modalAddPlotTemplate('change');

const CategoriesForm = Form.create()(({ categories, setValues }) => {
  if (categories === null) return null;

  const categoryIDs = Object.keys(categories);
  const [selected, setSelected] = useState({
    category: categoryIDs[0],
    plots: categories[categoryIDs[0]].plots,
    selectedPlot: categories[categoryIDs[0]].plots[0].id
  });

  const handleCategoryChange = value => {
    setValues({ category: value, plot_id: categories[value].plots[0].id });
    setSelected({
      category: value,
      plots: categories[value].plots,
      selectedPlot: categories[value].plots[0].id
    });
  };

  const handlePlotChange = value => {
    setValues({ category: selected.category, plot_id: value });
    setSelected({ ...selected, selectedPlot: value });
  };

  useEffect(() => {
    if (categories !== null)
      setValues({
        category: selected.category,
        plot_id: selected.selectedPlot
      });
  }, [categories]);

  return (
    <Form layout="vertical">
      <Form.Item label="Category" key="category">
        <Select defaultValue={categoryIDs[0]} onChange={handleCategoryChange}>
          {categoryIDs.map(id => (
            <Option key={id} value={id}>
              {categories[id].label}
            </Option>
          ))}
        </Select>
      </Form.Item>
      <Form.Item label="Plot" key="plot">
        <Select value={selected.selectedPlot} onChange={handlePlotChange}>
          {selected.plots.map(plot => (
            <Option key={plot.id} value={plot.id}>
              {plot.name}
            </Option>
          ))}
        </Select>
      </Form.Item>
    </Form>
  );
});

export const ModalEditParameters = ({
  fetchDashboards,
  dashIndex,
  activePlotRef
}) => {
  const [parameters, setParameters] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const { modals, setModalVisible, visible } = useContext(ModalContext);
  const formRef = useRef();

  const handleOk = e => {
    formRef.current.validateFields((err, values) => {
      if (!err) {
        setConfirmLoading(true);
        console.log('Received values of form: ', values);
        axios
          .put(
            `http://localhost:5050/api/dashboards/${dashIndex}/plots/${activePlotRef.current}/parameters`,
            values
          )
          .then(response => {
            if (response) {
              console.log(response.data);
              fetchDashboards();
              setConfirmLoading(false);
              setModalVisible(modals.editParameters, false);
            }
          })
          .catch(error => {
            setConfirmLoading(false);
            console.log(error.response);
          });
      }
    });
  };

  const handleCancel = e => {
    setModalVisible(modals.editParameters, false);
  };

  useEffect(() => {
    if (visible.editParameters)
      axios
        .get(
          `http://localhost:5050/api/dashboards/${dashIndex}/plots/${activePlotRef.current}/parameters`
        )
        .then(response => {
          setParameters(response.data);
        });
  }, [visible.editParameters]);

  return (
    <Modal
      title="Edit plot parameters"
      visible={visible.editParameters}
      width={800}
      onOk={handleOk}
      onCancel={handleCancel}
      okButtonProps={{ disabled: parameters === null }}
      confirmLoading={confirmLoading}
      destroyOnClose
    >
      <ParamsForm ref={formRef} parameters={parameters} />
    </Modal>
  );
};

const ParamsForm = Form.create()(({ parameters, form }) => {
  return (
    <Form layout="horizontal">
      {parameters
        ? parameters.map(param => parameter(param, form))
        : 'Fetching Data...'}
    </Form>
  );
});

export const ModalDeletePlot = ({
  fetchDashboards,
  dashIndex,
  activePlotRef
}) => {
  const [confirmLoading, setConfirmLoading] = useState(false);
  const { modals, setModalVisible, visible } = useContext(ModalContext);

  const handleOk = e => {
    setConfirmLoading(true);
    axios
      .delete(
        `http://localhost:5050/api/dashboards/${dashIndex}/plots/${activePlotRef.current}`
      )
      .then(response => {
        if (response) {
          console.log(response.data);
          fetchDashboards();
          setConfirmLoading(false);
          setModalVisible(modals.deletePlot, false);
        }
      })
      .catch(error => {
        setConfirmLoading(false);
        console.log(error.response);
      });
  };

  const handleCancel = e => {
    setModalVisible(modals.deletePlot, false);
  };

  return (
    <Modal
      title="Delete plot"
      visible={visible.deletePlot}
      width={800}
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={confirmLoading}
      okText="Delete"
      okButtonProps={{ type: 'danger' }}
    >
      Are you sure you want to delete this plot?
    </Modal>
  );
};
