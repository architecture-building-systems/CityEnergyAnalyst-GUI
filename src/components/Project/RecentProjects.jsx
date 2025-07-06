import { useCallback, useState } from 'react';
import { Button, Card, List, Spin, Typography } from 'antd';
import {
  FolderOpenOutlined,
  HistoryOutlined,
  PlusCircleOutlined,
} from '@ant-design/icons';
import {
  useRemoveProjectFromLocalStorage,
  useSaveProjectToLocalStorage,
  useProjectStore,
  useProjectLoading,
} from '../../stores/projectStore';
import './RecentProjects.css';
import OpenProjectModal from './OpenProjectModal';
import NewProjectModal from './NewProjectModal';
import { useUserInfo } from '../User/store';

const { Title, Text } = Typography;

const OpenProjectButton = ({ onSuccess }) => {
  const [visible, setVisible] = useState(false);

  return (
    <>
      <Button
        type="primary"
        icon={<FolderOpenOutlined />}
        className="open-new-project-btn"
        onClick={() => setVisible(true)}
      >
        Open Project
      </Button>
      <OpenProjectModal
        visible={visible}
        setVisible={setVisible}
        onSuccess={onSuccess}
      />
    </>
  );
};

const NewProjectButton = ({ onSuccess }) => {
  const [visible, setVisible] = useState(false);

  return (
    <>
      <Button
        icon={<PlusCircleOutlined />}
        className="open-new-project-btn"
        onClick={() => setVisible(true)}
      >
        New Project
      </Button>
      <NewProjectModal
        visible={visible}
        setVisible={setVisible}
        onSuccess={onSuccess}
      />
    </>
  );
};

const RecentProjects = () => {
  const [error, setError] = useState(null);
  const isFetching = useProjectLoading();

  const fetchInfo = useProjectStore((state) => state.fetchInfo);
  const recentProjects = useProjectStore((state) => state.recentProjects);
  const setRecentProjects = useProjectStore((state) => state.setRecentProjects);

  const userInfo = useUserInfo();
  const saveProjectToLocalStorage = useSaveProjectToLocalStorage();
  const removeProjectFromLocalStorage = useRemoveProjectFromLocalStorage();

  const handleProjectSelect = useCallback(
    async (projectPath) => {
      setError(null);
      try {
        await fetchInfo(projectPath);
        saveProjectToLocalStorage(projectPath);
      } catch (error) {
        const storedProject = removeProjectFromLocalStorage(projectPath);
        setRecentProjects(storedProject.recentProjects);
        setError(`Project does not exist: ${projectPath}`);
      }
    },
    [fetchInfo],
  );

  // Project in localStorage depends on user ID
  // Only show recent projects once user info is initialized
  if (userInfo == null || isFetching) return null;

  if (!recentProjects || recentProjects.length === 0) {
    return (
      <div className="recent-projects-container">
        <div className="empty-state-container">
          <HistoryOutlined className="empty-state-icon" />
          <Title level={4}>No Recent Projects</Title>
          <Text type="secondary" className="empty-state-text">
            You haven't opened any projects yet.
          </Text>
          <div style={{ display: 'flex', gap: 12 }}>
            <OpenProjectButton onSuccess={handleProjectSelect} />
            <NewProjectButton onSuccess={handleProjectSelect} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="recent-projects-container">
      <div className="recent-projects-title">
        <HistoryOutlined style={{ marginRight: '8px' }} />
        Recent Projects
      </div>
      <div>{error && <Text type="danger">{error}</Text>}</div>
      <div style={{ overflow: 'auto' }}>
        <List
          dataSource={recentProjects}
          renderItem={(project) => (
            <Card
              size="small"
              className="project-card"
              onClick={() => handleProjectSelect(project)}
            >
              <Text>{project}</Text>
            </Card>
          )}
        />
      </div>
      <OpenProjectButton onSuccess={handleProjectSelect} />
    </div>
  );
};

export default RecentProjects;
