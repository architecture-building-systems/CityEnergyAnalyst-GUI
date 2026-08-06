import { Typography } from 'antd';
import InfoTooltip from 'components/InfoTooltip';

const { Text } = Typography;

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
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        paddingBottom: 8,
        marginBottom: 8,
        borderBottom: '1px solid #e0e0e0',
      }}
    >
      <Text strong>{title}</Text>
      {tooltipKey ? <InfoTooltip tooltipKey={tooltipKey} /> : null}
    </div>
    {content}
  </div>
);

export default SectionCard;
