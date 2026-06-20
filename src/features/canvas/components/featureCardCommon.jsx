import { Button, Popconfirm, Tooltip } from 'antd';
import { BinAnimationIcon, InputEditorIcon, RefreshIcon } from 'assets/icons';

import { CEA_PURPLE } from 'constants/theme';
import { PLOT_GROUPS } from 'features/plots/constants';
import { useCanvasStore } from '../stores/canvasStore';

/**
 * Walk PLOT_GROUPS to find the group/subgroup that owns a given
 * feature key. Used by Plot/KPI cards to label their title rows.
 * Subgroups inherit their parent group's icon.
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
 * rounded surface, renders the title row (icon + label + optional
 * Edit / Delete buttons), and slots `children` underneath. Each
 * card variant (Plot, KPI, Map) computes its own title + icon and
 * wraps its body here.
 *
 * `editing` swaps the border to the CEA purple stroke to flag the
 * card as the active edit target. Suppressed under Export View
 * since editing is impossible there.
 *
 * Export View also strips the title row's drag-handle class + grab
 * cursor and hides the Edit / Delete buttons — the card surface
 * still reads, but every editing affordance is gone.
 */
export const FeatureCardShell = ({
  title,
  icon: Icon,
  onEdit,
  onRefit,
  onDeleteCard,
  editing = false,
  children,
}) => {
  const enableEdit = useCanvasStore((s) => s.enableEdit);
  const layoutLocked = useCanvasStore((s) => s.fixLayout);
  const showActions = (onEdit || onRefit || onDeleteCard) && enableEdit;
  return (
    <div style={editing && enableEdit ? editingCardStyle : cardStyle}>
      <div
        className={layoutLocked ? undefined : 'cea-card-drag-handle'}
        style={layoutLocked ? titleSectionStyle : titleSectionDraggableStyle}
      >
        <div style={featureTitleStyle}>
          {Icon && (
            <Icon
              style={{ fontSize: 18, color: '#555', flexShrink: 0 }}
              aria-hidden
            />
          )}
          <span>{title}</span>
        </div>
        {showActions && (
          <div className="cea-card-icon-button-container">
            {onEdit && (
              <Tooltip title="Edit" placement="bottom">
                <Button
                  type="text"
                  icon={<InputEditorIcon />}
                  onClick={onEdit}
                  aria-label="Edit card"
                />
              </Tooltip>
            )}
            {onRefit && (
              <Tooltip title="Refit" placement="bottom">
                <Button
                  type="text"
                  icon={<RefreshIcon />}
                  onClick={onRefit}
                  aria-label="Refit chart to its container"
                />
              </Tooltip>
            )}
            {onDeleteCard && (
              <Popconfirm
                title="Delete this card?"
                description="All content inside this card will be removed."
                okText="Delete"
                cancelText="Cancel"
                okButtonProps={{ danger: true }}
                onConfirm={onDeleteCard}
              >
                <Tooltip title="Delete card" placement="bottom">
                  <Button
                    type="text"
                    icon={<BinAnimationIcon style={{ color: '#f04d5b' }} />}
                    aria-label="Delete card"
                  />
                </Tooltip>
              </Popconfirm>
            )}
          </div>
        )}
      </div>
      {children}
    </div>
  );
};

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

// CEA purple stroke (matches the launch-state `+` glow + accent palette)
// signals the active edit target. Border width matched to keep the
// tile's interior dimensions identical so the body doesn't reflow.
const editingCardStyle = {
  ...cardStyle,
  border: `1px solid ${CEA_PURPLE}`,
  boxShadow: `0 0 0 1px ${CEA_PURPLE}`,
};

const titleSectionStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
  // Reserve the height the action-button row occupies so the card
  // body starts at the same vertical position whether or not the
  // Edit / Refit / Delete buttons are shown — otherwise hiding the
  // actions tightens the title row by ~16 px and the body shifts
  // upward, leaving the chart with an asymmetric padding compared
  // to siblings that *do* show the actions.
  minHeight: 38,
};

// Adds the `grab` cursor that signals "this row is the grid drag
// handle". Swapped in for `titleSectionStyle` outside Export View.
const titleSectionDraggableStyle = {
  ...titleSectionStyle,
  cursor: 'grab',
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
