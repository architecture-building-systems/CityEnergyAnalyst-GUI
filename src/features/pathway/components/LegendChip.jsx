import { Typography } from 'antd';

const { Text } = Typography;

const LegendChip = ({ colour, label, outline, halo }) => (
  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
    <span
      style={{
        width: 12,
        height: 12,
        borderRadius: 999,
        display: 'inline-block',
        background: colour,
        border: outline
          ? `2px solid ${outline}`
          : '1px solid rgba(15, 23, 42, 0.08)',
        boxShadow: halo ? `0 0 0 4px ${halo}` : 'none',
      }}
    />
    <Text style={{ fontSize: 12, color: '#475569' }}>{label}</Text>
  </div>
);

export default LegendChip;
