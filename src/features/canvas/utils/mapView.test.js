import { useMapStore } from 'features/map/stores/mapStore';

import { useCanvasStore } from '../stores/canvasStore';
import { deserializeCanvas, serializeCanvas } from './canvasSerialize';
import { createMapInstanceStore } from '../components/mapInstance';
import { linkMapStores, sameMapView } from './mapView';

const view = {
  colorMode: 'use-type',
  mapLabels: false,
  visibility: { zone: true, trees: false, zone_labels: false },
  extruded: true,
};

describe('sameMapView', () => {
  it('compares visibility by value, not identity', () => {
    expect(
      sameMapView(view, { ...view, visibility: { ...view.visibility } }),
    ).toBe(true);
    expect(
      sameMapView(view, {
        ...view,
        visibility: { ...view.visibility, trees: true },
      }),
    ).toBe(false);
    expect(sameMapView(view, null)).toBe(false);
  });
});

describe('canvas save and load', () => {
  it('round-trips the overview view and each map card view', () => {
    const saved = serializeCanvas({
      view: 'launch',
      columns: [],
      mapView: view,
      launchCards: [
        { id: 'm1', type: 'map', category: 'demand', mapView: view },
        { id: 'p1', type: 'plot' },
      ],
    });
    expect(saved.canvas.map_view.color_mode).toBe('use-type');

    const loaded = deserializeCanvas(saved);
    expect(loaded.mapView).toEqual(view);
    const [mapCard, plotCard] = loaded.launchCards;
    expect(mapCard.mapView).toEqual(view);
    expect(plotCard.mapView).toBeUndefined();
  });

  it('round-trips each pathway-multi row view by pathway', () => {
    const saved = serializeCanvas({
      view: 'pathway-multi',
      columns: [],
      pathwayMultiMapViews: { S1: view },
    });
    expect(saved.canvas.pathway_multi_map_views.S1.map_labels).toBe(false);
    expect(deserializeCanvas(saved).pathwayMultiMapViews).toEqual({ S1: view });
  });

  it('loads a canvas saved before views were saved', () => {
    const saved = serializeCanvas({ view: 'launch', columns: [] });
    delete saved.canvas.map_view;
    delete saved.canvas.pathway_multi_map_views;
    const loaded = deserializeCanvas(saved);
    expect(loaded.mapView).toBeNull();
    expect(loaded.pathwayMultiMapViews).toEqual({});
  });
});

describe('applyLoadedCanvas', () => {
  it('applies the overview view to the map store after the swap', () => {
    // CanvasPage copies map-store changes into the current canvas: it must
    // already be the loaded one, or the view would autosave into the old one.
    useCanvasStore.setState({ canvasName: 'a' });
    const canvasAtApply = [];
    const unsubscribe = useMapStore.subscribe(() => {
      canvasAtApply.push(useCanvasStore.getState().canvasName);
    });
    useCanvasStore
      .getState()
      .applyLoadedCanvas({ canvasName: 'b', mapView: view });
    unsubscribe();

    expect(canvasAtApply).toEqual(['b']);
    expect(useMapStore.getState().colorMode).toBe('use-type');
    expect(useMapStore.getState().visibility.trees).toBe(false);
  });
});

describe('linkMapStores', () => {
  it('makes followers copy the leader now and on change, until unlinked', () => {
    const leader = createMapInstanceStore();
    const follower = createMapInstanceStore();
    leader.setState({ colorMode: 'use-type' });

    const unlink = linkMapStores(
      leader,
      [follower],
      ['colorMode', 'mapLabels'],
    );
    expect(follower.getState().colorMode).toBe('use-type');

    leader.getState().setMapLabels(false);
    expect(follower.getState().mapLabels).toBe(false);

    unlink();
    leader.getState().setMapLabels(true);
    expect(follower.getState().mapLabels).toBe(false);
  });
});
