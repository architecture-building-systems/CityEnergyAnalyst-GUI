import { Button, Popconfirm, Popover, Select, Tooltip } from 'antd';

import { BinAnimationIcon } from 'assets/icons';
import { ERROR_RED, PATHWAY_PRIMARY } from 'constants/theme';

import { useCanvasStore } from '../stores/canvasStore';
import './FeatureCardDivider.css';

/**
 * Divider feature card — a single rule (horizontal or vertical) the
 * user drops between sections of the canvas, with optional `spacer`
 * style for an invisible gap.
 *
 * The line config (orientation, style, thickness, colour) is shared
 * across every column in compare mode — divider is structural
 * chrome, not per-column content like the Text card's `html`. The
 * store action `setCardDividerConfig` fans out the change.
 *
 * Toolbar matches the Text card's pattern: floats outside the
 * card and is revealed on hover / focus. Anchored on top for a
 * horizontal divider; on the right for a vertical one — either
 * way it sits in the neighbouring whitespace rather than over the
 * narrow line.
 *
 * Under Export View (`enableEdit === false`) the toolbar + drag
 * strip are hidden and the card surface drops its horizontal
 * padding so the rule renders edge-to-edge in the snapshot.
 */
const FeatureCardDivider = ({ card, columnIndex, onDeleteCard }) => {
  const enableEdit = useCanvasStore((s) => s.enableEdit);
  const layoutLocked = useCanvasStore((s) => s.fixLayout);
  const setCardDividerConfig = useCanvasStore((s) => s.setCardDividerConfig);
  const config = card.divider ?? DEFAULTS;
  const isVertical = config.orientation === 'vertical';

  const update = (partial) =>
    setCardDividerConfig(columnIndex, card.id, partial);

  // Edit mode keeps a small horizontal pad so the rule doesn't kiss
  // the card's left/right edges; Export View drops it so the line
  // renders edge-to-edge in the snapshot.
  const surfaceStyle = enableEdit ? cardSurfaceStyle : cardSurfaceStyleExport;

  return (
    <div
      style={surfaceStyle}
      className={`cea-canvas-divider-card${
        isVertical ? ' cea-canvas-divider-card-vertical' : ''
      }`}
    >
      {/* Drag handle gated on `fixLayout` only — matches the
          FeatureCardShell pattern. `enableEdit` controls the
          orientation/style toolbar elsewhere on the card, not
          drag/resize. */}
      {!layoutLocked && (
        <div
          className="cea-card-drag-handle"
          style={isVertical ? dragStripVerticalStyle : dragStripStyle}
          aria-label="Drag divider card"
        >
          <span style={isVertical ? dragGripVerticalStyle : dragGripStyle} />
        </div>
      )}
      {enableEdit && (
        <div
          style={isVertical ? toolbarStyleVertical : toolbarStyle}
          className="cea-canvas-divider-toolbar cea-card-icon-button-container cea-no-drag"
        >
          <Toolbar
            config={config}
            onChange={update}
            onDeleteCard={onDeleteCard}
          />
        </div>
      )}
      <div
        style={
          isVertical
            ? buildVerticalLineStyle(config)
            : buildHorizontalLineStyle(config)
        }
      />
    </div>
  );
};

const DEFAULTS = {
  orientation: 'horizontal',
  style: 'solid',
  thickness: 1,
  color: '#000000',
};

// `spacer` paints no line — the card still occupies its rgl row, so
// the user gets an invisible vertical (or horizontal) gap they can
// resize like any other divider.
const STYLE_OPTIONS = [
  { label: 'Solid', value: 'solid' },
  { label: 'Dashed', value: 'dashed' },
  { label: 'Dotted', value: 'dotted' },
  { label: 'Spacer', value: 'spacer' },
];

const THICKNESS_OPTIONS = [1, 2, 3, 4].map((px) => ({
  label: `${px}px`,
  value: px,
}));

// Seven shades from pure black to the card-outline grey. Last stop
// is `#e8e8e8` so a divider can blend with the surrounding card
// borders (matches `FeatureCardShell`'s `1px solid #e8e8e8`).
const COLOR_OPTIONS = [
  '#000000',
  '#2a2a2a',
  '#555555',
  '#808080',
  '#aaaaaa',
  '#d4d4d4',
  '#e8e8e8',
];

// Inline swatch palette — horizontal row of clickable circles. The
// active value gets a pathway-blue outline ring. Anchored inside an
// antd Popover so the palette only opens on click and dismisses on
// outside click / Escape.
const ColorPalette = ({ value, onChange }) => (
  <div style={paletteRowStyle}>
    {COLOR_OPTIONS.map((hex) => {
      const active = hex === value;
      return (
        <button
          key={hex}
          type="button"
          onClick={() => onChange(hex)}
          aria-label={`Colour ${hex}`}
          aria-pressed={active}
          style={{
            ...paletteSwatchStyle,
            background: hex,
            outline: active ? `2px solid ${PATHWAY_PRIMARY}` : 'none',
            outlineOffset: active ? 1 : 0,
          }}
        />
      );
    })}
  </div>
);

