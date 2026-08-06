export const BuildingPill = ({ name, color, onClick }) => (
  <span
    role={onClick ? 'button' : undefined}
    tabIndex={onClick ? 0 : undefined}
    onClick={onClick}
    onKeyDown={
      onClick
        ? (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onClick();
            }
          }
        : undefined
    }
    style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 999,
      fontSize: 11,
      fontWeight: 500,
      background: color ?? '#e8e8e8',
      color: color ? '#fff' : '#475569',
      cursor: onClick ? 'pointer' : 'default',
    }}
  >
    {name}
  </span>
);

const BuildingList = ({
  buildings,
  buildingColorMap,
  rebuildCounts,
  onBuildingClick,
}) => {
  if (!buildings?.length) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {buildings.map((b) => {
        const count = rebuildCounts?.[b] ?? 0;
        const label = count > 0 ? `${b}(${count})` : b;
        return (
          <BuildingPill
            key={b}
            name={label}
            color={buildingColorMap?.[b]}
            onClick={onBuildingClick ? () => onBuildingClick(b) : undefined}
          />
        );
      })}
    </div>
  );
};

export default BuildingList;
