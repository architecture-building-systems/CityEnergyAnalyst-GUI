import { useMemo } from 'react';
import { Button, Popconfirm, Tooltip } from 'antd';
import { BinAnimationIcon } from 'assets/icons';

import { PLOT_GROUPS } from 'features/plots/constants';

/**
 * Walk PLOT_GROUPS to find the group/subgroup that owns a given
 * feature key. Used by every FeatureCard variant to pick a label and
 * icon for the title row. Subgroups inherit their parent group's
 * icon — there's no per-subgroup icon in PLOT_GROUPS.
 */
export function findFamilyForFeature(feature) {
  if (!feature) return null;
  for (const group of PLOT_GROUPS) {
    if (group.keys?.includes(feature)) {
      return { label: group.label, keys: group.keys, icon: group.icon };
    }
    if (group.subgroups) {
      for (const sub of group.subgroups) {
        if (sub.keys?.includes(feature)) {
          return { label: sub.label, keys: sub.keys, icon: group.icon };
        }
      }
    }
  }
  return null;
}

/**
 * Shared FeatureCard chrome — fills the rgl tile with the white
 * rounded surface, renders the title row (family icon + label +
 * delete button), and slots `children` underneath. Each card type
 * (Plot, KPI, Map) wraps its body in this shell.
 */
export const FeatureCardShell = ({ feature, onDeleteCard, children }) => {
  const family = useMemo(() => findFamilyForFeature(feature), [feature]);
  const title = family?.label || feature;
  return (
    <div style={cardStyle}>
      <div style={titleSectionStyle}>
        <div style={featureTitleStyle}>
          {family?.icon && (
            <family.icon
              style={{ fontSize: 18, color: '#555', flexShrink: 0 }}
              aria-hidden
            />
          )}
          <span>{title}</span>
        </div>
        {onDeleteCard && <TitleDeleteButton onClick={onDeleteCard} />}
      </div>
      {children}
    </div>
  );
};

const TitleDeleteButton = ({ onClick }) => (
  <Popconfirm
    title="Delete this card?"
    description="All content inside this card will be removed."
    okText="Delete"
    cancelText="Cancel"
    okButtonProps={{ danger: true }}
    onConfirm={onClick}
  >
    <div className="cea-card-icon-button-container">
      <Tooltip title="Delete card" placement="bottom">
        <Button
          type="text"
          icon={<BinAnimationIcon style={{ color: '#f04d5b' }} />}
          aria-label="Delete card"
        />
      </Tooltip>
    </div>
  </Popconfirm>
);

// Fills the tile assigned by react-grid-layout — no own min/max,
// no resize handle. Internal overflow is handled by per-section
// scroll/ellipsis rules in each card variant.
const cardStyle = {
  background: '#fff',
  border: '1px solid #e8e8e8',
  borderRadius: 12,
  padding: '8px 16px',
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  width: '100%',
  height: '100%',
  overflow: 'hidden',
};

const titleSectionStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
};

const featureTitleStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontWeight: 700,
  fontSize: 15,
  color: '#222',
  minWidth: 0,
  overflow: 'hidden',
};

export const sectionDividerStyle = {
  borderTop: '1px solid #f0f0f0',
};
