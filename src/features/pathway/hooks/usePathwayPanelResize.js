import { useTransition } from '@react-spring/web';
import { usePanelResize } from 'hooks/usePanelResize';

export const usePathwayPanelResize = ({ open, expanded }) => {
  const {
    height: pathwayPanelHeight,
    contentRef: pathwayPanelContentRef,
    handleResizeStart: handlePathwayResizeStart,
  } = usePanelResize({
    initialHeight: 425,
    minDragHeight: 360,
    minClampHeight: 290,
    bottomInset: 220,
    // Fullscreen sizes itself from the viewport, so dragging is meaningless there.
    disabled: expanded,
  });

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
