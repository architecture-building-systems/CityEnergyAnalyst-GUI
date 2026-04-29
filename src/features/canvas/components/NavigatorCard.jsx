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
import {
  CheckOutlined,
  LeftOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import {
  BinAnimationIcon,
  CreateNewIcon,
  DuplicateIcon,
  ImportIcon,
  ShareIcon,
  StartOverIcon,
} from 'assets/icons';

import InfoTooltip from 'components/InfoTooltip';
import useNavigationStore from 'stores/navigationStore';
import routes from 'constants/routes.json';
import { useProjectStore } from 'features/project/stores/projectStore';

import { useCanvasStore } from '../stores/canvasStore';
import { useFetchSavedCanvases } from '../hooks/useCanvasData';
import {
  createCanvas,
  deleteSavedCanvas,
  duplicateCanvas,
  exportCanvasZip,
  importCanvasZip,
  readSavedCanvas,
} from '../api/canvas';
import { deserializeCanvas } from '../utils/canvasSerialize';
import {
  writeLastCanvas,
  clearLastCanvas,
} from '../hooks/useResumeLastCanvas';

/**
 * Navigator card — top strip of the Canvas Builder page.
 *
 * Mirrors the main viewport's black toolbar height (≈52px) but uses
 * a white background so it reads as a sibling to the canvas and plot
 * tool cards rather than a toolbar in the traditional sense. Holds
 * navigation actions, view toggles, the dashboard switcher, and the
 * Share / Import buttons.
 *
 * There is no Save button and no autosave toggle: every persistable
 * edit hits `PUT /api/canvas/{name}` directly via
 * `useCanvasPersistence`. The expensive plot-data capture pass runs
 * server-side inside `/export` when the user clicks Share.
 *
 * Currently visible controls:
 *   - Return       → back to the project page
 *   - Start Over   → clear cards / columns of the current canvas
 *                    (autosave then flushes the empty state)
 *   - Sync Maps    → mirror every map card to the overview map
 *   - Freeze Layout → lock card positions and sizes
 *   - Enable Edit  → show editing controls (default on); off
 *                    hides Edit / Delete / `+` / toolbars / range
 *                    inputs for a clean snapshot
 *   - Dashboard    → dropdown to switch between saved canvases
 *   - `+`          → open "Create new canvas" modal
 *   - Import       → upload a previously-shared canvas zip
 *   - Share        → capture every plot card to HTML, then download
 *                    the canvas folder as a zip
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
  const canvasName = useCanvasStore((s) => s.canvasName);
  const applyLoadedCanvas = useCanvasStore((s) => s.applyLoadedCanvas);
  const autosaveStatus = useCanvasStore((s) => s.autosaveStatus);

  const queryClient = useQueryClient();
  const { data: savedCanvases } = useFetchSavedCanvases(project, scenario);
  const hasSaved = Array.isArray(savedCanvases) && savedCanvases.length > 0;

  // When create / import commits, the listing is stale until
  // react-query refetches. Invalidate explicitly so the switcher
  // reflects the new canvas immediately.
  const invalidateSavedList = () =>
    queryClient.invalidateQueries({
      queryKey: ['canvas', 'saved', project, scenario],
    });

  // New-canvas modal — opened by the `+` button and by clicking
  // the empty dashboard switcher, mirroring the pathway dropdown's
  // up-front-naming pattern.
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createError, setCreateError] = useState(null);
  const [creating, setCreating] = useState(false);

  // Export (Share) flashes a "capturing plots…" loading state on
  // the Share button — the export endpoint re-renders every plot
  // server-side before zipping, so the request can take a moment.
  const [sharing, setSharing] = useState(false);

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

  const handleOpenSaved = async (name) => {
    try {
      const state = await readSavedCanvas({ project, scenario, name });
      applyLoadedCanvas(deserializeCanvas(state));
      writeLastCanvas(project, scenario, name);
    } catch (err) {
      antdMessage.error(`Could not open "${name}"`);
      // eslint-disable-next-line no-console
      console.error('Open canvas failed', err);
    }
  };

  /**
   * Per-option `⎘` handler in the dropdown — copy a saved canvas
   * into a fresh folder and refresh the listing. The backend picks
   * the target name (``"<source> (copy)"`` series) so the user
   * sees the new entry in the dropdown without a naming step.
   */
  const handleDuplicateCanvas = async (name) => {
    try {
      const result = await duplicateCanvas({ project, scenario, name });
      invalidateSavedList();
      antdMessage.success(`Duplicated as "${result.name}"`);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      antdMessage.error(detail || `Could not duplicate "${name}"`);
      // eslint-disable-next-line no-console
      console.error('Canvas duplicate failed', err);
    }
  };

  /**
   * Per-option 🗑 handler in the dropdown. Confirms first; deleting
   * the currently-open canvas drops it from the editor (back to
   * the empty entry state) so the autosave hook doesn't keep
   * trying to PUT to a folder that no longer exists.
   */
  const handleDeleteCanvas = (name) => {
    Modal.confirm({
      title: `Delete "${name}"?`,
      content:
        'This permanently removes the canvas folder and any captured plots. This cannot be undone.',
      okText: 'Delete',
      okButtonProps: { danger: true },
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await deleteSavedCanvas({ project, scenario, name });
          invalidateSavedList();
          if (canvasName === name) {
            // The editor was looking at the canvas we just removed
            // — reset back to the empty entry state so the
            // autosave hook stops targeting the missing folder.
            applyLoadedCanvas({
              view: 'launch',
              columns: [],
              parentScenario: null,
              launchCards: [],
              columnCards: {},
              mapsLinked: true,
              fixLayout: false,
              canvasName: null,
            });
            // Clear the localStorage resume target too — the
            // resume hook would otherwise 404 on the next mount
            // trying to fetch the just-deleted canvas.
            clearLastCanvas(project, scenario);
          }
          antdMessage.success(`Deleted "${name}"`);
        } catch (err) {
          antdMessage.error(`Could not delete "${name}"`);
          // eslint-disable-next-line no-console
          console.error('Canvas delete failed', err);
        }
      },
    });
  };

  const handleNewCanvas = () => {
    setCreateName('');
    setCreateError(null);
    setCreateOpen(true);
  };

  const handleCreateConfirm = async () => {
    const trimmed = createName.trim();
    if (!trimmed) {
      setCreateError('Name cannot be empty');
      return;
    }
    setCreating(true);
    try {
      const result = await createCanvas({
        project,
        scenario,
        name: trimmed,
      });
      // Server returns the sanitised name. Apply an empty canvas
      // state under that name so the persistence hook starts
      // targeting the new folder.
      applyLoadedCanvas({
        view: 'launch',
        columns: [],
        parentScenario: null,
        launchCards: [],
        columnCards: {},
        mapsLinked: true,
        fixLayout: false,
        canvasName: result.name,
      });
      writeLastCanvas(project, scenario, result.name);
      invalidateSavedList();
      setCreateOpen(false);
      setCreateName('');
      setCreateError(null);
    } catch (err) {
      const status = err?.response?.status;
      const detail = err?.response?.data?.detail;
      if (status === 409 || status === 400) {
        setCreateError(detail || 'Could not create canvas with that name');
      } else {
        antdMessage.error('Could not create canvas — see console for details');
        // eslint-disable-next-line no-console
        console.error('Canvas create failed', err);
      }
    } finally {
      setCreating(false);
    }
  };

  const handleCreateCancel = () => {
    setCreateOpen(false);
    setCreateName('');
    setCreateError(null);
  };

  const handleExport = async () => {
    if (!canvasName) return;
    setSharing(true);
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
    } finally {
      setSharing(false);
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
      // Auto-open the just-imported canvas so the editor lands the
      // user straight on it — silent imports left the user staring
      // at the entry state with the new canvas only reachable from
      // the dropdown. Failure to load is non-fatal: the import
      // already succeeded, the toast above stands, and the user
      // can pick the canvas from the switcher.
      try {
        const state = await readSavedCanvas({
          project,
          scenario,
          name: result.name,
        });
        applyLoadedCanvas(deserializeCanvas(state));
        writeLastCanvas(project, scenario, result.name);
      } catch (openErr) {
        // eslint-disable-next-line no-console
        console.error('Auto-open after import failed', openErr);
      }
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
        'All cards will be removed and the canvas will return to its launch state.',
      okText: 'Start over',
      cancelText: 'Cancel',
      onOk: () => {
        // Just reset the in-memory cards / columns. The persistence
        // hook flushes the empty state to the existing canvas
        // folder on its own.
        startOverStore();
      },
    });
  };

  return (
    <div style={cardStyle}>
      <Space size="small" align="center">
        <Button icon={<LeftOutlined />} onClick={handleReturn}>
          Return
        </Button>
        {/* Icon-only navigator actions all share the same wrapper
            chrome so Start Over reads as part of the same cluster
            — and matches the perimeter "+ Add a Feature card"
            affordance the user already knows.

            Everything from Start Over through Enable Edit is
            **hidden** until the user has actually opened or created
            a canvas (`canvasName` set). Only the dashboard switcher
            / `+` / Import on the right side stay live so the user
            has a clear path forward from the empty entry state. */}
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
        {/* Order: Autosave dot · Switcher · `+` · Import · Share.
            The autosave dot sits to the immediate left of the
            switcher and only paints while a flush is in flight (or
            for the brief 1.5 s confirmation flash that follows).
            In the empty entry state nothing is autosaving, so the
            dot stays hidden and the switcher remains the leftmost
            element of the cluster. Switcher + `+` form the
            create-or-open pair. Import sits to the right of `+`
            (zip in), Share sits to the right of Import (zip out).
            Share hides in the empty entry state; Switcher / `+` /
            Import are always visible and pulse purple while no
            canvas is open. The `+` button only pulses when the
            switcher reads "Select Canvas" (saved canvases exist
            but none is open) — when the switcher itself is in
            create-mode ("Create new Canvas"), the switcher *is*
            the call-to-action, so doubling up with a pulsing `+`
            would just compete for the user's eye. */}
        <AutosaveIndicator status={autosaveStatus} />
        <CanvasSwitcher
          savedCanvases={savedCanvases}
          canvasName={canvasName}
          disabled={!project || !scenario}
          onOpen={handleOpenSaved}
          onCreate={handleNewCanvas}
          onDuplicate={handleDuplicateCanvas}
          onDelete={handleDeleteCanvas}
        />
        <Tooltip title="New canvas" placement="bottom">
          <div
            className={`${iconWrapperClass}${
              !canvasName && hasSaved ? ' cea-canvas-blink' : ''
            }`}
            style={iconWrapperStyle}
          >
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
        {/* Info icon for Import — explains the cross-scenario
            limitation (canvas column references come along verbatim
            and may not resolve under a project with different
            scenario names). Tooltip body lives in the backend's
            `tooltips.yml` so the wording can be edited without a
            frontend redeploy. */}
        <InfoTooltip tooltipKey="canvas-import" />

        {canvasName && (
          <>
            <Tooltip title={`Share "${canvasName}" as a .zip`}>
              <div className={iconWrapperClass} style={iconWrapperStyle}>
                <Button
                  type="text"
                  icon={<ShareIcon />}
                  loading={sharing}
                  onClick={handleExport}
                  aria-label="Share Canvas as .zip"
                />
              </div>
            </Tooltip>
            {/* Info icon for Share — same pattern as Import.
                Surfaces the "plot data baked in / column refs by
                name" limitations of the .zip handoff. */}
            <InfoTooltip tooltipKey="canvas-share" />
          </>
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

      <Modal
        open={createOpen}
        title="Create new canvas"
        okText="Create"
        cancelText="Cancel"
        confirmLoading={creating}
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
          A canvas with this name already exists. Pick a new name to import
          under:
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
 * Autosave activity indicator. Sits to the left of the dashboard
 * switcher and paints only while a backend flush is in flight, plus
 * a brief check-mark confirmation after a successful save. Stays
 * hidden in the empty / idle state so the navigator reads as
 * unchanged when nothing is happening.
 *
 * - 'saving' → spinning loader, tooltip "Saving…"
 * - 'saved'  → green check, tooltip "Saved just now"
 * - 'idle'   → renders nothing
 *
 * Width is reserved (16 px) only when the indicator is visible —
 * empty state collapses to zero so it doesn't push the switcher
 * leftward while waiting for the first edit.
 */
const AutosaveIndicator = ({ status }) => {
  if (status === 'idle') return null;

  const isSaving = status === 'saving';
  const tooltip = isSaving ? 'Saving…' : 'Saved just now';
  const icon = isSaving ? (
    <LoadingOutlined style={autosaveSavingIconStyle} />
  ) : (
    <CheckOutlined style={autosaveSavedIconStyle} />
  );

  return (
    <Tooltip title={tooltip} placement="bottom">
      <span style={autosaveIndicatorStyle} aria-live="polite">
        {icon}
      </span>
    </Tooltip>
  );
};

const autosaveIndicatorStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 16,
  height: 16,
};

// CEA primary blue — matches the action-button accent so the spinner
// reads as "I'm working" without inventing a new colour.
const autosaveSavingIconStyle = { fontSize: 12, color: '#1470AF' };

// Slightly muted green — confirmation, not a system success toast.
const autosaveSavedIconStyle = { fontSize: 12, color: '#52c41a' };

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
  onDuplicate,
  onDelete,
}) => {
  const [open, setOpen] = useState(false);
  const list = Array.isArray(savedCanvases) ? savedCanvases : [];
  const sortedNames = useMemo(() => {
    const seen = new Set(list);
    const names = [...list];
    // The just-created canvas may not be in the freshly fetched list
    // yet (react-query refetch hasn't landed); make sure it shows.
    if (canvasName && !seen.has(canvasName)) names.push(canvasName);
    return names.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  }, [list, canvasName]);

  const options = useMemo(
    () =>
      sortedNames.map((name) => ({
        value: name,
        // The dropdown row is a hover-revealing
        // ``Duplicate · Delete`` pair next to the name — same
        // affordance the pathway dropdown uses. ``label`` is what
        // antd renders inside each option; the field's selected-
        // value display ignores this and shows the bare ``value``,
        // which is what we want.
        label: (
          <CanvasOptionRow
            name={name}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
          />
        ),
      })),
    [sortedNames, onDuplicate, onDelete],
  );

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
      placeholder={inCreateMode ? 'Create new Canvas' : 'Select Canvas'}
      options={inCreateMode ? [] : options}
      value={canvasName || undefined}
      disabled={disabled}
      onChange={(name) => {
        if (name && name !== canvasName) onOpen(name);
      }}
      // antd uses ``label`` (our row component) for the field
      // display by default; force the bare name there so the
      // selected canvas reads as plain text rather than a stretched
      // option-row layout.
      labelRender={({ value }) => (
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {value}
        </span>
      )}
      open={inCreateMode ? false : open}
      onOpenChange={inCreateMode ? undefined : setOpen}
      onClick={inCreateMode ? onCreate : undefined}
      notFoundContent={<small>No saved canvases</small>}
    />
  );
};

