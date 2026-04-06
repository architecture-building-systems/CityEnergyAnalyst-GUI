import {
  BuildOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  FileTextOutlined,
  PlusOutlined,
  RocketOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Divider,
  Drawer,
  Empty,
  Input,
  InputNumber,
  Modal,
  Select,
  Slider,
  Spin,
  Tooltip,
  Typography,
} from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { BinAnimationIcon, CreateNewIcon, RefreshIcon } from 'assets/icons';
import useJobsStore, { useCreateJob } from 'features/jobs/stores/jobsStore';
import {
  toolTypes,
  useSetToolType,
  useToolCardStore,
} from 'features/project/stores/tool-card';

import 'features/project/components/Cards/OverviewCard/OverviewCard.css';

import {
  deleteInterventionTemplate,
  fetchInterventionTemplates,
  fetchPathwayOverview,
  fetchPathwayTimeline,
  fetchYearEditorOptions,
} from '../api';

const { Text, Title } = Typography;

const LANE_PADDING = 30;
const LABEL_COLUMN_WIDTH = 176;
const RULER_HEIGHT = 24;
const ACTIVE_LANE_HEIGHT = 52;
const INACTIVE_LANE_HEIGHT = 28;
const ZOOM_MIN = 1;
const ZOOM_MAX = 8;
const MAX_VISIBLE_TIMELINE_LANES = 3;

const STATUS_FILL = {
  none: '#CBD5E1',
  validated: '#0F766E',
  baked: '#2659A0',
  simulated: '#2F855A',
};

const STATUS_ACCENT = {
  error: '#B91C1C',
  changed: '#D97706',
};

const DEFAULT_YAML_DRAFT = `modifications: {}
building_events:
  new_buildings: []
  demolished_buildings: []
`;