const Toolbar = ({ config, onChange, onDeleteCard }) => {
  const isVertical = config.orientation === 'vertical';
  const isSpacer = config.style === 'spacer';
  return (
    <>
      <Tooltip title="Horizontal" placement="top">
        <Button
          type="text"
          size="small"
          onClick={() => onChange({ orientation: 'horizontal' })}
          style={!isVertical ? activeBtnStyle : undefined}
          aria-label="Horizontal divider"
        >
          —
        </Button>
      </Tooltip>
      <Tooltip title="Vertical" placement="top">
        <Button
          type="text"
          size="small"
          onClick={() => onChange({ orientation: 'vertical' })}
          style={isVertical ? activeBtnStyle : undefined}
          aria-label="Vertical divider"
        >
          │
        </Button>
      </Tooltip>
      <span style={dividerStyle} />
      <Select
        size="small"
        style={{ width: 96 }}
        value={config.style}
        options={STYLE_OPTIONS}
        onChange={(value) => onChange({ style: value })}
      />
      {/* Thickness + colour are meaningless for spacer mode (no line
          to paint) — hide them so the toolbar reads as "this is just
          empty space". */}
      {!isSpacer && (
        <>
          <Select
            size="small"
            style={{ width: 64 }}
            value={config.thickness}
            options={THICKNESS_OPTIONS}
            onChange={(value) => onChange({ thickness: value })}
          />
          <Popover
            trigger="click"
            placement="bottom"
            content={
              <ColorPalette
                value={config.color ?? DEFAULTS.color}
                onChange={(value) => onChange({ color: value })}
              />
            }
          >
            <Tooltip title="Colour" placement="top">
              <span
                role="button"
                tabIndex={0}
                aria-label="Pick divider colour"
                style={triggerWrapperStyle}
              >
                <span
                  style={{
                    ...paletteSwatchStyle,
                    background: config.color ?? DEFAULTS.color,
                    cursor: 'pointer',
                  }}
                />
              </span>
            </Tooltip>
          </Popover>
        </>
      )}
      {onDeleteCard && (
        <Popconfirm
          title="Delete this divider?"
          okText="Delete"
          cancelText="Cancel"
          okButtonProps={{ danger: true }}
          onConfirm={onDeleteCard}
        >
          <Tooltip title="Delete card" placement="top">
            <Button
              type="text"
              icon={<BinAnimationIcon style={{ color: ERROR_RED }} />}
              style={deleteBtnStyle}
              aria-label="Delete card"
            />
          </Tooltip>
        </Popconfirm>
      )}
    </>
  );
};

// Build the actual line. `border-*-style` paints solid / dashed /
// dotted off the same property; thickness drives `border-*-width`;
// colour comes from the card config (with the default-black fallback
// for old persisted dividers that pre-date the colour palette).
// `spacer` paints nothing — the card still reserves its rgl row, so
// it acts as a deliberate gap.
const buildHorizontalLineStyle = ({ style, thickness, color }) => {
  if (style === 'spacer') return { width: '100%', alignSelf: 'center' };
  return {
    width: '100%',
    borderTop: `${thickness}px ${style} ${color ?? DEFAULTS.color}`,
    alignSelf: 'center',
  };
};

const buildVerticalLineStyle = ({ style, thickness, color }) => {
  if (style === 'spacer') return { height: '100%', alignSelf: 'center' };
  return {
    height: '100%',
    borderLeft: `${thickness}px ${style} ${color ?? DEFAULTS.color}`,
    alignSelf: 'center',
  };
};

// Card surface — flex centres the line vertically (horizontal) or
// horizontally (vertical). No border or vertical padding so the
// card's visual footprint matches the line itself; the grid still
// allocates a 1-row tile (~40 px), but without surrounding chrome
// the divider doesn't read as an oversized box.
const cardSurfaceStyle = {
  width: '100%',
  height: '100%',
  background: 'transparent',
  padding: '0 12px',
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  position: 'relative',
};

const cardSurfaceStyleExport = {
  ...cardSurfaceStyle,
  padding: 0,
};

// Top drag strip for horizontal layout (mirrors Text card).
const dragStripStyle = {
  position: 'absolute',
  top: 2,
  left: 12,
  right: 12,
  height: 8,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'grab',
};

const dragGripStyle = {
  width: 28,
  height: 3,
  borderRadius: 999,
  background: 'rgba(148, 163, 184, 0.6)',
};

// Vertical layout: drag strip rotates onto the left edge of the
// card so the user can grab the column.
const dragStripVerticalStyle = {
  position: 'absolute',
  left: 2,
  top: 12,
  bottom: 12,
  width: 8,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'grab',
};

const dragGripVerticalStyle = {
  width: 3,
  height: 28,
  borderRadius: 999,
  background: 'rgba(148, 163, 184, 0.6)',
};

// Toolbar floats above the card (horizontal) or to the right
// (vertical) — same hover/focus visibility rules as the Text card
// (see `FeatureCardDivider.css`).
const toolbarStyle = {
  position: 'absolute',
  bottom: 'calc(100% + 6px)',
  left: 0,
  right: 0,
  zIndex: 10,
  background: '#fff',
  gap: 2,
  flexShrink: 0,
};

const toolbarStyleVertical = {
  position: 'absolute',
  left: 'calc(100% + 6px)',
  top: 0,
  zIndex: 10,
  background: '#fff',
  gap: 2,
  flexShrink: 0,
  whiteSpace: 'nowrap',
};

const activeBtnStyle = {
  background: 'rgba(0,0,0,0.06)',
};

const dividerStyle = {
  width: 1,
  height: 18,
  background: '#e0e0e0',
  margin: '0 2px',
};

// Palette popover content — single horizontal row of swatch
// buttons. Tight gap so it reads as a swatch strip rather than
// individual chips.
const paletteRowStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
};

const paletteSwatchStyle = {
  display: 'inline-block',
  width: 14,
  height: 14,
  borderRadius: '50%',
  border: '1px solid #d9d9d9',
  padding: 0,
};

// Trigger sits inside the toolbar row — flex-centred so the swatch
// aligns vertically with the antd `<Select>` siblings.
const triggerWrapperStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  cursor: 'pointer',
  padding: '0 4px',
};

const deleteBtnStyle = {
  marginLeft: 'auto',
};

export default FeatureCardDivider;
