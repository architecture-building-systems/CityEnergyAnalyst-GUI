import { ConfigProvider, Modal, Switch, message } from 'antd';
import { useState } from 'react';

import InfoTooltip from 'components/InfoTooltip';

// cea/visualisation/format/plot_colours.py :: uuen_blue = rgb(20,113,176)
const UUEN_BLUE = '#1471B0';

const wrapperStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  whiteSpace: 'nowrap',
};

const labelStyle = { fontSize: 12 };

/**
 * Archetype-Lock.
 *
 * Locked, CEA owns the archetype-derived property tables and keeps them consistent with each
 * building's archetype. Unlocked, the user owns them.
 *
 * Both transitions are confirmed, but only one is destructive: unlocking changes nothing on
 * disk, while re-locking regenerates every derived table from the archetypes and discards
 * whatever was edited. The copy reflects that asymmetry rather than warning identically twice.
 */
const ArchetypeLockToggle = ({ locked, buildingCount, onChanged, disabled = false }) => {
  const [busy, setBusy] = useState(false);

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
      content:
        'CEA will stop keeping envelope, HVAC, indoor comfort, internal loads, supply and ' +
        'the building schedules consistent with each building’s archetype. You become ' +
        'responsible for the values you change, and CEA will mark the archetype cells in the ' +
        'zone table once they no longer match.',
      okText: 'Unlock',
      cancelText: 'Cancel',
      onOk: () => apply(false),
    });

  const confirmLock = () =>
    Modal.confirm({
      title: 'Lock to the archetypes?',
      // Name the tabs, the schedules and the building count: "your changes will be lost" is
      // not actionable unless the user knows what is about to be rewritten.
      content: (
        <>
          <p style={{ marginTop: 0 }}>
            CEA will regenerate <b>envelope</b>, <b>HVAC</b>, <b>indoor comfort</b>,{' '}
            <b>internal loads</b>, <b>supply</b> and the <b>building schedules</b>
            {buildingCount ? ` for all ${buildingCount} buildings` : ''} from their archetypes.
          </p>
          <p style={{ marginBottom: 0 }}>
            Any edits you made to those tables will be lost. This cannot be undone.
          </p>
        </>
      ),
      okText: 'Lock and regenerate',
      okButtonProps: { danger: true },
      cancelText: 'Cancel',
      onOk: () => apply(true),
    });

  return (
    <div style={wrapperStyle}>
      <ConfigProvider theme={{ token: { colorPrimary: UUEN_BLUE } }}>
        <Switch
          checked={locked}
          loading={busy}
          disabled={disabled || busy}
          onChange={(next) => (next ? confirmLock() : confirmUnlock())}
          aria-label="Archetype-Lock"
        />
      </ConfigProvider>
      <span style={labelStyle}>Archetype-Lock</span>
      <InfoTooltip tooltipKey="archetype-lock" />
    </div>
  );
};

export default ArchetypeLockToggle;
