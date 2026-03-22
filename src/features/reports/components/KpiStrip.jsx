import { Skeleton } from 'antd';

import KpiPill from './KpiPill';

/**
 * KPI strip matching mockup layout:
 *
 *   ┌────────┐  ┌────┐ ┌────┐ ┌────┐ ┌────┐
 *   │ 135K*  │  │110 │ │135 │ │ 23 │ │ 25 │
 *   │ annot. │  │lbl │ │lbl │ │lbl │ │lbl │
 *   └────────┘  └────┘ └────┘ └────┘ └────┘
 *
 * Props:
 *   featureTitle   — bold title (e.g. "Building energy demand")
 *   description    — line below title (e.g. "EUI (kWh/m2/yr) in this district:")
 *   primaryValue   — large number on the left (e.g. "135K*")
 *   primaryLabel   — annotation below the large number
 *   pills          — array of { value, label } for the pill row
 *   loading        — show skeleton placeholders
 */
const KpiStrip = ({
  featureTitle,
  description,
  primaryValue,
  primaryLabel,
  pills = [],
  loading = false,
}) => {
  if (loading) {
    return (
      <div style={outerStyle}>
        <Skeleton active paragraph={{ rows: 2 }} title={{ width: 200 }} />
      </div>
    );
  }

  return (
    <div style={outerStyle}>
      {featureTitle && <div style={titleStyle}>{featureTitle}</div>}
      {description && <div style={descriptionStyle}>{description}</div>}

      <div style={stripStyle}>
        {/* Primary large KPI */}
        {primaryValue != null && (
          <div style={primaryContainerStyle}>
            <span style={primaryValueStyle}>{primaryValue}</span>
            {primaryLabel && (
              <span style={primaryLabelStyle}>{primaryLabel}</span>
            )}
          </div>
        )}

        {/* Pill row */}
        {pills.map((pill, i) => (
          <KpiPill key={i} value={pill.value} label={pill.label} />
        ))}
      </div>
    </div>
  );
};

const outerStyle = {
  padding: '4px 0',
};

const titleStyle = {
  fontWeight: 700,
  fontSize: 15,
  marginBottom: 2,
  color: '#222',
};

const descriptionStyle = {
  fontSize: 13,
  color: '#555',
  marginBottom: 10,
};

const stripStyle = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 12,
  flexWrap: 'wrap',
};

const primaryContainerStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 60,
  marginRight: 4,
};

const primaryValueStyle = {
  fontSize: 32,
  fontWeight: 700,
  lineHeight: 1.1,
  color: '#222',
};

const primaryLabelStyle = {
  fontSize: 10,
  color: '#888',
  textAlign: 'center',
  lineHeight: 1.2,
  marginTop: 4,
  maxWidth: 100,
};

export default KpiStrip;
