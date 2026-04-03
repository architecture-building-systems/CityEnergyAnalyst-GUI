import { useMapStore, COLOR_MODES } from 'features/map/stores/mapStore';

/**
 * Legend component that displays construction archetype or main use type colors.
 * Shows a color swatch and label for each unique category.
 */
const ConstructionStandardLegend = () => {
  const colorMode = useMapStore((state) => state.colorMode);
  const constructionColorMap = useMapStore(
    (state) => state.constructionColorMap,
  );
  const useTypeColorMap = useMapStore((state) => state.useTypeColorMap);

  const isConstruction = colorMode === COLOR_MODES.CONSTRUCTION_STANDARD;
  const isUseType = colorMode === COLOR_MODES.USE_TYPE;

  if (!isConstruction && !isUseType) {
    return null;
  }

  const colorMap = isConstruction ? constructionColorMap : useTypeColorMap;
  const title = isConstruction ? 'Construction Archetypes' : 'Main Use Types';
  const entries = Object.keys(colorMap).sort();

  if (entries.length === 0) {
    return null;
  }

  return (
    <div
      className="cea-overlay-card construction-standard-legend"
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: 12,
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.15)',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        fontSize: 12,
        gap: 8,
        padding: 12,
        width: 280,
        maxHeight: 300,
        overflow: 'auto',
      }}
    >
      <div
        style={{
          fontWeight: 'bold',
          fontSize: 13,
          marginBottom: 4,
          borderBottom: '1px solid #e0e0e0',
          paddingBottom: 6,
        }}
      >
        {title}
      </div>

      {entries.map((entry) => (
        <LegendItem key={entry} color={colorMap[entry]} label={entry} />
      ))}
    </div>
  );
};

/**
 * Individual legend item with color swatch and label
 */
const LegendItem = ({ color, label }) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <div
        style={{
          width: 16,
          height: 16,
          backgroundColor: color,
          borderRadius: 3,
          border: '1px solid rgba(0, 0, 0, 0.2)',
          flexShrink: 0,
        }}
      />
      <span
        style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={label}
      >
        {label}
      </span>
    </div>
  );
};

export default ConstructionStandardLegend;
