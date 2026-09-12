import {
  deleteBuildings,
  duplicateBuilding,
  suggestDuplicateName,
} from './useUpdateInputs';
import { hasChanges } from 'features/input-editor/stores/inputEditorStore';

// The pending-change bookkeeping, tested without React: it decides whether the Save/Discard
// buttons appear at all, and a duplicate that is tracked in only some of these places shows a
// "changes detected" card with nothing in it.

const emptyChanges = () => ({ update: {}, delete: {}, add: {} });

const feature = (name) => ({
  type: 'Feature',
  properties: { name, height_ag: 9 },
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [0, 0],
        [0, 1],
        [1, 1],
        [0, 0],
      ],
    ],
  },
});

const state = (...names) => ({
  tables: {
    zone: Object.fromEntries(names.map((n) => [n, { height_ag: 9 }])),
    envelope: Object.fromEntries(names.map((n) => [n, { Hs: 0.5 }])),
  },
  geojsons: {
    zone: { type: 'FeatureCollection', features: names.map(feature) },
  },
});

describe('suggestDuplicateName', () => {
  it('appends an underscore when that name is free', () => {
    expect(suggestDuplicateName('B1000', new Set(['B1000']))).toBe('B1000_');
  });

  it('counts up instead of piling on underscores', () => {
    const taken = new Set(['B1000', 'B1000_', 'B1000_2']);
    expect(suggestDuplicateName('B1000', taken)).toBe('B1000_3');
  });

  it('never returns a name already in use', () => {
    const taken = new Set(['B1000']);
    for (let i = 0; i < 5; i += 1) {
      const name = suggestDuplicateName('B1000', taken);
      expect(taken.has(name)).toBe(false);
      taken.add(name);
    }
  });
});

describe('duplicateBuilding', () => {
  it('copies the zone row and its footprint under the new name', () => {
    const changes = emptyChanges();
    const result = duplicateBuilding(
      state('B1000'),
      'B1000',
      'B1000_',
      changes,
    );

    expect(result.created).toBe('B1000_');
    expect(result.tables.zone.B1000_).toEqual({ height_ag: 9 });
    expect(result.geojsons.zone.features.map((f) => f.properties.name)).toEqual(
      ['B1000', 'B1000_'],
    );
  });

  it('copies the geometry, not a reference to it', () => {
    const source = state('B1000');
    const result = duplicateBuilding(source, 'B1000', 'B1000_', emptyChanges());
    const [original, copy] = result.geojsons.zone.features;

    expect(copy.geometry).toEqual(original.geometry);
    expect(result.tables.zone.B1000_).not.toBe(source.tables.zone.B1000);
  });

  it('leaves the archetype-derived tables alone -- the server re-maps them', () => {
    const result = duplicateBuilding(
      state('B1000'),
      'B1000',
      'B1000_',
      emptyChanges(),
    );

    expect(result.tables.envelope.B1000_).toBeUndefined();
  });

  it('records the copy so the Save button appears', () => {
    const changes = emptyChanges();
    duplicateBuilding(state('B1000'), 'B1000', 'B1000_', changes);

    expect(changes.add.zone).toEqual(['B1000_']);
    expect(hasChanges(changes)).toBe(true);
  });

  it('does nothing when the source building has no row', () => {
    const changes = emptyChanges();
    const result = duplicateBuilding(
      state('B1000'),
      'B9999',
      'B9999_',
      changes,
    );

    expect(result.created).toBeNull();
    expect(hasChanges(changes)).toBe(false);
  });
});

describe('deleting a building that was duplicated but never saved', () => {
  it('cancels the duplicate instead of recording a deletion', () => {
    const changes = emptyChanges();
    const duplicated = duplicateBuilding(
      state('B1000'),
      'B1000',
      'B1000_',
      changes,
    );

    deleteBuildings({ ...duplicated }, ['B1000_'], changes);

    expect(changes.add.zone).toBeUndefined();
    expect(changes.delete.zone).toBeUndefined();
    expect(hasChanges(changes)).toBe(false);
  });

  it('still records a deletion for a building that exists on disk', () => {
    const changes = emptyChanges();

    deleteBuildings(state('B1000', 'B1001'), ['B1000'], changes);

    expect(changes.delete.zone).toEqual(['B1000']);
  });

  it('separates the two when both are deleted at once', () => {
    const changes = emptyChanges();
    const duplicated = duplicateBuilding(
      state('B1000', 'B1001'),
      'B1000',
      'B1000_',
      changes,
    );

    deleteBuildings({ ...duplicated }, ['B1000_', 'B1001'], changes);

    expect(changes.add.zone).toBeUndefined();
    expect(changes.delete.zone).toEqual(['B1001']);
  });

  it('keeps the other pending copies', () => {
    const changes = emptyChanges();
    let s = state('B1000');
    s = duplicateBuilding(s, 'B1000', 'B1000_', changes);
    s = duplicateBuilding(s, 'B1000', 'B1000_2', changes);

    deleteBuildings({ ...s }, ['B1000_'], changes);

    expect(changes.add.zone).toEqual(['B1000_2']);
  });
});

describe('hasChanges', () => {
  // The card that announces changes and the Save/Discard buttons inside it were computed
  // separately once; a duplicate-only change showed the card with no buttons in it.
  it.each([
    ['nothing pending', { update: {}, delete: {}, add: {} }, false],
    ['an edit', { update: { zone: { B1: {} } }, delete: {}, add: {} }, true],
    ['a deletion', { update: {}, delete: { zone: ['B1'] }, add: {} }, true],
    ['a duplicate', { update: {}, delete: {}, add: { zone: ['B1_'] } }, true],
    [
      'a changes object with no add key',
      { update: {}, delete: { zone: ['B1'] } },
      true,
    ],
    ['undefined', undefined, false],
    // `%s` takes the label only -- the second positional argument is the changes object, and
    // printing that makes the test name unreadable.
  ])('%s', (_label, changes, expected) => {
    expect(hasChanges(changes)).toBe(expected);
  });
});
