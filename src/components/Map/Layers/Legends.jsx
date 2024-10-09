import Gradient from 'javascript-color-gradient';
import { useMapStore } from '../store/store';

const ColourRampLegend = ({ label, colours, points, minValue, maxValue }) => {
  const gradientArray = new Gradient()
    .setColorGradient(...colours)
    .setMidpoint(points)
    .getColors();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div>{label}</div>
      <div
        style={{
          display: 'flex',
        }}
      >
        {gradientArray.map((color) => {
          return (
            <div
              style={{ backgroundColor: color, width: 18, height: 18 }}
              key={color}
              title={color}
            />
          );
        })}
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <div>{Math.round(minValue)}</div>
        <div>{Math.round(maxValue)}</div>
      </div>
    </div>
  );
};

export const Legends = () => {
  const selectedMapCategory = useMapStore((state) => state.selectedMapCategory);
  const mapLayerLegends = useMapStore((state) => state.mapLayerLegends);

  if (!selectedMapCategory?.layers) return null;

  return (
    <div
      className="cea-overlay-card"
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: 12,
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',

        boxSizing: 'border-box',

        display: 'flex',
        flexDirection: 'column',

        fontSize: 12,

        gap: 2,

        minWidth: 200,

        padding: 12,
        marginRight: 'auto',
      }}
    >
      <b>Legends</b>
      {Object.keys(mapLayerLegends ?? {}).map((key) => {
        const value = mapLayerLegends[key];
        return (
          <ColourRampLegend
            key={key}
            label={value.label}
            colours={value.colourArray}
            points={value.points}
            minValue={value.minValue}
            maxValue={value.maxValue}
          />
        );
      })}
    </div>
  );
};
