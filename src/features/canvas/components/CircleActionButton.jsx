import { Tooltip } from 'antd';
import { CreateNewIcon } from 'assets/icons';

import { PATHWAY_PRIMARY } from 'constants/theme';

/**
 * Blue-circle + label button used across the Canvas Builder.
 * Matches the pathway palette (`PATHWAY_PRIMARY`) and uses the
 * project's custom CreateNewIcon rather than antd icons.
 *
 * Two sizes: 'md' (40px circle, for LaunchView hero actions) and
 * 'sm' (32px circle, for "Add a plot" rows).
 */
const CircleActionButton = ({ label, onClick, tooltip, size = 'sm', icon }) => {
  const dims = SIZES[size] ?? SIZES.sm;
  const btn = (
    <button type="button" onClick={onClick} style={buttonStyle}>
      <span
        style={{
          ...circleStyle,
          width: dims.circle,
          height: dims.circle,
        }}
      >
        {icon ?? (
          <CreateNewIcon style={{ color: '#fff', fontSize: dims.icon }} />
        )}
      </span>
      <span style={{ ...labelStyle, fontSize: dims.label }}>{label}</span>
    </button>
  );
  return tooltip ? (
    <Tooltip title={tooltip} placement="right">
      {btn}
    </Tooltip>
  ) : (
    btn
  );
};

const SIZES = {
  sm: { circle: 32, icon: 16, label: 14 },
  md: { circle: 40, icon: 20, label: 16 },
};

const buttonStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '8px 4px',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  borderRadius: 8,
};

const circleStyle = {
  borderRadius: '50%',
  background: PATHWAY_PRIMARY,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

const labelStyle = {
  fontWeight: 600,
  color: '#333',
};

export default CircleActionButton;
