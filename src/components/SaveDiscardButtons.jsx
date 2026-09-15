import { Button, Tooltip } from 'antd';

import { BinAnimationIcon, SaveIcon } from 'assets/icons';
import { ERROR_RED } from 'constants/theme';

/**
 * The Save / Discard pair shown wherever an editor holds unsaved changes.
 *
 * Presentation only -- confirmation dialogs, success messages and what "discard" actually
 * means are the caller's, because they differ per editor. Shared so the design decisions below
 * live in one place rather than being re-derived each time one of these panels is restyled:
 *
 * - `cea-card-icon-button-container` (HomePage.css) is the app's icon-button chrome, one
 *   container per action. It draws the outline, so the buttons inside stay borderless.
 * - Colour carries the hierarchy the labels used to: red for the destructive action, filled
 *   UUEN blue for the one to take. Without it, two identical grey icons sit side by side.
 * - `active` is the blue breathing glow (`@keyframes glow`), the same one the empty-state CTAs
 *   use to say "this is the thing to do next". Unsaved changes are exactly that.
 * - The bin's colour is inline because antd's `.ant-btn .ant-btn-icon > svg { color: inherit }`
 *   outranks the SVG's own fill. The save icon paints white from the CSS, so it needs none.
 */
export const SaveDiscardButtons = ({ onSave, onDiscard }) => (
  <div style={{ display: 'flex', gap: 8 }}>
    <div className="cea-card-icon-button-container">
      <Tooltip title="Discard changes" placement="bottom">
        <Button
          type="text"
          onClick={onDiscard}
          icon={<BinAnimationIcon style={{ color: ERROR_RED }} />}
          aria-label="Discard changes"
        />
      </Tooltip>
    </div>
    <div className="cea-card-icon-button-container cea-icon-button-primary active">
      <Tooltip title="Save changes" placement="bottom">
        <Button
          type="text"
          onClick={onSave}
          icon={<SaveIcon />}
          aria-label="Save changes"
        />
      </Tooltip>
    </div>
  </div>
);

export default SaveDiscardButtons;
