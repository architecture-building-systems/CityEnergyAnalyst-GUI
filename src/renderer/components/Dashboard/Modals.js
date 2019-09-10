import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Modal, Form, Select, Input, Radio } from 'antd';
import axios from 'axios';
import {
  fetchDashboards,
  setModalSetScenarioVisibility,
  setModalNewDashboardVisibility,
  setModalDuplicateDashboardVisibility,
  setModalAddPlotVisibility,
  setModalEditParametersVisibility,
  setModalDeletePlotVisibility,
  setModalChangePlotVisibility,
  setModalDeleteDashboardVisibility
} from '../../actions/dashboard';
import parameter from '../Tools/parameter';

const { Option } = Select;

export const ModalNewDashboard = React.memo(
  ({ setDashIndex, dashboardNames }) => {
    const [confirmLoading, setConfirmLoading] = useState(false);
    const [newDashIndex, setNewDashIndex] = useState(null);
    const visible = useSelector(state => state.dashboard.showModalNewDashboard);
    const formRef = useRef();
    const dispatch = useDispatch();

    const handleOk = e => {
      formRef.current.validateFields((err, values) => {
        if (!err) {
          setConfirmLoading(true);
          console.log('Received values of form: ', values);
          axios
            .post(`http://localhost:5050/api/dashboard/new`, values)
            .then(response => {
              if (response) {
                console.log(response.data);
                dispatch(fetchDashboards(true));
                setConfirmLoading(false);
                dispatch(setModalNewDashboardVisibility(false));
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
      dispatch(setModalNewDashboardVisibility(false));
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
        visible={visible}
        width={800}
        onOk={handleOk}
        onCancel={handleCancel}
        confirmLoading={confirmLoading}
      >
        {visible ? <DashForm ref={formRef} /> : null}
      </Modal>
    );
  }
);

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

export const ModalDuplicateDashboard = React.memo(
  ({ dashIndex, setDashIndex, dashboardNames }) => {
    const [confirmLoading, setConfirmLoading] = useState(false);
    const [newDashIndex, setNewDashIndex] = useState(null);
    const visible = useSelector(
      state => state.dashboard.showModalDuplicateDashboard
    );
    const formRef = useRef();
    const dispatch = useDispatch();

    const handleOk = e => {
      formRef.current.validateFields((err, values) => {
        if (!err) {
          setConfirmLoading(true);
          console.log('Received values of form: ', values);
          axios
            .post(`http://localhost:5050/api/dashboard/duplicate`, {
              ...values,
              dashboard_index: dashIndex
            })
            .then(response => {
              if (response) {
                console.log(response.data);
                dispatch(fetchDashboards(true));
                setConfirmLoading(false);
                dispatch(setModalDuplicateDashboardVisibility(false));
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
      dispatch(setModalDuplicateDashboardVisibility(false));
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
        visible={visible}
        onOk={handleOk}
        onCancel={handleCancel}
        confirmLoading={confirmLoading}
      >
        {visible ? (
          <DashDuplicateForm
            ref={formRef}
            dashIndex={dashIndex}
            dashboardNames={dashboardNames}
          />
        ) : null}
      </Modal>
    );
  }
);

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

export const ModalSetScenario = React.memo(({ dashIndex }) => {
  const [scenarios, setScenarios] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const visible = useSelector(state => state.dashboard.showModalSetScenario);
  const formRef = useRef();
  const dispatch = useDispatch();

  const handleOk = e => {
    formRef.current.validateFields((err, values) => {
      if (!err) {
        setConfirmLoading(true);
        console.log('Received values of form: ', values);
        axios
          .post(
            `http://localhost:5050/api/dashboard/set-scenario/${dashIndex}`,
            values
          )
          .then(response => {
            if (response) {
              console.log(response.data);
              dispatch(fetchDashboards(true));
              setConfirmLoading(false);
              dispatch(setModalSetScenarioVisibility(false));
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
    dispatch(setModalSetScenarioVisibility(false));
  };

  useEffect(() => {
    if (visible) {
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
  }, [visible]);

  return (
    <Modal
      title="Set Scenario"
      visible={visible}
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={confirmLoading}
    >
      <SetScenarioForm ref={formRef} scenarios={scenarios} />
    </Modal>
  );
});

const SetScenarioForm = Form.create()(({ form, scenarios }) => {
  const { getFieldDecorator } = form;
  return (
    <Form layout="horizontal">
      {scenarios ? parameter(scenarios, getFieldDecorator) : 'Fetching Data...'}
    </Form>
  );
});

export const ModalDeleteDashboard = React.memo(
  ({ dashIndex, setDashIndex }) => {
    const [confirmLoading, setConfirmLoading] = useState(false);
    const visible = useSelector(
      state => state.dashboard.showModalDeleteDashboard
    );
    const dispatch = useDispatch();

    const handleOk = e => {
      setConfirmLoading(true);
      axios
        .post(`http://localhost:5050/api/dashboard/delete/${dashIndex}`)
        .then(response => {
          if (response) {
            console.log(response.data);
            setDashIndex(0);
            dispatch(fetchDashboards(true));
            setConfirmLoading(false);
            dispatch(setModalDeleteDashboardVisibility(false));
          }
        })
        .catch(error => {
          setConfirmLoading(false);
          console.log(error.response);
        });
    };

    const handleCancel = e => {
      dispatch(setModalDeleteDashboardVisibility(false));
    };

    return (
      <Modal
        title="Delete Dashboard"
        visible={visible}
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
  }
);

export const ModalAddPlot = React.memo(() => {
  const [categories, setCategories] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [values, setValues] = useState({ category: null, plot_id: null });
  const visible = useSelector(state => state.dashboard.showModalAddPlot);
  const { dashIndex, index } = useSelector(state => state.dashboard.activePlot);
  const dispatch = useDispatch();

  const handleValue = useCallback(values => setValues(values), []);

  const handleOk = e => {
    setConfirmLoading(true);
    axios
      .post(
        `http://localhost:5050/api/dashboard/add-plot/${dashIndex}/${index}`,
        values
      )
      .then(response => {
        if (response) {
          console.log(response.data);
          dispatch(fetchDashboards(true));
          setConfirmLoading(false);
          dispatch(setModalAddPlotVisibility(false));
        }
      })
      .catch(error => {
        setConfirmLoading(false);
        console.log(error.response);
      });
  };

  const handleCancel = e => {
    dispatch(setModalAddPlotVisibility(false));
  };

  useEffect(() => {
    if (visible) {
      axios
        .get('http://localhost:5050/api/dashboard/plot-categories')
        .then(response => {
          setCategories(response.data);
        });
    } else setCategories(null);
  }, [visible]);

  return (
    <Modal
      title="Add plot"
      visible={visible}
      width={800}
      onOk={handleOk}
      onCancel={handleCancel}
      okButtonProps={{ disabled: categories === null }}
      confirmLoading={confirmLoading}
    >
      <CategoriesForm categories={categories} setValues={handleValue} />
    </Modal>
  );
});

export const ModalChangePlot = React.memo(() => {
  const [categories, setCategories] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [values, setValues] = useState({ category: null, plot_id: null });
  const visible = useSelector(state => state.dashboard.showModalChangePlot);
  const { dashIndex, index } = useSelector(state => state.dashboard.activePlot);
  const dispatch = useDispatch();

  const handleValue = useCallback(values => setValues(values), []);

  const handleOk = e => {
    setConfirmLoading(true);
    axios
      .post(
        `http://localhost:5050/api/dashboard/change-plot/${dashIndex}/${index}`,
        values
      )
      .then(response => {
        if (response) {
          console.log(response.data);
          dispatch(fetchDashboards(true));
          setConfirmLoading(false);
          dispatch(setModalChangePlotVisibility(false));
        }
      })
      .catch(error => {
        setConfirmLoading(false);
        console.log(error.response);
      });
  };

  const handleCancel = e => {
    dispatch(setModalChangePlotVisibility(false));
  };

  useEffect(() => {
    if (visible) {
      axios
        .get('http://localhost:5050/api/dashboard/plot-categories')
        .then(response => {
          setCategories(response.data);
        });
    } else setCategories(null);
  }, [visible]);

  return (
    <Modal
      title="Change Plot"
      visible={visible}
      width={800}
      onOk={handleOk}
      onCancel={handleCancel}
      okButtonProps={{ disabled: categories === null }}
      confirmLoading={confirmLoading}
    >
      <CategoriesForm categories={categories} setValues={handleValue} />
    </Modal>
  );
});

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

export const ModalEditParameters = React.memo(() => {
  const [parameters, setParameters] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const visible = useSelector(state => state.dashboard.showModalEditParameters);
  const { dashIndex, index } = useSelector(state => state.dashboard.activePlot);
  const formRef = useRef();
  const dispatch = useDispatch();

  const handleOk = e => {
    formRef.current.validateFields((err, values) => {
      if (!err) {
        setConfirmLoading(true);
        console.log('Received values of form: ', values);
        axios
          .post(
            `http://localhost:5050/api/dashboard/plot-parameters/${dashIndex}/${index}`,
            values
          )
          .then(response => {
            if (response) {
              console.log(response.data);
              dispatch(fetchDashboards(true));
              setConfirmLoading(false);
              dispatch(setModalEditParametersVisibility(false));
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
    dispatch(setModalEditParametersVisibility(false));
  };

  useEffect(() => {
    if (visible) {
      axios
        .get(
          `http://localhost:5050/api/dashboard/plot-parameters/${dashIndex}/${index}`
        )
        .then(response => {
          setParameters(response.data);
        });
    }
  }, [dashIndex, index]);

  useEffect(() => {
    setParameters(null);
  }, [visible]);

  return (
    <Modal
      title="Edit plot parameters"
      visible={visible}
      width={800}
      onOk={handleOk}
      onCancel={handleCancel}
      okButtonProps={{ disabled: parameters === null }}
      confirmLoading={confirmLoading}
    >
      <ParamsForm ref={formRef} parameters={parameters} />
    </Modal>
  );
});

const ParamsForm = Form.create()(({ parameters, form }) => {
  const { getFieldDecorator } = form;

  return (
    <Form layout="horizontal">
      {parameters
        ? parameters.map(param => parameter(param, form))
        : 'Fetching Data...'}
    </Form>
  );
});

export const ModalDeletePlot = React.memo(() => {
  const [confirmLoading, setConfirmLoading] = useState(false);
  const visible = useSelector(state => state.dashboard.showModalDeletePlot);
  const { dashIndex, index } = useSelector(state => state.dashboard.activePlot);
  const dispatch = useDispatch();

  const handleOk = e => {
    setConfirmLoading(true);
    axios
      .post(
        `http://localhost:5050/api/dashboard/delete-plot/${dashIndex}/${index}`
      )
      .then(response => {
        if (response) {
          console.log(response.data);
          dispatch(fetchDashboards(true));
          setConfirmLoading(false);
          dispatch(setModalDeletePlotVisibility(false));
        }
      })
      .catch(error => {
        setConfirmLoading(false);
        console.log(error.response);
      });
  };

  const handleCancel = e => {
    dispatch(setModalDeletePlotVisibility(false));
  };

  return (
    <Modal
      title="Delete plot"
      visible={visible}
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
});
