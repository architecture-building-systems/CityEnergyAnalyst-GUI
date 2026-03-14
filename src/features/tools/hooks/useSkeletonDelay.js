import { useState, useEffect } from 'react';

const useSkeletonDelay = (delay = 350) => {
  const [showSkeleton, setShowSkeleton] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSkeleton(false);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  return showSkeleton;
};

export default useSkeletonDelay;