const TIMELINE_TOOLTIP_PROPS = {
  color: '#FFFFFF',
  styles: {
    body: {
      borderRadius: 16,
      padding: '12px 14px',
      border: '1px solid rgba(148, 163, 184, 0.24)',
      boxShadow: '0 20px 48px rgba(15, 23, 42, 0.16)',
    },
  },
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
  if (pxPerYear >= 56) {
    return 1;
  }
  if (pxPerYear * 2 >= 56) {
    return 2;
  }
  if (pxPerYear * 5 >= 56) {
    return 5;
  }
  return 10;
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

const getLaneHeight = (active) =>
  active ? ACTIVE_LANE_HEIGHT : INACTIVE_LANE_HEIGHT;

const getYearLabel = (row) => {
  if (!row) {
    return 'State';
  }
  if (row.state_kind === 'mixed') {
    return 'Mixed state';
  }
  if (row.state_kind === 'manual') {
    return 'Manual state';
  }
  return 'Stock state';
};

const getNodeFill = (row) => {
  const primaryPhase = row?.status?.primary_phase ?? 'none';
  return STATUS_FILL[primaryPhase] ?? STATUS_FILL.none;
};

const getNodeSize = (row, active) => {
  if (!active) {
    return 8;
  }
  return row?.state_kind === 'stock' ? 10 : 16;
};

const getInitialYamlDraft = (row) => {
  if (!row?.exists_in_log || row?.yaml_preview?.startsWith('# No explicit YAML')) {
    return DEFAULT_YAML_DRAFT;
  }
  return row.yaml_preview;
};

const toOptionList = (values) =>
  (values ?? []).map((value) => ({
    label: value,
    value,
  }));

const handleYamlTextareaKeyDown = (event, value, onChange) => {
  if (event.key !== 'Tab') {
    return;
  }

  event.preventDefault();
  const target = event.target;
  const start = target.selectionStart ?? 0;
  const end = target.selectionEnd ?? start;
  const indent = '  ';
  const nextValue = `${value.slice(0, start)}${indent}${value.slice(end)}`;
  onChange(nextValue);

  requestAnimationFrame(() => {
    target.selectionStart = start + indent.length;
    target.selectionEnd = start + indent.length;
  });
};

const renderYamlLine = (line, index) => {
  if (line.trim().length === 0) {
    return (
      <div key={`yaml-line-${index}`} style={{ minHeight: 18 }}>
        {' '}
      </div>
    );
  }

  if (/^\s*#/.test(line)) {
    return (
      <div key={`yaml-line-${index}`} style={{ whiteSpace: 'pre' }}>
        <span style={{ color: '#64748B', fontStyle: 'italic' }}>{line}</span>
      </div>
    );
  }

  const keyMatch = line.match(/^(\s*-\s*|\s*)([^:#]+):(.*)$/);
  if (keyMatch) {
    const [, prefix, rawKey, remainder] = keyMatch;
    return (
      <div key={`yaml-line-${index}`} style={{ whiteSpace: 'pre' }}>
        <span>{prefix}</span>
        <span style={{ color: '#2659A0', fontWeight: 600 }}>{rawKey}</span>
        <span>:</span>
        <span style={{ color: '#334155' }}>{remainder}</span>
      </div>
    );
  }

  const listMatch = line.match(/^(\s*-\s+)(.*)$/);
  if (listMatch) {
    const [, prefix, value] = listMatch;
    return (
      <div key={`yaml-line-${index}`} style={{ whiteSpace: 'pre' }}>
        <span style={{ color: '#94A3B8' }}>{prefix}</span>
        <span style={{ color: '#0F172A' }}>{value}</span>
      </div>
    );
  }

  return (
    <div key={`yaml-line-${index}`} style={{ whiteSpace: 'pre' }}>
      <span style={{ color: '#0F172A' }}>{line}</span>
    </div>
  );
};

const YamlPreview = ({
  value,
  fill = false,
  minHeight = 140,
  scrollable = true,
}) => (
  <div
    style={{
      background: 'linear-gradient(180deg, #F8FBFF 0%, #FDFEFE 100%)',
      border: '1px solid rgba(148, 163, 184, 0.28)',
      borderRadius: 14,
      padding: '12px 14px',
      fontFamily:
        '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
      fontSize: 12,
      lineHeight: 1.5,
      color: '#0F172A',
      overflow: scrollable ? 'auto' : 'visible',
      minHeight,
      maxHeight: fill || !scrollable ? 'none' : 240,
      height: fill && scrollable ? '100%' : 'auto',
      flex: fill ? 1 : '0 1 auto',
      width: '100%',
    }}
  >
    {(value ?? '# No explicit YAML entry for this year.\n')
      .split('\n')
      .map(renderYamlLine)}
  </div>
);

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

const SectionCard = ({ title, content }) => (
  <div
    style={{
      borderRadius: 14,
      border: '1px solid rgba(148, 163, 184, 0.18)',
      background: '#FFFFFF',
      padding: 12,
      minHeight: 110,
    }}
  >
    <Text strong style={{ display: 'block', marginBottom: 8 }}>
      {title}
    </Text>
    {content}
  </div>
);

const ValueTagList = ({ label, values, colour }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    <Text style={{ fontSize: 12, color: '#64748B' }}>{label}</Text>
    {values?.length ? (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {values.map((value) => (
          <span
            key={`${label}-${value}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 8px',
              borderRadius: 999,
              background: `${colour}14`,
              color: colour,
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            {value}
          </span>
        ))}
      </div>
    ) : (
      <Text style={{ color: '#94A3B8', fontSize: 12 }}>None</Text>
    )}
  </div>
);

const BuildingChangesSummary = ({ row }) => {
  const combinedEvents = row?.building_events ?? {};
  const explicitEvents = row?.explicit_building_events ?? {};
  const newBuildings = combinedEvents?.new_buildings ?? [];
  const demolishedBuildings = combinedEvents?.demolished_buildings ?? [];
  const explicitCount =
    (explicitEvents?.new_buildings?.length ?? 0) +
    (explicitEvents?.demolished_buildings?.length ?? 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <Text style={{ color: '#475569' }}>
        {newBuildings.length || demolishedBuildings.length
          ? `${newBuildings.length} added, ${demolishedBuildings.length} demolished`
          : 'No building changes for this year.'}
      </Text>
      <ValueTagList
        label="New"
        values={newBuildings}
        colour="#2F855A"
      />
      <ValueTagList
        label="Demolished"
        values={demolishedBuildings}
        colour="#B45309"
      />
      <Text style={{ fontSize: 12, color: '#64748B' }}>
        {explicitCount
          ? `Manual building edits stored in YAML: ${explicitCount}`
          : 'No explicit building edits stored in YAML.'}
      </Text>
    </div>
  );
};

const ModificationSummary = ({ row }) => {
  const modifications = row?.modifications ?? {};
  const archetypes = Object.keys(modifications);
  const modificationCount = row?.summary?.modification_count ?? 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <Text style={{ color: '#475569' }}>
        {modificationCount
          ? `${modificationCount} field changes across ${archetypes.length} archetype${archetypes.length === 1 ? '' : 's'}.`
          : 'No explicit modification fields saved for this year.'}
      </Text>
      <ValueTagList
        label="Archetypes"
        values={archetypes}
        colour="#2659A0"
      />
    </div>
  );
};

const PathwayOption = ({ pathwayName, onDelete }) => {
  const [isHovered, setIsHovered] = useState(false);

  const onClick = (e) => {
    e.stopPropagation();
    onDelete?.(pathwayName);
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
        title={pathwayName}
      >
        {pathwayName}
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

const PathwaySelect = ({
  selectedPathway,
  overviewPathways,
  onSelectPathway,
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

  const options = useMemo(() => {
    const otherPathways = sortedPathways.filter((p) => p !== selectedPathway);
    return otherPathways.length > 0
      ? [
          {
            label: 'Pathways',
            options: otherPathways.map((pathwayName) => ({
              label: (
                <PathwayOption
                  pathwayName={pathwayName}
                  onDelete={onDeletePathway}
                />
              ),
              value: pathwayName,
            })),
          },
        ]
      : [];
  }, [sortedPathways, selectedPathway, onDeletePathway]);

  const hasPathways = overviewPathways.length > 0;

  return (
    <Select
      className={`cea-scenario-select ${!hasPathways || !selectedPathway ? 'cea-scenario-select-empty' : ''}`}
      style={{ width: 208 }}
      styles={{ popup: { root: { width: 270 } } }}
      placeholder={hasPathways ? 'Select Pathway' : 'Create Pathway'}
      options={hasPathways ? options : []}
      value={selectedPathway}
      onChange={onSelectPathway}
      loading={loading}
      open={hasPathways ? open : false}
      onOpenChange={hasPathways ? setOpen : undefined}
      onClick={!hasPathways ? onCreatePathway : undefined}
      notFoundContent={<small>No other pathways</small>}
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
    return sortedTemplates.length > 0
      ? [
          {
            label: 'Intervention Templates',
            options: sortedTemplates.map((name) => ({
              label: (
                <TemplateOption
                  templateName={name}
                  onDelete={onDeleteTemplate}
                />
              ),
              value: name,
            })),
          },
        ]
      : [];
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
      value={null}
      onChange={() => {}}
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
}) => {
  const createJob = useCreateJob();
  const jobs = useJobsStore((state) => state.jobs);
  const setToolType = useSetToolType();
  const setSelectedTool = useToolCardStore((state) => state.setSelectedTool);

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
  const [selectedYear, setSelectedYear] = useState(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);

  const [loadingOverview, setLoadingOverview] = useState(false);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [panelError, setPanelError] = useState(null);
  const [busyAction, setBusyAction] = useState(null);
  const [pendingPanelJob, setPendingPanelJob] = useState(null);

  const [newYearValue, setNewYearValue] = useState(null);

  const [templateNames, setTemplateNames] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  const [editorOptions, setEditorOptions] = useState(null);
  const [editorOptionsLoading, setEditorOptionsLoading] = useState(false);

  const [buildingEventsModalOpen, setBuildingEventsModalOpen] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [yamlDrawerOpen, setYamlDrawerOpen] = useState(false);
  const [yamlDrawerLoading, setYamlDrawerLoading] = useState(false);
  const [yamlEditEnabled, setYamlEditEnabled] = useState(false);
  const [createYearModalOpen, setCreateYearModalOpen] = useState(false);
  const [editorTargetYear, setEditorTargetYear] = useState(null);

  const [newBuildingsDraft, setNewBuildingsDraft] = useState([]);
  const [demolishedBuildingsDraft, setDemolishedBuildingsDraft] = useState([]);
  const [selectedTemplatesDraft, setSelectedTemplatesDraft] = useState([]);
  const [yamlDraft, setYamlDraft] = useState(DEFAULT_YAML_DRAFT);

  const scenarioPath = useMemo(
    () => buildScenarioPath(project, scenarioName),
    [project, scenarioName],
  );

  const overviewPathways = overview?.pathways ?? [];
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
  const activeEditorYear = editorTargetYear ?? selectedRow?.year ?? null;
  const activeEditorRow = useMemo(() => {
    if (activeEditorYear == null) {
      return null;
    }
    return activeRowByYear.get(activeEditorYear) ?? null;
  }, [activeEditorYear, activeRowByYear]);

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
  const pxPerYear = (fitWidth / yearRange) * zoomLevel;
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
        return activePathway;
      } catch (error) {
        setPanelError(getErrorMessage(error, 'Failed to load pathways.'));
        setOverview(null);
        setSelectedPathway(null);
        return null;
      } finally {
        setLoadingOverview(false);
      }
    },
    [],
  );

  const loadTemplates = useCallback(
    async (pathwayName) => {
      if (!pathwayName) {
        setTemplateNames([]);
        return;
      }
      setLoadingTemplates(true);
      try {
        const names = await fetchInterventionTemplates(pathwayName);
        setTemplateNames(names);
      } catch {
        setTemplateNames([]);
      } finally {
        setLoadingTemplates(false);
      }
    },
    [],
  );

  const refreshPathwayData = useCallback(
    async ({
      preferredPathway = selectedPathwayRef.current,
      preferredYear = selectedYearRef.current,
    } = {}) => {
      const activePathway = await loadOverview(preferredPathway);
      if (!activePathway) {
        setTimeline(null);
        setSelectedYear(null);
        setTemplateNames([]);
        return;
      }
      await Promise.all([
        loadTimeline(activePathway, preferredYear),
        loadTemplates(activePathway),
      ]);
    },
    [loadOverview, loadTimeline, loadTemplates],
  );

  const ensureEditorOptions = useCallback(
    async (pathwayName, year) => {
      if (
        editorOptions?.pathway_name === pathwayName &&
        editorOptions?.year === year
      ) {
        return editorOptions;
      }

      setEditorOptionsLoading(true);
      try {
        const data = await fetchYearEditorOptions(pathwayName, year);
        setEditorOptions(data);
        return data;
      } catch (error) {
        throw new Error(
          getErrorMessage(error, 'Failed to load editor options.'),
        );
      } finally {
        setEditorOptionsLoading(false);
      }
    },
    [editorOptions],
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
      await Promise.all([
        loadTimeline(pathwayName, preferredYear),
        loadTemplates(pathwayName),
      ]);
    },
    [loadTimeline, loadTemplates],
  );

  const handleSelectYear = useCallback(
    (year) => {
      if (selectedPathwayRef.current && year != null) {
        selectedYearByPathwayRef.current[selectedPathwayRef.current] = year;
      }
      setSelectedYear(year);
    },
    [],
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
    setSelectedYear(null);
    setEditorOptions(null);
    setBuildingEventsModalOpen(false);
    setTemplateModalOpen(false);
    setYamlDrawerOpen(false);
    setYamlDrawerLoading(false);
    setYamlEditEnabled(false);
    setCreateYearModalOpen(false);
    setEditorTargetYear(null);
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
            'pathway-intervention-templates-define',
            'pathway-simulations',
            'pathway-validate-all-states',
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
      void refreshPathwayData();
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
      if (pendingPanelJob.onSuccess === 'deleted-pathway') {
        setCreateYearModalOpen(false);
        setBuildingEventsModalOpen(false);
        setTemplateModalOpen(false);
        setYamlDrawerOpen(false);
        setYamlDrawerLoading(false);
        setYamlEditEnabled(false);
        setEditorTargetYear(null);
      }
      if (pendingPanelJob.onSuccess === 'saved-building-events') {
        setBuildingEventsModalOpen(false);
        setEditorTargetYear(null);
      }
      if (pendingPanelJob.onSuccess === 'saved-templates') {
        setTemplateModalOpen(false);
        setSelectedTemplatesDraft([]);
        setEditorTargetYear(null);
      }
      if (pendingPanelJob.onSuccess === 'saved-yaml') {
        setYamlDrawerOpen(false);
        setYamlEditEnabled(false);
        setEditorTargetYear(null);
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
    if (!selectedPathway) {
      setPanelError('Select a pathway first.');
      return;
    }
    if (newYearValue == null) {
      setPanelError('Enter the year you want to add.');
      return;
    }

    const targetYear = Number(newYearValue);
    if (activeRowByYear.has(targetYear)) {
      handleSelectYear(targetYear);
    }
    setEditorTargetYear(targetYear);
    setCreateYearModalOpen(true);
    setNewYearValue(null);
    setPanelError(null);
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
      title: 'Create new pathway',
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
            existing_pathway_name: selectedPathway,
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

  const handleOpenBuildingEventsEditor = async (targetYear = activeEditorYear) => {
    if (!selectedPathway || targetYear == null) {
      return;
    }

    setEditorTargetYear(targetYear);
    setCreateYearModalOpen(false);
    setBuildingEventsModalOpen(true);
    try {
      const data = await ensureEditorOptions(selectedPathway, targetYear);
      const currentEvents = data?.entry?.building_events ?? {};
      setNewBuildingsDraft(currentEvents?.new_buildings ?? []);
      setDemolishedBuildingsDraft(currentEvents?.demolished_buildings ?? []);
      setPanelError(null);
    } catch (error) {
      setBuildingEventsModalOpen(false);
      setPanelError(getErrorMessage(error, 'Failed to open building editor.'));
    }
  };

  const handleSaveBuildingEvents = async () => {
    if (!selectedPathway || activeEditorYear == null) {
      return;
    }

    await startPanelJob({
      script: 'pathway-update-building-events',
      parameters: {
        scenario: scenarioPath,
        existing_pathway_name: selectedPathway,
        year_of_state: activeEditorYear,
        new_buildings: newBuildingsDraft,
        demolished_buildings: demolishedBuildingsDraft,
      },
      busyKey: 'save-building-events',
      startedMessage:
        `Building-events job started for ${activeEditorYear}. Open Job Info in the status bar for details.`,
      failedToStartMessage: 'Failed to start the building-events job.',
      completionMessage: `Updated building changes for ${activeEditorYear}.`,
      failureMessage:
        'Saving building changes failed. Open Job Info in the status bar for details.',
      preferredPathway: selectedPathway,
      preferredYear: activeEditorYear,
      onSuccess: 'saved-building-events',
    });
  };

  const handleOpenTemplateEditor = async (targetYear = activeEditorYear) => {
    if (!selectedPathway || targetYear == null) {
      return;
    }

    setEditorTargetYear(targetYear);
    setCreateYearModalOpen(false);
    setTemplateModalOpen(true);
    try {
      await ensureEditorOptions(selectedPathway, targetYear);
      setSelectedTemplatesDraft([]);
      setPanelError(null);
    } catch (error) {
      setTemplateModalOpen(false);
      setPanelError(getErrorMessage(error, 'Failed to open template editor.'));
    }
  };

  const handleSaveTemplates = async () => {
    if (!selectedPathway || activeEditorYear == null) {
      return;
    }

    await startPanelJob({
      script: 'pathway-events-apply-templates',
      parameters: {
        scenario: scenarioPath,
        existing_pathway_name: selectedPathway,
        year_of_state: activeEditorYear,
        intervention_templates: selectedTemplatesDraft,
      },
      busyKey: 'save-templates',
      startedMessage:
        `Template job started for ${activeEditorYear}. Open Job Info in the status bar for details.`,
      failedToStartMessage: 'Failed to start the template job.',
      completionMessage: `Applied templates to ${activeEditorYear}.`,
      failureMessage:
        'Applying templates failed. Open Job Info in the status bar for details.',
      preferredPathway: selectedPathway,
      preferredYear: activeEditorYear,
      onSuccess: 'saved-templates',
    });
  };

  const handleOpenYamlDrawer = async (targetYear = activeEditorYear) => {
    if (!selectedPathway || targetYear == null) {
      return;
    }
    setEditorTargetYear(targetYear);
    setCreateYearModalOpen(false);
    setYamlEditEnabled(false);
    setYamlDrawerOpen(true);
    setYamlDrawerLoading(true);
    setYamlDraft(getInitialYamlDraft(activeRowByYear.get(targetYear) ?? null));

    try {
      const data = await ensureEditorOptions(selectedPathway, targetYear);
      const savedYaml = data?.yaml_preview;
      if (
        typeof savedYaml === 'string' &&
        !savedYaml.startsWith('# No explicit YAML')
      ) {
        setYamlDraft(savedYaml);
      } else {
        setYamlDraft(
          getInitialYamlDraft(activeRowByYear.get(targetYear) ?? null),
        );
      }
      setPanelError(null);
    } catch (error) {
      setYamlDrawerOpen(false);
      setPanelError(getErrorMessage(error, 'Failed to open the YAML editor.'));
    } finally {
      setYamlDrawerLoading(false);
    }
  };

  const handleSaveYaml = async () => {
    if (!selectedPathway || activeEditorYear == null) {
      return;
    }

    await startPanelJob({
      script: 'pathway-save-yaml',
      parameters: {
        scenario: scenarioPath,
        existing_pathway_name: selectedPathway,
        year_of_state: activeEditorYear,
        raw_yaml: yamlDraft,
      },
      busyKey: 'save-yaml',
      startedMessage:
        `Save-YAML job started for ${activeEditorYear}. Open Job Info in the status bar for details.`,
      failedToStartMessage: 'Failed to start the save-YAML job.',
      completionMessage: `Saved YAML for ${activeEditorYear}.`,
      failureMessage:
        'Saving YAML failed. Open Job Info in the status bar for details.',
      preferredPathway: selectedPathway,
      preferredYear: activeEditorYear,
      onSuccess: 'saved-yaml',
    });
  };

  const handleValidateState = async () => {
    if (!selectedPathway || !selectedRow) {
      return;
    }

    await startPanelJob({
      script: 'pathway-validate-state',
      parameters: {
        scenario: scenarioPath,
        existing_pathway_name: selectedPathway,
        year_of_state: selectedRow.year,
      },
      busyKey: 'validate-state',
      startedMessage:
        `Validation job started for ${selectedRow.year}. Open Job Info in the status bar for details.`,
      failedToStartMessage: 'Failed to start the validation job.',
      completionMessage: `Validated state ${selectedRow.year}.`,
      failureMessage:
        'Validation reported issues. Open Job Info in the status bar for details.',
      preferredPathway: selectedPathway,
      preferredYear: selectedRow.year,
    });
  };

  const handleOpenTemplateTool = () => {
    setSelectedTool('pathway-intervention-templates-define');
    setToolType(toolTypes.TOOLS);
  };

  const handleDeleteTemplate = (templateName) => {
    if (!selectedPathway || !templateName) {
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
          await deleteInterventionTemplate(selectedPathway, templateName);
          await loadTemplates(selectedPathway);
        } catch (error) {
          setPanelError(
            getErrorMessage(error, 'Failed to delete intervention template.'),
          );
        }
      },
    });
  };

  const totalTimelineHeight =
    RULER_HEIGHT +
    overviewPathways.reduce(
      (sum, pathway) =>
        sum + getLaneHeight(pathway.pathway_name === selectedPathway),
      0,
    );
  const timelineViewportHeight = Math.min(
    Math.max(totalTimelineHeight, 160),
    RULER_HEIGHT +
      ACTIVE_LANE_HEIGHT +
      INACTIVE_LANE_HEIGHT *
        Math.max(
          Math.min(overviewPathways.length, MAX_VISIBLE_TIMELINE_LANES) - 1,
          0,
        ) +
      8,
  );

  useEffect(() => {
    const viewport = laneStackScrollRef.current;
    if (
      !viewport ||
      !selectedPathway ||
      overviewPathways.length <= MAX_VISIBLE_TIMELINE_LANES
    ) {
      return;
    }

    const selectedIndex = overviewPathways.findIndex(
      (pathway) => pathway.pathway_name === selectedPathway,
    );
    if (selectedIndex < 0) {
      return;
    }

    const laneTop = RULER_HEIGHT + selectedIndex * INACTIVE_LANE_HEIGHT;
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
  }, [overviewPathways, selectedPathway]);

  const renderNodeTooltip = (pathwayName, year, row, active) => {
    if (!active) {
      return (
        <div style={{ maxWidth: 220 }}>
          <Text strong style={{ display: 'block', color: '#0F172A' }}>
            {pathwayName}
          </Text>
          <Text style={{ fontSize: 12, color: '#475569' }}>
            {year} state year
          </Text>
        </div>
      );
    }

    return (
      <div style={{ maxWidth: 300, color: '#0F172A' }}>
        <Text strong style={{ display: 'block', color: '#0F172A' }}>
          {row.year} | {getYearLabel(row)}
        </Text>
        <Text
          style={{
            display: 'block',
            fontSize: 12,
            color: '#475569',
            marginTop: 2,
          }}
        >
          {row.summary?.text ?? 'No summary available.'}
        </Text>

        <div
          style={{
            display: 'grid',
            gap: 6,
            marginTop: 10,
            fontSize: 12,
            color: '#334155',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <span>Validation</span>
            <strong>{row.status?.validation?.label ?? 'Unknown'}</strong>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <span>Bake</span>
            <strong>{row.status?.bake?.label ?? 'Unknown'}</strong>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <span>Simulation</span>
            <strong>{row.status?.simulation?.label ?? 'Unknown'}</strong>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
            marginTop: 10,
          }}
        >
          <span
            style={{
              padding: '4px 8px',
              borderRadius: 999,
              background: 'rgba(38, 89, 160, 0.1)',
              color: '#2659A0',
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            {row.summary?.modification_count ?? 0} changes
          </span>
          <span
            style={{
              padding: '4px 8px',
              borderRadius: 999,
              background: 'rgba(47, 133, 90, 0.12)',
              color: '#2F855A',
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            {row.summary?.new_buildings_count ?? 0} added
          </span>
          <span
            style={{
              padding: '4px 8px',
              borderRadius: 999,
              background: 'rgba(180, 83, 9, 0.12)',
              color: '#B45309',
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            {row.summary?.demolished_buildings_count ?? 0} demolished
          </span>
        </div>

        <Text
          style={{
            display: 'block',
            marginTop: 10,
            fontSize: 11,
            color: '#64748B',
          }}
        >
          Last updated {formatCompactTimestamp(row.latest_modified_at)}
        </Text>
      </div>
    );
  };

  return (
    <div
      style={{
        height: '100%',
        minHeight: 360,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        padding: expanded ? '8px 16px 20px' : '4px 12px 16px',
        background: '#FFFFFF',
        overflow: 'hidden',
        borderRadius: 'inherit',
      }}
    >
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
            overviewPathways={overviewPathways}
            onSelectPathway={(pathwayName) =>
              void handleSelectPathway(pathwayName)
            }
            onDeletePathway={handleDeletePathwayByName}
            onCreatePathway={handleStartCreatePathway}
            loading={loadingOverview}
          />
          <div className="cea-card-icon-button-container">
            <Tooltip title="Create new pathway" placement="bottom">
              <Button
                icon={<CreateNewIcon />}
                type="text"
                loading={busyAction === 'create-pathway'}
                onClick={handleStartCreatePathway}
              />
            </Tooltip>
          </div>
          <Divider type="vertical" style={{ height: 24, margin: 0 }} />
          <TemplateSelect
            templates={templateNames}
            onDeleteTemplate={handleDeleteTemplate}
            onCreateTemplate={handleOpenTemplateTool}
            loading={loadingTemplates}
          />
          <div className="cea-card-icon-button-container">
            <Tooltip title="Define intervention template" placement="bottom">
              <Button
                icon={<CreateNewIcon />}
                type="text"
                onClick={handleOpenTemplateTool}
              />
            </Tooltip>
          </div>
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
              <Tooltip title="Refresh" placement="bottom">
                <Button
                  icon={<RefreshIcon />}
                  type="text"
                  loading={loadingOverview || loadingTimeline}
                  onClick={() => refreshPathwayData()}
                />
              </Tooltip>
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              flexWrap: 'wrap',
              justifyContent: 'flex-end',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <InputNumber
                size="small"
                placeholder="Year"
                precision={0}
                value={newYearValue}
                onChange={setNewYearValue}
                style={{ width: 96 }}
                disabled={!selectedPathway}
              />
              <Button
                size="small"
                type="primary"
                icon={<PlusOutlined />}
                disabled={!selectedPathway}
                loading={busyAction === 'add-year'}
                onClick={handleAddYear}
              >
                Add state
              </Button>
            </div>
            <Button
              size="small"
              icon={<CheckCircleOutlined />}
              disabled={!selectedPathway}
              loading={busyAction === 'pathway-validate-all-states'}
              onClick={() => handleRunPathwayJob('pathway-validate-all-states')}
            >
              Validate all states
            </Button>
            <Button
              size="small"
              icon={<BuildOutlined />}
              disabled={!selectedPathway}
              loading={busyAction === 'bake-pathway-states'}
              onClick={() => handleRunPathwayJob('bake-pathway-states')}
            >
              Bake states
            </Button>
            <Button
              size="small"
              icon={<RocketOutlined />}
              disabled={!selectedPathway}
              loading={busyAction === 'pathway-simulations'}
              onClick={() => handleRunPathwayJob('pathway-simulations')}
            >
              Simulate pathway
            </Button>
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
            gap: 12,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <LegendChip colour={STATUS_FILL.none} label="Draft or not baked" />
            <LegendChip colour={STATUS_FILL.baked} label="Baked" />
            <LegendChip colour={STATUS_FILL.simulated} label="Simulated" />
            <LegendChip
              colour={STATUS_FILL.none}
              label="Changed after confirmation"
              halo="rgba(217, 119, 6, 0.18)"
            />
            <LegendChip
              colour={STATUS_FILL.none}
              label="Validation issue"
              outline={STATUS_ACCENT.error}
            />
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              minWidth: 260,
              flex: '0 1 320px',
            }}
          >
            <Text style={{ color: '#475569', fontSize: 12 }}>Zoom</Text>
            <Slider
              min={ZOOM_MIN}
              max={ZOOM_MAX}
              step={0.25}
              value={zoomLevel}
              tooltip={{ formatter: (value) => `${value}x` }}
              onChange={(value) =>
                setZoomLevel(Array.isArray(value) ? value[0] : value)
              }
              style={{ margin: 0, flex: 1 }}
            />
          </div>
        </div>

        <div
          style={{
            border: '1px solid rgba(148, 163, 184, 0.22)',
            borderRadius: 18,
            background:
              'linear-gradient(180deg, rgba(248, 250, 252, 0.88) 0%, rgba(255, 255, 255, 0.98) 100%)',
            overflow: 'hidden',
          }}
        >
          {loadingOverview && !overview ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 180,
              }}
            >
              <Spin />
            </div>
          ) : overviewPathways.length === 0 ? (
            <div style={{ padding: 32 }}>
              <Empty
                description="No pathways yet"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
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
                  gridTemplateColumns: `${LABEL_COLUMN_WIDTH}px minmax(0, 1fr)`,
                  minHeight: Math.max(totalTimelineHeight, 160),
                }}
              >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  borderRight: '1px solid rgba(148, 163, 184, 0.18)',
                  background:
                    'linear-gradient(180deg, rgba(248, 251, 255, 0.96) 0%, rgba(255, 255, 255, 0.9) 100%)',
                }}
              >
                <div
                  style={{
                    height: RULER_HEIGHT,
                    padding: '4px 16px 0',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      letterSpacing: 1,
                      textTransform: 'uppercase',
                      color: '#64748B',
                    }}
                  >
                    Pathways
                  </Text>
                </div>

                {overviewPathways.map((pathway) => {
                  const active = pathway.pathway_name === selectedPathway;
                  return (
                    <button
                      key={`label-${pathway.pathway_name}`}
                      type="button"
                      onClick={() => void handleSelectPathway(pathway.pathway_name)}
                      style={{
                        height: getLaneHeight(active),
                        padding: active ? '0 16px' : '0 18px',
                        background: active
                          ? 'rgba(38, 89, 160, 0.08)'
                          : 'transparent',
                        border: 'none',
                        borderLeft: active
                          ? '4px solid #2659A0'
                          : '4px solid transparent',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'background 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        width: '100%',
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
                            fontWeight: active ? 600 : 500,
                            color: active ? '#0F172A' : '#475569',
                          }}
                        >
                          {pathway.pathway_name}
                        </div>
                        <Text
                          style={{
                            fontSize: 11,
                            color: active ? '#2659A0' : '#94A3B8',
                          }}
                        >
                          {pathway.state_count}
                        </Text>
                      </div>
                    </button>
                  );
                })}
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
                            top: 2,
                            transform: 'translateX(-50%)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 2,
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

                    {overviewPathways.map((pathway) => {
                      const active = pathway.pathway_name === selectedPathway;
                      const laneYears = active
                        ? activeRows.map((row) => row.year)
                        : pathway.years;
                      const laneHeight = getLaneHeight(active);

                      return (
                        <div
                          key={`lane-${pathway.pathway_name}`}
                          style={{
                            position: 'relative',
                            height: laneHeight,
                            background: active
                              ? 'linear-gradient(90deg, rgba(38, 89, 160, 0.04) 0%, rgba(255, 255, 255, 0) 55%)'
                              : 'transparent',
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
                              height: active ? 3 : 2,
                              background: active
                                ? 'linear-gradient(90deg, rgba(38, 89, 160, 0.52) 0%, rgba(38, 89, 160, 0.18) 100%)'
                                : 'rgba(203, 213, 225, 0.8)',
                              borderRadius: 999,
                            }}
                          />
                          {laneYears.map((year) => {
                            const row = active ? activeRowByYear.get(year) : null;
                            const nodeSize = getNodeSize(row, active);
                            const selected = active && selectedYear === year;
                            const validationError =
                              active && row?.validation?.status === 'error';
                            const nodeFill = active ? getNodeFill(row) : '#D7DDE7';

                            return (
                              <Tooltip
                                {...TIMELINE_TOOLTIP_PROPS}
                                key={`${pathway.pathway_name}-${year}`}
                                title={renderNodeTooltip(
                                  pathway.pathway_name,
                                  year,
                                  row,
                                  active,
                                )}
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (active) {
                                      handleSelectYear(year);
                                      return;
                                    }
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
                                    border: active
                                      ? `2px solid ${
                                          validationError
                                            ? STATUS_ACCENT.error
                                            : '#FFFFFF'
                                        }`
                                      : '1px solid rgba(148, 163, 184, 0.55)',
                                    background: nodeFill,
                                    cursor: 'pointer',
                                    boxShadow: active
                                      ? [
                                          row?.status?.has_stale_phase
                                            ? '0 0 0 6px rgba(217, 119, 6, 0.18)'
                                            : null,
                                          selected
                                            ? '0 0 0 8px rgba(38, 89, 160, 0.14)'
                                            : null,
                                          '0 4px 10px rgba(15, 23, 42, 0.12)',
                                        ]
                                          .filter(Boolean)
                                          .join(', ')
                                      : 'none',
                                    padding: 0,
                                  }}
                                  aria-label={`${pathway.pathway_name} ${year}`}
                                />
                              </Tooltip>
                            );
                          })}
                        </div>
                      );
                    })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

      <div
        style={{
          minHeight: 0,
          flex: 1,
          display: 'grid',
          gridTemplateColumns: 'minmax(320px, 1.2fr) minmax(280px, 1fr)',
          gap: 14,
          alignItems: 'stretch',
        }}
      >
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
          {!selectedRow ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="Select a pathway year to inspect it"
            />
          ) : (
            <>
              <div
                style={{
                  display: 'flex',
                  gap: 12,
                  alignItems: 'flex-start',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Title level={4} style={{ margin: 0 }}>
                      {selectedRow.year}
                    </Title>
                    <div
                      style={{
                        borderRadius: 999,
                        padding: '4px 10px',
                        background:
                          selectedRow.state_kind === 'mixed'
                            ? 'rgba(38, 89, 160, 0.12)'
                            : selectedRow.state_kind === 'manual'
                              ? 'rgba(15, 118, 110, 0.12)'
                              : 'rgba(148, 163, 184, 0.16)',
                        color:
                          selectedRow.state_kind === 'mixed'
                            ? '#2659A0'
                            : selectedRow.state_kind === 'manual'
                              ? '#0F766E'
                              : '#475569',
                        fontSize: 12,
                        fontWeight: 600,
                        textTransform: 'capitalize',
                      }}
                    >
                      {selectedRow.state_kind}
                    </div>
                  </div>
                  <Text style={{ color: '#475569' }}>
                    {selectedRow.summary?.text ?? 'No summary available.'}
                  </Text>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 8,
                  paddingTop: 2,
                }}
              >
                <Button
                  size="small"
                  icon={<BuildOutlined />}
                  onClick={handleOpenBuildingEventsEditor}
                >
                  Building events
                </Button>
                <Button
                  size="small"
                  icon={<ToolOutlined />}
                  onClick={handleOpenTemplateEditor}
                >
                  Apply templates
                </Button>
                <Button
                  size="small"
                  icon={<CheckCircleOutlined />}
                  loading={busyAction === 'validate-state'}
                  disabled={!selectedRow.has_state_folder}
                  onClick={handleValidateState}
                >
                  Validate state
                </Button>
                {selectedRow.can_delete || selectedRow.can_clear_manual_changes ? (
                  <Button
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    loading={busyAction === 'delete-year'}
                    onClick={handleDeleteSelectedYear}
                  >
                    {selectedRow.can_clear_manual_changes
                      ? 'Clear manual changes'
                      : 'Delete state'}
                  </Button>
                ) : null}
              </div>

              {selectedRow.state_kind === 'stock' && !selectedRow.exists_in_log ? (
                <Alert
                  type="info"
                  showIcon
                  message="This is a stock-only year."
                  description="Use Building events, Apply templates, or Edit YAML to add real edits. Empty placeholders are intentionally blocked for stock years."
                  style={{ borderRadius: 12 }}
                />
              ) : null}

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

              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 8,
                }}
              >
                <Text style={{ color: '#64748B', fontSize: 12 }}>
                  Validation:{' '}
                  <Text strong style={{ color: '#0F172A', fontSize: 12 }}>
                    {selectedRow.status?.validation?.label ?? 'Unknown'}
                  </Text>
                </Text>
                <Text style={{ color: '#64748B', fontSize: 12 }}>
                  Bake:{' '}
                  <Text strong style={{ color: '#0F172A', fontSize: 12 }}>
                    {selectedRow.status?.bake?.label ?? 'Unknown'}
                  </Text>
                </Text>
                <Text style={{ color: '#64748B', fontSize: 12 }}>
                  Simulation:{' '}
                  <Text strong style={{ color: '#0F172A', fontSize: 12 }}>
                    {selectedRow.status?.simulation?.label ?? 'Unknown'}
                  </Text>
                </Text>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: 12,
                }}
              >
                <SectionCard
                  title="Building changes"
                  content={<BuildingChangesSummary row={selectedRow} />}
                />
                <SectionCard
                  title="Modification summary"
                  content={<ModificationSummary row={selectedRow} />}
                />
              </div>

            </>
          )}
        </div>

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
            overflow: 'visible',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div>
              <Text
                style={{
                  display: 'block',
                  color: '#64748B',
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  fontSize: 11,
                }}
              >
                YAML preview
              </Text>
              <Text style={{ color: '#475569' }}>
                Colourised preview of the current explicit log entry.
              </Text>
            </div>
            {selectedRow ? (
              <Button
                size="small"
                icon={<EditOutlined />}
                onClick={() => void handleOpenYamlDrawer()}
              >
                YAML edit
              </Button>
            ) : null}
          </div>

          <div style={{ display: 'flex', paddingBottom: 6 }}>
            <YamlPreview
              value={selectedRow?.yaml_preview}
              minHeight={expanded ? 220 : 180}
              scrollable={false}
            />
          </div>
        </div>
      </div>

      </div>

      </div>

      <Modal
        title={
          activeEditorYear != null
            ? `Add state | ${selectedPathway} | ${activeEditorYear}`
            : 'Add state'
        }
        open={createYearModalOpen}
        footer={null}
        onCancel={() => {
          setCreateYearModalOpen(false);
          setEditorTargetYear(null);
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Text style={{ color: '#475569' }}>
            This year will only be saved after you make a real change. Choose
            the first edit you want to apply.
          </Text>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <Button
              icon={<BuildOutlined />}
              onClick={() => void handleOpenBuildingEventsEditor(activeEditorYear)}
            >
              Building events
            </Button>
            <Button
              icon={<ToolOutlined />}
              onClick={() => void handleOpenTemplateEditor(activeEditorYear)}
            >
              Apply templates
            </Button>
            <Button
              icon={<FileTextOutlined />}
              onClick={() => void handleOpenYamlDrawer(activeEditorYear)}
            >
              Edit YAML
            </Button>
          </div>
          <Text style={{ fontSize: 12, color: '#64748B' }}>
            Empty placeholder years are no longer created. The year appears in
            the timeline only after the first successful save.
          </Text>
        </div>
      </Modal>

      <Modal
        title={
          activeEditorYear != null
            ? `Building events | ${selectedPathway} | ${activeEditorYear}`
            : 'Building events'
        }
        open={buildingEventsModalOpen}
        onCancel={() => {
          setBuildingEventsModalOpen(false);
          setEditorTargetYear(null);
        }}
        onOk={handleSaveBuildingEvents}
        okText="Save building changes"
        confirmLoading={busyAction === 'save-building-events'}
      >
        {editorOptionsLoading ? (
          <div style={{ padding: '24px 0', textAlign: 'center' }}>
            <Spin />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>
                Add buildings
              </Text>
              <Select
                mode="multiple"
                allowClear
                style={{ width: '100%' }}
                placeholder="Select buildings to add in this year"
                value={newBuildingsDraft}
                options={toOptionList(editorOptions?.available_new_buildings)}
                onChange={setNewBuildingsDraft}
                optionFilterProp="label"
              />
            </div>
            <div>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>
                Demolish buildings
              </Text>
              <Select
                mode="multiple"
                allowClear
                style={{ width: '100%' }}
                placeholder="Select buildings to remove in this year"
                value={demolishedBuildingsDraft}
                options={toOptionList(
                  editorOptions?.available_demolished_buildings,
                )}
                onChange={setDemolishedBuildingsDraft}
                optionFilterProp="label"
              />
            </div>
          </div>
        )}
      </Modal>

      <Modal
        title={
          activeEditorYear != null
            ? `Apply templates | ${selectedPathway} | ${activeEditorYear}`
            : 'Apply templates'
        }
        open={templateModalOpen}
        onCancel={() => {
          setTemplateModalOpen(false);
          setEditorTargetYear(null);
        }}
        onOk={handleSaveTemplates}
        okText="Apply templates"
        okButtonProps={{ disabled: !selectedTemplatesDraft.length }}
        confirmLoading={busyAction === 'save-templates'}
      >
        {editorOptionsLoading ? (
          <div style={{ padding: '24px 0', textAlign: 'center' }}>
            <Spin />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Text style={{ color: '#475569' }}>
              This is the Step 2 flow for the selected year. Choose one or more
              reusable intervention templates to merge into the year entry.
            </Text>
            <Select
              mode="multiple"
              allowClear
              style={{ width: '100%' }}
              placeholder="Select intervention templates"
              value={selectedTemplatesDraft}
              options={toOptionList(editorOptions?.available_templates)}
              onChange={setSelectedTemplatesDraft}
              optionFilterProp="label"
            />
            <div
              style={{
                borderRadius: 12,
                border: '1px solid rgba(148, 163, 184, 0.2)',
                background: '#F8FAFC',
                padding: 12,
              }}
            >
              <Text strong style={{ display: 'block', marginBottom: 4 }}>
                Current year summary
              </Text>
              <Text style={{ color: '#475569' }}>
                {activeEditorRow?.summary?.text ??
                  'This year will be created when the first real change is saved.'}
              </Text>
            </div>
          </div>
        )}
      </Modal>

      <Drawer
        title={
          activeEditorYear != null
            ? `YAML edit | ${selectedPathway} | ${activeEditorYear}`
            : 'YAML edit'
        }
        placement="right"
        width={460}
        styles={{
          body: {
            display: 'flex',
            flexDirection: 'column',
          },
        }}
        open={yamlDrawerOpen}
        onClose={() => {
          setYamlDrawerOpen(false);
          setYamlDrawerLoading(false);
          setYamlEditEnabled(false);
          setEditorTargetYear(null);
        }}
        extra={
          <Button
            type="primary"
            icon={<FileTextOutlined />}
            disabled={!yamlEditEnabled}
            loading={busyAction === 'save-yaml'}
            onClick={handleSaveYaml}
          >
            Save YAML
          </Button>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minHeight: '100%' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div>
              <Text strong style={{ display: 'block' }}>
                Live preview
              </Text>
              <Text style={{ color: '#64748B', fontSize: 12 }}>
                The panel preview shows the last saved YAML. This preview updates
                live while you edit the current draft.
              </Text>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Button
                size="small"
                icon={<EditOutlined />}
                onClick={() => setYamlEditEnabled((current) => !current)}
                style={{ whiteSpace: 'nowrap' }}
              >
                {yamlEditEnabled ? 'Preview only' : 'Enable editing'}
              </Button>
            </div>
          </div>

          {yamlDrawerLoading ? (
            <div
              style={{
                minHeight: 220,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Spin />
            </div>
          ) : (
            <>
              <div style={{ minHeight: 0, display: 'flex' }}>
                <YamlPreview value={yamlDraft} fill minHeight={260} />
              </div>

              {yamlEditEnabled ? (
                <Input.TextArea
                  value={yamlDraft}
                  onChange={(event) => setYamlDraft(event.target.value)}
                  onKeyDown={(event) =>
                    handleYamlTextareaKeyDown(
                      event,
                      yamlDraft,
                      setYamlDraft,
                    )
                  }
                  autoSize={{ minRows: 14, maxRows: 24 }}
                  spellCheck={false}
                  style={{
                    fontFamily:
                      '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
                  }}
                />
              ) : null}
            </>
          )}
        </div>
      </Drawer>
    </div>
  );
};

export default PathwayPanel;
