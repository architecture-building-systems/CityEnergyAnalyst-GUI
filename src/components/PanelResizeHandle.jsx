/**
 * Grab strip for a drag-resizable overlay card. Pair with `usePanelResize`.
 *
 * A real `<button>` rather than a styled div so it is focusable and reachable by keyboard; the
 * 18px height is the hit area, the visible pill is smaller and centred inside it.
 */
const handleStyle = {
  height: 18,
  border: 'none',
  background: 'transparent',
  cursor: 'ns-resize',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
  flex: '0 0 auto',
};

const pillStyle = {
  width: 56,
  height: 5,
  borderRadius: 999,
  background: 'rgba(148, 163, 184, 0.7)',
};

export const PanelResizeHandle = ({
  onMouseDown,
  onKeyDown,
  height,
  label,
}) => (
  <button
    type="button"
    role="slider"
    aria-label={label}
    aria-orientation="vertical"
    aria-valuenow={height}
    onMouseDown={onMouseDown}
    onKeyDown={onKeyDown}
    style={handleStyle}
  >
    <span style={pillStyle} />
  </button>
);

export default PanelResizeHandle;
