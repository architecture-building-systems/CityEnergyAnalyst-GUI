/**
 * A single rounded-border KPI pill.
 * Displays a large centred value with a small label below.
 *
 * Matches mockup: ~60-70px wide rounded rectangle, value inside, label underneath.
 */
const KpiPill = ({ value, label }) => {
  const displayValue =
    typeof value === 'number'
      ? value.toLocaleString(undefined, { maximumFractionDigits: 1 })
      : value;

  return (
    <div style={pillContainerStyle}>
      <div style={pillStyle}>
        <span style={valueStyle}>{displayValue}</span>
      </div>
      <span style={labelStyle}>{label}</span>
    </div>
  );
};

const pillContainerStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 4,
  minWidth: 56,
  maxWidth: 80,
};

const pillStyle = {
  border: '1.5px solid #555',
  borderRadius: 12,
  padding: '8px 14px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 48,
};

const valueStyle = {
  fontSize: 22,
  fontWeight: 600,
  lineHeight: 1.1,
  color: '#222',
};

const labelStyle = {
  fontSize: 11,
  color: '#666',
  textAlign: 'center',
  lineHeight: 1.2,
};

export default KpiPill;
