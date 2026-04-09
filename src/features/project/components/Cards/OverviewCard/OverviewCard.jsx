import { Divider, Modal, Select, Spin, Typography } from 'antd';
import InfoTooltip from 'components/InfoTooltip';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import ProjectRow from './ProjectRow';
import ScenarioRow from './ScenarioRow';
import { ShowHideCardsButton } from 'components/ShowHideCardsButton';
import { useProjectStore } from 'features/project/stores/projectStore';
import {
  fetchPathwayOverview,
  fetchStateGeojson,
  switchToChildScenario,
} from 'features/pathway/api';
import { BinAnimationIcon } from 'assets/icons';
import useJobsStore, { useCreateJob } from 'features/jobs/stores/jobsStore';
import { useMapStore } from 'features/map/stores/mapStore';

const { Text } = Typography;

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

const LANE_PADDING = 18;
const TIMELINE_HEIGHT = 36;

const STATUS_FILL = {
  none: '#CBD5E1',
  validated: '#CBD5E1',
  baked: '#1470AF',
  simulated: '#000000',
};

const PathwayViewerRow = ({ scenarioName, project }) => {
  const queryClient = useQueryClient();
  const [overview, setOverview] = useState(null);
  const childScenario = useProjectStore((s) => s.childScenario);
  const setChildScenario = useProjectStore((s) => s.setChildScenario);
  const simulationProgress = useProjectStore((s) => s.simulationProgress);
  const createJob = useCreateJob();
  const [switching, setSwitching] = useState(false);
  const [hoveredYear, setHoveredYear] = useState(null);
  const viewportRef = useRef(null);
  const [viewportWidth, setViewportWidth] = useState(0);

  const refreshOverview = useCallback(() => {
    fetchPathwayOverview()
      .then(setOverview)
      .catch(() => setOverview(null));
  }, []);

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

  // Listen for completed delete/bake jobs to refresh
  const jobs = useJobsStore((s) => s.jobs);
  useEffect(() => {
    if (!jobs) return;
    const hasCompleted = Object.values(jobs).some(
      (j) =>
        j.state === 2 &&
        [
          'pathway-delete-pathway',
          'bake-pathway-states',
          'pathway-simulations',
        ].includes(j.script),
    );
    if (hasCompleted) refreshOverview();
  }, [jobs, refreshOverview]);

  // Measure viewport width
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return undefined;
    const update = () => setViewportWidth(el.clientWidth);
    update();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const bakedPathways = useMemo(() => {
    if (!overview?.pathways) return [];
    return overview.pathways.filter((p) => p.all_baked);
  }, [overview]);

  const selectedPathway = childScenario?.pathway_name ?? null;

  const currentPathway = useMemo(
    () => bakedPathways.find((p) => p.pathway_name === selectedPathway),
    [bakedPathways, selectedPathway],
  );

  const years = currentPathway?.years ?? [];
  const yearPhases = currentPathway?.year_phases ?? {};
  const span = overview?.span ?? {};
  const startYear = span.start_year;
  const endYear = span.end_year;
  const yearRange = useMemo(() => {
    if (startYear == null || endYear == null) return 1;
    return Math.max(endYear - startYear, 1);
  }, [startYear, endYear]);

  const fitWidth = Math.max((viewportWidth || 200) - LANE_PADDING * 2, 60);
  const pxPerYear = fitWidth / yearRange;
  const contentWidth = LANE_PADDING * 2 + yearRange * pxPerYear;

  // Nodes use LANE_PADDING so first/last nodes inset by the dropdown fillet
  const getYearOffset = useCallback(
    (year) => {
      if (startYear == null) return LANE_PADDING;
      return LANE_PADDING + (year - startYear) * pxPerYear;
    },
    [pxPerYear, startYear],
  );

  const setStateZoneOverride = useMapStore(
    (state) => state.setStateZoneOverride,
  );

  const handleNodeClick = async (pathwayName, year) => {
    const phase = yearPhases[String(year)] ?? 'none';
    if (phase !== 'baked' && phase !== 'simulated') return;

    setSwitching(true);
    try {
      const result = await switchToChildScenario(pathwayName, year);
      setChildScenario({
        pathway_name: pathwayName,
        year,
        parent_scenario: result.parent_scenario,
      });
      // Show state geometry on the map
      fetchStateGeojson(pathwayName, year)
        .then((data) => setStateZoneOverride(data?.geojson ?? null))
        .catch(() => setStateZoneOverride(null));
      queryClient.invalidateQueries();
    } catch {
      // silently fail
    } finally {
      setSwitching(false);
    }
  };

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
          setStateZoneOverride(null);
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Select
          className={
            selectedPathway ? 'cea-scenario-select-blue' : 'cea-scenario-select'
          }
          style={{ flex: 1 }}
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
            if (!value) setStateZoneOverride(null);
          }}
          onSelect={(value) => {
            if (value === selectedPathway) {
              setChildScenario(null);
              setStateZoneOverride(null);
            }
          }}
          allowClear
          notFoundContent={<small>No baked pathways</small>}
        />
        <InfoTooltip tooltipKey="pathway-viewer" placement="right" />
      </div>
      {selectedPathway && currentPathway && (
        <div
          ref={viewportRef}
          style={{
            width: '100%',
            height: TIMELINE_HEIGHT,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {switching ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
              }}
            >
              <Spin size="small" />
            </div>
          ) : (
            <div
              style={{
                width: contentWidth,
                minWidth: '100%',
                height: '100%',
                position: 'relative',
              }}
            >
              {/* Lane line — inset by fillet on both ends */}
              <div
                style={{
                  position: 'absolute',
                  left: LANE_PADDING,
                  right: LANE_PADDING + 14,
                  top: '55%',
                  height: 1.5,
                  background: '#8eb6dc',
                  borderRadius: 999,
                }}
              />
              {/* Right triangle arrow at right end */}
              <div
                style={{
                  position: 'absolute',
                  right: LANE_PADDING + 7,
                  top: '55%',
                  transform: 'translateY(-50%)',
                  width: 0,
                  height: 0,
                  borderTop: '5px solid transparent',
                  borderBottom: '5px solid transparent',
                  borderLeft: '7px solid #8eb6dc',
                }}
              />

              {/* Nodes */}
              {years.map((year) => {
                const phase = yearPhases[String(year)] ?? 'none';
                const progress = simulationProgress[selectedPathway];
                const isSimCompleted = progress?.completed?.includes(year);
                const isSimActive = progress?.active === year;
                const nodeFill = isSimCompleted
                  ? STATUS_FILL.simulated
                  : (STATUS_FILL[phase] ?? STATUS_FILL.none);
                const isActive =
                  childScenario?.year === year &&
                  childScenario?.pathway_name === selectedPathway;
                const showLabel = isActive || hoveredYear === year;

                return (
                  <div key={`${selectedPathway}-${year}`}>
                    {showLabel && (
                      <Text
                        style={{
                          position: 'absolute',
                          left: getYearOffset(year),
                          top: -4,
                          transform: 'translateX(-50%)',
                          fontSize: 11,
                          color: '#94A3B8',
                          whiteSpace: 'nowrap',
                          pointerEvents: 'none',
                        }}
                      >
                        {year}
                      </Text>
                    )}
                    <button
                      type="button"
                      onClick={() => handleNodeClick(selectedPathway, year)}
                      onMouseEnter={() => setHoveredYear(year)}
                      onMouseLeave={() => setHoveredYear(null)}
                      disabled={switching}
                      style={{
                        position: 'absolute',
                        left: getYearOffset(year),
                        top: '55%',
                        transform: 'translate(-50%, -50%)',
                        width: 10,
                        height: 10,
                        borderRadius: 999,
                        border: '2px solid #FFFFFF',
                        background: nodeFill,
                        cursor:
                          phase === 'baked' || phase === 'simulated'
                            ? 'pointer'
                            : 'default',
                        padding: 0,
                        boxShadow: isActive
                          ? '0 0 0 5px rgba(20, 112, 175, 0.14), 0 2px 4px rgba(15, 23, 42, 0.12)'
                          : '0 2px 4px rgba(15, 23, 42, 0.12)',
                      }}
                      className={isSimActive ? 'cea-node-breathing' : ''}
                      aria-label={`${selectedPathway} ${year}`}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
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
