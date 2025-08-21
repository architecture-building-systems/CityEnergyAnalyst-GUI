export const MissingDataPrompt = () => {
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 8,
        background: '#efefef',

        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <div>No data available for this selection.</div>
      <small>Either it does not exist or there was a problem loading it.</small>
    </div>
  );
};
