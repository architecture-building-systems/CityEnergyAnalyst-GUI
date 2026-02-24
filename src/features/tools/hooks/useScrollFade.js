import { useRef, useState, useEffect, useCallback } from 'react';

const FADE_HEIGHT = 32;
const MASK_WITH_FADE = `linear-gradient(to bottom, black calc(100% - ${FADE_HEIGHT}px), transparent 100%)`;

/**
 * Attaches a scroll listener to an element and returns a mask-image style
 * that fades out the bottom edge when there is more content to scroll.
 *
 * Call the returned `recheck` function from a `useEffect` whenever content
 * that might change the scroll height changes (e.g. when `description` or
 * `script` changes).
 *
 * @returns {{ ref: React.RefObject, maskStyle: React.CSSProperties, recheck: () => void }}
 */
export const useScrollFade = () => {
  const ref = useRef(null);
  const [hasMore, setHasMore] = useState(false);

  const check = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setHasMore(el.scrollTop + el.clientHeight < el.scrollHeight - 1);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    check();
    el.addEventListener('scroll', check);

    const observer = new ResizeObserver(check);
    observer.observe(el);

    return () => {
      el.removeEventListener('scroll', check);
      observer.disconnect();
    };
  }, [check]);

  const maskStyle = hasMore
    ? { WebkitMaskImage: MASK_WITH_FADE, maskImage: MASK_WITH_FADE }
    : undefined;

  return { ref, maskStyle, recheck: check };
};
