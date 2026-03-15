import { useMapStore, COLOR_MODES } from 'features/map/stores/mapStore';

/**
 * Legend component that displays construction standard colors
 * Shows a color swatch and label for each unique construction standard
 */
const ConstructionStandardLegend = () => {
  const colorMode = useMapStore((state) => state.colorMode);
  const constructionColorMap = useMapStore(
    (state) => state.constructionColorMap,
  );

  // Only show legend when construction standard coloring is active
  if (colorMode !== COLOR_MODES.CONSTRUCTION_STANDARD) {
    return null;
  }

  // Get sorted list of construction standards
  const standards = Object.keys(constructionColorMap).sort();

  if (standards.length === 0) {
    return null;
  }

  return (
    <div
      className="cea-overlay-card construction-standard-legend"
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 12,
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.15)',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        fontSize: 12,
        gap: 8,
        padding: 12,
        minWidth: 160,
        maxWidth: 220,
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
        Construction Standards
      </div>

      {standards.map((standard) => (
        <LegendItem
          key={standard}
          color={constructionColorMap[standard]}
          label={standard}
        />
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
