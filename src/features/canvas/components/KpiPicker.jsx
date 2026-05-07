/**
 * Single-pick KPI picker with optional step-2 parameter form.
 *
 *   <KpiPicker
 *     open={anchor !== null}
 *     onCancel={() => setAnchor(null)}
 *     onConfirm={(kpiId, locatorArgs) => addOrReplaceCard(anchor, kpiId, locatorArgs)}
 *     project={project}
 *     scenario={scenarioPath}
 *     initialFeature={null}     // optional — pre-expand a group
 *     initialKpiId={null}       // optional — pre-select on open
 *   />
 *
 * Flow:
 *   Step 1 — pick a KPI (radio, single-select). Hierarchy follows
 *            `PLOT_GROUPS` so the picker matches the canvas's plot
 *            taxonomy. The Next/Add button label flips based on
 *            whether the chosen KPI declares any user-configurable
 *            parameters in its yml `source.parameters` block.
 *   Step 2 — only when the chosen KPI has parameters. Renders a
 *            form with one antd `Select` per parameter, populated
 *            from `GET /api/kpis/<id>/parameters` (which calls the
 *            backend's option generators against the active
 *            scenario). Confirm fires
 *            `onConfirm(kpiId, locatorArgsObject)`.
 *
 * Reset semantics: every modal open resets to step 1 with no
 * parameter pre-fill, even when the caller passes
 * `initialKpiId` (Replace flow). Per the locked product decision
 * 2026-05-07: KPIs are the unit, params reset to defaults on
 * Replace.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Collapse,
  ConfigProvider,
  Modal,
  Radio,
  Select,
  Spin,
} from 'antd';
import { LeftOutlined } from '@ant-design/icons';

import { CEA_PURPLE } from 'constants/theme';
import { PLOT_GROUPS } from 'features/plots/constants';

import {
  useFetchKpiParameters,
  useFetchKpiRegistry,
} from '../hooks/useFetchKpis';

const KpiPicker = ({
  open,
  onCancel,
  onConfirm,
  project,
  scenario,
  initialFeature = null,
  initialKpiId = null,
}) => {
  const { data, isLoading, isError, error } = useFetchKpiRegistry();
  const allKpis = data?.kpis ?? [];

  // Step 1: which KPI is currently radio-selected. Step 2: which
  // KPI we've committed to (locked) and are gathering params for.
  const [selectedId, setSelectedId] = useState(null);
  const [step, setStep] = useState(1);
  // Locator-args form state in step 2. Keys mirror the backend's
  // `parameters` map; values are whatever the user picked. Null /
  // empty seeds the resolver's yml defaults.
  const [argsDraft, setArgsDraft] = useState({});

  useEffect(() => {
    if (!open) return;
    setSelectedId(initialKpiId ?? null);
    setStep(1);
    setArgsDraft({});
  }, [open, initialKpiId]);

  // Pull the picked KPI's metadata out of the flat registry for
  // step-1 button label decisions ("Next" if it has params,
  // "Add KPI" otherwise).
  const selectedKpi = useMemo(
    () => allKpis.find((k) => k.id === selectedId) ?? null,
    [allKpis, selectedId],
  );

  // Reorganise the flat KPI list into the same hierarchy
  // `FeatureCardPlot` uses (PLOT_GROUPS in features/plots/constants).
  // Empty groups are filtered out so the modal only shows
  // sections that actually have something pickable.
  const visibleGroups = useMemo(
    () => buildVisibleGroups(PLOT_GROUPS, allKpis),
    [allKpis],
  );

  // First non-empty group opens by default. When `initialFeature`
  // is set (legacy "feature focus" landing — kept for back-compat
  // with the OverviewCard ribbon's old click-to-edit path), pre-
  // expand the matching group instead.
  const [activeKeys, setActiveKeys] = useState([]);
  useEffect(() => {
    if (!open || visibleGroups.length === 0) return;
    if (initialFeature) {
      const match = findGroupForFeature(visibleGroups, initialFeature);
      if (match) {
        setActiveKeys([match.key]);
        return;
      }
    }
    setActiveKeys([visibleGroups[0].key]);
  }, [open, visibleGroups, initialFeature]);

  // Step 2 — fetch the parameter schema (label + choices) for
  // the picked KPI. Only enabled once the user advances past step
  // 1, so no wasteful fetches when the user is browsing step 1.
  const {
    data: paramsData,
    isLoading: paramsLoading,
    isError: paramsError,
  } = useFetchKpiParameters({
    project,
    scenario,
    kpiId: step === 2 ? selectedId : null,
  });
  const paramSpec = paramsData?.parameters ?? {};
  const paramKeys = Object.keys(paramSpec);

  // Pre-fill draft with defaults when the spec arrives so the
  // user sees something selected. The user can still change any
  // value via the dropdowns.
  useEffect(() => {
    if (step !== 2 || paramKeys.length === 0) return;
    setArgsDraft((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const key of paramKeys) {
        if (next[key] == null && paramSpec[key]?.default != null) {
          next[key] = paramSpec[key].default;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [step, paramSpec, paramKeys]);

  const items = useMemo(
    () =>
      visibleGroups.map((group) => ({
        key: group.key,
        label: (
          <span style={groupHeaderStyle}>
            {group.icon && <group.icon style={groupIconStyle} aria-hidden />}
            {group.label}
          </span>
        ),
        children: (
          <Radio.Group
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            style={{ display: 'block', width: '100%' }}
          >
            <div style={groupBodyStyle}>
              {group.subgroups.map((sub) => (
                <div key={sub.key} style={subgroupStyle}>
                  {sub.label && (
                    <div style={subgroupHeaderStyle}>{sub.label}</div>
                  )}
                  <div style={kpiListStyle}>
                    {sub.kpis.map((kpi) => (
                      <KpiRow key={kpi.id} kpi={kpi} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Radio.Group>
        ),
      })),
    [visibleGroups, selectedId],
  );

  // `has_parameters` comes from the registry endpoint per KPI —
  // drives whether step 1's confirm button reads "Next" (advance
  // to step 2) or "Add KPI" (commit straight away). `hasParams`
  // is only meaningful in step 2 once the parameters endpoint
  // has resolved its choices.
  const selectedHasYmlParams = !!selectedKpi?.has_parameters;
  const hasParams = paramKeys.length > 0;

  const handleNext = () => {
    if (!selectedId) return;
    setStep(2);
  };

  const handleConfirm = () => {
    if (!selectedId) return;
    if (step === 2 && hasParams) {
      // Strip empty / null entries — resolver's merge_locator_args
      // already drops nulls but keeping the wire payload tight is
      // cheap and survives schema-version skew.
      const args = {};
      for (const key of paramKeys) {
        const val = argsDraft[key];
        if (val !== undefined && val !== null && val !== '') {
          args[key] = val;
        }
      }
      onConfirm(selectedId, Object.keys(args).length ? args : null);
    } else {
      onConfirm(selectedId, null);
    }
  };

  // Step-1 confirm button: "Next" when the picked KPI has
  // parameters (will advance to step 2), "Add KPI" otherwise
  // (commit straight away). Disabled until the user picks one.
  const step1Label = !selectedId
    ? 'Add KPI'
    : selectedHasYmlParams
      ? 'Next'
      : 'Add KPI';

  const isStep1 = step === 1;

  return (
    <ConfigProvider theme={{ token: { colorPrimary: CEA_PURPLE } }}>
      <Modal
        title={
          isStep1 ? 'Add KPI card' : `Configure ${selectedKpi?.label ?? 'KPI'}`
        }
        open={open}
        onCancel={onCancel}
        width={640}
        destroyOnHidden
        footer={
          <FooterButtons
            isStep1={isStep1}
            canNext={!!selectedId && !isLoading}
            canConfirm={!!selectedId}
            onCancel={onCancel}
            onBack={() => setStep(1)}
            onNext={handleNext}
            onConfirm={handleConfirm}
            step1Label={step1Label}
          />
        }
      >
        {isLoading && (
          <div style={loadingStyle}>
            <Spin />
          </div>
        )}
        {isError && (
          <Alert
            type="error"
            message="Could not load KPI catalogue"
            description={error?.message ?? 'Unknown error'}
            showIcon
          />
        )}
        {!isLoading && !isError && visibleGroups.length === 0 && (
          <Alert
            type="info"
            message="No KPIs registered"
            description="Add yml entries under cea/kpi/definitions/ to populate the picker."
            showIcon
          />
        )}
        {!isLoading && !isError && visibleGroups.length > 0 && isStep1 && (
          <Collapse
            items={items}
            accordion
            activeKey={activeKeys}
            onChange={(key) =>
              setActiveKeys(Array.isArray(key) ? key : key ? [key] : [])
            }
            bordered={false}
            ghost
          />
        )}
        {!isStep1 && (
          <ParameterForm
            kpi={selectedKpi}
            paramSpec={paramSpec}
            paramsLoading={paramsLoading}
            paramsError={paramsError}
            value={argsDraft}
            onChange={setArgsDraft}
          />
        )}
      </Modal>
    </ConfigProvider>
  );
};

// ── Subcomponents ──────────────────────────────────────────────────

// Step-1 row: a single KPI choice rendered as a Radio entry. The
// surrounding Radio.Group manages selection state.
const KpiRow = ({ kpi }) => (
  <label style={rowStyle}>
    <Radio value={kpi.id} style={{ marginRight: 0 }} />
    <div style={rowTextStyle}>
      <div style={rowLabelLineStyle}>
        <span style={rowLabelStyle}>{kpi.label}</span>
        <span style={rowUnitStyle}>{kpi.unit}</span>
      </div>
      {kpi.info_note && <div style={rowInfoStyle}>{kpi.info_note}</div>}
    </div>
  </label>
);

// Step-2 form: one labelled antd Select per yml-declared
// parameter. Choices come from the backend's option generators
// (e.g. ``solar_panel_types`` scans the on-disk PV totals files).
// When the spec is empty, render a small note — should be rare
// since step 2 only opens when params exist, but defensive.
const ParameterForm = ({
  kpi,
  paramSpec,
  paramsLoading,
  paramsError,
  value,
  onChange,
}) => {
  const keys = Object.keys(paramSpec);
  if (paramsLoading) {
    return (
      <div style={loadingStyle}>
        <Spin />
      </div>
    );
  }
  if (paramsError) {
    return (
      <Alert type="error" message="Could not load KPI parameters" showIcon />
    );
  }
  if (keys.length === 0) {
    return (
      <Alert
        type="info"
        message="This KPI has no configurable parameters."
        showIcon
      />
    );
  }
  return (
    <div style={formStyle}>
      {kpi?.description && (
        <div style={formDescriptionStyle}>{kpi.description}</div>
      )}
      {keys.map((key) => {
        const param = paramSpec[key];
        const choices = param.choices ?? [];
        return (
          <div key={key} style={formRowStyle}>
            <div style={formLabelStyle}>
              <span style={formLabelTextStyle}>{param.label || key}</span>
              {param.description && (
                <span style={formLabelHintStyle}>{param.description}</span>
              )}
            </div>
            <Select
              value={value[key] ?? param.default ?? null}
              onChange={(v) => onChange((prev) => ({ ...prev, [key]: v }))}
              options={choices.map((c) => ({
                value: c.value,
                label: c.label,
              }))}
              placeholder={
                choices.length === 0
                  ? 'No options available — run upstream tool first'
                  : 'Select…'
              }
              disabled={choices.length === 0}
              style={{ width: '100%' }}
            />
          </div>
        );
      })}
    </div>
  );
};

// Modal footer: Cancel + (step-1 Next/Add | step-2 Back + Add).
// Keeping it inline so the picker's render path is one component;
// antd's default footer doesn't compose well with the multi-step
// transitions we want.
const FooterButtons = ({
  isStep1,
  canNext,
  canConfirm,
  onCancel,
  onBack,
  onNext,
  onConfirm,
  step1Label,
}) => (
  <div style={footerStyle}>
    <Button onClick={onCancel}>Cancel</Button>
    {isStep1 ? (
      <Button
        type="primary"
        onClick={
          step1Label === 'Next'
            ? onNext
            : onConfirm /* commit straight away when no params */
        }
        disabled={!canNext}
      >
        {step1Label}
      </Button>
    ) : (
      <>
        <Button icon={<LeftOutlined />} onClick={onBack}>
          Back
        </Button>
        <Button type="primary" onClick={onConfirm} disabled={!canConfirm}>
          Add KPI
        </Button>
      </>
    )}
  </div>
);

