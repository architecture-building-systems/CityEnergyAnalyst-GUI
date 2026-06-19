import { useRef, useState, useEffect } from 'react';
import { useTransition } from '@react-spring/web';

export const usePathwayPanelResize = ({ open, expanded }) => {
  const [pathwayPanelHeight, setPathwayPanelHeight] = useState(425);
  const pathwayResizeStateRef = useRef(null);
  const pathwayPanelContentRef = useRef(null);

  useEffect(() => {
    const clampHeight = (height) =>
      Math.max(290, Math.min(height, window.innerHeight - 220));

    const handleResize = () => {
      setPathwayPanelHeight((current) => clampHeight(current));
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handlePointerMove = (event) => {
      const resizeState = pathwayResizeStateRef.current;
      if (!resizeState) return;

      const contentHeight =
        pathwayPanelContentRef.current?.scrollHeight ?? Infinity;
      const nextHeight = Math.max(
        360,
        Math.min(
          resizeState.startHeight - (event.clientY - resizeState.startY),
          window.innerHeight - 220,
          contentHeight + 18,
        ),
      );
      setPathwayPanelHeight(nextHeight);
    };

    const handlePointerUp = () => {
      pathwayResizeStateRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
    };
  }, []);

  /* eslint-disable react-compiler/react-compiler */
  const handlePathwayResizeStart = (event) => {
    if (expanded || event.button !== 0) return;

    pathwayResizeStateRef.current = {
      startY: event.clientY,
      startHeight: pathwayPanelHeight,
    };
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
    event.preventDefault();
  };
  /* eslint-enable react-compiler/react-compiler */

  const pathwayPanelTransition = useTransition(open, {
    from: { transform: 'translateY(100%)', opacity: 0, maxHeight: '0vh' },
    enter: {
      transform: 'translateY(0%)',
      opacity: 1,
      maxHeight: expanded ? 'calc(100vh - 152px)' : `${pathwayPanelHeight}px`,
      marginBlock: '0px',
    },
    leave: {
      transform: 'translateY(100%)',
      opacity: 0,
      maxHeight: '0vh',
      marginBlock: '-12px',
    },
    config: { tension: 150, friction: 20 },
  });

  return {
    pathwayPanelHeight,
    pathwayPanelContentRef,
    handlePathwayResizeStart,
    pathwayPanelTransition,
  };
};
