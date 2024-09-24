import { useSpring } from '@react-spring/web';

export const useHoverGrow = (
  initialScale = 1,
  hoverScale = 1.2,
  duration = 100,
) => {
  const [styles, api] = useSpring(() => ({
    transform: `scale(${initialScale})`,
    config: { duration },
  }));

  const onMouseEnter = () => {
    api.start({ transform: `scale(${hoverScale})` });
  };

  const onMouseLeave = () => {
    api.start({ transform: `scale(${initialScale})` });
  };

  return {
    styles,
    onMouseEnter,
    onMouseLeave,
  };
};
