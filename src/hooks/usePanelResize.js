import { useRef, useState, useEffect } from 'react';

// How far an Arrow Up/Down keypress on the handle moves the height.
const KEY_STEP = 20;

// Clamps to `maximum` first so a viewport too small to fit `minimum` (a short window, a large
// `bottomInset`) yields the smaller value instead of overflowing past what's available.
const clampToAvailableHeight = (value, minimum, maximum) =>
  maximum < minimum ? maximum : Math.min(Math.max(value, minimum), maximum);

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
  //
  // A ref, not a plain value: it needs to reflect the *committed* fitted height at the moment a
  // drag starts, not whatever a render passed down. A caller that recomputes this from layout
  // (`fitInputTableHeight`, `offsetHeight`) can only safely publish it via an effect, one render
  // after commit -- reading a plain prop here would capture that same one-render-behind value
  // regardless, so the ref buys nothing there. It matters when a drag starts between renders,
  // where the ref (read live, at event time) reflects the latest commit and a captured prop would
  // still be the render before it.
  renderedHeightRef,
}) => {
  const [height, setHeight] = useState(initialHeight);
  // Latches on the first drag. Callers use it to drop launch-time sizing policy once the user
  // has expressed a preference.
  const [hasResized, setHasResized] = useState(false);
  const resizeStateRef = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    const clampHeight = (value) =>
      clampToAvailableHeight(
        value,
        minClampHeight,
        window.innerHeight - bottomInset,
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
      const maxHeight = Math.min(
        window.innerHeight - bottomInset,
        contentHeight + contentSlack,
      );
      const nextHeight = clampToAvailableHeight(
        resizeState.startHeight - (event.clientY - resizeState.startY),
        minDragHeight,
        maxHeight,
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
      // A drag in progress at unmount would otherwise leave the page stuck with a resize
      // cursor and no text selection forever -- `handlePointerUp` never fires because its
      // only trigger, the `mouseup` listener above, was just removed.
      resizeStateRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [minDragHeight, bottomInset, contentSlack]);

  /* eslint-disable react-compiler/react-compiler */
  const handleResizeStart = (event) => {
    // Left button only -- a right-click drag would otherwise start a resize with no mouseup.
    if (disabled || event.button !== 0) return;

    resizeStateRef.current = {
      startY: event.clientY,
      startHeight: renderedHeightRef?.current ?? height,
    };
    setHasResized(true);
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
    event.preventDefault();
  };

  // Arrow Up/Down step the height while the handle has keyboard focus -- the mouse drag above
  // is the only way to resize otherwise, which a keyboard-only user can't perform at all.
  const handleResizeKeyDown = (event) => {
    if (disabled) return;
    let delta = 0;
    if (event.key === 'ArrowUp') delta = KEY_STEP;
    else if (event.key === 'ArrowDown') delta = -KEY_STEP;
    if (!delta) return;

    event.preventDefault();
    const contentHeight = contentRef.current?.scrollHeight ?? Infinity;
    const maxHeight = Math.min(
      window.innerHeight - bottomInset,
      contentHeight + contentSlack,
    );
    const startHeight = renderedHeightRef?.current ?? height;
    setHeight(
      clampToAvailableHeight(startHeight + delta, minDragHeight, maxHeight),
    );
    setHasResized(true);
  };
  /* eslint-enable react-compiler/react-compiler */

  return {
    height,
    hasResized,
    contentRef,
    handleResizeStart,
    handleResizeKeyDown,
  };
};
