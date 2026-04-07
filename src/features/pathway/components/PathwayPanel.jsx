import {
  Alert,
  Button,
  Divider,
  InputNumber,
  Modal,
  Select,
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
  RefreshIcon,
  RunIcon,
} from 'assets/icons';
import { useQueryClient } from '@tanstack/react-query';
import useJobsStore, { useCreateJob } from 'features/jobs/stores/jobsStore';
import {
  toolTypes,
  useSetToolType,
  useToolCardStore,
} from 'features/project/stores/tool-card';

import 'features/project/components/Cards/OverviewCard/OverviewCard.css';

import {
  deleteInterventionTemplate,
  fetchBuildingLifecycle,
  fetchInterventionTemplates,
  fetchPathwayOverview,
  fetchPathwayTimeline,
  fetchStateGeojson,
  preSaveBuildingEventsConfig,
} from '../api';

const { Text, Title } = Typography;

const LANE_PADDING = 60;
const LABEL_COLUMN_WIDTH = 208;
const RULER_HEIGHT = 24;
const ACTIVE_LANE_HEIGHT = 48;
const MAX_VISIBLE_TIMELINE_LANES = 3;

const STATUS_FILL = {
  none: '#CBD5E1',
  validated: '#CBD5E1',
  baked: '#1470AF',
  simulated: '#000000',
};

const STATUS_ACCENT = {
  error: '#f04d5b',
  changed: '#D97706',
};


const getErrorMessage = (error, fallbackMessage) => {
  const detail = error?.response?.data?.detail;
  if (typeof detail === 'string' && detail.trim()) {
    return detail;
  }
  if (detail?.message) {
    return detail.message;
  }
  if (error?.message) {
    return error.message;
  }
  return fallbackMessage;
};

const buildScenarioPath = (project, scenarioName) => {
  if (!project || !scenarioName) {
    return null;
  }
  return `${String(project).replace(/[\\/]+$/, '')}/${scenarioName}`;
};

const formatCompactTimestamp = (value) => {
  if (!value) {
    return 'Not recorded';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }
  return parsed.toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

const getTickStep = (pxPerYear) => {
  const steps = [1, 2, 5, 10, 20, 50, 100, 200, 500];
  for (const step of steps) {
    if (pxPerYear * step >= 56) {
      return step;
    }
  }
  return 1000;
};

const pickClosestYear = (years, preferredYear) => {
  if (!years?.length || preferredYear == null) {
    return null;
  }

  return (
    [...years].sort(
      (left, right) =>
        Math.abs(left - preferredYear) - Math.abs(right - preferredYear) ||
        left - right,
    )[0] ?? null
  );
};

const resolveSelectedYear = ({
  years,
  preferredYear,
  pendingYear,
  currentYear,
  rememberedYear,
}) => {
  const candidates = [
    preferredYear,
    pendingYear,
    currentYear,
    rememberedYear,
  ];

  for (const candidate of candidates) {
    if (candidate != null && years.includes(candidate)) {
      return candidate;
    }
  }

  const fallbackTarget =
    preferredYear ?? pendingYear ?? currentYear ?? rememberedYear ?? null;
  if (fallbackTarget != null) {
    return pickClosestYear(years, fallbackTarget);
  }

  return years[0] ?? null;
};

const getNodeFill = (row) => {
  const hasStale = row?.status?.has_stale_phase;
  if (hasStale) return STATUS_ACCENT.error;
  const primaryPhase = row?.status?.primary_phase ?? 'none';
  return STATUS_FILL[primaryPhase] ?? STATUS_FILL.none;
};

const getNodeSize = () => 12;

const LegendChip = ({ colour, label, outline, halo }) => (
  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
    <span
      style={{
        width: 12,
        height: 12,
        borderRadius: 999,
        display: 'inline-block',
        background: colour,
        border: outline ? `2px solid ${outline}` : '1px solid rgba(15, 23, 42, 0.08)',
        boxShadow: halo ? `0 0 0 4px ${halo}` : 'none',
      }}
    />
    <Text style={{ fontSize: 12, color: '#475569' }}>{label}</Text>
  </div>
);

const SectionCard = ({ title, content, tooltipKey }) => (
  <div
    style={{
      borderRadius: 14,
      border: '1px solid rgba(148, 163, 184, 0.18)',
      background: '#FFFFFF',
      padding: 12,
      minHeight: 60,
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingBottom: 8, marginBottom: 8, borderBottom: '1px solid #e0e0e0' }}>
      <Text strong>{title}</Text>
      {tooltipKey ? <InfoTooltip tooltipKey={tooltipKey} /> : null}
    </div>
    {content}
  </div>
);


const BuildingPill = ({ name, color, onClick }) => (
  <span
    role={onClick ? 'button' : undefined}
    tabIndex={onClick ? 0 : undefined}
    onClick={onClick}
    onKeyDown={onClick ? (e) => { if (e.key === 'Enter') onClick(); } : undefined}
    style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 999,
      fontSize: 11,
      fontWeight: 500,
      background: color ?? '#e8e8e8',
      color: color ? '#fff' : '#475569',
      cursor: onClick ? 'pointer' : 'default',
    }}
  >
    {name}
  </span>
);

