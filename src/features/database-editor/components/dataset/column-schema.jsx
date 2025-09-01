import { Tooltip } from 'antd';

export const TableColumnSchema = ({ columns, columnSchema }) => {
  if (!Array.isArray(columns)) return null;

  return (
    <details style={{ fontSize: 12 }}>
      <summary>Column Glossary</summary>
      <div style={{ maxHeight: 200, overflowY: 'auto', padding: 8 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr
              style={{
                textAlign: 'left',
                fontWeight: 'bold',
                textDecoration: 'underline',
              }}
            >
              <th>Name</th>
              <th>Unit</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {columns.map((col) => {
              const schemaInfo = columnSchema?.[col];
              const foreignKey = schemaInfo?.choice?.lookup;

              if (!schemaInfo)
                return (
                  <tr key={col}>
                    <td>{col}</td>
                    <td colSpan={2}>Missing</td>
                  </tr>
                );

              return (
                <tr key={col}>
                  <td
                    style={{
                      maxWidth: 140,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',

                      fontFamily: 'monospace',
                    }}
                  >
                    <b>{col}</b>
                    {foreignKey && (
                      <Tooltip
                        title={
                          Array.isArray(foreignKey?.path)
                            ? `${foreignKey.path
                                .map((p) => p.toUpperCase())
                                .join(
                                  ' > ',
                                )}${foreignKey?.column && ` [${foreignKey.column}]`}`
                            : foreignKey?.path
                        }
                        placement="right"
                      >
                        <span
                          style={{
                            marginLeft: 4,
                            paddingInline: 4,
                            cursor: 'pointer',
                          }}
                        >
                          ↗
                        </span>
                      </Tooltip>
                    )}
                  </td>
                  <td>{schemaInfo?.unit}</td>
                  <td>{schemaInfo?.description}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </details>
  );
};
