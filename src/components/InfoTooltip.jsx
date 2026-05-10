import { Tooltip } from 'antd';
import { InformationIcon } from 'assets/icons';
import { useTooltip } from 'hooks/useTooltips';

/**
 * Info icon with tooltip content loaded from the backend.
 * @param {string} tooltipKey — key matching an entry in tooltips.yml
 * @param {object} [style] — optional style override for the icon
 * @param {string} [placement] — tooltip placement (default: "bottom")
 */
const InfoTooltip = ({ tooltipKey, style, placement = 'bottom' }) => {
  const tip = useTooltip(tooltipKey);
  if (!tip) return null;

  const content = tip.title ? (
    <div>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{tip.title}</div>
      <div style={{ whiteSpace: 'pre-line' }}>{tip.body}</div>
    </div>
  ) : (
    tip.body
  );

  return (
    <Tooltip title={content} placement={placement}>
      <InformationIcon
        style={{ color: '#94A3B8', fontSize: 14, cursor: 'help', ...style }}
      />
    </Tooltip>
  );
};

/**
 * Tooltip wrapper with content loaded from the backend.
 * @param {string} tooltipKey — key matching an entry in tooltips.yml
 * @param {string} [placement] — tooltip placement (default: "bottom")
 * @param {React.ReactNode} children — element to wrap
 */
export const TooltipFromBackend = ({
  tooltipKey,
  placement = 'bottom',
  children,
}) => {
  const tip = useTooltip(tooltipKey);
  if (!tip) return children;

  return (
    <Tooltip title={tip.body} placement={placement}>
      {children}
    </Tooltip>
  );
};

export default InfoTooltip;
