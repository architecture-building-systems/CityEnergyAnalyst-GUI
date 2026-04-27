import { useEffect, useState } from 'react';

import { useCanvasStore } from '../stores/canvasStore';

/**
 * Tiny status badge for the navigator that shows how long ago the
 * last autosave landed (or "Saved" / "Unsaved changes" depending
 * on the current state). Lives next to the Save button so the user
 * can tell at a glance whether their work is safe.
 *
 * State machine:
 *   - autoSave OFF + tempUuid set         → "Unsaved changes"
 *   - tempUuid present + lastSavedAt set  → "Saved · {relative}"
 *   - tempUuid present, no flush yet      → "Saving…"
 *   - everything else                     → render nothing
 *     (clean, viewing-saved-canvas, or no edits to track)
 *
 * Refreshes every 30s on a timer so the relative timestamp keeps
 * up without burning render cycles.
 */
const SavedIndicator = () => {
  const autoSave = useCanvasStore((s) => s.autoSave);
  const tempUuid = useCanvasStore((s) => s.tempUuid);
  const lastSavedAt = useCanvasStore((s) => s.lastSavedAt);

  // Tick to re-format the relative timestamp without keeping a
  // millisecond-accurate counter in render. 30 s matches the
  // resolution of "n minutes ago".
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!lastSavedAt) return undefined;
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, [lastSavedAt]);

  if (!tempUuid) return null;

  let text = '';
  let color = '#888';
  if (!autoSave) {
    text = 'Unsaved changes';
    color = '#f04d5b';
  } else if (lastSavedAt) {
    text = `Saved · ${formatRelative(lastSavedAt)}`;
  } else {
    text = 'Saving…';
  }

  return <span style={{ ...badgeStyle, color }}>{text}</span>;
};

function formatRelative(timestamp) {
  const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

const badgeStyle = {
  fontSize: 12,
  whiteSpace: 'nowrap',
};

export default SavedIndicator;
