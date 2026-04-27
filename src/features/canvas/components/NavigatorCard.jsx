import { useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Button,
  ConfigProvider,
  Input,
  Modal,
  Select,
  Space,
  Switch,
  Tooltip,
  message as antdMessage,
} from 'antd';
import { LeftOutlined } from '@ant-design/icons';
import {
  CreateNewIcon,
  ImportIcon,
  SaveIcon,
  ShareIcon,
  StartOverIcon,
} from 'assets/icons';

import InfoTooltip from 'components/InfoTooltip';
import useNavigationStore from 'stores/navigationStore';
import routes from 'constants/routes.json';
import { useProjectStore } from 'features/project/stores/projectStore';

import { useCanvasStore } from '../stores/canvasStore';
import { useFetchSavedCanvases } from '../hooks/useCanvasData';
import SavedIndicator from './SavedIndicator';
import {
  createTempCanvas,
  deleteTempCanvas,
  exportCanvasZip,
  importCanvasZip,
  readSavedCanvas,
  saveTempCanvas,
  updateTempCanvas,
} from '../api/canvas';
import { deserializeCanvas, serializeCanvas } from '../utils/canvasSerialize';


/**
 * Navigator card — top strip of the Canvas Builder page.
 *
 * Mirrors the main viewport's black toolbar height (≈52px) but uses
 * a white background so it reads as a sibling to the canvas and plot
 * tool cards rather than a toolbar in the traditional sense. Holds
 * navigation actions, view toggles, the dashboard switcher, and the
 * Save / Discard buttons that drive the persistence flow.
 *
 * Currently visible controls:
 *   - Return       → back to the project page
 *   - Start Over   → delete the active draft and clear comparison
 *                    state (with confirm)
 *   - Sync Maps    → mirror every map card to the overview map
 *   - Fix Layout   → lock card positions and sizes
 *   - Enable Edit  → show editing controls (default on); off
 *                    hides Edit / Delete / `+` / toolbars / range
 *                    inputs for a clean snapshot
 *   - Auto Save    → flush every change to a backend draft
 *                    (default on); off keeps everything in memory
 *                    until Save is clicked
 *   - Save         → promote the active draft to a saved canvas;
 *                    prompts for a name on first save
 *   - Share        → download the saved canvas as a zip
 *   - Import       → upload a previously-shared canvas zip
 *   - Dashboard    → dropdown to switch between saved canvases,
 *                    or `+ New canvas` to start fresh
 */