const BuildingList = ({ buildings, buildingColorMap, rebuildCounts, onBuildingClick }) => {
  if (!buildings?.length) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {buildings.map((b) => {
        const count = rebuildCounts?.[b] ?? 0;
        const label = count > 0 ? `${b}(${count})` : b;
        return (
          <BuildingPill
            key={b}
            name={label}
            color={buildingColorMap?.[b]}
            onClick={onBuildingClick ? () => onBuildingClick(b) : undefined}
          />
        );
      })}
    </div>
  );
};

const ModificationSummary = ({ row, constructionColorMap: colorMap }) => {
  const modifications = row?.modifications ?? {};
  const archetypes = Object.keys(modifications);
  if (!archetypes.length) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {archetypes.map((archetype) => {
        const components = modifications[archetype] ?? {};
        const color = colorMap?.[archetype];
        const changes = Object.entries(components).flatMap(
          ([component, fields]) =>
            Object.entries(fields).map(([field, value]) => ({
              component,
              field,
              value,
            })),
        );
        return (
          <div key={archetype} style={{ fontSize: 12 }}>
            <BuildingPill name={archetype} color={color} />
            {changes.map((c) => (
              <div key={`${c.component}-${c.field}`} style={{ color: '#475569', paddingLeft: 8 }}>
                {c.field}: {String(c.value)}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
};

const PathwayOptionWithCheckbox = ({
  pathwayName,
  checked,
  onToggle,
  onDelete,
}) => {
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => {
            e.stopPropagation();
            onToggle(pathwayName);
          }}
          onClick={(e) => e.stopPropagation()}
          style={{ cursor: 'pointer', flexShrink: 0 }}
        />
        <div
          style={{
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={pathwayName}
        >
          {pathwayName}
        </div>
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

const PathwaySelect = ({
  selectedPathway,
  visiblePathways,
  overviewPathways,
  onToggleVisible,
  onDeletePathway,
  onCreatePathway,
  loading,
}) => {
  const [open, setOpen] = useState(false);

  const sortedPathways = useMemo(() => {
    return [...overviewPathways]
      .map((p) => p.pathway_name)
      .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  }, [overviewPathways]);

  const visibleSet = useMemo(() => new Set(visiblePathways), [visiblePathways]);

  const options = useMemo(() => {
    return sortedPathways.map((pathwayName) => ({
      label: (
        <PathwayOptionWithCheckbox
          pathwayName={pathwayName}
          checked={visibleSet.has(pathwayName)}
          onToggle={onToggleVisible}
          onDelete={onDeletePathway}
        />
      ),
      value: pathwayName,
    }));
  }, [sortedPathways, visibleSet, onToggleVisible, onDeletePathway]);

  const hasPathways = overviewPathways.length > 0;

  const displayLabel = visiblePathways.length > 0
    ? visiblePathways.join('; ')
    : selectedPathway ?? '';

  return (
    <Select
      className={`cea-scenario-select ${!hasPathways || !selectedPathway || visiblePathways.length === 0 ? 'cea-scenario-select-empty' : ''}`}
      style={{ width: 208 }}
      styles={{ popup: { root: { width: 270 } } }}
      placeholder={hasPathways ? 'Select Pathway' : 'Create Pathway'}
      options={hasPathways ? options : []}
      value={visiblePathways.length > 0 ? selectedPathway : undefined}
      onChange={() => {}}
      onSelect={(pathwayName) => {
        onToggleVisible(pathwayName);
        setOpen(true);
      }}
      loading={loading}
      open={hasPathways ? open : false}
      onOpenChange={hasPathways ? setOpen : undefined}
      onClick={!hasPathways ? onCreatePathway : undefined}
      notFoundContent={<small>No pathways</small>}
      labelRender={() =>
        visiblePathways.length > 0 ? (
          <span
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {displayLabel}
          </span>
        ) : null
      }
    />
  );
};

const TemplateOption = ({ templateName, onDelete }) => {
  const [isHovered, setIsHovered] = useState(false);

  const onClick = (e) => {
    e.stopPropagation();
    onDelete?.(templateName);
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
      <div
        style={{
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flexGrow: 1,
        }}
        title={templateName}
      >
        {templateName}
      </div>
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

const TemplateSelect = ({
  templates,
  selectedTemplate,
  onSelectTemplate,
  onDeleteTemplate,
  onCreateTemplate,
  loading,
}) => {
  const [open, setOpen] = useState(false);

  const sortedTemplates = useMemo(() => {
    return [...(templates ?? [])].sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase()),
    );
  }, [templates]);

  const options = useMemo(() => {
    return sortedTemplates.map((name) => ({
      label: (
        <TemplateOption
          templateName={name}
          onDelete={onDeleteTemplate}
        />
      ),
      value: name,
    }));
  }, [sortedTemplates, onDeleteTemplate]);

  const hasTemplates = sortedTemplates.length > 0;

  return (
    <Select
      className={`cea-template-select ${!hasTemplates ? 'cea-template-select-empty' : ''}`}
      style={{ width: 208 }}
      styles={{ popup: { root: { width: 270 } } }}
      placeholder={
        hasTemplates ? 'Intervention Templates' : 'Create Intervention Template'
      }
      options={hasTemplates ? options : []}
      value={selectedTemplate}
      onChange={onSelectTemplate}
      onSelect={(value) => {
        if (value === selectedTemplate) {
          onSelectTemplate(null);
        }
      }}
      allowClear={hasTemplates}
      loading={loading}
      open={hasTemplates ? open : false}
      onOpenChange={hasTemplates ? setOpen : undefined}
      onClick={!hasTemplates ? onCreateTemplate : undefined}
      notFoundContent={<small>No intervention templates</small>}
    />
  );
};

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

  const { data: inputData } = useInputs();
  const colorMode = useMapStore((state) => state.colorMode);
  const constructionColorMap = useMapStore((state) => state.constructionColorMap);
  const useTypeColorMap = useMapStore((state) => state.useTypeColorMap);
  const setStateZoneOverride = useMapStore((state) => state.setStateZoneOverride);

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
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  const [selectedHeaderTemplate, setSelectedHeaderTemplate] = useState(null);

  const scenarioPath = useMemo(
    () => buildScenarioPath(project, scenarioName),
    [project, scenarioName],
  );

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
    const newAtYear = new Set(selectedRow?.building_events?.new_buildings ?? []);
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

  const span = timeline?.span ?? overview?.span ?? {};
  const startYear = span?.start_year;
  const endYear = span?.end_year;
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
          rememberedYear:
            selectedYearByPathwayRef.current[pathwayName] ?? null,
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
        setPanelError(getErrorMessage(error, 'Failed to load pathway timeline.'));
        setTimeline(null);
        return null;
      } finally {
        setLoadingTimeline(false);
      }
    },
    [],
  );

  const loadOverview = useCallback(
    async (preferredPathway = null) => {
      setLoadingOverview(true);
      setPanelError(null);
      try {
        const data = await fetchPathwayOverview();
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
          if (prev.length > 0) {
            return prev.filter((p) => pathwayNames.includes(p));
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
    [],
  );

  const loadTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    try {
      const names = await fetchInterventionTemplates();
      setTemplateNames(names);
    } catch {
      setTemplateNames([]);
    } finally {
      setLoadingTemplates(false);
    }
  }, []);

  const refreshPathwayData = useCallback(
    async ({
      preferredPathway = selectedPathwayRef.current,
      preferredYear = selectedYearRef.current,
    } = {}) => {
      setBuildingLifecycleData(null);
      const activePathway = await loadOverview(preferredPathway);
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
      onSuccess,
    }) => {
      setBusyAction(busyKey);
      try {
        const job = await createJob(script, parameters);
        setPanelError(null);
        setPendingPanelJob({
          id: job.id,
          busyKey,
          preferredPathway,
          preferredYear,
          failureMessage,
          onSuccess,
        });
        return job;
      } catch (error) {
        setBusyAction(null);
        setPanelError(
          getErrorMessage(error, failedToStartMessage ?? 'Failed to start job.'),
        );
        return null;
      }
    },
    [createJob],
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
    if (selectedYear == null || !scrollViewportRef.current || startYear == null) {
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
    if (!open || !selectedPathway || !jobs) {
      return;
    }

    const relevantJobs = Object.entries(jobs)
      .map(([id, job]) => ({ id, ...job }))
      .filter(
        (job) =>
          job.state === 2 &&
          job.scenario_name === scenarioName &&
          [
            'bake-pathway-states',
            'pathway-events-apply-templates',
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
      const pendingYear = pendingPreferredYearRef.current;
      void refreshPathwayData(
        pendingYear != null
          ? { preferredYear: pendingYear }
          : undefined,
      );
    }
  }, [jobs, open, refreshPathwayData, scenarioName, selectedPathway]);

  useEffect(() => {
    if (!pendingPanelJob || !jobs) {
      return;
    }

    const job = jobs[pendingPanelJob.id];
    if (!job) {
      return;
    }

    if (job.state === 2) {
      if (pendingPanelJob.onSuccess === 'created-pathway') {
        // pathway created successfully
      }
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
    if (!selectedPathway || !scenarioPath) {
      setPanelError('Select a scenario and pathway first.');
      return;
    }

    setBusyAction(scriptName);
    try {
      await createJob(scriptName, {
        scenario: scenarioPath,
        existing_pathway_name: selectedPathway,
      });
      setPanelError(null);
    } catch (error) {
      setPanelError(getErrorMessage(error, 'Failed to start pathway job.'));
    } finally {
      setBusyAction(null);
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
    if (!selectedHeaderTemplate || newYearValue == null || !visiblePathways.length) {
      return;
    }

    const targetYear = Number(newYearValue);
    pendingPreferredYearRef.current = targetYear;
    await startPanelJob({
      script: 'pathway-events-apply-templates',
      parameters: {
        scenario: scenarioPath,
        existing_pathway_names: visiblePathways,
        year_of_state: targetYear,
        intervention_templates: [selectedHeaderTemplate],
      },
      busyKey: 'apply-intervention',
      failedToStartMessage: 'Failed to start the apply-intervention job.',
      failureMessage:
        'Applying intervention failed. Open Job Info in the status bar for details.',
      preferredPathway: selectedPathway,
      preferredYear: targetYear,
      onSuccess: 'saved-templates',
    });
    setNewYearValue(null);
  };

  const handleDeletePathwayByName = (pathwayName) => {
    if (!pathwayName || !scenarioPath) {
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
        await startPanelJob({
          script: 'pathway-delete-pathway',
          parameters: {
            scenario: scenarioPath,
            existing_pathway_name: pathwayName,
          },
          busyKey: 'delete-pathway',
          failedToStartMessage: 'Failed to start the delete-pathway job.',
          failureMessage:
            'Deleting the pathway failed. Open Job Info in the status bar for details.',
          preferredPathway:
            pathwayName === selectedPathway ? null : selectedPathway,
          preferredYear: null,
          onSuccess: 'deleted-pathway',
        });
      },
    });
  };

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
        await startPanelJob({
          script: 'create-new-pathway',
          parameters: {
            scenario: scenarioPath,
            new_pathway_name: name,
          },
          busyKey: 'create-pathway',
          failedToStartMessage: 'Failed to start the create-pathway job.',
          failureMessage:
            'Create pathway failed. Open Job Info in the status bar for details.',
          preferredPathway: name,
          onSuccess: 'created-pathway',
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
        await startPanelJob({
          script: 'pathway-delete-state',
          parameters: {
            scenario: scenarioPath,
            existing_pathway_names: [selectedPathway],
            year_of_state: selectedRow.year,
          },
          busyKey: 'delete-year',
          startedMessage:
            `${destructiveLabel} job started. Open Job Info in the status bar for details.`,
          failedToStartMessage: `Failed to start the ${destructiveLabel.toLowerCase()} job.`,
          completionMessage: selectedRow.can_clear_manual_changes
            ? `Cleared manual changes for ${selectedRow.year}.`
            : `Deleted state ${selectedRow.year}.`,
          failureMessage:
            `${destructiveLabel} failed. Open Job Info in the status bar for details.`,
          preferredPathway: selectedPathway,
          preferredYear: selectedRow.year,
        });
      },
    });
  };


  const handleOpenTemplateTool = () => {
    setSelectedTool('pathway-intervention-templates-define');
    setToolType(toolTypes.TOOLS);
  };

  const handleDeleteTemplate = (templateName) => {
    if (!templateName) {
      return;
    }

    Modal.confirm({
      title: `Delete template '${templateName}'?`,
      content:
        'This removes the intervention template definition. This cannot be undone.',
      okText: 'Delete template',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteInterventionTemplate(templateName);
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
    if (!pathwayName || !scenarioPath) return;
    setBusyAction(`bake-${pathwayName}`);
    try {
      await createJob('bake-pathway-states', {
        scenario: scenarioPath,
        existing_pathway_name: pathwayName,
      });
      setPanelError(null);
    } catch (error) {
      setPanelError(getErrorMessage(error, 'Failed to start bake job.'));
    } finally {
      setBusyAction(null);
    }
  };

  const totalTimelineHeight =
    RULER_HEIGHT +
    visibleOverviewPathways.length * ACTIVE_LANE_HEIGHT;
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

  return (
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
        <h2 style={{ margin: 0 }}>Pathway Builder</h2>
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
            onCreatePathway={handleStartCreatePathway}
            loading={loadingOverview}
          />
          <div className="cea-card-icon-button-container">
            <TooltipFromBackend tooltipKey="create-new-pathway" placement="bottom">
              <Button
                icon={<CreateNewIcon />}
                type="text"
                loading={busyAction === 'create-pathway'}
                onClick={handleStartCreatePathway}
              />
            </TooltipFromBackend>
          </div>
          <Divider type="vertical" style={{ height: 24, margin: 0 }} />
          <TemplateSelect
            templates={templateNames}
            selectedTemplate={selectedHeaderTemplate}
            onSelectTemplate={setSelectedHeaderTemplate}
            onDeleteTemplate={handleDeleteTemplate}
            onCreateTemplate={handleOpenTemplateTool}
            loading={loadingTemplates}
          />
          <div className="cea-card-icon-button-container">
            <TooltipFromBackend tooltipKey="define-intervention-template" placement="bottom">
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
              <TooltipFromBackend tooltipKey="refresh-pathway" placement="bottom">
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
                  const phase = row?.status?.primary_phase ?? 'none';
                  return phase !== 'baked' && phase !== 'simulated';
                })
              }
              loading={busyAction === 'pathway-simulations'}
              onClick={() => handleRunPathwayJob('pathway-simulations')}
            >
              {busyAction === 'pathway-simulations' ? (
                'Starting job...'
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: 549 }}>
            <InputNumber
              placeholder="2050"
              precision={0}
              value={newYearValue}
              onChange={setNewYearValue}
              style={{ width: 96 }}
              disabled={!selectedPathway}
            />
            {selectedHeaderTemplate ? (
              <Button
                type="primary"
                icon={<CreateNewIcon />}
                disabled={!visiblePathways.length || newYearValue == null}
                loading={busyAction === 'apply-intervention'}
                onClick={handleApplyIntervention}
              >
                Apply Selected Intervention
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
            {selectedRow && (selectedRow.can_delete || selectedRow.can_clear_manual_changes) ? (
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
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            <LegendChip colour={STATUS_FILL.none} label="Draft" />
            <LegendChip colour={STATUS_FILL.baked} label="Baked" />
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
            <div style={{ height: RULER_HEIGHT + ACTIVE_LANE_HEIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#94A3B8', fontSize: 12 }}>Create or select a Pathway</Text>
            </div>
          ) : (
            <div
              ref={laneStackScrollRef}
              style={{
                maxHeight: timelineViewportHeight,
                overflowY:
                  totalTimelineHeight > timelineViewportHeight ? 'auto' : 'hidden',
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
                  background:
                    '#f7f7f7',
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
                          <Text style={{ fontSize: 11, color: '#64748B' }}>
                            {year}
                          </Text>
                        </div>
                      ))}
                    </div>

                    {visibleOverviewPathways.map((pathway) => {
                      const isActive = pathway.pathway_name === selectedPathway;
                      const laneYears = isActive
                        ? activeRows.map((row) => row.year)
                        : pathway.years ?? [];

                      return (
                        <div
                          key={`lane-${pathway.pathway_name}`}
                          style={{
                            position: 'relative',
                            height: ACTIVE_LANE_HEIGHT,
                            boxSizing: 'border-box',
                            background: 'transparent',
                            borderBottom: '1px solid rgba(148, 163, 184, 0.08)',
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
                            const row = isActive ? activeRowByYear.get(year) : null;
                            const nodeSize = getNodeSize(row, true);
                            const selected = isActive && selectedYear === year;
                            const validationError =
                              isActive && row?.validation?.status === 'error';
                            const nodeFill = isActive
                              ? validationError
                                ? STATUS_ACCENT.error
                                : getNodeFill(row)
                              : '#CBD5E1';

                            return (
                                <button
                                  key={`${pathway.pathway_name}-${year}`}
                                  type="button"
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
                                    boxShadow: selected
                                      ? '0 0 0 8px rgba(20, 112, 175, 0.14), 0 4px 10px rgba(15, 23, 42, 0.12)'
                                      : '0 4px 10px rgba(15, 23, 42, 0.12)',
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
                  <div style={{ height: RULER_HEIGHT, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
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
                        loading={busyAction === `bake-${pathway.pathway_name}`}
                        onClick={() => handleBakePathway(pathway.pathway_name)}
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
                  <Title level={4} style={{ margin: 0, marginLeft: 12, width: 80, flexShrink: 0 }}>
                    Y_{selectedRow.year}
                  </Title>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                    {[
                      { key: 'auto-stock', label: 'Auto-Stock', active: selectedRow.state_kind === 'stock' || selectedRow.state_kind === 'mixed' },
                      { key: 'construct', label: 'Construct-Event', active: (selectedRow.summary?.new_buildings_count ?? 0) > 0 },
                      { key: 'demolish', label: 'Demolish-Event', active: (selectedRow.summary?.demolished_buildings_count ?? 0) > 0 },
                      { key: 'intervention', label: 'Intervention', active: (selectedRow.summary?.modification_count ?? 0) > 0 },
                    ].map((tag) => (
                      <span
                        key={tag.key}
                        style={{
                          padding: '3px 10px',
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 600,
                          background: tag.active ? '#8eb6dc' : '#e8e8e8',
                          color: tag.active ? '#fff' : '#999',
                        }}
                      >
                        {tag.label}
                      </span>
                    ))}
                    <InfoTooltip tooltipKey="state-types" />
                    <Text style={{ color: '#94A3B8', fontSize: 11, marginLeft: 'auto' }}>
                      Last updated: {formatCompactTimestamp(selectedRow.latest_modified_at)}
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
                const hasConstruct = (selectedRow.building_events?.new_buildings ?? []).length > 0;
                const hasDemolish = (selectedRow.building_events?.demolished_buildings ?? []).length > 0;
                const hasChange = Object.keys(selectedRow.modifications ?? {}).length > 0;
                const visibleCards = [hasConstruct, hasDemolish, hasChange].filter(Boolean).length;
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
                        content={<BuildingList buildings={selectedRow.building_events?.new_buildings} buildingColorMap={buildingColorMap} rebuildCounts={rebuildCounts} onBuildingClick={handleBuildingClick} />}
                      />
                    )}
                    {hasDemolish && (
                      <SectionCard
                        title="Demolition"
                        tooltipKey="demolition-card"
                        content={<BuildingList buildings={selectedRow.building_events?.demolished_buildings} buildingColorMap={buildingColorMap} onBuildingClick={handleBuildingClick} />}
                      />
                    )}
                    {hasChange && (
                      <SectionCard
                        title="Intervention"
                        tooltipKey="intervention-card"
                        content={<ModificationSummary row={selectedRow} constructionColorMap={constructionColorMap} />}
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
  );
};

export default PathwayPanel;
