import { useState, useEffect } from 'react';

// Only report loading as true once it has lasted `delay` ms, to avoid
// flashing a skeleton/spinner for requests that resolve quickly.
const useSkeletonDelay = (loading, delay = 200) => {
  const [showSkeleton, setShowSkeleton] = useState(false);

  useEffect(() => {
    if (!loading) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional reset when loading ends
      setShowSkeleton(false);
      return;
    }

    const timer = setTimeout(() => setShowSkeleton(true), delay);
    return () => clearTimeout(timer);
  }, [loading, delay]);

  return showSkeleton;
};

export default useSkeletonDelay;
