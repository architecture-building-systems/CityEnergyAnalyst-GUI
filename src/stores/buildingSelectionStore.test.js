import { beforeEach, describe, expect, it } from 'vitest';

import useBuildingSelectionStore from './buildingSelectionStore';

const store = () => useBuildingSelectionStore.getState();

describe('buildingSelectionStore layer', () => {
  beforeEach(() => store().cancelSelection());

  it('defaults to the zone layer', () => {
    store().startSelection(['B1'], 'owner');
    expect(store().layer).toBe('zone');
  });

  it('picks from the requested layer, then resets to the zone', () => {
    store().startSelection(['S1'], 'owner', 'surroundings');
    expect(store().layer).toBe('surroundings');

    store().toggleBuilding('S1');
    expect(store().selectedBuildings).toEqual(['S1']);

    store().confirmSelection();
    expect(store().layer).toBe('zone');
  });

  it('ignores buildings outside the offered choices', () => {
    store().startSelection(['S1'], 'owner', 'surroundings');
    store().toggleBuilding('B1');
    expect(store().selectedBuildings).toEqual([]);
  });
});
