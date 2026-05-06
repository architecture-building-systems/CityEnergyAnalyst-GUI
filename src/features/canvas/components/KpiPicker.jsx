/**
 * Multi-select KPI picker — replaces the old per-tile "edit drawer"
 * flow for KPIs. Lives at the page level (`CanvasPage`) because
 * any perimeter `+` on any column / launch view can open it; the
 * anchor (column index + targetCardId + direction) is captured at
 * open time and replayed on confirm.
 *
 *   <KpiPicker
 *     open={anchor !== null}
 *     onCancel={() => setAnchor(null)}
 *     onConfirm={(kpiIds) => batchAdd(anchor, kpiIds)}
 *   />
 *
 * UX:
 *  - Modal (not drawer) — feels lighter for "pick something" and
 *    pairs better with the perimeter `+` flow that already opens
 *    a panel near the click.
 *  - Empty default selection (locked decision 2026-05-06). The
 *    confirm button's "Add N KPIs" label is the user's count
 *    feedback.
 *  - Headline subset isn't decorated in the picker; the
 *    distinction surfaces later (KpiRibbon under OverviewCard
 *    auto-promotes them).
 *  - Feature accordion sections; all collapsed-default would hide
 *    too much, so the first section is open and the rest closed
 *    on first render.
 *  - CEA-purple is wired through a wrapping `ConfigProvider` so
 *    every antd primitive inside the modal (Checkbox, OK button,
 *    Collapse expand chevrons) picks up the brand colour without
 *    having to override each component individually.
 *
 *  - Confirm fires `onConfirm(kpiIds)` and closes the modal. The
 *    page-level handler decides what to do with the ids.
 */

import { useEffect, useMemo, useState } from 'react';
import { Alert, Checkbox, Collapse, ConfigProvider, Modal, Spin } from 'antd';

import { CEA_PURPLE } from 'constants/theme';
import { PLOT_GROUPS } from 'features/plots/constants';

import { useFetchKpiRegistry } from '../hooks/useFetchKpis';

