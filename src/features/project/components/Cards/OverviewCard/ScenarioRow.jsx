import routes from 'constants/routes.json';
import useNavigationStore from 'stores/navigationStore';
import { useMemo, useState } from 'react';
import { Badge, Button, message, Select, Tooltip } from 'antd';
import {
  BinAnimationIcon,
  CreateNewIcon,
  DuplicateIcon,
  UploadDownloadIcon,
} from 'assets/icons';

import './OverviewCard.css';
import { useOpenScenario } from 'features/project/hooks';
import { useChangesExist } from 'features/input-editor/stores/inputEditorStore';
import DuplicateScenarioModal from 'features/project/components/modals/DuplicateScenarioModal';
import DeleteScenarioModal from 'features/project/components/modals/DeleteScenarioModal';
import { useScenarioLimits } from 'stores/serverStore';
import { isElectron } from 'utils/electron';
import { useIsValidUser } from 'stores/userStore';

const ScenarioRow = ({ project, scenarioName, scenarioList }) => {
  const isValidUser = useIsValidUser();
  const changesExist = useChangesExist();

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <Badge
        dot
        styles={{ root: { flex: 1, minWidth: 0 } }}
        count={changesExist ? 1 : 0}
      >
        <ScenarioSelect
          project={project}
          scenarioName={scenarioName}
          scenarioList={scenarioList}
        />
      </Badge>
      <div
        className={`cea-card-icon-button-container ${scenarioName !== null ? '' : 'active'}`}
      >
        {isValidUser && scenarioName !== null && (
          <DuplicateScenarioIcon
            project={project}
            currentScenarioName={scenarioName}
            scenarioList={scenarioList}
          />
        )}
        <NewScenarioIcon disabled={!isValidUser} />
        {isValidUser && !isElectron() && <UploadDownloadScenarioIcon />}
      </div>
    </div>
  );
};

const ScenarioOption = ({ scenarioName, onDelete }) => {
  const [isHovered, setIsHovered] = useState(false);
  const changes = useChangesExist();

  const onClick = (e) => {
    e.stopPropagation();
    onDelete?.(scenarioName);
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
      <span>{scenarioName}</span>
      {!changes && isHovered && (
        <BinAnimationIcon
          style={{ padding: '2px 8px' }}
          className="cea-job-info-icon danger shake"
          onClick={onClick}
        />
      )}
    </div>
  );
};

const ScenarioSelect = ({ project, scenarioName, scenarioList }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [scenarioToDelete, setScenarioToDelete] = useState(null);
  const [deleteScenarioVisible, setDeleteScenarioVisible] = useState(false);

  const changes = useChangesExist();

  const openScenario = useOpenScenario(routes.PROJECT);

  const sortedScenarios = useMemo(() => {
    return [...scenarioList].sort((a, b) => {
      return a.toLowerCase().localeCompare(b.toLowerCase());
    });
  }, [scenarioList]);

  const handleChange = async (value) => {
    if (changes) {
      message.config({
        top: 120,
        maxCount: 1,
      });
      message.warning(
        'Save or discard changes before opening another scenario.',
      );
      return;
    }

    setLoading(true);
    try {
      await openScenario(project, value);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteScenario = (scenario) => {
    setScenarioToDelete(scenario);
    setDeleteScenarioVisible(true);
  };

  const options = useMemo(() => {
    const filteredScenarios = sortedScenarios.filter(
      (scenario) => scenario !== scenarioName,
    );
    return filteredScenarios.length > 0
      ? [
          {
            label: 'Scenarios',
            options: filteredScenarios.map((scenario) => ({
              label: (
                <ScenarioOption
                  scenarioName={scenario}
                  onDelete={handleDeleteScenario}
                />
              ),
              value: scenario,
            })),
          },
        ]
      : [];
  }, [sortedScenarios, scenarioName]);

  const hasScenarios = scenarioList.length > 0;

  return (
    <>
      <Select
        className="cea-scenario-select"
        style={{ width: '100%' }}
        styles={{ popup: { root: { width: 270 } } }}
        placeholder={hasScenarios ? 'Select Scenario' : 'Create Scenario'}
        options={hasScenarios ? options : []}
        value={scenarioName}
        onChange={handleChange}
        loading={loading}
        open={hasScenarios ? open : false}
        onOpenChange={hasScenarios ? setOpen : undefined}
        notFoundContent={<small>No other scenarios</small>}
      />
      <DeleteScenarioModal
        visible={deleteScenarioVisible}
        setVisible={setDeleteScenarioVisible}
        project={project}
        scenario={scenarioToDelete}
      />
    </>
  );
};

const NewScenarioIcon = ({ children, style, onClick, disabled }) => {
  const { limit, count } = useScenarioLimits();
  const [open, setOpen] = useState(false);

  const { push } = useNavigationStore();
  const handleClick = () => {
    if (limit && count <= 0) {
      message.config({
        top: 60,
      });
      message.warning(
        <div style={{ padding: 8 }}>
          You have reached the maximum number of scenarios ({limit}). Please
          delete a scenario before creating a new one.
        </div>,
      );
      return;
    }
    push(routes.CREATE_SCENARIO);
    onClick?.();
  };

  return (
    <Tooltip
      title={disabled ? 'Log in to create a scenario' : 'Create Scenario'}
      placement="bottom"
      open={open && children == null}
      onOpenChange={setOpen}
    >
      <Button
        icon={<CreateNewIcon />}
        type="text"
        onClick={handleClick}
        disabled={disabled}
        style={style}
      >
        {children}
      </Button>
    </Tooltip>
  );
};

const DuplicateScenarioIcon = ({
  project,
  currentScenarioName,
  scenarioList,
}) => {
  const [visible, setVisible] = useState(false);
  const onClick = () => setVisible(true);

  return (
    <>
      <Tooltip title="Duplicate Scenario" placement="bottom">
        <Button icon={<DuplicateIcon />} type="text" onClick={onClick} />
      </Tooltip>
      <DuplicateScenarioModal
        visible={visible}
        setVisible={setVisible}
        project={project}
        currentScenarioName={currentScenarioName}
        scenarioList={scenarioList}
      />
    </>
  );
};

const UploadDownloadScenarioIcon = () => {
  const { push } = useNavigationStore();
  const onClick = () => push(routes.UPLOAD_DOWNLOAD);

  return (
    <Tooltip title="Upload/Download" placement="bottom">
      <Button icon={<UploadDownloadIcon />} type="text" onClick={onClick} />
    </Tooltip>
  );
};

export default ScenarioRow;
