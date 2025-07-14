import { Tooltip } from 'antd';
import { animated } from '@react-spring/web';
import { ShowHideCardsIcon } from 'assets/icons';
import { useHoverGrow } from 'features/project/hooks/hover-grow';

export const ShowHideCardsButton = ({ hideAll, onToggle, style }) => {
  const { styles, onMouseEnter, onMouseLeave } = useHoverGrow();
  return (
    <Tooltip title={!hideAll ? 'Show Overlays' : 'Hide Overlays'}>
      <animated.div
        className="cea-overlay-card"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        style={styles}
      >
        <ShowHideCardsIcon
          className="cea-card-toolbar-icon"
          style={{ margin: 0, background: '#000', ...style }}
          onClick={() => onToggle?.((prev) => !prev)}
        />
      </animated.div>
    </Tooltip>
  );
};

export default ShowHideCardsButton;