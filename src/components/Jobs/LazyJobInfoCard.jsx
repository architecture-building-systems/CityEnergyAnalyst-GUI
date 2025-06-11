// LazyJobInfoCard.jsx
import { useEffect, useRef, useState } from 'react';

const LazyJobInfoCard = ({ children }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [hasBeenVisible, setHasBeenVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Update our state when observer callback fires
        setIsVisible(entry.isIntersecting);
        if (entry.isIntersecting) {
          setHasBeenVisible(true);
        }
      },
      {
        root: null, // viewport
        rootMargin: '100px', // Load items 100px before they're visible
        threshold: 0.1, // Trigger when 10% of the item is visible
      },
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, []);

  // Render a placeholder until the component is visible
  if (!isVisible && !hasBeenVisible) {
    return <div ref={ref} className="cea-job-info-card placeholder" />;
  }

  // Once it's been visible at least once, keep rendering it
  // This prevents content jumping when scrolling quickly
  return <div ref={ref}>{children}</div>;
};

export default LazyJobInfoCard;
