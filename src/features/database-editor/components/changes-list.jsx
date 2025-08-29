import { arrayStartsWith } from 'utils';
import useDatabaseEditorStore from '../stores/databaseEditorStore';

export const DatabaseChangesList = () => {
  const changes = useDatabaseEditorStore((state) => state.changes);

  if (changes.length === 0) return null;

  return (
    <div className="cea-database-editor-changes-list" style={{ fontSize: 12 }}>
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
