import { arrayStartsWith } from 'utils';
import useDatabaseEditorStore from '../stores/databaseEditorStore';
import { useEffect } from 'react';
import useNavigationStore from 'stores/navigationStore';

const useUnsavedChangesWarning = (hasUnsavedChanges) => {
  const { addBlocker, removeBlocker } = useNavigationStore();
  const message =
    'You have unsaved changes that will be lost if you navigate away. Are you sure you want to continue?';

  // Handle browser refresh/close
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Handle programmatic navigation through navigation store
  useEffect(() => {
    const blockerId = 'database-editor-unsaved-changes';

    if (hasUnsavedChanges) {
      addBlocker(blockerId, message);
    } else {
      removeBlocker(blockerId);
    }

    return () => {
      removeBlocker(blockerId);
    };
  }, [hasUnsavedChanges, addBlocker, removeBlocker]);

  // Handle back/forward button and other navigation
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    // Push a dummy state to intercept back button
    const currentState = window.history.state;

    // Push a new state to capture back navigation
    window.history.pushState({ ...currentState, preventBack: true }, '');

    const handlePopState = () => {
      if (hasUnsavedChanges) {
        const shouldLeave = window.confirm(message);

        if (!shouldLeave) {
          // Stay on current page - push the state back
          window.history.pushState({ ...currentState, preventBack: true }, '');
        } else {
          // Allow navigation - go back to the actual previous page
          window.history.go(-1);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      // Clean up the dummy state if component unmounts
      if (window.history.state?.preventBack) {
        window.history.back();
      }
    };
  }, [hasUnsavedChanges]);

  // Handle in-app navigation by intercepting link clicks
  useEffect(() => {
    const handleClick = (e) => {
      if (hasUnsavedChanges) {
        // Check if it's a navigation link
        const target = e.target.closest('a[href], button[data-navigate]');
        if (target && !target.hasAttribute('data-allow-unsaved')) {
          const shouldLeave = window.confirm(message);
          if (!shouldLeave) {
            e.preventDefault();
            e.stopPropagation();
          }
        }
      }
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [hasUnsavedChanges]);
};

export const DatabaseChangesList = () => {
  const changes = useDatabaseEditorStore((state) => state.changes);
  useUnsavedChangesWarning(changes.length > 0);

  if (changes.length === 0) return null;

  return (
    <div
      className="cea-database-editor-changes-list"
      style={{
        fontSize: 12,
        border: '1px solid #ccc',
        padding: 12,
        borderRadius: 8,
      }}
    >
      <div>Changes</div>
      <ul style={{ maxHeight: '300px', overflowY: 'auto' }}>
        {changes.map((change, index) => {
          let dataKey = change?.dataKey ?? [];
          let _index = change?.index;

          // Handle case where index is actually last element (e.g. use types dataset)
          if (
            arrayStartsWith(dataKey, ['ARCHETYPES', 'USE']) ||
            arrayStartsWith(dataKey, ['COMPONENTS', 'CONVERSION'])
          ) {
            _index = dataKey[dataKey.length - 1];
            dataKey = dataKey.slice(0, -1);
          }

          return (
            <li key={index} style={{ display: 'flex', gap: 4 }}>
              <span>{dataKey.join(' > ')}</span>
              {_index && (
                <>
                  {' > '}
                  <b>{_index}</b>
                </>
              )}
              <span>[ {change?.field} ]</span>
              <span>: </span>
              <span
                style={{
                  fontFamily: 'monospace',
                  background: '#ff000032',
                  paddingInline: 2,
                }}
              >
                {change?.oldValue}
              </span>
              <span> ➔ </span>
              <span
                style={{
                  fontFamily: 'monospace',
                  background: '#00ff0032',
                  paddingInline: 2,
                }}
              >
                {change?.value}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
