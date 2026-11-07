import { networkOverlayLayers, networkVisibilityKey } from './networkOverlay';

const network = {
  edges: { type: 'FeatureCollection', features: [] },
  nodes: null,
};

describe('networkOverlayLayers', () => {
  it('draws DH underneath DC', () => {
    const ids = networkOverlayLayers({ DC: network, DH: network }).map(
      (l) => l.id,
    );
    expect(ids[0]).toBe('state-network-DH-edges');
    expect(ids.indexOf('state-network-DC-edges')).toBeGreaterThan(
      ids.indexOf('state-network-DH-plants'),
    );
  });

  it('skips missing and hidden types', () => {
    const layers = networkOverlayLayers(
      { DH: network, DC: network },
      { [networkVisibilityKey('DC')]: false },
    );
    expect(layers.map((l) => l.id)).toEqual([
      'state-network-DH-edges',
      'state-network-DH-plants',
    ]);
    expect(networkOverlayLayers({ DH: null, DC: undefined })).toEqual([]);
  });
});
