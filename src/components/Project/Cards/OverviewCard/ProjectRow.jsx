import { useMemo, useState } from 'react';
import NewProjectModal from '../../NewProjectModal';
import { Button, Divider, message, Select, Tooltip } from 'antd';
import {
  BinAnimationIcon,
  CreateNewIcon,
  OpenProjectIcon,
  RefreshIcon,
} from '../../../../assets/icons';
import {
  useProjectStore,
  useFetchProjectChoices,
  useSaveProjectToLocalStorage,
} from '../../store';
import { useOpenScenario } from '../../hooks';
import { useInputs } from '../../../../hooks/queries/useInputs';
import { useChangesExist } from '../../../InputEditor/store';
import { useMapStore } from '../../../Map/store/store';
import { isElectron } from '../../../../utils/electron';
import OpenProjectModal from '../../OpenProjectModal';
import DeleteProjectModal from '../../DeleteProjectModal';

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

const NewProjectIconButton = ({ children, style, onSuccess, onClick }) => {
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);

  const handleClick = () => {
    setVisible(true);
    onClick?.();
  };

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
          onClick={handleClick}
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
  const [_, fetchProjectChoices] = useFetchProjectChoices();
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
        await fetchProjectChoices();
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
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [projectToDelete, setProjectToDelete] = useState(null);
  const [deleteProjectVisible, setDeleteProjectVisible] = useState(false);

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

  const handleDeleteProject = (project) => {
    setProjectToDelete(project);
    setDeleteProjectVisible(true);
  };

  const options = useMemo(() => {
    return choices?.length > 1
      ? [
          {
            label: 'Projects',
            options: choices
              .filter((choice) => choice !== projectName)
              .map((choice) => ({
                label: (
                  <ProjectOption
                    projectName={choice}
                    onDelete={handleDeleteProject}
                  />
                ),
                value: choice,
              })),
          },
        ]
      : [];
  }, [choices, projectName]);

  if (projectName == null) return null;
  return (
    <>
      <Select
        style={{ width: '100%' }}
        styles={{ popup: { root: { width: 270 } } }}
        placeholder="Select a project"
        options={options}
        filterOption={true}
        value={projectName}
        onChange={handleChange}
        loading={loading}
        open={open}
        onOpenChange={setOpen}
        popupRender={(menu) => (
          <>
            {menu}
            <Divider style={{ margin: '8px 0' }} />
            <NewProjectIconButton
              style={{ width: '100%' }}
              onClick={() => setOpen(false)}
            >
              Create New Project
            </NewProjectIconButton>
          </>
        )}
        notFoundContent={<small>No Projects found</small>}
      />
      <DeleteProjectModal
        visible={deleteProjectVisible}
        setVisible={setDeleteProjectVisible}
        project={projectToDelete}
      />
    </>
  );
};

export default ProjectRow;
