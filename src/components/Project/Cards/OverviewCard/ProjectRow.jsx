import { useMemo, useState } from 'react';
import NewProjectModal from '../../NewProjectModal';
import { Button, Divider, message, Modal, Select, Tooltip } from 'antd';
import {
  BinAnimationIcon,
  CreateNewIcon,
  OpenProjectIcon,
  RefreshIcon,
} from '../../../../assets/icons';
import { useProjectStore, useSaveProjectToLocalStorage } from '../../store';
import { useFetchProjectChoices, useOpenScenario } from '../../hooks';
import { useInputs } from '../../../../hooks/queries/useInputs';
import { useChangesExist } from '../../../InputEditor/store';
import { useMapStore } from '../../../Map/store/store';
import { isElectron } from '../../../../utils/electron';
import OpenProjectModal from '../../OpenProjectModal';

const ProjectRow = ({ projectName }) => {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
      }}
    >
      {!isElectron() && (
        <div style={{ flex: 1, minWidth: 0 }}>
          <ProjectSelect projectName={projectName} />
        </div>
      )}
      <div className="cea-card-icon-button-container">
        <RefreshIconButton />
        {isElectron() && (
          <>
            <OpenProjectIconButton />
            <NewProjectIconButton />
          </>
        )}
      </div>
    </div>
  );
};

const OpenProjectIconButton = () => {
  const [visible, setVisible] = useState(false);

  return (
    <>
      <Tooltip title="Open Project">
        <Button
          icon={<OpenProjectIcon />}
          type="text"
          onClick={() => setVisible(true)}
        />
      </Tooltip>
      <OpenProjectModal visible={visible} setVisible={setVisible} />
    </>
  );
};

const NewProjectIconButton = ({ children, style, onSuccess }) => {
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);

  return (
    <>
      <Tooltip
        title="New Project"
        open={open && children == null}
        onOpenChange={setOpen}
      >
        <Button
          icon={<CreateNewIcon />}
          type="text"
          onClick={() => setVisible(true)}
          style={style}
        >
          {children}
        </Button>
      </Tooltip>
      <NewProjectModal
        visible={visible}
        setVisible={setVisible}
        onSuccess={onSuccess}
      />
    </>
  );
};

const RefreshIconButton = () => {
  const [loading, setLoading] = useState(false);
  const project = useProjectStore((state) => state.project);
  const scenarioName = useProjectStore((state) => state.scenario);
  const fetchInfo = useProjectStore((state) => state.fetchInfo);
  const resetCameraOptions = useMapStore((state) => state.resetCameraOptions);

  const changes = useChangesExist();

  const { refetch } = useInputs();

  const openScenario = useOpenScenario();

  const onRefresh = async () => {
    if (changes) {
      message.config({
        top: 120,
        maxCount: 1,
      });
      message.warning(
        <div style={{ padding: 8 }}>
          Failed to refresh project.
          <br />
          <i>Save or discard changes before refreshing.</i>
        </div>,
      );
      return;
    }

    try {
      setLoading(true);
      // FIXME: Implement scenario refresh
      if (scenarioName) {
        await openScenario(project, scenarioName).then((exists) => {
          if (exists) refetch().then(resetCameraOptions);
        });
      } else {
        // Otherwise, refresh project
        await fetchInfo(project);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Tooltip title="Refresh">
      <Button
        icon={<RefreshIcon />}
        type="text"
        onClick={onRefresh}
        loading={loading}
      />
    </Tooltip>
  );
};

const ProjectOption = ({ projectName, onDelete }) => {
  const [isHovered, setIsHovered] = useState(false);

  const onClick = (e) => {
    e.stopPropagation();
    onDelete?.(projectName);
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span>{projectName}</span>
      {isHovered && (
        <BinAnimationIcon
          style={{ padding: '2px 8px' }}
          className="cea-job-info-icon danger shake"
          onClick={onClick}
        />
      )}
    </div>
  );
};

const ProjectSelect = ({ projectName }) => {
  const [loading, setLoading] = useState(false);

  const [choices] = useFetchProjectChoices();
  const updateScenario = useProjectStore((state) => state.updateScenario);
  const fetchInfo = useProjectStore((state) => state.fetchInfo);
  const saveProjectToLocalStorage = useSaveProjectToLocalStorage();

  const handleChange = async (value) => {
    setLoading(true);
    try {
      updateScenario(null);
      await fetchInfo(value);
      saveProjectToLocalStorage(value);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async (project) => {
    console.log('handleDeleteProject', project);
    Modal.confirm({
      title: 'Are you sure you want to delete this project?',
      content: 'This action cannot be undone.',
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      async onOk() {
        try {
          return await deleteProject(project);
        } catch (e) {
          console.error(e);
          message.error('Failed to delete project');
          return e;
        }
      },
      onCancel() {
        console.log('Cancel');
      },
    });
  };

  const options = useMemo(() => {
    return choices
      ? choices
          .filter((choice) => choice !== projectName)
          .map((choice) => ({
            label: (
              <ProjectOption
                projectName={choice}
                onDelete={handleDeleteProject}
              />
            ),
            value: choice,
          }))
      : [];
  }, [choices, projectName]);

  if (projectName == null) return null;
  return (
    <Select
      style={{ width: '100%' }}
      styles={{ popup: { root: { width: 270 } } }}
      placeholder="Select a project"
      options={options}
      filterOption={true}
      value={projectName}
      onChange={handleChange}
      loading={loading}
      popupRender={(menu) => (
        <>
          {menu}
          <Divider style={{ margin: '8px 0' }} />
          <NewProjectIconButton style={{ width: '100%' }}>
            Create New Project
          </NewProjectIconButton>
        </>
      )}
    />
  );
};

export default ProjectRow;
