import { arrayStartsWith } from 'utils';
import { useEffect, useRef } from 'react';
import useNavigationStore from 'stores/navigationStore';
import { Button } from 'antd';
import {
  EditOutlined,
  PlusOutlined,
  DeleteOutlined,
  CopyOutlined,
} from '@ant-design/icons';

const ACTION_CONFIG = {
  update: {
    icon: EditOutlined,
    color: '#1890ff',
    label: 'Updated',
  },
  create: {
    icon: PlusOutlined,
    color: '#52c41a',
    label: 'Created',
  },
  duplicate: {
    icon: CopyOutlined,
    color: '#722ed1',
    label: 'Duplicated',
  },
  delete: {
    icon: DeleteOutlined,
    color: '#ff4d4f',
    label: 'Deleted',
  },
};

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
    const originalState = window.history.state;
    // Push a marker state to detect back navigation
    window.history.pushState({ ...originalState, preventBack: true }, '');
    const handlePopState = () => {
      if (!hasUnsavedChanges) return;
      const shouldLeave = window.confirm(message);
      if (!shouldLeave) {
        // Restore marker state to keep the user on the page
        window.history.pushState({ ...originalState, preventBack: true }, '');
      }
      // If user confirms, do nothing and let the browser navigate naturally.
    };
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      // Remove marker without navigating
      if (window.history.state?.preventBack) {
        window.history.replaceState(originalState || {}, '');
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

export const DatabaseChangesList = ({ changes, onSave }) => {
  const listRef = useRef(null);
  useUnsavedChangesWarning(changes.length > 0);

  // Scroll to bottom when new changes are added
  useEffect(() => {
    if (listRef.current && changes.length > 0) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [changes.length]);

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
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>Changes</div>
        <Button type="primary" onClick={onSave}>
          Save
        </Button>
      </div>

      <ul ref={listRef} style={{ maxHeight: 120, overflowY: 'auto' }}>
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

          const action = change?.action || 'update';
          const config = ACTION_CONFIG[action] || ACTION_CONFIG.update;
          const Icon = config.icon;

          // Render based on action type
          if (action === 'update') {
            // Detailed field change display
            return (
              <li
                key={index}
                style={{ display: 'flex', gap: 4, alignItems: 'center' }}
              >
                <Icon style={{ color: config.color }} />
                <span>{dataKey.join(' > ')}</span>
                {_index !== undefined && _index !== null && (
                  <>
                    {' > '}
                    <b>{_index}</b>
                  </>
                )}
                {change?.displayInfo?.hour && (
                  <>
                    {' > '}
                    <b>{change.displayInfo.hour}</b>
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
          } else {
            // Simple action + identifier display for create/duplicate/delete
            return (
              <li
                key={index}
                style={{ display: 'flex', gap: 4, alignItems: 'center' }}
              >
                <Icon style={{ color: config.color }} />
                <span style={{ color: config.color }}>{config.label} row:</span>
                <span>{dataKey.join(' > ')}</span>
                {_index !== undefined && _index !== null && (
                  <>
                    {' > '}
                    <b style={{ color: config.color }}>{_index}</b>
                  </>
                )}
              </li>
            );
          }
        })}
      </ul>
    </div>
  );
};
