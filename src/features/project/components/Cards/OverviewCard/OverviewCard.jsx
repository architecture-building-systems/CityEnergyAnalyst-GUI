import { Divider, Modal, Select } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import ProjectRow from './ProjectRow';
import ScenarioRow from './ScenarioRow';
import { ShowHideCardsButton } from 'components/ShowHideCardsButton';
import { useProjectStore } from 'features/project/stores/projectStore';
import { fetchPathwayOverview } from 'features/pathway/api';
import { BinAnimationIcon } from 'assets/icons';
import useJobsStore, { useCreateJob } from 'features/jobs/stores/jobsStore';

import CeaLogoSVG from 'assets/cea-logo.svg';

const OverviewCard = ({
  project,
  projectName,
  scenarioName,
  scenarioList,
  onToggleHideAll,
}) => {
  return (
    <div
      id="cea-overview-card"
      style={{
        background: '#fff',
        padding: 12,
        borderRadius: 12,
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',

        boxSizing: 'border-box',

        display: 'flex',
        flexDirection: 'column',
        gap: 8,

        fontSize: 12,
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
        }}
      >
        <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Logo height={48} />
        </div>

        <ShowHideCardsButton
          hideAll={true}
          onToggle={onToggleHideAll}
          style={{
            background: '#fff',
            color: '#000',
            padding: 0,
            borderRadius: 0,
          }}
        />
      </div>
      <OverviewCardProjectInfo
        project={project}
        projectName={projectName}
        scenarioName={scenarioName}
        scenarioList={scenarioList}
      />
    </div>
  );
};

const OverviewCardProjectInfo = ({
  project,
  projectName,
  scenarioName,
  scenarioList,
}) => {
  if (!project) return null;

  return (
    <>
      <ProjectRow projectName={projectName} />
      <Divider
        titlePlacement="right"
        orientationMargin={2}
        plain
        style={{ margin: 0, fontSize: 12, color: 'rgba(5, 5, 5, 0.25)' }}
      >
        Scenario
      </Divider>
      <ScenarioRow
        project={project}
        scenarioName={scenarioName}
        scenarioList={scenarioList}
      />
      <PathwayViewerRow scenarioName={scenarioName} project={project} />
    </>
  );
};

const PathwayOption = ({ pathwayName, onDelete }) => {
  const [isHovered, setIsHovered] = useState(false);

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
      <div
        style={{
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flexGrow: 1,
        }}
        title={pathwayName}
      >
        {pathwayName}
      </div>
      {isHovered && (
        <BinAnimationIcon
          style={{ padding: '2px 8px' }}
          className="cea-job-info-icon danger shake"
          onClick={(e) => {
            e.stopPropagation();
            onDelete?.(pathwayName);
          }}
        />
      )}
    </div>
  );
};

const PathwayViewerRow = ({ scenarioName, project }) => {
  const [overview, setOverview] = useState(null);
  const childScenario = useProjectStore((s) => s.childScenario);
  const setChildScenario = useProjectStore((s) => s.setChildScenario);
  const createJob = useCreateJob();

  const refreshOverview = () => {
    fetchPathwayOverview()
      .then(setOverview)
      .catch(() => setOverview(null));
  };

  useEffect(() => {
    if (!scenarioName) return;
    let cancelled = false;
    fetchPathwayOverview()
      .then((data) => {
        if (!cancelled) setOverview(data);
      })
      .catch(() => {
        if (!cancelled) setOverview(null);
      });
    return () => {
      cancelled = true;
    };
  }, [scenarioName]);

  // Listen for completed delete jobs to refresh
  const jobs = useJobsStore((s) => s.jobs);
  useEffect(() => {
    if (!jobs) return;
    const hasCompleted = Object.values(jobs).some(
      (j) => j.state === 2 && j.script === 'pathway-delete-pathway',
    );
    if (hasCompleted) refreshOverview();
  }, [jobs]);

  const bakedPathways = useMemo(() => {
    if (!overview?.pathways) return [];
    return overview.pathways.filter((p) => p.all_baked);
  }, [overview]);

  const selectedPathway = childScenario?.pathway_name ?? null;

  const handleDelete = (pathwayName) => {
    const scenarioPath = `${String(project).replace(/[\\/]+$/, '')}/${scenarioName}`;
    Modal.confirm({
      title: `Delete pathway '${pathwayName}'?`,
      content:
        'This removes the pathway log, intervention templates, baked states, simulation outputs, and saved state-status records. This cannot be undone.',
      okText: 'Delete pathway',
      okButtonProps: { danger: true },
      onOk: async () => {
        if (selectedPathway === pathwayName) {
          setChildScenario(null);
        }
        await createJob('pathway-delete-pathway', {
          scenario: scenarioPath,
          existing_pathway_name: pathwayName,
        });
      },
    });
  };

  if (!scenarioName || bakedPathways.length === 0) return null;

  const options = bakedPathways.map((p) => ({
    label: (
      <PathwayOption pathwayName={p.pathway_name} onDelete={handleDelete} />
    ),
    value: p.pathway_name,
  }));

  return (
    <>
      <Divider
        titlePlacement="right"
        orientationMargin={2}
        plain
        style={{ margin: 0, fontSize: 12, color: 'rgba(5, 5, 5, 0.25)' }}
      >
        Pathway
      </Divider>
      <Select
        className={
          selectedPathway ? 'cea-scenario-select-blue' : 'cea-scenario-select'
        }
        style={{ width: '100%' }}
        styles={{ popup: { root: { width: 270 } } }}
        placeholder="Select Pathway"
        options={options}
        value={selectedPathway}
        onChange={(value) => {
          setChildScenario(
            value
              ? { pathway_name: value, year: null, parent_scenario: null }
              : null,
          );
        }}
        onSelect={(value) => {
          if (value === selectedPathway) {
            setChildScenario(null);
          }
        }}
        allowClear
        notFoundContent={<small>No baked pathways</small>}
      />
    </>
  );
};

const Logo = ({ height }) => {
  return (
    <div
      id="cea-overview-card-logo"
      style={{
        display: 'flex',
        alignItems: 'center',
        height,
        gap: 12,
      }}
    >
      <CeaLogoSVG style={{ height: '100%' }} />
    </div>
  );
};

export default OverviewCard;