// ── Helpers ────────────────────────────────────────────────────────

// Walk PLOT_GROUPS and bucket the flat KPI list by category.
// Returns the same group/subgroup tree the multi-select picker
// used; only the row component changed (Radio instead of
// Checkbox).
const buildVisibleGroups = (plotGroups, allKpis) => {
  const byCategory = new Map();
  for (const kpi of allKpis) {
    const list = byCategory.get(kpi.category) ?? [];
    list.push(kpi);
    byCategory.set(kpi.category, list);
  }

  const collectKpisForKeys = (keys) => {
    const out = [];
    for (const key of keys ?? []) {
      const list = byCategory.get(key);
      if (list) out.push(...list);
    }
    return out;
  };

  const result = [];
  for (const group of plotGroups) {
    const subgroups = [];
    if (group.subgroups) {
      for (const sub of group.subgroups) {
        const kpis = collectKpisForKeys(sub.keys);
        if (kpis.length > 0) {
          subgroups.push({ key: sub.label, label: sub.label, kpis });
        }
      }
    } else {
      const kpis = collectKpisForKeys(group.keys);
      if (kpis.length > 0) {
        subgroups.push({ key: group.label, label: null, kpis });
      }
    }
    if (subgroups.length === 0) continue;
    result.push({
      key: group.label,
      label: group.label,
      icon: group.icon ?? null,
      subgroups,
    });
  }
  return result;
};

