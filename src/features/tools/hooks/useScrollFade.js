import { useRef, useState, useEffect } from 'react';

const FADE_HEIGHT = 32;
const MASK_WITH_FADE = `linear-gradient(to bottom, black calc(100% - ${FADE_HEIGHT}px), transparent 100%)`;

/**
 * Attaches a scroll listener to an element and returns a mask-image style
 * that fades out the bottom edge when there is more content to scroll.
 *
 * @param {any[]} deps - Values that cause content to change (e.g. [description], [script]).
 *   Changing these re-evaluates whether the fade is needed.
 * @returns {{ ref: React.RefObject, maskStyle: React.CSSProperties }}
 */
export const useScrollFade = (deps = []) => {
  const ref = useRef(null);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const check = () => {
      setHasMore(el.scrollTop + el.clientHeight < el.scrollHeight - 1);
    };

    check();
    el.addEventListener('scroll', check);

    const observer = new ResizeObserver(check);
    observer.observe(el);

    return () => {
      el.removeEventListener('scroll', check);
      observer.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const maskStyle = hasMore
    ? { WebkitMaskImage: MASK_WITH_FADE, maskImage: MASK_WITH_FADE }
    : undefined;

  return { ref, maskStyle };
};
