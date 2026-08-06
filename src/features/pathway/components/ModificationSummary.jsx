import { BuildingPill } from './BuildingList';

const ModificationSummary = ({ row, constructionColorMap: colorMap }) => {
  const modifications = row?.modifications ?? {};
  const archetypes = Object.keys(modifications);
  if (!archetypes.length) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {archetypes.map((archetype) => {
        const components = modifications[archetype] ?? {};
        const color = colorMap?.[archetype];
        const changes = Object.entries(components).flatMap(
          ([component, fields]) =>
            Object.entries(fields).map(([field, value]) => ({
              component,
              field,
              value,
            })),
        );
        return (
          <div key={archetype} style={{ fontSize: 12 }}>
            <BuildingPill name={archetype} color={color} />
            {changes.map((c) => (
              <div
                key={`${c.component}-${c.field}`}
                style={{ color: '#475569', paddingLeft: 8 }}
              >
                {c.field}: {String(c.value)}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
};

export default ModificationSummary;