const findGroupForFeature = (visibleGroups, feature) => {
  if (!feature) return null;
  const prefix = `${feature}.`;
  for (const group of visibleGroups) {
    for (const sub of group.subgroups) {
      if (sub.kpis.some((k) => k.id?.startsWith(prefix))) {
        return group;
      }
    }
  }
  return null;
};

// ── Styles ──────────────────────────────────────────────────────────

const loadingStyle = {
  padding: '32px 0',
  textAlign: 'center',
};

const groupHeaderStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  fontWeight: 600,
};

const groupIconStyle = {
  fontSize: 16,
  color: '#555',
  flexShrink: 0,
};

const groupBodyStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
};

const subgroupStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
};

const subgroupHeaderStyle = {
  fontSize: 11,
  fontWeight: 600,
  color: '#666',
  textTransform: 'uppercase',
  letterSpacing: 0.4,
};

const kpiListStyle = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  columnGap: 16,
  rowGap: 8,
  paddingLeft: 4,
};

const rowStyle = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 10,
  cursor: 'pointer',
  padding: '4px 0',
};

const rowTextStyle = {
  flex: 1,
  minWidth: 0,
};

const rowLabelLineStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  flexWrap: 'wrap',
};

const rowLabelStyle = {
  fontSize: 13,
  color: '#222',
  fontWeight: 500,
};

const rowUnitStyle = {
  fontSize: 11,
  color: '#888',
};

const rowInfoStyle = {
  fontSize: 11,
  color: '#888',
  marginTop: 2,
  lineHeight: 1.3,
};

const formStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
  padding: '8px 4px',
};

const formDescriptionStyle = {
  fontSize: 12,
  color: '#666',
  lineHeight: 1.4,
};

const formRowStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
};

const formLabelStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 1,
};

const formLabelTextStyle = {
  fontSize: 12,
  fontWeight: 500,
  color: '#222',
};

const formLabelHintStyle = {
  fontSize: 11,
  color: '#888',
};

const footerStyle = {
  display: 'flex',
  gap: 8,
  justifyContent: 'flex-end',
};

export default KpiPicker;
