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

describe('deleting when the geometry failed to load', () => {
  // `df_to_json` returns null when it cannot read the geometry file. The table still lists
  // every row, so the delete button is live -- and it used to throw inside `Modal.confirm`,
  // where antd swallows the error and the dialog just sits there.
  it.each([
    ['geojsons.zone is null', { zone: null }],
    ['geojsons.zone is missing', {}],
    ['the feature list is missing', { zone: {} }],
  ])('%s -- the row still leaves the tables', (_label, geojsons) => {
    const changes = emptyChanges();
    const result = deleteBuildings(
      { tables: { zone: { B1000: {}, B1000_V: {} } }, geojsons },
      ['B1000_V'],
      changes,
    );

    expect(Object.keys(result.tables.zone)).toEqual(['B1000']);
    expect(changes.delete.zone).toEqual(['B1000_V']);
  });
});

describe('the cached query data is never mutated', () => {
  // React Query structural-shares its cache: if a mutator edits `oldData` in place, the "new"
  // data compares equal to the old and it hands back the *same* reference, so nothing
  // re-renders. The row left the store but stayed on screen until a manual refresh.
  it('deleteBuildings leaves the caller’s tables untouched', () => {
    const original = state('B1000', 'B1001');

    deleteBuildings(original, ['B1001'], emptyChanges());

    expect(Object.keys(original.tables.zone)).toEqual(['B1000', 'B1001']);
    expect(Object.keys(original.tables.envelope)).toEqual(['B1000', 'B1001']);
  });

  it('deleteBuildings returns fresh table references', () => {
    const original = state('B1000', 'B1001');

    const result = deleteBuildings(original, ['B1001'], emptyChanges());

    expect(result.tables.zone).not.toBe(original.tables.zone);
    expect(Object.keys(result.tables.zone)).toEqual(['B1000']);
  });

  it('duplicateBuilding leaves the caller’s tables untouched', () => {
    const original = state('B1000');

    duplicateBuilding(original, 'B1000', 'B1000_', emptyChanges());

    expect(Object.keys(original.tables.zone)).toEqual(['B1000']);
    expect(original.geojsons.zone.features).toHaveLength(1);
  });

  it('hands the store a new changes object so subscribers re-render', () => {
    const changes = emptyChanges();
    let handed = null;

    deleteBuildings(state('B1000'), ['B1000'], changes, (next) => {
      handed = next;
    });

    expect(handed).not.toBe(changes);
    expect(handed.delete.zone).toEqual(['B1000']);
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
