import useDatabaseEditorStore from '../stores/databaseEditorStore';

export const DatabaseChangesList = () => {
  const changes = useDatabaseEditorStore((state) => state.changes);

  if (changes.length === 0) return null;

  return (
    <div className="cea-database-editor-changes-list" style={{ fontSize: 12 }}>
      <div>Changes</div>
      <ul style={{ maxHeight: '300px', overflowY: 'auto' }}>
        {changes.map((change, index) => {
          const dataKey = change?.dataKey ?? [];

          return (
            <li key={index} style={{ display: 'flex', gap: 4 }}>
              <span>{dataKey.join(' > ')}</span>
              {change?.index && (
                <span>
                  {' > '}
                  {change.index}
                </span>
              )}
              <span>[{change?.field}]</span>
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
