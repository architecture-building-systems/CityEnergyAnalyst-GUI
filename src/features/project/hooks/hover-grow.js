import { useSpring } from '@react-spring/web';

export const useHoverGrow = (
  initialScale = 1,
  hoverScale = 1.2,
  config = { duration: 100 },
) => {
  const [styles, api] = useSpring(() => ({
    scale: initialScale,
  }));

  const onMouseEnter = () => {
    api.start({ scale: hoverScale, config });
  };

  const onMouseLeave = () => {
    api.start({ scale: initialScale, config });
  };

  return {
    styles,
    onMouseEnter,
    onMouseLeave,
  };
};
