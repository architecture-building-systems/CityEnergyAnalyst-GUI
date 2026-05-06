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

import { useFetchKpiRegistry } from '../hooks/useFetchKpis';

const titleCase = (s) =>
  s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

const KpiPicker = ({ open, onCancel, onConfirm }) => {
  const { data, isLoading, isError, error } = useFetchKpiRegistry();
  const features = data?.features ?? [];

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

  // Keep accordion-open state local to a session; first feature
  // opens by default so users see something on first render
  // without having to expand a header.
  const [activeKeys, setActiveKeys] = useState([]);
  useEffect(() => {
    if (open && features.length > 0) {
      setActiveKeys([features[0].name]);
    }
  }, [open, features]);

  const items = useMemo(
    () =>
      features.map((feature) => ({
        key: feature.name,
        label: (
          <span style={featureHeaderStyle}>
            {titleCase(feature.name)}
            <span style={featureCountStyle}>
              {countSelectedInFeature(selected, feature.kpis)}
              /{feature.kpis.length}
            </span>
          </span>
        ),
        children: (
          <div style={kpiListStyle}>
            {feature.kpis.map((kpi) => (
              <KpiRow
                key={kpi.id}
                kpi={kpi}
                checked={selected.has(kpi.id)}
                onToggle={() => toggle(kpi.id)}
              />
            ))}
          </div>
        ),
      })),
    [features, selected],
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

const countSelectedInFeature = (selected, kpis) =>
  kpis.reduce((n, k) => n + (selected.has(k.id) ? 1 : 0), 0);

// ── Styles ──────────────────────────────────────────────────────────

const loadingStyle = {
  padding: '32px 0',
  textAlign: 'center',
};

const featureHeaderStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  fontWeight: 600,
};

const featureCountStyle = {
  fontSize: 11,
  color: '#888',
  fontWeight: 400,
};

const kpiListStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
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
