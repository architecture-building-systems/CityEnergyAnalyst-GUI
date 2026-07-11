import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Dropdown, Tooltip } from 'antd';

import { useCanvasStore } from '../stores/canvasStore';
import {
  CreateNewIcon,
  DividerCardIcon,
  KpiCardIcon,
  MapCardIcon,
  PlotCardIcon,
  TextCardIcon,
} from 'assets/icons';

import { PLUS_BUTTON_HEIGHT_PX } from '../utils/exposureGeometry';

import './PerimeterPlusButtons.css';

/**
 * Right-edge + bottom-edge `+` affordances for a tile.
 *
 * `exposure.{right,bottom}` is either `null` (edge fully blocked, or
 * only too-small slivers exposed) or `{ fraction }` — the centre of
 * the largest exposed segment as a 0..1 fraction along the edge. The
 * `+` button is positioned at that fraction so it always lands on
 * the exposed strip even when neighbouring tiles cover part of the
 * edge. See `computeExposure` in `../utils/exposureGeometry`.
 *
 * Clicking (or hovering) the `+` swaps it for an icon panel —
 * Map / Plot / Text / Divider / KPI as glyph buttons. Map and
 * Plot expand to sub-Dropdowns for their category/feature tree;
 * Text / Divider trigger immediate inserts; KPI opens the
 * page-level multi-pick modal owned by `CanvasPage`. Trees,
 * inserts, and the modal-open callback all flow in via
 * `buildSectionMenus`.
 *
 * `breathing` (optional) — when true, the closed `+` pulses with a
 * CEA-purple shadow to draw the user's attention. The caller toggles
 * this on at launch and off once at least one feature card exists.
 */
export const PerimeterPlusButtons = ({
  targetCardId,
  exposure,
  buildSectionMenus,
  breathing = false,
  // Compare mode constrains every column to a single vertical
  // stack — placing cards side-by-side wouldn't make sense, so the
  // right-edge `+` is suppressed even when there's exposed space
  // on that edge. Bottom-edge `+` stays so users can append.
  hideRight = false,
}) => {
  // Suppress every perimeter `+` while a KPI card has its action
  // overlay open — the user just clicked into "edit this card"
  // mode, surfacing card-add affordances would just be visual
  // noise on top of the action overlay.
  const kpiActionsActive = useCanvasStore(
    (s) => s.activeKpiActionsCardId !== null,
  );
  if (kpiActionsActive) return null;
  const rightAnchor = hideRight ? null : exposure?.right;
  const bottomAnchor = exposure?.bottom;
  const rightSections = rightAnchor
    ? buildSectionMenus(targetCardId, 'right')
    : null;
  const bottomSections = bottomAnchor
    ? buildSectionMenus(targetCardId, 'bottom')
    : null;
  // Centre the FIRST child on the exposure fraction by subtracting
  // half a button height/width from the wrapper start. The column
  // (right edge) stacks downward; the row (bottom edge) stacks east.
  const halfPx = PLUS_BUTTON_HEIGHT_PX / 2;
  const rightStyle = rightAnchor
    ? {
        ...plusRightStyle,
        top: `calc(${rightAnchor.fraction * 100}% - ${halfPx}px)`,
      }
    : null;
  const bottomStyle = bottomAnchor
    ? {
        ...plusBottomStyle,
        left: `calc(${bottomAnchor.fraction * 100}% - ${halfPx}px)`,
      }
    : null;
  // Stable id per `+` instance, used by the canvasStore's
  // `activePerimeterPlusId` slot to coordinate "only one panel
  // open at a time" — every other `+` hides while one is
  // expanded into its option-strip. ``targetCardId`` is either a
  // card id or the ``'MAP'`` sentinel (set by the primary tile);
  // ``-right`` / ``-bottom`` distinguishes the two edges of one
  // card.
  const anchorId = targetCardId || 'MAP';
  return (
    <>
      {rightSections && (
        <PlusButton
          id={`${anchorId}-right`}
          style={rightStyle}
          sections={rightSections}
          tooltipPlacement="top"
          expandDirection="down"
          breathing={breathing}
        />
      )}
      {bottomSections && (
        <PlusButton
          id={`${anchorId}-bottom`}
          style={bottomStyle}
          sections={bottomSections}
          tooltipPlacement="left"
          expandDirection="right"
          breathing={breathing}
        />
      )}
    </>
  );
};