/**
 * One row in the canvas dropdown: name on the left, hover-revealed
 * Duplicate + Delete icons on the right. Mirrors
 * ``PathwayOptionWithCheckbox`` from the pathway builder
 * (sans-checkbox — canvases are single-select, not toggle-visible).
 *
 * Click handlers ``stopPropagation`` so the icon clicks don't also
 * fire ``onChange`` on the parent ``Select`` (which would open the
 * canvas the user was trying to delete).
 */
const CanvasOptionRow = ({ name, onDuplicate, onDelete }) => {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <div
      style={canvasOptionRowStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={canvasOptionNameStyle} title={name}>
        {name}
      </div>
      {isHovered && (
        <div style={canvasOptionActionsStyle}>
          <DuplicateIcon
            style={canvasOptionDuplicateIconStyle}
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate?.(name);
            }}
          />
          <BinAnimationIcon
            // Inline `color` beats antd's
            // `.ant-select-item-option-selected` rule, which would
            // otherwise tint the bin black/brand-blue when this row
            // is the currently-open canvas (matched specificity,
            // antd wins by source order). Bin SVG paints with
            // `fill="currentColor"`, so setting `color` inline
            // forces the red regardless of cascade.
            style={canvasOptionDeleteIconStyle}
            className="cea-job-info-icon shake"
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.(name);
            }}
          />
        </div>
      )}
    </div>
  );
};

const canvasOptionRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const canvasOptionNameStyle = {
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  flex: 1,
};

const canvasOptionActionsStyle = {
  display: 'flex',
  alignItems: 'center',
  flexShrink: 0,
};

const canvasOptionDuplicateIconStyle = {
  padding: '2px 4px',
  cursor: 'pointer',
  opacity: 0.55,
};

// Hardcoded brand-red so the bin stays red even when its parent
// option is the currently-selected canvas (antd's
// `.ant-select-item-option-selected` recolours descendants and
// would otherwise win by source order). `cursor: pointer` because
// `BinAnimationIcon` ships with the shake animation but no hover
// affordance of its own here.
const canvasOptionDeleteIconStyle = {
  padding: '2px 4px',
  color: '#f04d5b',
  cursor: 'pointer',
};

// Shared chrome for every icon-only action in the navigator
// (Start Over / Share / Import / `+`). The class name is the same
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

// Compact `Switch + label + info` toggle used in the Navigator row.
// Wraps its own `ConfigProvider` so each toggle shows up as a
// distinct child of `Space` and gets the row's flex gap (a shared
// outer provider would collapse them into one slot). The info
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
