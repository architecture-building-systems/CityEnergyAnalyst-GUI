import {
  Alert,
  Button,
  Divider,
  InputNumber,
  message,
  Modal,
  Spin,
  Typography,
} from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import InfoTooltip, { TooltipFromBackend } from 'components/InfoTooltip';
import { useInputs } from 'features/input-editor/hooks/queries/useInputs';
import { useMapStore, COLOR_MODES } from 'features/map/stores/mapStore';
import { getMainUseType } from 'features/map/utils/constructionColors';
import {
  BinAnimationIcon,
  CreateNewIcon,
  DuplicateIcon,
  RefreshIcon,
  RunIcon,
} from 'assets/icons';
import { useQueryClient } from '@tanstack/react-query';
import useJobsStore, { useCreateJob } from 'features/jobs/stores/jobsStore';
import { useProjectStore } from 'features/project/stores/projectStore';
import {
  toolTypes,
  useSetToolType,
  useToolCardStore,
} from 'features/project/stores/tool-card';

import 'features/project/components/Cards/OverviewCard/OverviewCard.css';
import DuplicatePathwayModal from 'features/project/components/modals/DuplicatePathwayModal';
import BuildingList from './BuildingList';
import LegendChip from './LegendChip';
import ModificationSummary from './ModificationSummary';
import PathwaySelect from './PathwaySelect';
import SectionCard from './SectionCard';
import TemplateSelect from './TemplateSelect';
import { pathwayOverviewQueryKey } from '../hooks/usePathwayOverview';
import { STATUS_ACCENT, STATUS_FILL } from '../constants';
import {
  formatCompactTimestamp,
  getErrorMessage,
  getNodeFill,
  getNodeSize,
  getTickStep,
  resolveSelectedYear,
} from '../utils';

import {
  applyTemplatesToYear,
  createPathway,
  deleteInterventionTemplate,
  deletePathway,
  deletePathwayYear,
  fetchBuildingLifecycle,
  fetchInterventionTemplate,
  fetchInterventionTemplates,
  fetchPathwayOverview,
  fetchPathwayTimeline,
  fetchStateGeojson,
  fetchTemplateUsage,
  fetchYearEditorOptions,
  preSaveBuildingEventsConfig,
  preSaveDefineTemplateConfig,
  preSaveSimulatePathwayConfig,
  saveYearYaml,
} from '../api';

const { Text, Title } = Typography;

const LANE_PADDING = 60;
const LABEL_COLUMN_WIDTH = 208;
const RULER_HEIGHT = 24;
const ACTIVE_LANE_HEIGHT = 48;
const MAX_VISIBLE_TIMELINE_LANES = 3;
// Minimum horizon for the shared ruler so sparse, near-term pathways still render against a
// long-term scale. Pathways that already run past this keep their own end year.
const MIN_TIMELINE_END_YEAR = 2100;

