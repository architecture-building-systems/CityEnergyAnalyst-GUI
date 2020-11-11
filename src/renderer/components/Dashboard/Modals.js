import React, { useState, useEffect, useRef, useContext } from 'react';
import {
  Modal,
  Form,
  Select,
  Input,
  Radio,
  Button,
  Skeleton,
  Icon,
} from 'antd';
import axios from 'axios';
import { ModalContext } from '../../utils/ModalManager';
import { shell } from 'electron';
import Parameter from '../Tools/Parameter';
import path from 'path';

const { Option } = Select;

export const ModalNewDashboard = ({
  fetchDashboards,
  setDashIndex,
  dashboardNames,
}) => {
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [newDashIndex, setNewDashIndex] = useState(null);
  const { modals, setModalVisible, visible } = useContext(ModalContext);
  const formRef = useRef();

  const handleOk = (e) => {
    formRef.current.validateFields((err, values) => {
      if (!err) {
        setConfirmLoading(true);
        console.log('Received values of form: ', values);
        axios
          .post(`http://${process.env.CEA_URL}/api/dashboards/`, values)
          .then((response) => {
            if (response) {
              console.log(response.data);
              fetchDashboards();
              setConfirmLoading(false);
              setModalVisible(modals.newDashboard, false);
              setNewDashIndex(response.data.new_dashboard_index);
            }
          })
          .catch((error) => {
            setConfirmLoading(false);
            console.log(error.response);
          });
      }
    });
  };

  const handleCancel = (e) => {
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
          rules: [{ required: true }],
        })(<Input />)}
      </Form.Item>
      <Form.Item
        label="Layout"
        key="layout"
        labelCol={{ span: 6 }}
        wrapperCol={{ span: 11, offset: 1 }}
      >
        {getFieldDecorator('layout', {
          initialValue: 'row',
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
  dashboardNames,
}) => {
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [newDashIndex, setNewDashIndex] = useState(null);
  const { modals, setModalVisible, visible } = useContext(ModalContext);
  const formRef = useRef();

  const handleOk = (e) => {
    formRef.current.validateFields((err, values) => {
      if (!err) {
        setConfirmLoading(true);
        console.log('Received values of form: ', values);
        axios
          .post(`http://${process.env.CEA_URL}/api/dashboards/duplicate`, {
            ...values,
            dashboard_index: dashIndex,
          })
          .then((response) => {
            if (response) {
              console.log(response.data);
              fetchDashboards();
              setConfirmLoading(false);
              setModalVisible(modals.duplicateDashboard, false);
              setNewDashIndex(response.data.new_dashboard_index);
            }
          })
          .catch((error) => {
            setConfirmLoading(false);
            console.log(error.response);
          });
      }
    });
  };

  const handleCancel = (e) => {
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
            rules: [{ required: true }],
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

  const handleOk = (e) => {
    formRef.current.validateFields((err, values) => {
      if (!err) {
        setConfirmLoading(true);
        console.log('Received values of form: ', values);
        axios
          .patch(`http://${process.env.CEA_URL}/api/dashboards/${dashIndex}`, values)
          .then((response) => {
            if (response) {
              console.log(response.data);
              fetchDashboards();
              setConfirmLoading(false);
              setModalVisible(modals.setScenario, false);
            }
          })
          .catch((error) => {
            setConfirmLoading(false);
            console.log(error.response);
          });
      }
    });
  };

  const handleCancel = (e) => {
    setModalVisible(modals.setScenario, false);
  };

  useEffect(() => {
    if (visible.setScenario) {
      axios.get('http://${process.env.CEA_URL}/api/project/').then((response) => {
        const { scenario, scenarios } = response.data;
        setScenarios({
          type: 'ScenarioNameParameter',
          name: 'scenario',
          value: scenario,
          help: 'Change the scenario parameter of all plots in this dashboard',
          choices: scenarios,
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
      {scenarios ? (
        <Parameter form={form} parameter={form} />
      ) : (
          'Fetching Data...'
        )}
    </Form>
  );
});

export const ModalDeleteDashboard = ({
  fetchDashboards,
  dashIndex,
  setDashIndex,
}) => {
  const [confirmLoading, setConfirmLoading] = useState(false);
  const { modals, setModalVisible, visible } = useContext(ModalContext);

  const handleOk = (e) => {
    setConfirmLoading(true);
    axios
      .delete(`http://${process.env.CEA_URL}/api/dashboards/${dashIndex}`)
      .then((response) => {
        if (response) {
          console.log(response.data);
          setDashIndex(0);
          fetchDashboards();
          setConfirmLoading(false);
          setModalVisible(modals.deleteDashboard, false);
        }
      })
      .catch((error) => {
        setConfirmLoading(false);
        console.log(error.response);
      });
  };

  const handleCancel = (e) => {
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

const ModalAddPlotTemplate = ({
  title,
  modal,
  fetchDashboards,
  dashIndex,
  activePlotRef,
  categories,
}) => {
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [category, setCategory] = useState({ category: null, plot_id: null });
  const [parameters, setParameters] = useState(null);
  const formRef = useRef();

  const { setModalVisible, visible } = useContext(ModalContext);

  const nextPage = () => setPage((oldValue) => oldValue + 1);
  const prevPage = () => setPage((oldValue) => oldValue - 1);
  const getParameters = async (scenario) => {
    try {
      const params = await axios.get(
        `http://${process.env.CEA_URL}/api/dashboards/plot-categories/${category.category}/plots/${category.plot_id}/parameters`,
        scenario ? { params: { scenario } } : {}
      );
      console.log(params.data);
      setParameters(params.data);
    } catch (error) {
      console.log(error);
    }
  };

  const handleOk = (e) => {
    formRef.current.validateFields((err, values) => {
      if (!err) {
        setConfirmLoading(true);
        console.log('Received values of form: ', values);
        axios
          .put(
            `http://${process.env.CEA_URL}/api/dashboards/${dashIndex}/plots/${activePlotRef.current}`,
            { ...category, parameters: values }
          )
          .then((response) => {
            if (response) {
              console.log(response.data);
              fetchDashboards();
              setConfirmLoading(false);
              setModalVisible(modal, false);
            }
          })
          .catch((error) => {
            setConfirmLoading(false);
            console.log(error.response);
          });
      }
    });
  };

  const handleCancel = (e) => {
    setModalVisible(modal, false);
  };

  useEffect(() => {
    if (!visible[modal]) {
      setPage(0);
    }
  }, [visible[modal]]);

  return (
    <Modal
      title={title}
      visible={visible[modal]}
      onCancel={handleCancel}
      width={800}
      footer={[
        <Button
          key="cancel"
          onClick={handleCancel}
          style={{ display: page == 0 ? 'inline' : 'none' }}
        >
          Cancel
        </Button>,
        <Button
          key="next"
          type="primary"
          loading={loading}
          style={{ display: page == 0 ? 'inline' : 'none' }}
          onClick={async () => {
            setLoading(true);
            await getParameters();
            setLoading(false);
            nextPage();
          }}
        >
          Next
        </Button>,
        <Button
          key="back"
          style={{ display: page == 1 ? 'inline' : 'none' }}
          onClick={prevPage}
        >
          Back
        </Button>,
        <Button
          key="ok"
          type="primary"
          onClick={handleOk}
          loading={confirmLoading}
          disabled={page !== 1}
        >
          Ok
        </Button>,
      ]}
      destroyOnClose
    >
      <div style={{ display: page == 0 ? 'block' : 'none' }}>
        <CategoriesForm categories={categories} setValues={setCategory} />
      </div>
      {page == 1 && (
        <div>
          <ParamsForm
            ref={formRef}
            parameters={parameters}
            getParameters={getParameters}
          />
        </div>
      )}
    </Modal>
  );
};

export const ModalAddPlot = (props) => {
  const { modals } = useContext(ModalContext);
  return (
    <ModalAddPlotTemplate title="Add Plot" modal={modals.addPlot} {...props} />
  );
};

export const ModalChangePlot = (props) => {
  const { modals } = useContext(ModalContext);
  return (
    <ModalAddPlotTemplate
      title="Change Plot"
      modal={modals.changePlot}
      {...props}
    />
  );
};

const CategoriesForm = Form.create()(({ categories, setValues }) => {
  if (categories === null) return null;

  const categoryIDs = Object.keys(categories);
  const [selected, setSelected] = useState({
    category: categoryIDs[0],
    plots: categories[categoryIDs[0]].plots,
    selectedPlot: categories[categoryIDs[0]].plots[0].id,
  });

  const handleCategoryChange = (value) => {
    setValues({ category: value, plot_id: categories[value].plots[0].id });
    setSelected({
      category: value,
      plots: categories[value].plots,
      selectedPlot: categories[value].plots[0].id,
    });
  };

  const handlePlotChange = (value) => {
    setValues({ category: selected.category, plot_id: value });
    setSelected({ ...selected, selectedPlot: value });
  };

  useEffect(() => {
    if (categories !== null)
      setValues({
        category: selected.category,
        plot_id: selected.selectedPlot,
      });
  }, [categories]);

  return (
    <Form layout="vertical">
      <Form.Item label="Category" key="category">
        <Select defaultValue={categoryIDs[0]} onChange={handleCategoryChange}>
          {categoryIDs.map((id) => (
            <Option key={id} value={id}>
              {categories[id].label}
            </Option>
          ))}
        </Select>
      </Form.Item>
      <Form.Item label="Plot" key="plot">
        <Select value={selected.selectedPlot} onChange={handlePlotChange}>
          {selected.plots.map((plot) => (
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
  activePlotRef,
}) => {
  const [parameters, setParameters] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const { modals, setModalVisible, visible } = useContext(ModalContext);
  const formRef = useRef();
  const getParameters = async (scenario) => {
    try {
      const params = await axios.get(
        `http://${process.env.CEA_URL}/api/dashboards/${dashIndex}/plots/${activePlotRef.current}/parameters`,
        scenario ? { params: { scenario } } : {}
      );
      console.log(params.data);
      setParameters(params.data);
    } catch (error) {
      console.log(error);
    }
  };

  const handleOk = (e) => {
    formRef.current.validateFields((err, values) => {
      if (!err) {
        setConfirmLoading(true);
        console.log('Received values of form: ', values);
        axios
          .put(
            `http://${process.env.CEA_URL}/api/dashboards/${dashIndex}/plots/${activePlotRef.current}`,
            { parameters: values }
          )
          .then((response) => {
            if (response) {
              console.log(response.data);
              fetchDashboards();
              setConfirmLoading(false);
              setModalVisible(modals.editParameters, false);
            }
          })
          .catch((error) => {
            setConfirmLoading(false);
            console.log(error.response);
          });
      }
    });
  };

  const handleCancel = (e) => {
    setModalVisible(modals.editParameters, false);
  };

  useEffect(() => {
    if (visible.editParameters) {
      getParameters();
    } else setParameters(null);
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
      <ParamsForm
        ref={formRef}
        parameters={parameters}
        getParameters={getParameters}
      />
    </Modal>
  );
};

const ParamsForm = Form.create()(({ parameters, form, getParameters }) => {
  const scenario = form.getFieldValue('scenario-name');
  const handleScenarioChange = async (scenario) => {
    await getParameters(scenario);
    form.validateFields((errors, values) => { });
  };
  useEffect(() => {
    if (scenario) {
      handleScenarioChange(scenario);
    }
  }, [scenario]);
  return (
    <Form layout="horizontal">
      {parameters ? (
        <React.Fragment>
          {parameters.map((param) => (
            <Parameter key={param.name} form={form} parameter={param} />
          ))}
        </React.Fragment>
      ) : (
          'Fetching Data...'
        )}
    </Form>
  );
});

export const ModalDeletePlot = ({
  fetchDashboards,
  dashIndex,
  activePlotRef,
}) => {
  const [confirmLoading, setConfirmLoading] = useState(false);
  const { modals, setModalVisible, visible } = useContext(ModalContext);

  const handleOk = (e) => {
    setConfirmLoading(true);
    axios
      .delete(
        `http://${process.env.CEA_URL}/api/dashboards/${dashIndex}/plots/${activePlotRef.current}`
      )
      .then((response) => {
        if (response) {
          console.log(response.data);
          fetchDashboards();
          setConfirmLoading(false);
          setModalVisible(modals.deletePlot, false);
        }
      })
      .catch((error) => {
        setConfirmLoading(false);
        console.log(error.response);
      });
  };

  const handleCancel = (e) => {
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

const groupFilesOnParent = (fileList) => {
  let out = {};
  for (const fileLocation of fileList) {
    const parentFolder = path.dirname(fileLocation);
    const fileName = path.basename(fileLocation);
    if (typeof out[parentFolder] == 'undefined') out[parentFolder] = [];
    out[parentFolder].push(fileName);
  }
  return out;
};

const FileList = ({ folderPath, filePaths }) => {
  const fileList = filePaths.map((file) => (
    <li key={file}>
      <a onClick={() => shell.openItem(path.join(folderPath, file))}>{file}</a>
    </li>
  ));

  return (
    <div style={{ marginBottom: 10 }}>
      <Icon type="folder" />
      <b style={{ margin: 5 }}>{folderPath}</b>
      <a onClick={() => shell.openItem(folderPath)}>Open Folder</a>
      {filePaths.length > 3 ? (
        <details style={{ margin: 10 }}>
          <summary>Show files</summary>
          <div style={{ margin: 10, maxHeight: 200, overflow: 'auto' }}>
            <ul>{fileList}</ul>
          </div>
        </details>
      ) : (
          <ul>{fileList}</ul>
        )}
    </div>
  );
};

const PlotFilesList = ({ inputs, data }) => {
  const inputFolders = Object.keys(inputs);
  const dataFolders = Object.keys(data);
  return (
    <div>
      {inputFolders.length ? (
        <div>
          <h2>Input Files</h2>
          {inputFolders.map((inputFolder) => (
            <FileList
              key={inputFolder}
              folderPath={inputFolder}
              filePaths={inputs[inputFolder]}
            />
          ))}
        </div>
      ) : null}
      {dataFolders.length ? (
        <div>
          <h2>Data Files</h2>
          {dataFolders.map((dataFolder) => (
            <FileList
              key={dataFolder}
              folderPath={dataFolder}
              filePaths={data[dataFolder]}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
};

export const ModalPlotFiles = ({ dashIndex, activePlotRef }) => {
  const [loading, setLoading] = useState(true);
  const [fileLocations, setFileLocations] = useState(null);
  const { modals, setModalVisible, visible } = useContext(ModalContext);
  const handleCancel = () => setModalVisible(modals.plotFiles, false);

  useEffect(() => {
    const fetchFileLocations = async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(
          `http://${process.env.CEA_URL}/api/dashboards/${dashIndex}/plots/${activePlotRef.current}/input-files`
        );
        setFileLocations({
          inputs: groupFilesOnParent(data.inputs),
          data: groupFilesOnParent(data.data),
        });
      } catch (err) {
        console.log(err);
      } finally {
        setLoading(false);
      }
    };
    if (visible.plotFiles) fetchFileLocations();
    else setFileLocations(null);
  }, [visible]);

  return (
    <Modal
      title="Plot Data Files"
      visible={visible.plotFiles}
      width={800}
      onCancel={handleCancel}
      footer={null}
      destroyOnClose
    >
      {loading ? (
        <Skeleton />
      ) : fileLocations ? (
        <PlotFilesList
          inputs={fileLocations.inputs}
          data={fileLocations.data}
        />
      ) : (
            <div>Files not found</div>
          )}
    </Modal>
  );
};