const KpiPicker = ({ open, onCancel, onConfirm }) => {
  const { data, isLoading, isError, error } = useFetchKpiRegistry();
  const allKpis = data?.kpis ?? [];

  // Selection state — local to the modal session. Reset to empty
  // every time the modal opens so previous picks don't leak into
  // the next add.
  const [selected, setSelected] = useState(() => new Set());
  useEffect(() => {
    if (open) setSelected(new Set());
  }, [open]);

  const selectedCount = selected.size;
  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Reorganise the flat KPI list into the same hierarchy
  // `FeatureCardPlot` uses (PLOT_GROUPS in features/plots/constants).
  // Each yml KPI's `category` field is one of the leaf plot keys
  // (`demand`, `lifecycle-emissions`, `cost-breakdown`, etc.); the
  // group / subgroup an entry belongs to is derived from
  // PLOT_GROUPS at render time, not duplicated in the picker.
  // Empty groups are filtered out so the modal only shows
  // sections that actually have something pickable.
  const visibleGroups = useMemo(
    () => buildVisibleGroups(PLOT_GROUPS, allKpis),
    [allKpis],
  );

  // First non-empty group opens by default so users see content
  // on first render. Reset whenever the modal reopens.
  const [activeKeys, setActiveKeys] = useState([]);
  useEffect(() => {
    if (open && visibleGroups.length > 0) {
      setActiveKeys([visibleGroups[0].key]);
    }
  }, [open, visibleGroups]);

  const items = useMemo(
    () =>
      visibleGroups.map((group) => ({
        key: group.key,
        label: (
          <span style={groupHeaderStyle}>
            {group.icon && (
              <group.icon style={groupIconStyle} aria-hidden />
            )}
            {group.label}
            <span style={groupCountStyle}>
              {countSelectedInGroup(selected, group)}
              /{group.totalKpis}
            </span>
          </span>
        ),
        children: (
          <div style={groupBodyStyle}>
            {group.subgroups.map((sub) => (
              <div key={sub.key} style={subgroupStyle}>
                {sub.label && (
                  <div style={subgroupHeaderStyle}>{sub.label}</div>
                )}
                <div style={kpiListStyle}>
                  {sub.kpis.map((kpi) => (
                    <KpiRow
                      key={kpi.id}
                      kpi={kpi}
                      checked={selected.has(kpi.id)}
                      onToggle={() => toggle(kpi.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ),
      })),
    [visibleGroups, selected],
  );

  const confirmLabel =
    selectedCount === 0
      ? 'Add KPIs'
      : `Add ${selectedCount} KPI${selectedCount === 1 ? '' : 's'}`;

  // `ConfigProvider` overrides antd's default blue with CEA
  // purple for every component rendered inside the modal —
  // checkbox tick, OK button background, Collapse expand-arrow
  // hover, etc. — without us having to override each component
  // individually. Same pattern `NavigatorCard.jsx` uses for the
  // toggles on the navigator.
  return (
    <ConfigProvider theme={{ token: { colorPrimary: CEA_PURPLE } }}>
      <Modal
        title="Add KPI cards"
        open={open}
        onCancel={onCancel}
        onOk={() => onConfirm(Array.from(selected))}
        okText={confirmLabel}
        okButtonProps={{ disabled: selectedCount === 0 }}
        cancelText="Cancel"
        width={520}
        destroyOnHidden
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
        {!isLoading && !isError && features.length === 0 && (
          <Alert
            type="info"
            message="No KPIs registered"
            description="Add yml entries under cea/kpi/definitions/ to populate the picker."
            showIcon
          />
        )}
        {!isLoading && !isError && features.length > 0 && (
          <Collapse
            items={items}
            activeKey={activeKeys}
            onChange={(keys) => setActiveKeys(keys)}
            bordered={false}
            ghost
          />
        )}
      </Modal>
    </ConfigProvider>
  );
};

const KpiRow = ({ kpi, checked, onToggle }) => (
  <label style={rowStyle}>
    <Checkbox checked={checked} onChange={onToggle} />
    <div style={rowTextStyle}>
      <div style={rowLabelLineStyle}>
        <span style={rowLabelStyle}>{kpi.label}</span>
        <span style={rowUnitStyle}>{kpi.unit}</span>
      </div>
      {kpi.info_note && <div style={rowInfoStyle}>{kpi.info_note}</div>}
    </div>
  </label>
);

// Walk PLOT_GROUPS and bucket the flat KPI list by category. The
// shape returned by this helper is the SOLE place that knows
// about the group-and-subgroup hierarchy in the picker; everything
// else just consumes it. Returns:
//
//   [
//     {
//       key, label, icon, totalKpis,
//       subgroups: [
//         { key, label: string|null, kpis: [...] },
//         ...
//       ],
//     },
//     ...
//   ]
//
// A top-level group with `keys` (no nested subgroups) collapses to
// a single subgroup with `label: null` so the render path is
// uniform. Groups with no matching KPIs are filtered out.
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
    const totalKpis = subgroups.reduce((n, s) => n + s.kpis.length, 0);
    result.push({
      key: group.label,
      label: group.label,
      icon: group.icon ?? null,
      subgroups,
      totalKpis,
    });
  }
  return result;
};

const countSelectedInGroup = (selected, group) =>
  group.subgroups.reduce(
    (n, sub) =>
      n + sub.kpis.reduce((m, k) => m + (selected.has(k.id) ? 1 : 0), 0),
    0,
  );

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

const groupCountStyle = {
  fontSize: 11,
  color: '#888',
  fontWeight: 400,
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

// Subgroup header (e.g. "GHG Emissions" inside "Life Cycle
// Analysis"). Only renders for top-level groups that have nested
// subgroups; flat groups (e.g. "Energy Demand Forecasting") set
// `label: null` and skip this row entirely.
const subgroupHeaderStyle = {
  fontSize: 11,
  fontWeight: 600,
  color: '#666',
  textTransform: 'uppercase',
  letterSpacing: 0.4,
};

const kpiListStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
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

export default KpiPicker;
