import routes from 'constants/routes.json';
import useNavigationStore from 'stores/navigationStore';
import { useMemo, useState } from 'react';
import { Badge, Button, message, Tooltip } from 'antd';
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

  const sortedScenarios = useMemo(() => {
    return [...scenarioList].sort((a, b) => {
      return a.toLowerCase().localeCompare(b.toLowerCase());
    });
  }, [scenarioList]);

  const remainingScenarios = useMemo(() => {
    return sortedScenarios.filter((scenario) => scenario !== scenarioName);
  }, [sortedScenarios, scenarioName]);

  const changesExist = useChangesExist();

  const [deleteScenarioVisible, setDeleteScenarioVisible] = useState(false);
  const [scenarioToDelete, setScenarioToDelete] = useState(null);

  const onDelete = (scenario) => {
    setScenarioToDelete(scenario);
    setDeleteScenarioVisible(true);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,

        fontSize: 14,
        minHeight: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <Badge dot styles={{ root: { flex: 1 } }} count={changesExist ? 1 : 0}>
          <div
            style={{
              backgroundColor: '#000',
              padding: '10px 12px',
              borderRadius: 12,
              color: '#fff',

              fontWeight: 'bold',
            }}
          >
            {scenarioName ? (
              scenarioName
            ) : (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                {'>'}
              </div>
            )}
          </div>
        </Badge>
        <div
          className={`cea-card-icon-button-container ${scenarioName !== null ? '' : 'active'}`}
        >
          {scenarioName !== null && (
            <DuplicateScenarioIcon
              project={project}
              currentScenarioName={scenarioName}
              scenarioList={scenarioList}
              disabled={!isValidUser}
            />
          )}
          <NewScenarioIcon disabled={!isValidUser} />
          {isValidUser && !isElectron() && <UploadDownloadScenarioIcon />}
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          overflow: 'auto',
        }}
      >
        {remainingScenarios.map((scenario) => (
          <ScenarioItem
            key={scenario}
            project={project}
            scenario={scenario}
            onDelete={onDelete}
          />
        ))}
        <DeleteScenarioModal
          visible={deleteScenarioVisible}
          setVisible={setDeleteScenarioVisible}
          project={project}
          scenario={scenarioToDelete}
        />
      </div>
    </div>
  );
};

const ScenarioItem = ({ project, scenario, onDelete }) => {
  const [isHovered, setIsHovered] = useState(false);
  const changes = useChangesExist();

  const openScenario = useOpenScenario(routes.PROJECT);
  const handleOpenScenario = () => {
    if (changes) {
      message.config({
        top: 120,
      });
      message.warning(
        'Save or discard changes before opening another scenario.',
      );
      return;
    }
    openScenario(project, scenario);
  };

  const handleDeleteScenario = async (e) => {
    e.stopPropagation();
    onDelete?.(scenario);
  };

  return (
    <div
      className="cea-card-scenario-item"
      key={scenario}
      onClick={handleOpenScenario}
      onKeyDown={(e) => e.key === 'Enter' && handleOpenScenario()}
      role="button"
      tabIndex={0}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {scenario}

      {!changes && isHovered && (
        <BinAnimationIcon
          style={{ padding: '2px 8px' }}
          className="cea-job-info-icon danger shake"
          onClick={handleDeleteScenario}
        />
      )}
    </div>
  );
};

const NewScenarioIcon = ({ disabled }) => {
  const { limit, count } = useScenarioLimits();

  const { push } = useNavigationStore();
  const onClick = () => {
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
  };

  return (
    <Tooltip
      title={disabled ? 'Log in to create a new scenario' : 'New Scenario'}
      placement="bottom"
    >
      <Button
        icon={<CreateNewIcon />}
        type="text"
        onClick={onClick}
        disabled={disabled}
      />
    </Tooltip>
  );
};

const DuplicateScenarioIcon = ({
  project,
  currentScenarioName,
  scenarioList,
  disabled,
}) => {
  const [visible, setVisible] = useState(false);
  const onClick = () => setVisible(true);

  return (
    <>
      <Tooltip title="Duplicate Scenario" placement="bottom">
        <Button
          icon={<DuplicateIcon />}
          type="text"
          onClick={onClick}
          disabled={disabled}
        />
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
