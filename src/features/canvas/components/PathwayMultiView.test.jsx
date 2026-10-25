import { act, fireEvent, render, screen } from '@testing-library/react';

import { useProjectStore } from 'features/project/stores/projectStore';

import { useCanvasStore } from '../stores/canvasStore';
import { deserializeCanvas, serializeCanvas } from '../utils/canvasSerialize';
import { useScopedColorMode, useScopedSetColorMode } from './mapInstance';
import PathwayMultiView from './PathwayMultiView';

// The row map, reduced to the toggle it reads and writes through the row's store.
vi.mock('./CanvasMap', () => ({
  default: function CanvasMapStub() {
    const colorMode = useScopedColorMode();
    const setColorMode = useScopedSetColorMode();
    return (
      <button type="button" onClick={() => setColorMode('use-type')}>
        colour: {colorMode}
      </button>
    );
  },
}));
vi.mock('./CanvasPlot', () => ({ default: () => null }));
vi.mock('./CanvasScenarioHeader', () => ({ default: () => null }));
vi.mock('./PathwayCompareSelect', () => ({ default: () => null }));
vi.mock(
  'features/map/components/Map/Layers/ConstructionStandardLegend',
  () => ({
    default: () => null,
  }),
);
vi.mock('features/pathway/hooks/usePathwayOverview', () => ({
  usePathwayOverview: () => ({
    data: { pathways: [{ pathway_name: 'S1', years: [2030, 2050] }] },
  }),
}));

// Load a pathway-multi canvas with one row, S1.
const loadMultiView = (pathwayMultiMapViews = {}) =>
  act(() => {
    useCanvasStore.getState().applyLoadedCanvas({
      view: 'pathway-multi',
      columns: [{ type: 'pathway', pathwayName: 'S1', scenario: 'baseline' }],
      parentScenario: 'baseline',
      comparisonSetup: { kind: 'pathway-multi', pathwayNames: ['S1'] },
      pathwayMultiMapViews,
    });
  });

beforeEach(() => {
  useProjectStore.setState({ project: '/p', scenario: 'baseline' });
  loadMultiView();
});

describe('PathwayMultiView row map view', () => {
  it('saves a row toggle and restores it when the canvas is reopened', () => {
    const { unmount } = render(<PathwayMultiView />);
    fireEvent.click(screen.getByRole('button', { name: /colour:/ }));
    expect(useCanvasStore.getState().pathwayMultiMapViews.S1.colorMode).toBe(
      'use-type',
    );

    // Save, leave, and reopen the canvas.
    const saved = serializeCanvas(useCanvasStore.getState());
    unmount();
    act(() => {
      useCanvasStore.getState().applyLoadedCanvas({
        view: 'launch',
        pathwayMultiMapViews: {},
      });
    });
    act(() => {
      useCanvasStore.getState().applyLoadedCanvas(deserializeCanvas(saved));
    });
    render(<PathwayMultiView />);
    expect(screen.getByRole('button', { name: /colour:/ }).textContent).toBe(
      'colour: use-type',
    );
  });

  it('applies the loaded canvas to rows that stay on screen', () => {
    // Opening a canvas from the switcher keeps the same pathway rows mounted.
    render(<PathwayMultiView />);
    loadMultiView({
      S1: {
        colorMode: 'use-type',
        mapLabels: true,
        visibility: { zone: true },
        extruded: false,
      },
    });
    expect(screen.getByRole('button', { name: /colour:/ }).textContent).toBe(
      'colour: use-type',
    );
  });
});
