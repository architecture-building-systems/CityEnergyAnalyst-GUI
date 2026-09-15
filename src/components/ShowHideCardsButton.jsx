import { Tooltip } from 'antd';
import { animated } from '@react-spring/web';
import { ShowHideCardsIcon } from 'assets/icons';
import { useHoverGrow } from 'features/project/hooks/hover-grow';

/**
 * The floating control that brings the map overlays back.
 *
 * `ProjectOverlay` renders it only while the overlays are hidden, so the label is fixed rather
 * than derived from state -- there is no "hide" case for this button to describe.
 *
 * `onToggle` is called with no arguments: `handleHideAll` flips the flag itself.
 */
export const ShowHideCardsButton = ({ onToggle }) => {
  const { styles, onMouseEnter, onMouseLeave } = useHoverGrow();
  return (
    <animated.div
      className="cea-overlay-card cea-card-toolbar-icon-container"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={styles}
    >
      <Tooltip title="Show Overlays">
        <button
          className="cea-card-toolbar-icon no-hover-color"
          onClick={() => onToggle?.()}
          type="button"
          aria-label="Show Overlays"
        >
          <ShowHideCardsIcon />
        </button>
      </Tooltip>
    </animated.div>
  );
};

export default ShowHideCardsButton;
