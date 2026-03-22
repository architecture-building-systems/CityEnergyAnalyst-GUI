import { Card, Statistic, Spin } from 'antd';

const KpiCard = ({ label, value, unit, loading = false }) => {
  if (loading) {
    return (
      <Card size="small" style={cardStyle}>
        <Spin size="small" />
      </Card>
    );
  }

  // Format large numbers with separators
  const formattedValue =
    typeof value === 'number'
      ? value.toLocaleString(undefined, { maximumFractionDigits: 1 })
      : value;

  return (
    <Card size="small" style={cardStyle}>
      <Statistic
        title={<span style={{ fontSize: 11, color: '#666' }}>{label}</span>}
        value={formattedValue}
        suffix={<span style={{ fontSize: 11, color: '#999' }}>{unit}</span>}
        valueStyle={{ fontSize: 16, fontWeight: 600 }}
      />
    </Card>
  );
};

const cardStyle = {
  borderRadius: 8,
  minWidth: 120,
  flex: '1 1 0',
};

export default KpiCard;
