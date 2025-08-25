export const MissingDataPrompt = ({ dataKey }) => {
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 8,
        background: '#efefef',

        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',

        gap: 8,
      }}
    >
      <div>No data available for this selection.</div>
      <div>{dataKey}</div>
      <small>Either it does not exist or there was a problem loading it.</small>
    </div>
  );
};
