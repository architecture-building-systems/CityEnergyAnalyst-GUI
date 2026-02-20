import { useState, useLayoutEffect, useRef, useCallback } from 'react';

const useHeaderVisibility = (description, showSkeleton) => {
  const [headerVisible, setHeaderVisible] = useState(true);
  const lastScrollPositionRef = useRef(0);
  const descriptionRef = useRef(null);
  const [descriptionHeight, setDescriptionHeight] = useState('auto');

  // Reset header visibility when description changes
  useLayoutEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional reset pattern on prop change
    setHeaderVisible(true);
    lastScrollPositionRef.current = 0;
    setDescriptionHeight('auto');
  }, [description]);

  // This effect will measure the actual height of the description
  useLayoutEffect(() => {
    if (descriptionRef.current && !showSkeleton) {
      const height = descriptionRef.current.scrollHeight;
      setDescriptionHeight(height);
    }
  }, [description, showSkeleton]);

  const handleScroll = useCallback(
    (e) => {
      // Ensure the scroll threshold greater than the description height to prevent layout shifts
      const scrollThreshold = descriptionHeight;
      const currentScrollPosition = e.target.scrollTop;

      // Determine scroll direction and update header visibility
      if (
        currentScrollPosition > lastScrollPositionRef.current &&
        currentScrollPosition > scrollThreshold
      ) {
        setHeaderVisible(false); // Hide header when scrolling down past threshold
      } else if (currentScrollPosition === 0) {
        setHeaderVisible(true); // Show header when scrolling up or near top
      }
      lastScrollPositionRef.current = currentScrollPosition;
    },
    [descriptionHeight],
  );

  return {
    headerVisible,
    descriptionRef,
    descriptionHeight,
    handleScroll,
  };
};

export default useHeaderVisibility;