// Click `+` (or hover for ≥ HOVER_OPEN_DELAY_MS) → it disappears and
// the first option (Map) takes its place; Plot and KPI cascade from
// there. Open-state is managed manually instead of via antd's
// Dropdown popup so the option panel can start exactly at the `+`
// button's anchor — antd's popup would shift it off the trigger.
//
// Hover behaviours:
//   - closed → 250 ms hover opens the panel (snappy enough to feel
//              responsive but long enough to ignore flyovers).
//   - open   → 1 s away from both the panel and any sub-Dropdown
//              popup collapses back to the `+`.
//
// Closing isn't an instant flip: when `closing === true` the pills
// stay rendered for `COLLAPSE_DURATION_MS` while the reverse
// animation plays (keyframes in PerimeterPlusButtons.css), then
// `open` flips to false and the `+` reappears.
const PlusButton = ({
  id,
  style,
  sections,
  tooltipPlacement,
  expandDirection,
  breathing,
}) => {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const ref = useRef(null);
  const openTimerRef = useRef(null);
  const closeTimerRef = useRef(null);
  const collapseTimerRef = useRef(null);

  // ── "Only one panel at a time" coordination ────────────────────
  // When this button opens, claim the global slot. When it closes
  // (collapse triggered), release it. Other `PlusButton` instances
  // read the slot and hide themselves while another button owns it
  // — keeps the canvas uncluttered while the user is choosing
  // an option.
  const activePerimeterPlusId = useCanvasStore((s) => s.activePerimeterPlusId);
  const setActivePerimeterPlusId = useCanvasStore(
    (s) => s.setActivePerimeterPlusId,
  );
  const hidden = activePerimeterPlusId !== null && activePerimeterPlusId !== id;

  // Claim the slot on open.
  useEffect(() => {
    if (open && !closing) setActivePerimeterPlusId(id);
  }, [open, closing, id, setActivePerimeterPlusId]);

  // If we own the slot at unmount time (rare — e.g. card deleted
  // while panel was open), clear it so a sibling button isn't
  // permanently hidden.
  useEffect(
    () => () => {
      if (useCanvasStore.getState().activePerimeterPlusId === id) {
        setActivePerimeterPlusId(null);
      }
    },
    [id, setActivePerimeterPlusId],
  );

  const cancelOpenTimer = () => {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
  };
  const cancelCloseTimer = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  // Start the collapse: flip `closing=true` so the pills get the
  // reverse-animation class, then unmount them after the animation
  // finishes. `closing` itself blocks re-entry while in progress.
  // Releases the global slot at the START of collapse (not the
  // end) so sibling `+` buttons fade back in alongside this
  // panel's collapse animation rather than after it.
  const startCollapse = useCallback(() => {
    if (!open || closing) return;
    setClosing(true);
    setActivePerimeterPlusId(null);
    collapseTimerRef.current = setTimeout(() => {
      setOpen(false);
      setClosing(false);
      collapseTimerRef.current = null;
    }, COLLAPSE_DURATION_MS);
  }, [open, closing, setActivePerimeterPlusId]);

  const handleClosedMouseEnter = () => {
    if (openTimerRef.current || open) return;
    openTimerRef.current = setTimeout(() => {
      setOpen(true);
      openTimerRef.current = null;
    }, HOVER_OPEN_DELAY_MS);
  };

  // Open-state outside-tracking: a global `mousemove` listener
  // checks whether the cursor is inside the wrapper or any visible
  // antd Dropdown popup (sub-menus are portaled out of our ref).
  // Outside both → start the close timer; back inside → cancel.
  // `mousedown` outside is a hard collapse.
  //
  // Cascade popups use `.ant-dropdown-menu-submenu-popup` (a separate
  // portal from the parent `.ant-dropdown`); without that selector,
  // hovering into a category's nested layer list would read as
  // "outside" and start the collapse mid-selection.
  useEffect(() => {
    if (!open || closing) return;
    const cursorIsInside = (target) => {
      if (ref.current?.contains(target)) return true;
      const popups = document.querySelectorAll(
        '.ant-dropdown:not(.ant-dropdown-hidden), .ant-dropdown-menu-submenu-popup:not(.ant-dropdown-menu-submenu-hidden)',
      );
      for (const p of popups) if (p.contains(target)) return true;
      return false;
    };
    const handleMove = (e) => {
      if (cursorIsInside(e.target)) {
        cancelCloseTimer();
        return;
      }
      if (closeTimerRef.current) return;
      closeTimerRef.current = setTimeout(() => {
        startCollapse();
        closeTimerRef.current = null;
      }, HOVER_CLOSE_DELAY_MS);
    };
    const handleDown = (e) => {
      if (!cursorIsInside(e.target)) startCollapse();
    };
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mousedown', handleDown);
    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mousedown', handleDown);
      cancelCloseTimer();
    };
  }, [open, closing, startCollapse]);

  // Cancel any pending timers on unmount.
  useEffect(
    () => () => {
      cancelOpenTimer();
      cancelCloseTimer();
      if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
    },
    [],
  );

  // Use `visibility: hidden` (not `display: none`) so the wrapper
  // keeps its absolute-positioned slot in the DOM — re-showing
  // is instant on collapse without any layout reshuffle. Pointer
  // events drop too so clicks pass through to whatever's behind.
  return (
    <div
      ref={ref}
      style={{
        ...style,
        ...(hidden ? { visibility: 'hidden', pointerEvents: 'none' } : null),
      }}
    >
      {open ? (
        <ExpandedOptions
          sections={sections}
          onPick={startCollapse}
          direction={expandDirection}
          closing={closing}
        />
      ) : (
        <div
          className={`cea-card-icon-button-container cea-no-drag ${
            breathing ? 'cea-canvas-plus-breathing' : 'cea-canvas-plus-fade-in'
          }`}
          onMouseEnter={handleClosedMouseEnter}
          onMouseLeave={cancelOpenTimer}
        >
          <Tooltip title="Add a Feature card" placement={tooltipPlacement}>
            <Button
              type="text"
              icon={<CreateNewIcon />}
              onClick={() => setOpen(true)}
              aria-label="Add a Feature card"
            />
          </Tooltip>
        </div>
      )}
    </div>
  );
};

