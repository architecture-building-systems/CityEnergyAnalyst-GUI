import { Tooltip } from 'antd';
import { animated } from '@react-spring/web';
import { ShowHideCardsIcon } from 'assets/icons';
import { useHoverGrow } from 'features/project/hooks/hover-grow';

export const ShowHideCardsButton = ({ hideAll, onToggle, style }) => {
  const { styles, onMouseEnter, onMouseLeave } = useHoverGrow();
  return (
    <animated.div
      className={`cea-overlay-card cea-card-toolbar-icon-container ${!hideAll ? '' : 'inverted'}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={styles}
    >
      <Tooltip title={!hideAll ? 'Show Overlays' : 'Hide Overlays'}>
        <button
          className="cea-card-toolbar-icon no-hover-color"
          onClick={() => onToggle?.((prev) => !prev)}
          type="button"
        >
          <ShowHideCardsIcon style={style} />
        </button>
      </Tooltip>
    </animated.div>
  );
};

export default ShowHideCardsButton;
