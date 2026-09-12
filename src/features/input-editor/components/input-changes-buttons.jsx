import { Button, Modal, Tooltip, message } from 'antd';
import { BinAnimationIcon, SaveIcon } from 'assets/icons';
import { ERROR_RED } from 'constants/theme';

import { AsyncError } from 'components/AsyncError';
import { useSaveInputs } from 'features/input-editor/hooks/mutations/useSaveInputs';
import { useResyncInputs } from 'features/input-editor/hooks/updates/useUpdateInputs';
import {
  hasChanges,
  useDiscardChanges,
} from 'features/input-editor/stores/inputEditorStore';
import { useSetShowLoginModal } from 'features/auth/stores/login-modal';
import { ChangesSummary } from 'features/input-editor/components/changes-summary';

export const InputChangesButtons = ({ changes }) => {
  const saveChanges = useSaveInputs();
  const resyncInputs = useResyncInputs();
  const discardChangesFunc = useDiscardChanges();

  const setShowLoginModal = useSetShowLoginModal();

  const discardChanges = async () => {
    // TODO: Throw error
    await resyncInputs();
    discardChangesFunc();
  };

  // Shared with the card that renders these buttons, so the two can never disagree about
  // whether there is anything to save.
  const noChanges = !hasChanges(changes);

  const _saveChanges = () => {
    Modal.confirm({
      title: 'Save these changes?',
      content: (
        <details>
          <summary>Show changes</summary>
          <ChangesSummary changes={changes} />
        </details>
      ),
      centered: true,
      okText: 'SAVE',
      okType: 'primary',
      cancelText: 'Cancel',
      async onOk() {
        await saveChanges
          .mutateAsync()
          .then(() => {
            message.config({
              top: 120,
            });
            message.success('Changes Saved!');
          })
          .catch((error) => {
            // Optional: a network failure has no `response`, and reading `.status` off it
            // would throw inside the catch, replacing the error modal with a blank screen.
            if (error?.response?.status === 401) setShowLoginModal(true);
            else {
              Modal.error({
                title: 'Could not save changes',
                content: <AsyncError error={error} />,
                width: '80vw',
              });
            }
          });
      },
    });
  };

  const _discardChanges = () => {
    Modal.confirm({
      title: 'This will discard all unsaved changes.',
      content: (
        <details>
          <summary>Show changes</summary>
          <ChangesSummary changes={changes} />
        </details>
      ),
      centered: true,
      okText: 'DISCARD',
      okType: 'danger',
      cancelText: 'Cancel',
      async onOk() {
        await discardChanges()
          .then(() => {
            message.config({
              top: 120,
            });
            message.info('Unsaved changes have been discarded.');
          })
          .catch((error) => {
            console.error(error);
            message.error('Something went wrong.', 0);
          });
      },
    });
  };

  if (noChanges) return <div></div>;

  return (
    // `cea-card-icon-button-container` is the shared icon-button chrome (see HomePage.css).
    // Colour carries the hierarchy the labels used to: red for the destructive action, a filled
    // UUEN blue for the one to take. Without it two identical grey icons sit side by side.
    <div style={{ display: 'flex', gap: 8 }}>
      <div className="cea-card-icon-button-container">
        <Tooltip title="Discard changes" placement="bottom">
          <Button
            type="text"
            onClick={_discardChanges}
            icon={<BinAnimationIcon style={{ color: ERROR_RED }} />}
            aria-label="Discard changes"
          />
        </Tooltip>
      </div>
      {/* `active` is the existing blue breathing glow (HomePage.css `@keyframes glow`), the
          same one the empty-state CTAs use to say "this is the thing to do next". Unsaved
          changes are exactly that. `cea-icon-button-primary` fills it UUEN blue; the icon
          paints white from the CSS, so no inline colour here. */}
      <div className="cea-card-icon-button-container cea-icon-button-primary active">
        <Tooltip title="Save changes" placement="bottom">
          <Button
            type="text"
            onClick={_saveChanges}
            icon={<SaveIcon />}
            aria-label="Save changes"
          />
        </Tooltip>
      </div>
    </div>
  );
};