const PathwayPanel = ({
  open,
  project,
  scenarioName,
  expanded = false,
  onHidePanel,
}) => {
  const queryClient = useQueryClient();
  const createJob = useCreateJob();
  const jobs = useJobsStore((state) => state.jobs);
  const setToolType = useSetToolType();
  const setSelectedTool = useToolCardStore((state) => state.setSelectedTool);
  const simulationProgress = useProjectStore((s) => s.simulationProgress);
  const clearSimulationProgress = useProjectStore(
    (s) => s.clearSimulationProgress,
  );

  const { data: inputData } = useInputs();
  const colorMode = useMapStore((state) => state.colorMode);
  const constructionColorMap = useMapStore(
    (state) => state.constructionColorMap,
  );
  const useTypeColorMap = useMapStore((state) => state.useTypeColorMap);
  const setStateZoneOverride = useMapStore(
    (state) => state.setStateZoneOverride,
  );

  const buildingColorMap = useMemo(() => {
    const features = inputData?.geojsons?.zone?.features ?? [];
    const map = {};
    const isConstruction = colorMode === COLOR_MODES.CONSTRUCTION_STANDARD;
    const isUseType = colorMode === COLOR_MODES.USE_TYPE;
    if (!isConstruction && !isUseType) return map;
    features.forEach((f) => {
      const name = f?.properties?.name;
      if (!name) return;
      if (isConstruction) {
        const constType = f.properties.const_type;
        if (constType && constructionColorMap[constType]) {
          map[name] = constructionColorMap[constType];
        }
      } else {
        const mainUse = getMainUseType(f.properties);
        if (mainUse && useTypeColorMap[mainUse]) {
          map[name] = useTypeColorMap[mainUse];
        }
      }
    });
    return map;
  }, [inputData, colorMode, constructionColorMap, useTypeColorMap]);

  const scrollViewportRef = useRef(null);
  const viewportMeasureRef = useRef(null);
  const laneStackScrollRef = useRef(null);
  const pendingPreferredYearRef = useRef(null);
  const handledJobIdsRef = useRef(new Set());
  const selectedPathwayRef = useRef(null);
  const selectedYearRef = useRef(null);
  const selectedYearByPathwayRef = useRef({});

  const [overview, setOverview] = useState(null);
  const [timeline, setTimeline] = useState(null);
  const [selectedPathway, setSelectedPathway] = useState(null);
  const [visiblePathways, setVisiblePathways] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [viewportWidth, setViewportWidth] = useState(0);

  const [loadingOverview, setLoadingOverview] = useState(false);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [panelError, setPanelError] = useState(null);
  const [busyAction, setBusyAction] = useState(null);
  const [pendingPanelJob, setPendingPanelJob] = useState(null);

  const [newYearValue, setNewYearValue] = useState(null);

  const [templateNames, setTemplateNames] = useState([]);
  const [templateDescriptions, setTemplateDescriptions] = useState({});
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  const [selectedHeaderTemplates, setSelectedHeaderTemplates] = useState([]);

  const overviewPathways = overview?.pathways ?? [];
  const visibleSet = useMemo(() => new Set(visiblePathways), [visiblePathways]);
  const visibleOverviewPathways = useMemo(
    () => overviewPathways.filter((p) => visibleSet.has(p.pathway_name)),
    [overviewPathways, visibleSet],
  );
  const activeRows = timeline?.years ?? [];
  const activeRowByYear = useMemo(
    () => new Map(activeRows.map((row) => [row.year, row])),
    [activeRows],
  );
  const selectedRow = useMemo(() => {
    if (!activeRows.length) {
      return null;
    }
    return activeRows.find((row) => row.year === selectedYear) ?? null;
  }, [activeRows, selectedYear]);

  // Count rebuild cycles per building for the selected year's display
  const rebuildCounts = useMemo(() => {
    if (!selectedRow) return {};
    const result = {};
    // Count how many times each building was demolished before or at the selected year
    for (const row of activeRows) {
      if (row.year > selectedRow.year) break;
      const demolished = row?.building_events?.demolished_buildings ?? [];
      for (const b of demolished) {
        result[b] = (result[b] ?? 0) + 1;
      }
    }
    // Only keep counts where the building is also in new_buildings at the selected year
    // (meaning it was rebuilt after demolition)
    const newAtYear = new Set(
      selectedRow?.building_events?.new_buildings ?? [],
    );
    const filtered = {};
    for (const [b, count] of Object.entries(result)) {
      if (newAtYear.has(b) && count > 0) {
        filtered[b] = count;
      }
    }
    return filtered;
  }, [activeRows, selectedRow]);

  // Show state geometry on map when a baked/simulated node is selected
  useEffect(() => {
    const phase = selectedRow?.status?.primary_phase;
    if (
      selectedPathway &&
      selectedRow?.year != null &&
      (phase === 'baked' || phase === 'simulated')
    ) {
      fetchStateGeojson(selectedPathway, selectedRow.year)
        .then((data) => setStateZoneOverride(data?.geojson ?? null))
        .catch(() => setStateZoneOverride(null));
    } else {
      setStateZoneOverride(null);
    }
  }, [selectedPathway, selectedRow, setStateZoneOverride]);

  // Scale the shared ruler to the currently visible lanes rather than the global span the
  // backend reports (the union of every pathway). Otherwise a freshly created/launched pathway
  // would inherit the previous pathway's year range instead of showing its own.
  const visibleSpan = useMemo(() => {
    const years = visibleOverviewPathways.flatMap((p) => p.years ?? []);
    if (!years.length) {
      return null;
    }
    return { start_year: Math.min(...years), end_year: Math.max(...years) };
  }, [visibleOverviewPathways]);

  const span = visibleSpan ?? timeline?.span ?? overview?.span ?? {};
  const startYear = span?.start_year;
  // Extend the ruler to at least 2100 so sparse, near-term pathways still show a long-term
  // horizon; pathways that already run past 2100 keep their own end year.
  const endYear =
    span?.end_year != null
      ? Math.max(span.end_year, MIN_TIMELINE_END_YEAR)
      : span?.end_year;
  const yearRange = useMemo(() => {
    if (startYear == null || endYear == null) {
      return 1;
    }
    return Math.max(endYear - startYear, 1);
  }, [endYear, startYear]);

  const fitWidth = Math.max((viewportWidth || 860) - LANE_PADDING * 2, 240);
  const pxPerYear = fitWidth / yearRange;
  const contentWidth = LANE_PADDING * 2 + yearRange * pxPerYear;

  const getYearOffset = useCallback(
    (year) => {
      if (startYear == null) {
        return LANE_PADDING;
      }
      return LANE_PADDING + (year - startYear) * pxPerYear;
    },
    [pxPerYear, startYear],
  );

  const tickYears = useMemo(() => {
    if (startYear == null || endYear == null) {
      return [];
    }
    const step = getTickStep(pxPerYear);
    const ticks = new Set([startYear, endYear]);
    const firstTick = Math.ceil(startYear / step) * step;
    for (let year = firstTick; year <= endYear; year += step) {
      ticks.add(year);
    }
    return [...ticks].sort((left, right) => left - right);
  }, [endYear, pxPerYear, startYear]);

  const loadTimeline = useCallback(
    async (pathwayName, preferredYear = null) => {
      if (!pathwayName) {
        setTimeline(null);
        setSelectedYear(null);
        return null;
      }

      setLoadingTimeline(true);
      setPanelError(null);
      try {
        const data = await fetchPathwayTimeline(pathwayName);
        const timelineYears = (data?.years ?? []).map((row) => row.year);
        const currentYear =
          selectedPathwayRef.current === pathwayName
            ? selectedYearRef.current
            : null;
        const nextYear = resolveSelectedYear({
          years: timelineYears,
          preferredYear,
          pendingYear: pendingPreferredYearRef.current,
          currentYear,
          rememberedYear: selectedYearByPathwayRef.current[pathwayName] ?? null,
        });

        pendingPreferredYearRef.current = null;
        setTimeline(data);
        setSelectedPathway(pathwayName);
        setSelectedYear(nextYear);
        if (nextYear != null) {
          selectedYearByPathwayRef.current[pathwayName] = nextYear;
        }
        return data;
      } catch (error) {
        setPanelError(
          getErrorMessage(error, 'Failed to load pathway timeline.'),
        );
        setTimeline(null);
        return null;
      } finally {
        setLoadingTimeline(false);
      }
    },
    [],
  );

  const loadOverview = useCallback(
    async (preferredPathway = null, { exclusiveVisible = false } = {}) => {
      setLoadingOverview(true);
      setPanelError(null);
      try {
        // Fetch through the same query cache `usePathwayOverview` uses
        // (OverviewCard, Canvas Builder) instead of calling the raw API
        // directly -- concurrent calls to this key collapse into a single
        // network request instead of firing a duplicate. `staleTime: 0`
        // still forces a fresh fetch here (rather than serving a
        // pre-mutation cached value) whenever no fetch is already in
        // flight, and the result populates that shared cache too.
        const data = await queryClient.fetchQuery({
          queryKey: pathwayOverviewQueryKey(scenarioName),
          queryFn: fetchPathwayOverview,
          staleTime: 0,
        });
        setOverview(data);
        const pathwayNames = (data?.pathways ?? []).map(
          (item) => item.pathway_name,
        );
        const activePathway =
          (preferredPathway && pathwayNames.includes(preferredPathway)
            ? preferredPathway
            : null) ??
          (selectedPathwayRef.current &&
          pathwayNames.includes(selectedPathwayRef.current)
            ? selectedPathwayRef.current
            : null) ??
          pathwayNames[0] ??
          null;
        setSelectedPathway(activePathway);
        setVisiblePathways((prev) => {
          // After creating a new pathway, show only it so building events and interventions
          // (which target every visible lane) do not silently also apply to the old pathways.
          if (exclusiveVisible) {
            return activePathway ? [activePathway] : [];
          }
          if (prev.length > 0) {
            const kept = prev.filter((p) => pathwayNames.includes(p));
            if (activePathway && !kept.includes(activePathway)) {
              kept.push(activePathway);
            }
            return kept;
          }
          return activePathway ? [activePathway] : [];
        });
        return activePathway;
      } catch (error) {
        setPanelError(getErrorMessage(error, 'Failed to load pathways.'));
        setOverview(null);
        setSelectedPathway(null);
        setVisiblePathways([]);
        return null;
      } finally {
        setLoadingOverview(false);
      }
    },
    [queryClient, scenarioName],
  );

  const loadTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    try {
      const { names, descriptions } = await fetchInterventionTemplates();
      setTemplateNames(names);
      setTemplateDescriptions(descriptions);
    } catch {
      setTemplateNames([]);
      setTemplateDescriptions({});
    } finally {
      setLoadingTemplates(false);
    }
  }, []);

  const refreshPathwayData = useCallback(
    async ({
      preferredPathway = selectedPathwayRef.current,
      preferredYear = selectedYearRef.current,
      exclusiveVisible = false,
    } = {}) => {
      setBuildingLifecycleData(null);
      const activePathway = await loadOverview(preferredPathway, {
        exclusiveVisible,
      });
      if (!activePathway) {
        setTimeline(null);
        setSelectedYear(null);
        await loadTemplates();
        return;
      }
      await Promise.all([
        loadTimeline(activePathway, preferredYear),
        loadTemplates(),
      ]);
    },
    [loadOverview, loadTimeline, loadTemplates],
  );

  const startPanelJob = useCallback(
    async ({
      script,
      parameters,
      busyKey,
      failedToStartMessage,
      failureMessage,
      preferredPathway = null,
      preferredYear = null,
      // Fired via message.info() the moment the job is *created* (not
      // completed) -- distinct from the button's `busyAction` spinner, which
      // this helper keeps active for the job's full run via
      // `pendingPanelJob`. Genuinely long-running panel jobs (bake) pass
      // this so there's an explicit "this started a background job" signal
      // beyond the spinner alone.
      startingMessage,
    }) => {
      setBusyAction(busyKey);
      try {
        // Every panel job operates on the parent scenario's outputs/pathways/...
        // tree, regardless of which child pathway state is active in the map/canvas
        // (X-CEA-Child-Scenario). Pin the headers explicitly rather than relying on
        // activeScenarioHeaders()'s default, which would follow the active child
        // scenario and point the job at the wrong folder. The backend resolves
        // parameters.scenario from these headers -- the client no longer computes it.
        const job = await createJob(script, parameters, {
          project,
          scenarioName,
          childScenario: null,
        });
        if (startingMessage) message.info(startingMessage);
        setPanelError(null);
        setPendingPanelJob({
          id: job.id,
          busyKey,
          preferredPathway,
          preferredYear,
          failureMessage,
        });
        return job;
      } catch (error) {
        setBusyAction(null);
        setPanelError(
          getErrorMessage(
            error,
            failedToStartMessage ?? 'Failed to start job.',
          ),
        );
        return null;
      }
    },
    [createJob, project, scenarioName],
  );

  // Non-job pathway mutations (fast, synchronous REST calls) share this
  // shape instead: drive the same `busyAction` spinner buttons already read,
  // refresh on success, surface errors through the panel's persistent
  // `panelError` alert. No toast on success -- the data refresh itself is
  // the success signal, matching the panel's existing non-job action
  // (handleDeleteTemplate) rather than introducing a new convention.
  //
  // Unlike startPanelJob, this helper does NOT pin the scenario context for
  // you -- each `action` must pass `{ project, scenarioName, childScenario:
  // null }` explicitly to the pathway/api.js call it wraps (see call sites
  // below), or the request falls back to activeScenarioHeaders() and will
  // silently follow whatever child pathway state happens to be active.
  const runPathwayAction = useCallback(
    async ({ busyKey, action, refresh, failureMessage }) => {
      setBusyAction(busyKey);
      try {
        await action();
        setPanelError(null);
        await refresh?.();
      } catch (error) {
        setPanelError(getErrorMessage(error, failureMessage));
      } finally {
        setBusyAction(null);
      }
    },
    [],
  );

  const handleSelectPathway = useCallback(
    async (pathwayName, preferredYear = null) => {
      if (!pathwayName || pathwayName === selectedPathwayRef.current) {
        if (preferredYear != null) {
          selectedYearByPathwayRef.current[pathwayName] = preferredYear;
          setSelectedYear(preferredYear);
        }
        return;
      }
      pendingPreferredYearRef.current = preferredYear;
      await loadTimeline(pathwayName, preferredYear);
    },
    [loadTimeline],
  );

  const handleToggleVisible = useCallback(
    (pathwayName) => {
      setVisiblePathways((prev) => {
        const isVisible = prev.includes(pathwayName);
        if (isVisible) {
          const next = prev.filter((p) => p !== pathwayName);
          if (selectedPathwayRef.current === pathwayName && next.length > 0) {
            void handleSelectPathway(next[0]);
          }
          return next;
        }
        return [...prev, pathwayName];
      });
    },
    [handleSelectPathway],
  );

  useEffect(() => {
    selectedPathwayRef.current = selectedPathway;
  }, [selectedPathway]);

  useEffect(() => {
    selectedYearRef.current = selectedYear;
    if (selectedPathway && selectedYear != null) {
      selectedYearByPathwayRef.current[selectedPathway] = selectedYear;
    }
  }, [selectedPathway, selectedYear]);

  useEffect(() => {
    setOverview(null);
    setTimeline(null);
    setSelectedPathway(null);
    setVisiblePathways([]);
    setSelectedYear(null);
    setPendingPanelJob(null);
    pendingPreferredYearRef.current = null;
    handledJobIdsRef.current = new Set();
    selectedPathwayRef.current = null;
    selectedYearRef.current = null;
    selectedYearByPathwayRef.current = {};
  }, [project, scenarioName]);

  useEffect(() => {
    if (!open || !scenarioName) {
      return;
    }
    void refreshPathwayData();
  }, [open, refreshPathwayData, scenarioName]);

  useEffect(() => {
    const element = viewportMeasureRef.current;
    if (!element) {
      return undefined;
    }

    const updateWidth = () => {
      setViewportWidth(element.clientWidth);
    };

    updateWidth();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateWidth);
      return () => window.removeEventListener('resize', updateWidth);
    }

    const observer = new ResizeObserver(() => updateWidth());
    observer.observe(element);
    return () => observer.disconnect();
  }, [open]);

  useEffect(() => {
    if (
      selectedYear == null ||
      !scrollViewportRef.current ||
      startYear == null
    ) {
      return;
    }

    const viewport = scrollViewportRef.current;
    const targetLeft = getYearOffset(selectedYear) - viewport.clientWidth / 2;
    const boundedLeft = Math.max(
      0,
      Math.min(targetLeft, contentWidth - viewport.clientWidth),
    );

    viewport.scrollTo({
      left: boundedLeft,
      behavior: 'smooth',
    });
  }, [contentWidth, getYearOffset, selectedPathway, selectedYear, startYear]);

  useEffect(() => {
    if (!open || !jobs) {
      return;
    }

    const relevantJobs = Object.entries(jobs)
      .map(([id, job]) => ({ id, ...job }))
      .filter(
        (job) =>
          job.state === 2 &&
          job.scenario_name === scenarioName &&
          // pathway-delete-pathway and pathway-events-apply-templates now run as
          // direct REST calls (see runPathwayAction) and never appear as jobs.
          [
            'bake-pathway-states',
            'pathway-intervention-templates-define',
            'pathway-simulations',
            'pathway-update-building-events',
          ].includes(job.script),
      );

    let needsRefresh = false;
    relevantJobs.forEach((job) => {
      if (handledJobIdsRef.current.has(job.id)) {
        return;
      }
      handledJobIdsRef.current.add(job.id);
      needsRefresh = true;
    });

    if (needsRefresh) {
      clearSimulationProgress();
      const pendingYear = pendingPreferredYearRef.current;
      void refreshPathwayData(
        pendingYear != null ? { preferredYear: pendingYear } : undefined,
      );
    }
  }, [jobs, open, refreshPathwayData, scenarioName, selectedPathway]);

  // Auto-select the year currently being simulated so the user can view it
  useEffect(() => {
    if (!selectedPathway) return;
    const progress = simulationProgress[selectedPathway];
    if (progress?.active != null) {
      setSelectedYear(progress.active);
    }
  }, [simulationProgress, selectedPathway]);

  useEffect(() => {
    if (!pendingPanelJob || !jobs) {
      return;
    }

    const job = jobs[pendingPanelJob.id];
    if (!job) {
      return;
    }

    if (job.state === 2) {
      setPanelError(null);
      void refreshPathwayData({
        preferredPathway:
          pendingPanelJob.preferredPathway ?? selectedPathwayRef.current,
        preferredYear: pendingPanelJob.preferredYear,
      });
      setPendingPanelJob(null);
      setBusyAction(null);
      return;
    }

    if ([3, 4, 5].includes(job.state)) {
      setPanelError(
        pendingPanelJob.failureMessage ??
          'The pathway job failed. Open Job Info in the status bar for details.',
      );
      void refreshPathwayData();
      setPendingPanelJob(null);
      setBusyAction(null);
    }
  }, [jobs, pendingPanelJob, refreshPathwayData]);

  const activeValidationIssues = selectedRow?.validation?.issues ?? [];
  const globalValidationIssues = timeline?.validation?.issues ?? [];

  const handleRunPathwayJob = async (scriptName) => {
    if (!selectedPathway || !scenarioName) {
      setPanelError('Select a scenario and pathway first.');
      return;
    }

    try {
      await preSaveSimulatePathwayConfig(selectedPathway);
      await queryClient.invalidateQueries({
        queryKey: ['toolParams', scriptName],
      });
      onHidePanel?.();
      setSelectedTool(scriptName);
      setToolType(toolTypes.TOOLS);
      setPanelError(null);
    } catch (error) {
      setPanelError(getErrorMessage(error, 'Failed to open simulation tool.'));
    }
  };

  const handleAddYear = async () => {
    if (!visiblePathways.length) {
      setPanelError('Select a pathway first.');
      return;
    }
    if (newYearValue == null) {
      setPanelError('Enter the year you want to add.');
      return;
    }

    try {
      await preSaveBuildingEventsConfig(visiblePathways, Number(newYearValue));
      await queryClient.invalidateQueries({
        queryKey: ['toolParams', 'pathway-update-building-events'],
      });
      pendingPreferredYearRef.current = Number(newYearValue);
      onHidePanel?.();
      setSelectedTool('pathway-update-building-events');
      setToolType(toolTypes.TOOLS);
      setPanelError(null);
    } catch (error) {
      setPanelError(
        getErrorMessage(error, 'Failed to open building events tool.'),
      );
    }
  };

  const handleApplyIntervention = async () => {
    if (
      !selectedHeaderTemplates.length ||
      newYearValue == null ||
      !visiblePathways.length
    ) {
      return;
    }

    const targetYear = Number(newYearValue);
    await runPathwayAction({
      busyKey: 'apply-intervention',
      // One fast REST call per visible pathway lane -- mirrors the job
      // script's own server-side loop over existing_pathway_names.
      action: () =>
        Promise.all(
          visiblePathways.map((pathwayName) =>
            applyTemplatesToYear(
              pathwayName,
              targetYear,
              selectedHeaderTemplates,
              { project, scenarioName, childScenario: null },
            ),
          ),
        ),
      refresh: () =>
        refreshPathwayData({
          preferredPathway: selectedPathway,
          preferredYear: targetYear,
        }),
      failureMessage: 'Failed to apply the intervention.',
    });
    setNewYearValue(null);
  };

  const handleCopyState = async () => {
    if (!selectedPathway || !selectedRow || newYearValue == null) {
      return;
    }

    const targetYear = Number(newYearValue);
    // Reuse the year's expert-YAML round-trip: read the selected state's full entry, then
    // write it under the target year (saving revalidates the resulting log).
    let rawYaml;
    try {
      const options = await fetchYearEditorOptions(
        selectedPathway,
        selectedRow.year,
      );
      rawYaml = options?.yaml_preview;
    } catch (error) {
      setPanelError(getErrorMessage(error, 'Failed to copy state.'));
      return;
    }
    if (!rawYaml || !rawYaml.trim()) {
      setPanelError('The selected state has no content to copy.');
      return;
    }

    await runPathwayAction({
      busyKey: 'copy-state',
      action: () =>
        saveYearYaml(selectedPathway, targetYear, rawYaml, {
          project,
          scenarioName,
          childScenario: null,
        }),
      refresh: () =>
        refreshPathwayData({
          preferredPathway: selectedPathway,
          preferredYear: targetYear,
        }),
      failureMessage: 'Failed to copy state.',
    });
    setNewYearValue(null);
  };

  const handleDeletePathwayByName = (pathwayName) => {
    if (!pathwayName || !scenarioName) {
      return;
    }

    Modal.confirm({
      title: `Delete pathway '${pathwayName}'?`,
      content:
        'This removes the pathway log, intervention templates, baked states, simulation outputs, and saved state-status records for this pathway. This cannot be undone.',
      okText: 'Delete pathway',
      okButtonProps: {
        danger: true,
      },
      onOk: async () => {
        await runPathwayAction({
          busyKey: 'delete-pathway',
          action: () =>
            deletePathway(pathwayName, {
              project,
              scenarioName,
              childScenario: null,
            }),
          refresh: () =>
            refreshPathwayData({
              preferredPathway:
                pathwayName === selectedPathway ? null : selectedPathway,
              preferredYear: null,
            }),
          failureMessage: 'Failed to delete the pathway.',
        });
      },
    });
  };

  const [duplicateTarget, setDuplicateTarget] = useState(null);

  const handleDuplicatePathwayByName = (pathwayName) => {
    setDuplicateTarget(pathwayName);
  };

  const handleDuplicated = useCallback(
    (newName) => {
      setDuplicateTarget(null);
      setVisiblePathways((prev) =>
        prev.includes(newName) ? prev : [...prev, newName],
      );
      void refreshPathwayData({ preferredPathway: newName });
    },
    [refreshPathwayData],
  );

  const handleStartCreatePathway = () => {
    Modal.confirm({
      title: 'Create Pathway',
      content: (
        <div style={{ paddingTop: 8 }}>
          <input
            id="cea-new-pathway-input"
            placeholder="new_pathway_name"
            style={{
              width: '100%',
              padding: '4px 11px',
              borderRadius: 6,
              border: '1px solid #d9d9d9',
              fontSize: 14,
              boxSizing: 'border-box',
            }}
          />
        </div>
      ),
      okText: 'Create',
      onOk: async () => {
        const input = document.getElementById('cea-new-pathway-input');
        const name = input?.value?.trim();
        if (!name) {
          setPanelError('Enter a pathway name first.');
          return Promise.reject();
        }
        if (!scenarioName) {
          setPanelError('Scenario is not ready yet. Please try again.');
          return Promise.reject();
        }
        await runPathwayAction({
          busyKey: 'create-pathway',
          action: () =>
            createPathway(name, { project, scenarioName, childScenario: null }),
          refresh: () =>
            refreshPathwayData({
              preferredPathway: name,
              exclusiveVisible: true,
            }),
          failureMessage: 'Failed to create the pathway.',
        });
      },
    });
  };

  const handleDeleteSelectedYear = () => {
    if (!selectedRow || !selectedPathway) {
      return;
    }

    const destructiveLabel = selectedRow.can_clear_manual_changes
      ? 'Clear manual changes'
      : 'Delete state';

    Modal.confirm({
      title: `${destructiveLabel} for ${selectedRow.year}?`,
      content: selectedRow.can_clear_manual_changes
        ? 'Stock-driven content will stay visible, but the manual edits for this year will be removed.'
        : 'This removes the explicit pathway entry and any stored state status for the selected year.',
      okText: destructiveLabel,
      okButtonProps: {
        danger: true,
      },
      onOk: async () => {
        await runPathwayAction({
          busyKey: 'delete-year',
          action: () =>
            deletePathwayYear(selectedPathway, selectedRow.year, {
              project,
              scenarioName,
              childScenario: null,
            }),
          refresh: () =>
            refreshPathwayData({
              preferredPathway: selectedPathway,
              preferredYear: selectedRow.year,
            }),
          failureMessage: `Failed to ${destructiveLabel.toLowerCase()}.`,
        });
      },
    });
  };

  const handleOpenTemplateTool = () => {
    setSelectedTool('pathway-intervention-templates-define');
    setToolType(toolTypes.TOOLS);
  };

  const handleEditTemplate = async (templateName) => {
    if (!templateName) {
      return;
    }

    const openForm = async (configPayload) => {
      try {
        await preSaveDefineTemplateConfig(configPayload);
        setSelectedHeaderTemplates((current) =>
          current.includes(templateName) ? current : [...current, templateName],
        );
        handleOpenTemplateTool();
        // The define form caches its parameters per script name. Switching templates does
        // not change the script, so force a refetch to reload the freshly-saved values into
        // an already-open form. This resets the form, discarding any unsaved edits — matching
        // how every CEA tool form behaves when its data reloads.
        await queryClient.invalidateQueries({
          queryKey: ['toolParams', 'pathway-intervention-templates-define'],
        });
      } catch (error) {
        setPanelError(
          getErrorMessage(
            error,
            'Failed to open intervention template for editing.',
          ),
        );
      }
    };

    let template;
    try {
      template = await fetchInterventionTemplate(templateName);
    } catch (error) {
      setPanelError(
        getErrorMessage(error, 'Failed to load intervention template.'),
      );
      return;
    }

    const configPayload = template?.config ?? {};

    if (template?.diverged) {
      Modal.confirm({
        title: `Edit template '${templateName}'?`,
        content:
          'This template applies different changes to different construction types, which the edit form cannot show. ' +
          'Opening it for editing will use the first construction type’s values for all of them. Saving will overwrite the others.',
        okText: 'Edit anyway',
        onOk: () => openForm(configPayload),
      });
      return;
    }

    await openForm(configPayload);
  };

  const handleDeleteTemplate = async (templateName) => {
    if (!templateName) {
      return;
    }

    // Best-effort: warn if this template's changes appear in any pathway-year. A scan failure
    // must never block deletion, so fall back to an empty list on error.
    let usage = [];
    try {
      usage = await fetchTemplateUsage(templateName);
    } catch {
      usage = [];
    }

    let usageNote = null;
    if (usage.length > 0) {
      const byPathway = usage.reduce((acc, { pathway, year }) => {
        (acc[pathway] = acc[pathway] || []).push(year);
        return acc;
      }, {});
      const summary = Object.entries(byPathway)
        .map(
          ([pathway, years]) =>
            `${pathway} (${years.sort((a, b) => a - b).join(', ')})`,
        )
        .join('; ');
      usageNote = (
        <p style={{ marginTop: 8 }}>
          Changes matching this template appear in{' '}
          <strong>{usage.length}</strong> pathway year
          {usage.length === 1 ? '' : 's'}: {summary}. Those years keep their own
          copy and are <strong>not</strong> affected by deleting the template.
        </p>
      );
    }

    Modal.confirm({
      title: `Delete template '${templateName}'?`,
      content: (
        <>
          <p style={{ margin: 0 }}>
            This removes the intervention template definition. This cannot be
            undone.
          </p>
          {usageNote}
        </>
      ),
      okText: 'Delete template',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteInterventionTemplate(templateName);
          // Drop the deleted template from the selection so it doesn't linger as a
          // dangling value in the dropdown.
          setSelectedHeaderTemplates((current) =>
            current.filter((name) => name !== templateName),
          );
          await loadTemplates();
        } catch (error) {
          setPanelError(
            getErrorMessage(error, 'Failed to delete intervention template.'),
          );
        }
      },
    });
  };

  const buildingLifecycleData = useToolCardStore(
    (state) => state.buildingLifecycleData,
  );
  const setBuildingLifecycleData = useToolCardStore(
    (state) => state.setBuildingLifecycleData,
  );
  const setStoreVisiblePathways = useToolCardStore(
    (state) => state.setVisiblePathways,
  );

  // Sync visible pathways to tool card store
  useEffect(() => {
    setStoreVisiblePathways(visiblePathways);
  }, [visiblePathways, setStoreVisiblePathways]);

  // Refresh lifecycle card when visible pathways change
  useEffect(() => {
    const currentBuilding = buildingLifecycleData?.building_name;
    if (!currentBuilding || !visiblePathways.length) return;
    fetchBuildingLifecycle(currentBuilding, visiblePathways)
      .then(setBuildingLifecycleData)
      .catch(() => {});
  }, [visiblePathways, setBuildingLifecycleData]);

  const handleBuildingClick = async (buildingName) => {
    if (!visiblePathways.length) return;
    try {
      const data = await fetchBuildingLifecycle(buildingName, visiblePathways);
      setBuildingLifecycleData(data);
      setToolType(toolTypes.BUILDING_INFO);
    } catch (error) {
      setPanelError(
        getErrorMessage(error, 'Failed to load building lifecycle.'),
      );
    }
  };

  const handleBakePathway = async (pathwayName) => {
    if (!pathwayName || !scenarioName) return;
    // Bake is the one pathway action that stays on the job system -- it
    // rebuilds a full scenario-inputs copy per state year, genuinely slow
    // for a real scenario. Route through startPanelJob (not a raw
    // createJob) so busyAction/pendingPanelJob track it through to actual
    // completion, not just job creation, and so the starting toast fires.
    await startPanelJob({
      script: 'bake-pathway-states',
      parameters: { existing_pathway_name: pathwayName },
      busyKey: `bake-${pathwayName}`,
      startingMessage:
        'Baking pathway states — this can take a while. Track progress in Job Info.',
      failedToStartMessage: 'Failed to start the bake job.',
      failureMessage:
        'Baking pathway states failed. Open Job Info in the status bar for details.',
      preferredPathway: pathwayName,
    });
  };

  const totalTimelineHeight =
    RULER_HEIGHT + visibleOverviewPathways.length * ACTIVE_LANE_HEIGHT;
  const timelineViewportHeight = Math.min(
    totalTimelineHeight,
    RULER_HEIGHT +
      ACTIVE_LANE_HEIGHT *
        Math.min(visibleOverviewPathways.length, MAX_VISIBLE_TIMELINE_LANES),
  );

  useEffect(() => {
    const viewport = laneStackScrollRef.current;
    if (
      !viewport ||
      !selectedPathway ||
      visibleOverviewPathways.length <= MAX_VISIBLE_TIMELINE_LANES
    ) {
      return;
    }

    const selectedIndex = visibleOverviewPathways.findIndex(
      (pathway) => pathway.pathway_name === selectedPathway,
    );
    if (selectedIndex < 0) {
      return;
    }

    const laneTop = RULER_HEIGHT + selectedIndex * ACTIVE_LANE_HEIGHT;
    const laneBottom = laneTop + ACTIVE_LANE_HEIGHT;
    const visibleTop = viewport.scrollTop;
    const visibleBottom = visibleTop + viewport.clientHeight;

    if (laneTop < visibleTop) {
      viewport.scrollTo({
        top: Math.max(laneTop - 8, 0),
        behavior: 'smooth',
      });
      return;
    }

    if (laneBottom > visibleBottom) {
      viewport.scrollTo({
        top: Math.max(laneBottom - viewport.clientHeight + 8, 0),
        behavior: 'smooth',
      });
    }
  }, [visibleOverviewPathways, selectedPathway]);

  const allPathwayNames = useMemo(
    () => overviewPathways.map((p) => p.pathway_name),
    [overviewPathways],
  );

  return (
    <>
      <DuplicatePathwayModal
        visible={duplicateTarget != null}
        setVisible={(v) => {
          if (!v) setDuplicateTarget(null);
        }}
        currentPathwayName={duplicateTarget ?? ''}
        existingPathwayNames={allPathwayNames}
        onDuplicated={handleDuplicated}
      />
      <div
        style={{
          minHeight: 290,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          padding: expanded ? '8px 16px 20px' : '4px 12px 16px',
          background: '#FFFFFF',
          overflow: 'hidden',
          borderRadius: 'inherit',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Pathway Builder</h2>
          <InfoTooltip tooltipKey="pathway-builder" placement="right" />
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) auto',
            gap: 16,
            alignItems: 'start',
            paddingBottom: 8,
            borderBottom: '1px solid rgba(148, 163, 184, 0.2)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              minWidth: 0,
            }}
          >
            <PathwaySelect
              selectedPathway={selectedPathway}
              visiblePathways={visiblePathways}
              overviewPathways={overviewPathways}
              onToggleVisible={handleToggleVisible}
              onDeletePathway={handleDeletePathwayByName}
              onDuplicatePathway={handleDuplicatePathwayByName}
              onCreatePathway={handleStartCreatePathway}
              loading={loadingOverview}
              allBaked={
                activeRows.length > 0 &&
                activeRows.every((row) => {
                  const phase = row?.status?.primary_phase ?? 'none';
                  return phase === 'baked' || phase === 'simulated';
                })
              }
            />
            <div className="cea-card-icon-button-container">
              <TooltipFromBackend
                tooltipKey="create-new-pathway"
                placement="bottom"
              >
                <Button
                  icon={<CreateNewIcon />}
                  type="text"
                  loading={busyAction === 'create-pathway'}
                  disabled={!scenarioName}
                  onClick={handleStartCreatePathway}
                />
              </TooltipFromBackend>
            </div>
            <Divider type="vertical" style={{ height: 24, margin: 0 }} />
            <TemplateSelect
              templates={templateNames}
              descriptions={templateDescriptions}
              selectedTemplates={selectedHeaderTemplates}
              onSelectTemplates={setSelectedHeaderTemplates}
              onEditTemplate={handleEditTemplate}
              onDeleteTemplate={handleDeleteTemplate}
              onCreateTemplate={handleOpenTemplateTool}
              loading={loadingTemplates}
            />
            <div className="cea-card-icon-button-container">
              <TooltipFromBackend
                tooltipKey="define-intervention-template"
                placement="bottom"
              >
                <Button
                  icon={<CreateNewIcon />}
                  type="text"
                  onClick={handleOpenTemplateTool}
                />
              </TooltipFromBackend>
            </div>
            <InfoTooltip tooltipKey="intervention-templates" />
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: 8,
              flexShrink: 0,
              maxWidth: '100%',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                flexWrap: 'wrap',
                justifyContent: 'flex-end',
              }}
            >
              {loadingTimeline ? (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    color: '#64748B',
                    fontSize: 12,
                  }}
                >
                  <Spin size="small" />
                  Refreshing active pathway
                </span>
              ) : null}
              <div className="cea-card-icon-button-container">
                <TooltipFromBackend
                  tooltipKey="refresh-pathway"
                  placement="bottom"
                >
                  <Button
                    icon={<RefreshIcon />}
                    type="text"
                    loading={loadingOverview || loadingTimeline}
                    onClick={() => refreshPathwayData()}
                  />
                </TooltipFromBackend>
              </div>
              <Button
                type="primary"
                disabled={
                  !selectedPathway ||
                  visiblePathways.length > 1 ||
                  !activeRows.length ||
                  activeRows.some((row) => {
                    if (row?.status?.has_stale_phase) return true;
                    const phase = row?.status?.primary_phase ?? 'none';
                    return (
                      phase !== 'baked' &&
                      phase !== 'simulated' &&
                      phase !== 'custom'
                    );
                  })
                }
                loading={busyAction === 'pathway-simulations'}
                onClick={() => handleRunPathwayJob('pathway-simulations')}
              >
                {busyAction === 'pathway-simulations' ? (
                  'Starting job...'
                ) : (
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                  >
                    Simulate Pathway
                    <RunIcon style={{ fontSize: 18 }} />
                  </div>
                )}
              </Button>
              <InfoTooltip tooltipKey="simulate-pathway" />
            </div>
          </div>
        </div>

        <div
          style={{
            minHeight: 0,
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            paddingRight: 2,
          }}
        >
          {panelError ? (
            <Alert
              type="error"
              showIcon
              message={panelError}
              style={{ borderRadius: 12 }}
            />
          ) : null}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 14,
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  flexWrap: 'wrap',
                }}
              >
                <InputNumber
                  placeholder="2050"
                  precision={0}
                  value={newYearValue}
                  onChange={setNewYearValue}
                  style={{ width: 96, flexShrink: 0 }}
                  disabled={!selectedPathway}
                />
                {selectedHeaderTemplates.length ? (
                  <Button
                    type="primary"
                    icon={<CreateNewIcon />}
                    disabled={!visiblePathways.length || newYearValue == null}
                    loading={busyAction === 'apply-intervention'}
                    onClick={handleApplyIntervention}
                  >
                    {selectedHeaderTemplates.length > 1
                      ? `Apply ${selectedHeaderTemplates.length} Interventions`
                      : 'Apply Selected Intervention'}
                  </Button>
                ) : (
                  <Button
                    type="primary"
                    icon={<CreateNewIcon />}
                    disabled={!selectedPathway || newYearValue == null}
                    loading={busyAction === 'add-year'}
                    onClick={handleAddYear}
                  >
                    Create Building Event
                  </Button>
                )}
                {selectedRow ? (
                  <Button
                    icon={<DuplicateIcon />}
                    disabled={!selectedPathway || newYearValue == null}
                    loading={busyAction === 'copy-state'}
                    onClick={handleCopyState}
                  >
                    Copy State
                  </Button>
                ) : null}
                {selectedRow &&
                (selectedRow.can_delete ||
                  selectedRow.can_clear_manual_changes) ? (
                  <Button
                    danger
                    icon={<BinAnimationIcon />}
                    disabled={!selectedPathway}
                    loading={busyAction === 'delete-year'}
                    onClick={handleDeleteSelectedYear}
                  >
                    {selectedRow.can_clear_manual_changes
                      ? 'Clear Manual Changes'
                      : 'Delete State'}
                  </Button>
                ) : null}
                <InfoTooltip tooltipKey="add-building-event-or-intervention" />
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: 14,
                  flexWrap: 'wrap',
                  alignItems: 'center',
                }}
              >
                <LegendChip colour={STATUS_FILL.none} label="Draft" />
                <LegendChip colour={STATUS_FILL.baked} label="Baked" />
                <LegendChip colour={STATUS_FILL.custom} label="Custom" />
                <LegendChip colour={STATUS_FILL.simulated} label="Simulated" />
                <LegendChip
                  colour={STATUS_ACCENT.error}
                  label="Stale (re-bake needed)"
                />
              </div>
            </div>

            <div
              style={{
                border: '1px solid rgba(148, 163, 184, 0.22)',
                borderRadius: 18,
                background: '#f7f7f7',
                overflow: 'hidden',
              }}
            >
              {loadingOverview && !overview ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: 72,
                  }}
                >
                  <Spin />
                </div>
              ) : visibleOverviewPathways.length === 0 ? (
                <div
                  style={{
                    height: RULER_HEIGHT + ACTIVE_LANE_HEIGHT,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: '#94A3B8', fontSize: 12 }}>
                    Create or select a Pathway
                  </Text>
                </div>
              ) : (
                <div
                  ref={laneStackScrollRef}
                  style={{
                    maxHeight: timelineViewportHeight,
                    overflowY:
                      totalTimelineHeight > timelineViewportHeight
                        ? 'auto'
                        : 'hidden',
                  }}
                >
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: `${LABEL_COLUMN_WIDTH}px minmax(0, 1fr) auto`,
                      minHeight: totalTimelineHeight,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        borderRight: '1px solid rgba(148, 163, 184, 0.18)',
                        background: '#f7f7f7',
                      }}
                    >
                      <div
                        style={{
                          height: RULER_HEIGHT,
                          padding: '0 16px',
                          display: 'flex',
                          alignItems: 'flex-end',
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            letterSpacing: 1,
                            color: '#64748B',
                          }}
                        >
                          Pathways
                        </Text>
                      </div>

                      {visibleOverviewPathways.map((pathway) => (
                        <div
                          key={`label-${pathway.pathway_name}`}
                          style={{
                            height: ACTIVE_LANE_HEIGHT,
                            padding: '0 16px',
                            background: 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            width: '100%',
                            boxSizing: 'border-box',
                            borderBottom: '1px solid rgba(148, 163, 184, 0.08)',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 8,
                              width: '100%',
                              minWidth: 0,
                            }}
                          >
                            <div
                              style={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                fontWeight: 600,
                                color: '#0F172A',
                              }}
                            >
                              {pathway.pathway_name}
                            </div>
                            <Text style={{ fontSize: 11, color: '#94A3B8' }}>
                              {pathway.state_count}
                            </Text>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div
                      ref={viewportMeasureRef}
                      style={{ minWidth: 0, minHeight: 0, overflow: 'hidden' }}
                    >
                      <div
                        ref={scrollViewportRef}
                        style={{
                          minWidth: 0,
                          maxWidth: '100%',
                          overflowX: 'auto',
                          overflowY: 'hidden',
                          cursor: 'default',
                        }}
                      >
                        <div style={{ width: contentWidth, minWidth: '100%' }}>
                          <div
                            style={{
                              position: 'relative',
                              height: RULER_HEIGHT,
                            }}
                          >
                            {tickYears.map((year) => (
                              <div
                                key={`tick-${year}`}
                                style={{
                                  position: 'absolute',
                                  left: getYearOffset(year),
                                  top: 0,
                                  transform: 'translateX(-50%)',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  gap: 0,
                                }}
                              >
                                <span
                                  style={{
                                    width: 1,
                                    height: 10,
                                    background: 'rgba(100, 116, 139, 0.32)',
                                  }}
                                />
                                <Text
                                  style={{ fontSize: 11, color: '#64748B' }}
                                >
                                  {year}
                                </Text>
                              </div>
                            ))}
                          </div>

                          {visibleOverviewPathways.map((pathway) => {
                            const isActive =
                              pathway.pathway_name === selectedPathway;
                            const laneYears = isActive
                              ? activeRows.map((row) => row.year)
                              : (pathway.years ?? []);

                            return (
                              <div
                                key={`lane-${pathway.pathway_name}`}
                                style={{
                                  position: 'relative',
                                  height: ACTIVE_LANE_HEIGHT,
                                  boxSizing: 'border-box',
                                  background: 'transparent',
                                  borderBottom:
                                    '1px solid rgba(148, 163, 184, 0.08)',
                                }}
                              >
                                <div
                                  style={{
                                    position: 'absolute',
                                    left: LANE_PADDING,
                                    right: LANE_PADDING,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    height: 1,
                                    background: '#8eb6dc',
                                    borderRadius: 999,
                                  }}
                                />
                                {laneYears.map((year) => {
                                  const row = isActive
                                    ? activeRowByYear.get(year)
                                    : null;
                                  const nodeSize = getNodeSize(row, true);
                                  const selected =
                                    isActive && selectedYear === year;
                                  const validationError =
                                    isActive &&
                                    row?.validation?.status === 'error';
                                  const overviewPhase =
                                    pathway.year_phases?.[String(year)];
                                  const progress =
                                    simulationProgress[pathway.pathway_name];
                                  const isSimCompleted =
                                    progress?.completed?.includes(year);
                                  const isSimActive = progress?.active === year;
                                  const nodeFill = isSimCompleted
                                    ? STATUS_FILL.simulated
                                    : isActive
                                      ? validationError
                                        ? STATUS_ACCENT.error
                                        : getNodeFill(row)
                                      : (STATUS_FILL[overviewPhase] ??
                                        '#CBD5E1');

                                  return (
                                    <button
                                      key={`${pathway.pathway_name}-${year}`}
                                      type="button"
                                      className={
                                        isSimActive ? 'cea-node-breathing' : ''
                                      }
                                      onClick={() => {
                                        void handleSelectPathway(
                                          pathway.pathway_name,
                                          year,
                                        );
                                      }}
                                      style={{
                                        position: 'absolute',
                                        left: getYearOffset(year),
                                        top: '50%',
                                        transform: 'translate(-50%, -50%)',
                                        width: nodeSize,
                                        height: nodeSize,
                                        borderRadius: 999,
                                        border: '2px solid #FFFFFF',
                                        background: nodeFill,
                                        cursor: 'pointer',
                                        ...(isSimActive
                                          ? {}
                                          : {
                                              boxShadow: selected
                                                ? '0 0 0 8px rgba(20, 112, 175, 0.14), 0 4px 10px rgba(15, 23, 42, 0.12)'
                                                : '0 4px 10px rgba(15, 23, 42, 0.12)',
                                            }),
                                        padding: 0,
                                      }}
                                      aria-label={`${pathway.pathway_name} ${year}`}
                                    />
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        borderLeft: '1px solid rgba(148, 163, 184, 0.18)',
                      }}
                    >
                      <div
                        style={{
                          height: RULER_HEIGHT,
                          display: 'flex',
                          alignItems: 'flex-end',
                          justifyContent: 'center',
                        }}
                      >
                        <InfoTooltip tooltipKey="bake-states" />
                      </div>
                      {visibleOverviewPathways.map((pathway) => (
                        <div
                          key={`bake-${pathway.pathway_name}`}
                          style={{
                            height: ACTIVE_LANE_HEIGHT,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '0 8px',
                            boxSizing: 'border-box',
                            borderBottom: '1px solid rgba(148, 163, 184, 0.08)',
                          }}
                        >
                          <Button
                            size="small"
                            loading={
                              busyAction === `bake-${pathway.pathway_name}`
                            }
                            onClick={() =>
                              handleBakePathway(pathway.pathway_name)
                            }
                          >
                            Bake
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div
              style={{
                minHeight: 0,
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {selectedRow && visiblePathways.length > 0 ? (
                <div
                  style={{
                    borderRadius: 18,
                    border: '1px solid rgba(148, 163, 184, 0.22)',
                    background:
                      'linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.96) 100%)',
                    padding: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    minHeight: 0,
                    overflow: 'auto',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      gap: 12,
                      alignItems: 'flex-start',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        width: '100%',
                      }}
                    >
                      <Title
                        level={4}
                        style={{
                          margin: 0,
                          marginLeft: 12,
                          width: 80,
                          flexShrink: 0,
                          fontSize: 18,
                        }}
                      >
                        Y_{selectedRow.year}
                      </Title>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          flex: 1,
                        }}
                      >
                        {[
                          {
                            key: 'auto-stock',
                            label: 'Auto-Stock',
                            active:
                              selectedRow.state_kind === 'stock' ||
                              selectedRow.state_kind === 'mixed',
                          },
                          {
                            key: 'construct',
                            label: 'Construct-Event',
                            active:
                              (selectedRow.summary?.new_buildings_count ?? 0) >
                              0,
                          },
                          {
                            key: 'demolish',
                            label: 'Demolish-Event',
                            active:
                              (selectedRow.summary
                                ?.demolished_buildings_count ?? 0) > 0,
                          },
                          {
                            key: 'intervention',
                            label: 'Intervention',
                            active:
                              (selectedRow.summary?.modification_count ?? 0) >
                              0,
                          },
                          {
                            key: 'custom-input',
                            label: 'Custom-Input',
                            active:
                              selectedRow.status?.primary_phase === 'custom',
                            colour: '#C695A7',
                          },
                        ].map((tag) => (
                          <span
                            key={tag.key}
                            style={{
                              padding: '3px 10px',
                              borderRadius: 999,
                              fontSize: 11,
                              fontWeight: 600,
                              background: tag.active
                                ? (tag.colour ?? '#8eb6dc')
                                : '#e8e8e8',
                              color: tag.active ? '#fff' : '#999',
                            }}
                          >
                            {tag.label}
                          </span>
                        ))}
                        <InfoTooltip tooltipKey="state-types" />
                        <Text
                          style={{
                            color: '#94A3B8',
                            fontSize: 11,
                            marginLeft: 'auto',
                          }}
                        >
                          Last updated:{' '}
                          {formatCompactTimestamp(
                            selectedRow.latest_modified_at,
                          )}
                        </Text>
                      </div>
                    </div>
                  </div>

                  {globalValidationIssues.length ? (
                    <Alert
                      type="warning"
                      showIcon
                      message="Pathway log warnings"
                      description={
                        <ul style={{ margin: 0, paddingInlineStart: 18 }}>
                          {globalValidationIssues.map((issue) => (
                            <li key={issue}>{issue}</li>
                          ))}
                        </ul>
                      }
                      style={{ borderRadius: 12 }}
                    />
                  ) : null}

                  {activeValidationIssues.length ? (
                    <Alert
                      type="error"
                      showIcon
                      message="Year-specific validation issues"
                      description={
                        <ul style={{ margin: 0, paddingInlineStart: 18 }}>
                          {activeValidationIssues.map((issue) => (
                            <li key={issue}>{issue}</li>
                          ))}
                        </ul>
                      }
                      style={{ borderRadius: 12 }}
                    />
                  ) : null}

                  {(() => {
                    const hasConstruct =
                      (selectedRow.building_events?.new_buildings ?? [])
                        .length > 0;
                    const hasDemolish =
                      (selectedRow.building_events?.demolished_buildings ?? [])
                        .length > 0;
                    const hasChange =
                      Object.keys(selectedRow.modifications ?? {}).length > 0;
                    const visibleCards = [
                      hasConstruct,
                      hasDemolish,
                      hasChange,
                    ].filter(Boolean).length;
                    if (!visibleCards) return null;
                    return (
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                          gap: 12,
                        }}
                      >
                        {hasConstruct && (
                          <SectionCard
                            title="Construction"
                            tooltipKey="construction-card"
                            content={
                              <BuildingList
                                buildings={
                                  selectedRow.building_events?.new_buildings
                                }
                                buildingColorMap={buildingColorMap}
                                rebuildCounts={rebuildCounts}
                                onBuildingClick={handleBuildingClick}
                              />
                            }
                          />
                        )}
                        {hasDemolish && (
                          <SectionCard
                            title="Demolition"
                            tooltipKey="demolition-card"
                            content={
                              <BuildingList
                                buildings={
                                  selectedRow.building_events
                                    ?.demolished_buildings
                                }
                                buildingColorMap={buildingColorMap}
                                onBuildingClick={handleBuildingClick}
                              />
                            }
                          />
                        )}
                        {hasChange && (
                          <SectionCard
                            title="Intervention"
                            tooltipKey="intervention-card"
                            content={
                              <ModificationSummary
                                row={selectedRow}
                                constructionColorMap={constructionColorMap}
                              />
                            }
                          />
                        )}
                      </div>
                    );
                  })()}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PathwayPanel;