// Three free-standing pill buttons. Each has its own
// `cea-card-icon-button-container` outline (no shared frame).
// `direction` ('down' | 'right') drives the flex axis + which
// animation class to use (CSS in PerimeterPlusButtons.css). `closing`
// swaps to the reverse-animation variant. `onPick` triggers the
// collapse after a leaf is chosen.
const ExpandedOptions = ({ sections, onPick, direction, closing }) => {
  const { mapItems, plotItems, onPickText, onPickDivider, onPickKpi } =
    sections;
  const isRow = direction === 'right';
  const containerStyle = isRow ? expandedRowStyle : expandedColumnStyle;
  const axis = isRow ? 'right' : 'down';
  const itemClass = closing
    ? `cea-canvas-collapse-item-${axis}`
    : `cea-canvas-expand-item-${axis}`;
  // Sub-Dropdowns open to the right for the column (right-edge `+`)
  // and below for the row (bottom-edge `+`) so the menu doesn't
  // overlap its own pill column/row. Per-button tooltips mirror
  // that axis — the column gets tooltips on the LEFT, the row gets
  // them on TOP.
  const subPlacement = isRow ? 'bottomLeft' : 'rightTop';
  const tooltipPlacement = isRow ? 'top' : 'left';
  return (
    <div className="cea-no-drag" style={containerStyle}>
      <Dropdown
        menu={{ items: mapItems, onClick: onPick }}
        trigger={['click']}
        placement={subPlacement}
        disabled={mapItems.length === 0}
      >
        <div className={`cea-card-icon-button-container ${itemClass}`}>
          <Tooltip title="Map" placement={tooltipPlacement}>
            <Button
              type="text"
              icon={<MapCardIcon />}
              disabled={mapItems.length === 0}
              aria-label="Add a Map card"
            />
          </Tooltip>
        </div>
      </Dropdown>
      <Dropdown
        menu={{ items: plotItems, onClick: onPick }}
        trigger={['click']}
        placement={subPlacement}
        disabled={plotItems.length === 0}
      >
        <div className={`cea-card-icon-button-container ${itemClass}`}>
          <Tooltip title="Plot" placement={tooltipPlacement}>
            <Button
              type="text"
              icon={<PlotCardIcon />}
              disabled={plotItems.length === 0}
              aria-label="Add a Plot card"
            />
          </Tooltip>
        </div>
      </Dropdown>
      <div className={`cea-card-icon-button-container ${itemClass}`}>
        <Tooltip title="Text" placement={tooltipPlacement}>
          <Button
            type="text"
            icon={<TextCardIcon />}
            onClick={onPickText}
            disabled={!onPickText}
            aria-label="Add a Text card"
          />
        </Tooltip>
      </div>
      <div className={`cea-card-icon-button-container ${itemClass}`}>
        <Tooltip title="Divider" placement={tooltipPlacement}>
          <Button
            type="text"
            icon={<DividerCardIcon />}
            onClick={onPickDivider}
            disabled={!onPickDivider}
            aria-label="Add a Divider card"
          />
        </Tooltip>
      </div>
      <div className={`cea-card-icon-button-container ${itemClass}`}>
        <Tooltip title="KPI" placement={tooltipPlacement}>
          <Button
            type="text"
            icon={<KpiCardIcon />}
            onClick={() => {
              onPickKpi?.();
              // Close the perimeter panel after the click — the
              // KPI picker modal is what the user interacts with
              // next, not the pill column.
              onPick?.();
            }}
            disabled={!onPickKpi}
            aria-label="Add a KPI card"
          />
        </Tooltip>
      </div>
    </div>
  );
};

// ── Constants & styles ─────────────────────────────────────────────

const HOVER_OPEN_DELAY_MS = 250;
const HOVER_CLOSE_DELAY_MS = 1000;
const COLLAPSE_DURATION_MS = 300;

// `+` affordances hanging off a tile's right / bottom edges, nudged
// 8 px beyond. `.cea-no-drag` (set in JSX) prevents drag-on-click.
//
// No `transform: translate(-50%)` — the wrapper start (top for
// right edge, left for bottom edge) is offset upstream by half a
// button so the FIRST child's centre lands on the exposure fraction.
// That keeps the closed `+` visually at the fraction AND keeps the
// first option (Map) at the same spot when the panel expands.
const plusRightStyle = {
  position: 'absolute',
  left: '100%',
  marginLeft: 8,
  zIndex: 3,
};

const plusBottomStyle = {
  position: 'absolute',
  top: '100%',
  marginTop: 8,
  zIndex: 3,
};

const expandedColumnStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 8,
};

const expandedRowStyle = {
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
};