const NavigatorCard = () => {
  const { push } = useNavigationStore();
  const project = useProjectStore((s) => s.project);
  const scenario = useProjectStore((s) => s.scenario);

  const startOverStore = useCanvasStore((s) => s.startOver);
  const mapsLinked = useCanvasStore((s) => s.mapsLinked);
  const setMapsLinked = useCanvasStore((s) => s.setMapsLinked);
  const enableEdit = useCanvasStore((s) => s.enableEdit);
  const setEnableEdit = useCanvasStore((s) => s.setEnableEdit);
  const fixLayout = useCanvasStore((s) => s.fixLayout);
  const setFixLayout = useCanvasStore((s) => s.setFixLayout);
  const autoSave = useCanvasStore((s) => s.autoSave);
  const setAutoSave = useCanvasStore((s) => s.setAutoSave);
  const tempUuid = useCanvasStore((s) => s.tempUuid);
  const setTempUuid = useCanvasStore((s) => s.setTempUuid);
  const canvasName = useCanvasStore((s) => s.canvasName);
  const savedAs = useCanvasStore((s) => s.savedAs);
  const dirty = useCanvasStore((s) => s.dirty);
  const markSaved = useCanvasStore((s) => s.markSaved);
  const applyLoadedCanvas = useCanvasStore((s) => s.applyLoadedCanvas);
  const createNamedDraft = useCanvasStore((s) => s.createNamedDraft);

  const queryClient = useQueryClient();
  const { data: savedCanvases } = useFetchSavedCanvases(project, scenario);

  // When Save commits, the listing is stale until react-query
  // refetches. Invalidate explicitly so the switcher reflects the
  // new canvas immediately.
  const invalidateSavedList = () =>
    queryClient.invalidateQueries({
      queryKey: ['canvas', 'saved', project, scenario],
    });

  // Save-name prompt — only fired by the (rare) Save path that
  // doesn't already have a `canvasName`, e.g. after a Start Over.
  // The default flow names canvases up-front via the New-canvas
  // modal below, so this stays a fallback.
  const [namePromptOpen, setNamePromptOpen] = useState(false);
  const [pendingName, setPendingName] = useState('');
  const [nameError, setNameError] = useState(null);
  const [saving, setSaving] = useState(false);

  // New-canvas modal — opened by the `+` button and by clicking
  // the empty dashboard switcher, mirroring the pathway dropdown's
  // up-front-naming pattern.
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createError, setCreateError] = useState(null);

  // Import button is a styled button that proxies clicks to a
  // hidden `<input type="file">`. The input lives in the JSX tree
  // below, the ref drives the click; we reset its `value` on the
  // way out so picking the same zip twice in a row still fires
  // `onChange`.
  const fileInputRef = useRef(null);
  const [importing, setImporting] = useState(false);

  // Import-as-rename state. When the backend returns 409 on the
  // first upload attempt we hold the picked file in a ref and open
  // the rename prompt; the user supplies a fresh name, we retry
  // the upload with `as: <new>`. The ref (rather than state)
  // avoids re-rendering the file picker proxy when we stash the
  // pending file.
  const pendingImportFileRef = useRef(null);
  const [renamePromptOpen, setRenamePromptOpen] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [renameError, setRenameError] = useState(null);

  const handleReturn = () => {
    push(routes.PROJECT);
  };

  /**
   * Run Save against the backend and commit the result locally.
   * If no `tempUuid` exists yet — autoSave was off, or the user
   * clicked Save before the autosave debounce fired — we
   * materialise the temp on the fly: create folder, flush the
   * current in-memory state into it, then promote. This is the
   * "force a flush" path that lets Save work as a one-button
   * commit regardless of autosave state.
   *
   * Surfaces 409 conflicts back into the name-prompt modal so the
   * user can pick a different name; other errors fall through to
   * a toast.
   */
  const commitSave = async (name) => {
    setSaving(true);
    try {
      let uuid = useCanvasStore.getState().tempUuid;
      if (!uuid) {
        const created = await createTempCanvas({
          project,
          scenario,
          fromName: useCanvasStore.getState().savedAs ?? null,
        });
        uuid = created.uuid;
        setTempUuid(uuid);
        // Flush the in-memory state so the about-to-be-promoted
        // temp actually carries the user's edits, not an empty
        // canvas freshly seeded from the parent (or no parent).
        await updateTempCanvas({
          project,
          scenario,
          uuid,
          payload: serializeCanvas(useCanvasStore.getState()),
        });
      }
      const result = await saveTempCanvas({
        project,
        scenario,
        uuid,
        name,
      });
      markSaved(result.name);
      invalidateSavedList();
      setNamePromptOpen(false);
      setPendingName('');
      setNameError(null);
      antdMessage.success(`Saved as "${result.name}"`);
    } catch (err) {
      const status = err?.response?.status;
      const detail = err?.response?.data?.detail;
      if (status === 409 || status === 400) {
        // Bounce back into the prompt; let the user fix the name.
        setNameError(detail || 'Could not save with that name');
        setNamePromptOpen(true);
      } else {
        antdMessage.error('Save failed — see console for details');
        // eslint-disable-next-line no-console
        console.error('Canvas save failed', err);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSaveClick = () => {
    if (!dirty) return;
    if (canvasName) {
      // The canvas already has a committed name — overwrite without
      // re-prompting. (Save As lives in a later phase.)
      commitSave(canvasName);
    } else {
      setPendingName('');
      setNameError(null);
      setNamePromptOpen(true);
    }
  };

  /**
   * Confirm-discard-then-load when the user picks a different
   * saved canvas (or "+ New canvas") from the switcher. Skips the
   * confirm when there's nothing to lose (no live temp).
   */
  const switchCanvas = async (action) => {
    const proceed = await new Promise((resolve) => {
      if (!tempUuid) {
        resolve(true);
        return;
      }
      Modal.confirm({
        title: 'Discard unsaved changes?',
        content:
          'You have unsaved changes to the current canvas. Continuing will discard them.',
        okText: 'Discard',
        okButtonProps: { danger: true },
        cancelText: 'Cancel',
        onOk: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });
    if (!proceed) return;

    if (tempUuid) {
      try {
        await deleteTempCanvas({ project, scenario, uuid: tempUuid });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to delete temp canvas', err);
      }
    }
    await action();
  };

  const handleOpenSaved = (name) =>
    switchCanvas(async () => {
      try {
        const state = await readSavedCanvas({ project, scenario, name });
        applyLoadedCanvas(deserializeCanvas(state));
      } catch (err) {
        antdMessage.error(`Could not open "${name}"`);
        // eslint-disable-next-line no-console
        console.error('Open canvas failed', err);
      }
    });

  const handleNewCanvas = () =>
    switchCanvas(async () => {
      // Pathway-style up-front naming: open a modal asking for the
      // canvas name. Confirming the modal seeds `canvasName` and
      // resets to launch view; the autosave hook then materialises
      // a temp folder on the first persistable edit (with no
      // `from:` seed since `savedAs` is null until first Save).
      setCreateName('');
      setCreateError(null);
      setCreateOpen(true);
    });

  const handleCreateConfirm = () => {
    const trimmed = createName.trim();
    if (!trimmed) {
      setCreateError('Name cannot be empty');
      return;
    }
    createNamedDraft(trimmed);
    setCreateOpen(false);
    setCreateName('');
    setCreateError(null);
  };

  const handleCreateCancel = () => {
    setCreateOpen(false);
    setCreateName('');
    setCreateError(null);
  };

  const handleExport = async () => {
    if (!canvasName) return;
    try {
      const blob = await exportCanvasZip({
        project,
        scenario,
        name: canvasName,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${canvasName}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      antdMessage.error('Could not share canvas — see console for details');
      // eslint-disable-next-line no-console
      console.error('Canvas export failed', err);
    }
  };

  const handleImportPick = () => fileInputRef.current?.click();

  /**
   * Run an import attempt. Returns `'ok'` on success, `'conflict'`
   * if the backend returned 409 (caller should open the rename
   * prompt), or `'error'` for anything else (already toasted).
   */
  const runImport = async (file, as) => {
    try {
      const result = await importCanvasZip({ project, scenario, file, as });
      invalidateSavedList();
      antdMessage.success(`Imported "${result.name}"`);
      return 'ok';
    } catch (err) {
      const httpStatus = err?.response?.status;
      const detail = err?.response?.data?.detail;
      if (httpStatus === 409) {
        setRenameError(detail || null);
        return 'conflict';
      }
      if (httpStatus === 400) {
        antdMessage.error(detail || 'Invalid canvas zip');
      } else {
        antdMessage.error('Import failed — see console for details');
        // eslint-disable-next-line no-console
        console.error('Canvas import failed', err);
      }
      return 'error';
    }
  };

  const handleImportChange = async (event) => {
    const file = event.target.files?.[0];
    // Reset early so picking the same zip twice still fires onChange.
    event.target.value = '';
    if (!file) return;

    setImporting(true);
    const outcome = await runImport(file);
    setImporting(false);

    if (outcome === 'conflict') {
      // Stash the file + open the rename prompt. The retry happens
      // inside `handleRenameImport` once the user supplies a new
      // name.
      pendingImportFileRef.current = file;
      setRenameValue('');
      setRenamePromptOpen(true);
    }
  };

  const handleRenameImport = async () => {
    const file = pendingImportFileRef.current;
    if (!file) {
      setRenamePromptOpen(false);
      return;
    }
    const trimmed = renameValue.trim();
    if (!trimmed) {
      setRenameError('Name cannot be empty');
      return;
    }
    setImporting(true);
    const outcome = await runImport(file, trimmed);
    setImporting(false);
    if (outcome === 'ok') {
      pendingImportFileRef.current = null;
      setRenamePromptOpen(false);
      setRenameValue('');
      setRenameError(null);
    }
    // 'conflict' / 'error' leave the prompt open with the error
    // populated so the user can try a different name.
  };

  const handleCancelRenameImport = () => {
    pendingImportFileRef.current = null;
    setRenamePromptOpen(false);
    setRenameValue('');
    setRenameError(null);
  };

  const handleStartOver = () => {
    Modal.confirm({
      title: 'Start over?',
      content:
        'All cards will be removed and the canvas will return to its launch state. Any unsaved draft will be discarded.',
      okText: 'Start over',
      cancelText: 'Cancel',
      onOk: async () => {
        // Clean up the server-side temp before resetting local
        // state. If the API call fails we still reset locally —
        // a stranded temp folder is a recoverable inconvenience,
        // but blocking the user on it would not be.
        if (tempUuid) {
          try {
            await deleteTempCanvas({ project, scenario, uuid: tempUuid });
          } catch (err) {
            // eslint-disable-next-line no-console
            console.error('Failed to delete temp canvas', err);
          }
        }
        startOverStore();
      },
    });
  };

  const saveDisabled = !dirty || saving;
  const saveTooltip = saving
    ? 'Saving…'
    : !dirty
      ? 'No changes to save'
      : canvasName
        ? `Save changes to "${canvasName}"`
        : 'Save as a new canvas';

  return (
    <div style={cardStyle}>
      <Space size="small" align="center">
        <Button icon={<LeftOutlined />} onClick={handleReturn}>
          Return
        </Button>
        {/* Icon-only navigator actions all share the same wrapper
            chrome so Start Over / Save / Share / Import read as one
            cluster — and match the perimeter "+ Add a Feature card"
            affordance the user already knows.

            Everything from Start Over to Auto Save is **hidden**
            until the user has actually opened or created a canvas
            (`canvasName` set). Only the dashboard switcher / `+` /
            Import on the right side stay live so the user has a
            clear path forward from the empty entry state. */}
        {canvasName && (
          <>
            <Tooltip title="Start Over">
              <div className={iconWrapperClass} style={iconWrapperStyle}>
                <Button
                  type="text"
                  icon={<StartOverIcon />}
                  onClick={handleStartOver}
                  aria-label="Start over"
                />
              </div>
            </Tooltip>
            <NavigatorToggle
              checked={mapsLinked}
              onChange={setMapsLinked}
              label="Sync Maps"
              ariaLabel="Sync map cards with overview"
              tooltipKey="canvas-sync-maps"
            />
            <NavigatorToggle
              checked={fixLayout}
              onChange={setFixLayout}
              label="Freeze Layout"
              ariaLabel="Lock card positions and sizes"
            />
            <NavigatorToggle
              checked={enableEdit}
              onChange={setEnableEdit}
              label="Enable Edit"
              ariaLabel="Show editing controls"
            />
          </>
        )}
      </Space>

      <Space size="small">
        <SavedIndicator />
        {/* Order: Auto Save · Save · Switcher · `+` · Import · Share.
            Auto Save and Save sit together as the persistence pair
            at the start of the right cluster — the toggle decides
            *whether* changes flush, the button forces a commit.
            Switcher + `+` form the create-or-open pair. Import
            sits to the right of `+` (zip in), Share sits to the
            right of Import (zip out). The persistence pair and
            Share hide in the empty entry state; Switcher / `+` /
            Import are always visible and pulse purple while no
            canvas is open. */}
        {canvasName && (
          <>
            <NavigatorToggle
              checked={autoSave}
              onChange={setAutoSave}
              label="Auto Save"
              ariaLabel="Automatically save changes to a draft"
            />
            <Tooltip title={saveTooltip}>
              <div className={iconWrapperClass} style={iconWrapperStyle}>
                <Button
                  type="text"
                  icon={<SaveIcon />}
                  disabled={saveDisabled}
                  loading={saving}
                  onClick={handleSaveClick}
                  aria-label="Save canvas"
                />
              </div>
            </Tooltip>
          </>
        )}

        {/* Dashboard switcher — Select + adjacent `+` button to
            match the pathway dropdown's chrome. When no saved
            canvases exist (or none are open), clicking the Select
            doesn't open the dropdown — it triggers the new-canvas
            modal, identical to the `+` button's behaviour. */}
        <CanvasSwitcher
          savedCanvases={savedCanvases}
          canvasName={canvasName}
          disabled={!project || !scenario}
          onOpen={handleOpenSaved}
          onCreate={handleNewCanvas}
        />
        <Tooltip title="New canvas" placement="bottom">
          <div className={iconWrapperClass} style={iconWrapperStyle}>
            <Button
              type="text"
              icon={<CreateNewIcon />}
              onClick={handleNewCanvas}
              disabled={!project || !scenario}
              aria-label="New canvas"
            />
          </div>
        </Tooltip>

        <Tooltip title="Import a Canvas .zip">
          <div
            className={`${iconWrapperClass}${
              canvasName ? '' : ' cea-canvas-blink'
            }`}
            style={iconWrapperStyle}
          >
            <Button
              type="text"
              icon={<ImportIcon />}
              loading={importing}
              disabled={!project || !scenario}
              onClick={handleImportPick}
              aria-label="Import canvas zip"
            />
          </div>
        </Tooltip>

        {canvasName && (
          <Tooltip title={`Share "${canvasName}" as a zip`}>
            <div className={iconWrapperClass} style={iconWrapperStyle}>
              <Button
                type="text"
                icon={<ShareIcon />}
                onClick={handleExport}
                aria-label="Share canvas as zip"
              />
            </div>
          </Tooltip>
        )}
      </Space>

      {/* Hidden input proxied by the Import button above. Mounted
          *outside* the right-side `<Space>` so its `display: none`
          tile doesn't push apart its visible neighbours (Import /
          Share) — antd's Space allocates spacing per child
          regardless of `display`. */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".zip,application/zip"
        style={{ display: 'none' }}
        onChange={handleImportChange}
      />

      <NameSaveModal
        open={namePromptOpen}
        value={pendingName}
        onChange={setPendingName}
        error={nameError}
        loading={saving}
        onCancel={() => {
          setNamePromptOpen(false);
          setNameError(null);
        }}
        onOk={() => {
          const trimmed = pendingName.trim();
          if (!trimmed) {
            setNameError('Name cannot be empty');
            return;
          }
          commitSave(trimmed);
        }}
      />

      <Modal
        open={createOpen}
        title="Create new canvas"
        okText="Create"
        cancelText="Cancel"
        onOk={handleCreateConfirm}
        onCancel={handleCreateCancel}
        destroyOnClose
      >
        <p style={{ marginTop: 0 }}>Choose a name for the new canvas:</p>
        <Input
          autoFocus
          value={createName}
          placeholder="e.g. Cumulative Emissions Comparison"
          onChange={(e) => {
            setCreateName(e.target.value);
            if (createError) setCreateError(null);
          }}
          onPressEnter={handleCreateConfirm}
          status={createError ? 'error' : undefined}
        />
        {createError && (
          <div style={{ color: '#f04d5b', fontSize: 12, marginTop: 6 }}>
            {createError}
          </div>
        )}
      </Modal>

      <Modal
        open={renamePromptOpen}
        title="Import as"
        okText="Import"
        cancelText="Cancel"
        confirmLoading={importing}
        onOk={handleRenameImport}
        onCancel={handleCancelRenameImport}
        destroyOnClose
      >
        <p style={{ marginTop: 0 }}>
          A canvas with this name already exists. Pick a new name to
          import under:
        </p>
        <Input
          autoFocus
          value={renameValue}
          placeholder="New canvas name"
          onChange={(e) => {
            setRenameValue(e.target.value);
            if (renameError) setRenameError(null);
          }}
          onPressEnter={handleRenameImport}
          status={renameError ? 'error' : undefined}
        />
        {renameError && (
          <div style={{ color: '#f04d5b', fontSize: 12, marginTop: 6 }}>
            {renameError}
          </div>
        )}
      </Modal>
    </div>
  );
};

/**
 * Dashboard switcher modelled after the pathway builder's
 * `PathwaySelect`. Same dimensions (208 px wide, 270 px popup),
 * same `cea-scenario-select` family of classes, same empty-state
 * behaviour: when nothing is open the select reads "Select canvas"
 * with the empty-state outline so the New (+) button next to it
 * reads as the call-to-action.
 *
 * The `+ New canvas` entry that used to live inside the dropdown
 * has been hoisted into a sibling `+` button (parent renders it),
 * leaving the Select's options to a clean alphabetised list of
 * saved canvases.
 */
const CanvasSwitcher = ({
  savedCanvases,
  canvasName,
  disabled,
  onOpen,
  onCreate,
}) => {
  const [open, setOpen] = useState(false);
  const list = Array.isArray(savedCanvases) ? savedCanvases : [];
  const options = useMemo(() => {
    const seen = new Set(list);
    const names = [...list];
    // The just-saved canvas may not be in the freshly fetched list
    // yet (react-query refetch hasn't landed); make sure it shows.
    if (canvasName && !seen.has(canvasName)) names.push(canvasName);
    return names
      .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
      .map((name) => ({ value: name, label: name }));
  }, [list, canvasName]);

  const hasSaved = options.length > 0;
  const hasSelection = !!canvasName;

  // When there are no saved canvases AND none is open, the Select
  // is in "create" mode: placeholder reads "Create new Canvas",
  // the dropdown is force-closed, and clicking the field invokes
  // the parent's `onCreate` (same hook the `+` button uses).
  // Mirrors PathwaySelect exactly.
  const inCreateMode = !hasSaved && !hasSelection;

  // The empty entry state pulses purple (CEA-canvas accent) so the
  // dashboard switcher reads as a primary CTA before the user has
  // any canvas open. `cea-canvas-blink`'s rule overrides the blue
  // glow that `cea-scenario-select-empty` ships with.
  return (
    <Select
      className={`cea-scenario-select ${
        hasSelection ? '' : 'cea-scenario-select-empty cea-canvas-blink'
      }`}
      style={{ width: 208 }}
      styles={{ popup: { root: { width: 270 } } }}
      placeholder={inCreateMode ? 'Create new Canvas' : 'Select canvas'}
      options={inCreateMode ? [] : options}
      value={canvasName || undefined}
      disabled={disabled}
      onChange={(name) => {
        if (name && name !== canvasName) onOpen(name);
      }}
      open={inCreateMode ? false : open}
      onOpenChange={inCreateMode ? undefined : setOpen}
      onClick={inCreateMode ? onCreate : undefined}
      notFoundContent={<small>No saved canvases</small>}
    />
  );
};

/**
 * Modal prompt for naming a new canvas. Surfaces 400 / 409 errors
 * from the backend (illegal name, duplicate) inline below the input
 * so the user can correct without losing the typed name.
 */
const NameSaveModal = ({
  open,
  value,
  onChange,
  error,
  loading,
  onOk,
  onCancel,
}) => (
  <Modal
    open={open}
    title="Save canvas"
    okText="Save"
    cancelText="Cancel"
    confirmLoading={loading}
    onOk={onOk}
    onCancel={onCancel}
    destroyOnClose
  >
    <p style={{ marginTop: 0 }}>Choose a name for this canvas:</p>
    <Input
      autoFocus
      value={value}
      placeholder="e.g. Cumulative Emissions Comparison"
      onChange={(e) => onChange(e.target.value)}
      onPressEnter={onOk}
      status={error ? 'error' : undefined}
    />
    {error && (
      <div style={{ color: '#f04d5b', fontSize: 12, marginTop: 6 }}>
        {error}
      </div>
    )}
  </Modal>
);

// Shared chrome for every icon-only action in the navigator
// (Start Over / Save / Share / Import). The class name is the same
// outline + 30×30 icon button rule the perimeter "+ Add a Feature
// card" affordance uses; solid white background lifts the buttons
// off the navigator's 50%-opaque white surface so they read as
// raised tiles.
const iconWrapperClass = 'cea-card-icon-button-container';
const iconWrapperStyle = { background: '#fff' };

// Matches the main viewport's black toolbar height — 24px icon +
// 2×8px icon padding + 2×6px container padding ≈ 52px. Kept at 52
// so the two toolbars read as equal-height siblings if viewed
// side-by-side.
const cardStyle = {
  height: 52,
  boxSizing: 'border-box',
  // 50% opaque white — the grey page shows through at half strength.
  background: 'rgba(255, 255, 255, 0.5)',
  border: '1px solid #e8e8e8',
  borderRadius: 12,
  padding: '0 12px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
};

// `height: 32` matches the antd button height so the toggle's
// centerline aligns with `Return` / `Start Over` regardless of the
// Switch's intrinsic height. `marginLeft: 16` doubles the gap
// inherited from `Space size="small"` so the toggle group reads as a
// separate cluster from the navigation buttons.
const syncToggleWrapperStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  marginLeft: 16,
  height: 32,
};

const syncToggleLabelStyle = {
  fontSize: 14,
  color: '#222',
};

// Compact CEA-purple `Switch + label + info` toggle used in the
// Navigator row. Wraps its own `ConfigProvider` so each toggle shows
// up as a distinct child of `Space` and gets the row's flex gap (a
// shared outer provider would collapse them into one slot). The info
// icon's body is loaded by `InfoTooltip` from the backend
// `tooltips.yml` keyed by `tooltipKey`.
const NavigatorToggle = ({
  checked,
  onChange,
  label,
  ariaLabel,
  tooltipKey,
  disabled = false,
}) => (
  <div style={syncToggleWrapperStyle}>
    <ConfigProvider theme={{ token: { colorPrimary: '#AC6080' } }}>
      <Switch
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        aria-label={ariaLabel}
      />
    </ConfigProvider>
    <span style={syncToggleLabelStyle}>{label}</span>
    {tooltipKey && <InfoTooltip tooltipKey={tooltipKey} />}
  </div>
);

export default NavigatorCard;
