import { useCanvasStore } from '../stores/canvasStore';
import { useProjectStore } from 'features/project/stores/projectStore';

/**
 * Once-per-canvas header rendered at the top of the canvas in
 * pathway modes. Replaces the per-column scenario label (which the
 * column headers now use for state-year / pathway-name) so the
 * shared parent scenario stays anchored in one place.
 *
 * Format:
 *   Scenario: <scenario-name>  —  Pathway View
 *
 * The `trailing` slot is for content that should sit on the right
 * side of the header — used by `PathwayMultiView` to host the
 * `<PathwayCompareSelect>` picker so the user can change pathway
 * picks without leaving the row layout.
 *
 * Hidden in non-pathway modes; the existing `NavigatorCard`
 * already provides scenario context there.
 */
const CanvasScenarioHeader = ({ trailing = null }) => {
  const view = useCanvasStore((s) => s.view);
  const parentScenario = useCanvasStore((s) => s.parentScenario);
  const projectScenario = useProjectStore((s) => s.scenario);

  const isPathwayMode = view === 'pathway-single' || view === 'pathway-multi';
  if (!isPathwayMode) return null;

  const scenarioName = scenarioBasename(parentScenario || projectScenario);
  if (!scenarioName) return null;

  return (
    <div style={rowStyle}>
      <div style={textStyle}>
        <span style={labelStyle}>Scenario:</span>{' '}
        <span style={nameStyle} title={scenarioName}>
          {scenarioName}
        </span>
        <span style={separatorStyle}>—</span>
        <span style={modeStyle}>Pathway View</span>
      </div>
      {trailing && <div style={trailingStyle}>{trailing}</div>}
    </div>
  );
};

// Strip path prefix when the scenario field is a full filesystem
// path (`enterPathwaySingle` stores child-state paths there in a
// related field, but `parentScenario` is normally just the name).
// Keeps the header readable when called with either shape.
const scenarioBasename = (raw) => {
  if (!raw) return '';
  const sep = raw.includes('\\') ? '\\' : '/';
  return raw.split(sep).filter(Boolean).pop() ?? raw;
};

const rowStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 16,
  paddingBottom: 8,
};

const textStyle = {
  display: 'flex',
  alignItems: 'baseline',
  gap: 8,
  fontSize: 16,
  color: '#222',
  minWidth: 0,
};

const labelStyle = {
  fontWeight: 500,
  color: '#666',
};

const nameStyle = {
  fontWeight: 700,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  maxWidth: 320,
};

const separatorStyle = {
  color: '#bbb',
};

const modeStyle = {
  color: '#666',
  fontStyle: 'italic',
};

const trailingStyle = {
  display: 'flex',
  alignItems: 'center',
  flexShrink: 0,
};

export default CanvasScenarioHeader;
