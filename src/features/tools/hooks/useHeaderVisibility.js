import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';

const useHeaderVisibility = (description, showSkeleton) => {
  const [headerVisible, setHeaderVisible] = useState(true);
  const lastScrollPositionRef = useRef(0);
  const descriptionRef = useRef(null);
  const descriptionHeightRef = useRef('auto');

  // This effect will measure the actual height of the description
  useLayoutEffect(() => {
    if (descriptionRef.current && !showSkeleton) {
      const height = descriptionRef.current.scrollHeight;
      descriptionHeightRef.current = height;
    }
  }, [description, showSkeleton]);

  useEffect(() => {
    // Reset header visibility when description changes
    setHeaderVisible(true);
    lastScrollPositionRef.current = 0;
    descriptionHeightRef.current = 'auto';
  }, [description]);

  const handleScroll = useCallback((e) => {
    // Ensure the scroll threshold greater than the description height to prevent layout shifts
    const scrollThreshold = descriptionHeightRef.current;
    const currentScrollPosition = e.target.scrollTop;

    // Determine scroll direction and update header visibility
    if (
      currentScrollPosition > lastScrollPositionRef.current &&
      currentScrollPosition > scrollThreshold
    ) {
      setHeaderVisible(false); // Hide header when scrolling down past threshold
    } else if (currentScrollPosition == 0) {
      setHeaderVisible(true); // Show header when scrolling up or near top
    }
    lastScrollPositionRef.current = currentScrollPosition;
  }, []);

  return {
    headerVisible,
    descriptionRef,
    descriptionHeight: descriptionHeightRef.current,
    handleScroll,
  };
};

export default useHeaderVisibility;
