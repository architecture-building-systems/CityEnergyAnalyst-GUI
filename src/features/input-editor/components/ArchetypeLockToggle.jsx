import { ConfigProvider, Modal, Switch, Tooltip, message } from 'antd';
import { Fragment, useState } from 'react';

import InfoTooltip from 'components/InfoTooltip';
import { UUEN_BLUE } from 'constants/theme';

const wrapperStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  whiteSpace: 'nowrap',
};

// Matches the canvas-builder toggles (`NavigatorCard.jsx` :: syncToggleLabelStyle).
const labelStyle = { fontSize: 14, color: '#222' };

// Display labels for the tab keys the backend sends in `derived_tabs`
// (`archetype_lock.ARCHETYPE_DERIVED_TABS`). Only cosmetic -- an unrecognised key still
// renders (hyphens become spaces), so a new derived table shows up here without a frontend
// change; only its capitalisation would need a follow-up.
const TAB_LABELS = {
  envelope: 'envelope',
  hvac: 'HVAC',
  'indoor-comfort': 'indoor comfort',
  'internal-loads': 'internal loads',
  supply: 'supply',
};

const tabLabel = (tab) => TAB_LABELS[tab] ?? tab.replace(/-/g, ' ');

/**
 * "a, b and c" -- no Oxford comma, matching the copy this replaced. `Modal.confirm`'s
 * `content` takes a React node either way, so this covers both dialogs: `bold` toggles the
 * only difference between them, whether each item is wrapped in `<b>`.
 */
const JoinedList = ({ items, bold = false }) =>
  items.map((item, i) => (
    <Fragment key={item}>
      {i > 0 && (i === items.length - 1 ? ' and ' : ', ')}
      {bold ? <b>{item}</b> : item}
    </Fragment>
  ));

/**
 * Archetype Lock.
 *
 * Locked, CEA owns the archetype-derived property tables and keeps them consistent with each
 * building's archetype. Unlocked, the user owns them.
 *
 * Both transitions are confirmed, but only one is destructive: unlocking changes nothing on
 * disk, while re-locking regenerates every derived table from the archetypes and discards
 * whatever was edited. The copy reflects that asymmetry rather than warning identically twice.
 */
const ArchetypeLockToggle = ({
  locked,
  derivedTabs = [],
  buildingCount,
  onChanged,
  disabled = false,
}) => {
  const [busy, setBusy] = useState(false);

  // The tables named in the dialogs, in the server's order, plus schedules -- which are not a
  // `derived_tabs` entry (they are per-building files, not an input-editor tab) but are
  // regenerated alongside them all the same.
  const tabLabels = derivedTabs.map(tabLabel);
  const regeneratedItems = [...tabLabels, 'building schedules'];

  const apply = async (nextLocked) => {
    setBusy(true);
    try {
      await onChanged(nextLocked);
    } catch (error) {
      message.error(
        error?.response?.data?.detail ?? 'Could not change the archetype lock.',
      );
    } finally {
      setBusy(false);
    }
  };

  const confirmUnlock = () =>
    Modal.confirm({
      title: 'Unlock the archetype-derived tables?',
      content: (
        <>
          CEA will stop keeping <JoinedList items={regeneratedItems} /> consistent
          with each building’s archetype. You become responsible for the values you
          change, and CEA will mark the archetype cells in the zone table once they
          no longer match.
        </>
      ),
      okText: 'UNLOCK', okButtonProps: { danger: true },
      cancelText: 'Cancel',
      onOk: () => apply(false),
    });

  const confirmLock = () =>
    Modal.confirm({
      title: 'Lock to the Archetypes?',
      // Name the tabs, the schedules and the building count: "your changes will be lost" is
      // not actionable unless the user knows what is about to be rewritten.
      content: (
        <>
          <p style={{ marginTop: 0 }}>
            CEA will regenerate <JoinedList items={regeneratedItems} bold />
            {buildingCount ? ` for all ${buildingCount} buildings` : ''} from
            their archetypes (i.e. const_type, use_type and ratios) using Archetype Mapper.
          </p>
          <p style={{ marginBottom: 0 }}>
            Any custom edits you made to those tables will be lost. This cannot be
            undone.
          </p>
        </>
      ),
      okText: 'LOCK & REGENERATE',
      okButtonProps: { danger: true },
      cancelText: 'Cancel',
      onOk: () => apply(true),
    });

  return (
    <div style={wrapperStyle}>
      <ConfigProvider theme={{ token: { colorPrimary: UUEN_BLUE } }}>
        {/* `disabled` currently only ever means "unsaved changes are pending" (see
            `InputTable.jsx`) -- the tooltip names that reason rather than staying generic, since
            there is nowhere else on the switch itself to say why it won't respond. */}
        <Tooltip
          title={
            disabled
              ? 'Save or discard your pending changes before toggling the lock.'
              : undefined
          }
        >
          <Switch
            checked={locked}
            loading={busy}
            disabled={disabled || busy}
            onChange={(next) => (next ? confirmLock() : confirmUnlock())}
            aria-label="Archetype Lock"
          />
        </Tooltip>
      </ConfigProvider>
      <span style={labelStyle}>Archetype Lock</span>
      <InfoTooltip tooltipKey="archetype-lock" />
    </div>
  );
};

export default ArchetypeLockToggle;
