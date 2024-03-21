import { useState, useEffect } from 'react';
import { DownOutlined } from '@ant-design/icons';
import { Card, Row, Col, Button, Modal, Tag, Dropdown, Space } from 'antd';
import axios from 'axios';
import { deleteScenario, useOpenScenario } from './Project';
import RenameScenarioModal from './RenameScenarioModal';
import { useFetchProject } from '../../utils/hooks';

const ScenarioCard = ({ scenarioName, project, active }) => {
  const openScenario = useOpenScenario();
  const handleOpenScenario = () => openScenario(project, scenarioName);

  return (
    <Card
      style={{ marginTop: 16 }}
      type="inner"
      title={
        <>
          <span>{scenarioName} </span>
          {active && <Tag>Current</Tag>}
        </>
      }
      extra={
        <Space>
          <EditScenarioMenu scenarioName={scenarioName} project={project} />
          <Button type="primary" onClick={handleOpenScenario}>
            Open
          </Button>
        </Space>
      }
    >
      <Row>
        <Col span={6}>
          <ScenarioImage
            project={project}
            scenarioName={scenarioName}
            onClick={handleOpenScenario}
          />
        </Col>
      </Row>
    </Card>
  );
};

const ScenarioImage = ({ project, scenarioName, onClick = () => {} }) => {
  const [image, isLoading, error] = useGenerateScenarioImage(
    project,
    scenarioName,
  );

  return (
    <div
      style={{
        width: 256,
        height: 160,
        backgroundColor: '#eee',
        textAlign: 'center',
        textJustify: 'center',
      }}
    >
      {isLoading ? (
        'Fetching image...'
      ) : error ? (
        'Unable to generate image'
      ) : (
        // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/click-events-have-key-events
        <img
          className="cea-scenario-preview-image"
          alt={`${scenarioName} preview`}
          src={`data:image/png;base64,${image}`}
          onClick={onClick}
        />
      )}
    </div>
  );
};

const useGenerateScenarioImage = (project, scenarioName) => {
  const [data, setData] = useState({ image: null });
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const resp = await axios.get(
          `${
            import.meta.env.VITE_CEA_URL
          }/api/project/scenario/${scenarioName}/image`,
          { params: { project } },
        );
        setData(resp.data);
      } catch (err) {
        console.error(err.response.data);
        setError(err.response.data);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  return [data.image, isLoading, error];
};

const EditScenarioMenu = ({ scenarioName, project }) => {
  const [isModalVisible, setModalVisible] = useState(false);
  const fetchProject = useFetchProject();

  const showConfirm = () => {
    let secondsToGo = 3;
    const modal = Modal.confirm({
      title: `Are you sure you want to delete this scenario?`,
      content: (
        <div>
          <p>
            <b>{scenarioName}</b>
          </p>
          <p>
            <i>(This operation cannot be reversed)</i>
          </p>
        </div>
      ),
      okText: `DELETE (${secondsToGo})`,
      okType: 'danger',
      okButtonProps: { disabled: true },
      cancelText: 'Cancel',
      onOk: () => deleteScenario(scenarioName, project, fetchProject),
      centered: true,
    });

    const timer = setInterval(() => {
      secondsToGo -= 1;
      modal.update({
        okText: `DELETE (${secondsToGo})`,
      });
    }, 1000);

    setTimeout(() => {
      clearInterval(timer);
      modal.update({
        okButtonProps: { disabled: false },
        okText: 'DELETE',
      });
    }, secondsToGo * 1000);
  };

  const items = [
    {
      key: 'rename',
      label: 'Rename',
    },
    { type: 'divider' },
    { key: 'delete', label: <div style={{ color: 'red' }}>Delete</div> },
  ];

  const onClick = ({ key }) => {
    switch (key) {
      case 'rename':
        setModalVisible(true);
        break;
      case 'delete':
        showConfirm();
        break;
      default:
        break;
    }
  };

  return (
    <span id={`${scenarioName}-edit-button`} className="scenario-edit-button">
      <Dropdown
        menu={{ items, onClick }}
        trigger={['click']}
        getPopupContainer={() => {
          return document.getElementById(`${scenarioName}-edit-button`);
        }}
      >
        <Button>
          Edit <DownOutlined />
        </Button>
      </Dropdown>
      <RenameScenarioModal
        scenarioName={scenarioName}
        project={project}
        visible={isModalVisible}
        setVisible={setModalVisible}
      />
    </span>
  );
};

export default ScenarioCard;
