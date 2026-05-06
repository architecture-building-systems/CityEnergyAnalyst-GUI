/**
 * Read `?focusFeature=<feature>` once on canvas mount, then strip
 * the param from the URL so the focus action only fires once.
 *
 * Source: the OverviewCard's `KpiRibbon` (main project viewport)
 * pushes the canvas route with this query param when the user
 * clicks a headline tile. The canvas page consumes the value to
 * decide between two landing actions:
 *   - cards present for the feature → scroll the first matching
 *     KPI card into view + flash it.
 *   - no matching card               → open the picker pre-expanded
 *     to that feature's group.
 *
 * The URL is cleaned up on first capture (replace, not push) so
 * a refresh / back-navigation doesn't replay the focus and so the
 * URL bar isn't cluttered with a one-shot param.
 *
 * Returns `{ focusFeature, consume }`. The caller calls `consume()`
 * once it has dispatched the focus action; further re-renders
 * resolve `focusFeature` to `null` so the action doesn't repeat
 * (e.g. when card data updates after the scroll has already fired).
 */

import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';

export const useFocusFeature = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Capture the URL value once at mount. `useState` initialiser
  // runs before the cleanup effect so the value survives the
  // navigate(replace) below.
  const [focusFeature, setFocusFeature] = useState(() => {
    const params = new URLSearchParams(location.search);
    return params.get('focusFeature');
  });

  // Strip the param from the URL the moment we have it. Replace
  // (not push) so the back button doesn't bounce through a
  // pre-clean URL. Including `location.search` in deps is safe:
  // the second run after navigate() finds no `focusFeature` param
  // and early-returns, so there's no loop.
  useEffect(() => {
    if (!focusFeature) return;
    const params = new URLSearchParams(location.search);
    if (!params.has('focusFeature')) return;
    params.delete('focusFeature');
    const search = params.toString();
    navigate(`${location.pathname}${search ? `?${search}` : ''}`, {
      replace: true,
    });
  }, [focusFeature, location.pathname, location.search, navigate]);

  const consume = useCallback(() => setFocusFeature(null), []);

  return { focusFeature, consume };
};
