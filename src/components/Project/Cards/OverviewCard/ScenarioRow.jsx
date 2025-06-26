import { push } from 'connected-react-router';

import routes from '../../../../constants/routes.json';
import { useDispatch } from 'react-redux';
import { useMemo, useState } from 'react';
import { Badge, message, Modal, Tooltip } from 'antd';
import {
  BinAnimationIcon,
  CreateNewIcon,
  DuplicateIcon,
  UploadDownloadIcon,
} from '../../../../assets/icons';

import './OverviewCard.css';
import { useOpenScenario } from '../../hooks';
import { useChangesExist } from '../../../InputEditor/store';
import { useProjectStore } from '../../store';

const ScenarioRow = ({ project, scenarioName, scenarioList }) => {
  const sortedScenarios = useMemo(() => {
    return scenarioList.sort((a, b) => {
      return a.toLowerCase().localeCompare(b.toLowerCase());
    });
  }, [scenarioList]);

  const remainingScenarios = useMemo(() => {
    return sortedScenarios.filter((scenario) => scenario !== scenarioName);
  }, [sortedScenarios, scenarioName]);

  const changesExist = useChangesExist();

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
            {scenarioName
              ? scenarioName
              : scenarioList?.length
                ? 'Select Scenario'
                : 'Create Scenario'}
          </div>
        </Badge>
        <div className="cea-card-icon-button-container">
          <DuplicateScenarioIcon />
          <NewScenarioIcon />
          <UploadDownloadScenarioIcon />
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
          <ScenarioItem key={scenario} project={project} scenario={scenario} />
        ))}
      </div>
    </div>
  );
};

const ScenarioItem = ({ project, scenario }) => {
  const [isHovered, setIsHovered] = useState(false);
  const changes = useChangesExist();

  const deleteScenario = useProjectStore((state) => state.deleteScenario);
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

    const confirmed = await new Promise((resolve) => {
      Modal.warning({
        title: 'Delete Scenario',
        content: 'Are you sure you want to delete this scenario?',
        okText: 'Delete',
        cancelText: 'Cancel',
        onOk: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });

    if (!confirmed) return;
    await deleteScenario(scenario);
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

const NewScenarioIcon = () => {
  const dispatch = useDispatch();
  const onClick = () => dispatch(push(routes.CREATE_SCENARIO));

  return (
    <Tooltip title="New Scenario" placement="bottom">
      <CreateNewIcon onClick={onClick} />
    </Tooltip>
  );
};

const DuplicateScenarioIcon = () => {
  const onClick = () => {};

  return (
    <Tooltip title="Duplicate Scenario" placement="bottom">
      <DuplicateIcon onClick={onClick} />
    </Tooltip>
  );
};

const UploadDownloadScenarioIcon = () => {
  const dispatch = useDispatch();
  const onClick = () => dispatch(push(routes.UPLOAD_DOWNLOAD));

  return (
    <Tooltip title="Upload/Download" placement="bottom">
      <UploadDownloadIcon onClick={onClick} />
    </Tooltip>
  );
};

export default ScenarioRow;
