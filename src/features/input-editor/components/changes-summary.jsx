export const ChangesSummary = ({ changes }) => {
  return (
    <div style={{ overflow: 'auto', maxHeight: 400 }}>
      {Object.keys(changes.delete).length ? (
        <div>
          <b>DELETE:</b>
          {Object.keys(changes.delete).map((table) => (
            <div key={table}>
              <u>
                <b>{table}</b>
              </u>
              <div>
                {changes.delete[table].reduce(
                  (out, building) => `${out}, ${building}`,
                )}
              </div>
              <br />
            </div>
          ))}
        </div>
      ) : null}
      {Object.keys(changes.update).length ? (
        <div>
          <b>UPDATE:</b>
          {Object.keys(changes.update).map((table) => (
            <div key={table}>
              <u>
                <b>{table}</b>
              </u>
              {Object.keys(changes.update[table]).map((building) => (
                <div key={building}>
                  {building}
                  {Object.keys(changes.update[table][building]).map(
                    (property) => (
                      <div key={property}>
                        <i>{property}</i>
                        {` : ${changes.update[table][building][property].oldValue}
                        → 
                        ${changes.update[table][building][property].newValue}`}
                      </div>
                    ),
                  )}
                </div>
              ))}
              <br />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
};
