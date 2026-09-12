import { useRef, useState, useEffect } from 'react';

/**
 * Drag-to-resize height for a bottom-anchored overlay card.
 *
 * The card grows upward, so dragging the handle up increases the height -- hence the inverted
 * `startHeight - (clientY - startY)`. Pointer listeners live on `window`, not the handle, so a
 * fast drag that leaves the 18px grab strip keeps resizing instead of stalling.
 *
 * `contentRef` is optional. Attach it to the scrollable content and the card refuses to grow
 * taller than the content needs; leave it off for a card whose content scrolls internally (a
 * table), where `scrollHeight` is unbounded and the cap would never bind anyway.
 *
 * Two different minimums, matching the behaviour this was extracted from: `minDragHeight` is
 * the floor while dragging, `minClampHeight` the floor applied when the *window* resizes. The
 * second is the lower of the two, so shrinking the browser may squeeze the card below what a
 * user could have dragged it to.
 */
export const usePanelResize = ({
  initialHeight,
  minDragHeight,
  minClampHeight,
  // Space reserved below the card (toolbars, page chrome) when computing the maximum height.
  bottomInset,
  // Breathing room added to the measured content height before using it as a cap.
  contentSlack = 18,
  // While true the card is sizing itself some other way (fullscreen) and drags are ignored.
  disabled = false,
  // What the card is actually rendered at, when the caller shrinks it below `height` to fit its
  // content. Drags start from this so grabbing the handle on a fitted card doesn't snap it up to
  // the unfitted height first. Defaults to `height` when the caller does no fitting.
  renderedHeight,
}) => {
  const [height, setHeight] = useState(initialHeight);
  // Latches on the first drag. Callers use it to drop launch-time sizing policy once the user
  // has expressed a preference.
  const [hasResized, setHasResized] = useState(false);
  const resizeStateRef = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    const clampHeight = (value) =>
      Math.max(
        minClampHeight,
        Math.min(value, window.innerHeight - bottomInset),
      );

    const handleResize = () => {
      setHeight((current) => clampHeight(current));
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [minClampHeight, bottomInset]);

  useEffect(() => {
    const handlePointerMove = (event) => {
      const resizeState = resizeStateRef.current;
      if (!resizeState) return;

      const contentHeight = contentRef.current?.scrollHeight ?? Infinity;
      const nextHeight = Math.max(
        minDragHeight,
        Math.min(
          resizeState.startHeight - (event.clientY - resizeState.startY),
          window.innerHeight - bottomInset,
          contentHeight + contentSlack,
        ),
      );
      setHeight(nextHeight);
    };

    const handlePointerUp = () => {
      resizeStateRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
    };
  }, [minDragHeight, bottomInset, contentSlack]);

  /* eslint-disable react-compiler/react-compiler */
  const handleResizeStart = (event) => {
    // Left button only -- a right-click drag would otherwise start a resize with no mouseup.
    if (disabled || event.button !== 0) return;

    resizeStateRef.current = {
      startY: event.clientY,
      startHeight: renderedHeight ?? height,
    };
    setHasResized(true);
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
    event.preventDefault();
  };
  /* eslint-enable react-compiler/react-compiler */

  return { height, hasResized, contentRef, handleResizeStart };
};
