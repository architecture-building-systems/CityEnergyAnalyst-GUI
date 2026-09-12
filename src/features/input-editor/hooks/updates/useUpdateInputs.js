import { useQueryClient } from '@tanstack/react-query';
import { childScenarioToken } from 'lib/api/scenarioContext';
import { useProjectStore } from 'features/project/stores/projectStore';
import { INDEX_COLUMN } from 'features/input-editor/constants';
import {
  useChanges,
  useSetChanges,
  useUpdateChanges,
} from 'features/input-editor/stores/inputEditorStore';
import { months_short } from 'constants/months';

const BUILDING_GEOMETRY_NAMES = ['zone', 'surroundings'];

function updateGeoJsonProperty(geojsons, table, building, property, value) {
  // Destructure the target GeoJSON table
  const tableData = geojsons?.[table];
  if (!tableData) return geojsons; // Return unchanged if the table doesn't exist

  const updatedFeatures = tableData.features.map((feature) => {
    // Return unchanged feature
    if (feature.properties[INDEX_COLUMN] !== building) return feature;

    // Return a new feature with updated properties
    return {
      ...feature,
      properties: {
        ...feature.properties,
        [property]: value,
        ...(feature.properties.REFERENCE ? { REFERENCE: 'User - Input' } : {}),
      },
    };
  });

  // Return a new GeoJSON object with updated features
  return {
    ...geojsons,
    [table]: {
      ...tableData,
      features: updatedFeatures,
    },
  };
}

function updateData(state, table, buildings, properties, onChange) {
  let { geojsons, tables, columns } = state;
  for (const building of buildings) {
    for (const propertyObj of properties) {
      const { property, value } = propertyObj;

      // Ensure value type is correct
      let _value = value;
      try {
        const type = columns[table][property].type;
        _value = type == 'string' ? value : Number(value);
      } catch (error) {
        console.error(error);
      }

      // Track update changes
      onChange(
        table,
        building,
        property,
        tables[table][building][property],
        _value,
      );

      tables = {
        ...tables,
        [table]: {
          ...tables[table],
          [building]: {
            ...tables[table][building],
            [property]: _value,
            ...(tables[table][building].REFERENCE
              ? { REFERENCE: 'User - Input' }
              : {}),
          },
        },
      };

      // Update building properties of geojsons
      if (BUILDING_GEOMETRY_NAMES.includes(table)) {
        geojsons = updateGeoJsonProperty(
          geojsons,
          table,
          building,
          property,
          _value,
        );
      }
    }
  }
  return { geojsons, tables };
}

function updateYearSchedule(schedule, building, month, value, onChange) {
  // Track update changes
  onChange(
    'schedules',
    building,
    `MONTHLY_MULTIPLIER_${months_short[month]}`,
    schedule.MONTHLY_MULTIPLIER[month],
    value,
  );

  let monthSchedule = schedule.MONTHLY_MULTIPLIER;
  monthSchedule[month] = value;

  return schedule;
}

function updateDaySchedule(
  schedule,
  building,
  tab,
  day,
  hour,
  value,
  onChange,
) {
  // Track update changes
  onChange(
    'schedules',
    building,
    `${tab}_${day}_${hour + 1}`,
    schedule.SCHEDULES[tab][day][hour],
    value,
  );

  let daySchedule = schedule.SCHEDULES[tab][day];
  daySchedule[hour] = value;
  schedule = {
    ...schedule,
    SCHEDULES: {
      ...schedule.SCHEDULES,
      [tab]: {
        ...schedule.SCHEDULES[tab],
        [day]: daySchedule,
      },
    },
  };

  return schedule;
}

function deleteGeoJsonFeature(geojsons, table, building) {
  return {
    ...geojsons,
    [table]: {
      ...geojsons[table],
      features: geojsons[table].features.filter(
        (feature) => feature.properties[INDEX_COLUMN] != building,
      ),
    },
  };
}

export function deleteBuildings(state, buildings, changes, onChange) {
  let { geojsons, tables } = state;
  const isZoneBuilding = !!tables?.zone?.[buildings[0]];
  const isTree = !!tables?.trees?.[buildings[0]];

  const layer = isZoneBuilding ? 'zone' : isTree ? 'trees' : 'surroundings';

  // Deleting a building that was duplicated but never saved cancels the duplicate rather than
  // recording a deletion -- there is nothing on disk to delete, and listing it under both ADD
  // and DELETE in the summary would be nonsense.
  const pendingAdds = new Set(changes.add?.[layer] ?? []);
  const cancelled = buildings.filter((building) => pendingAdds.has(building));
  if (cancelled.length) {
    changes.add[layer] = (changes.add[layer] ?? []).filter(
      (building) => !cancelled.includes(building),
    );
    if (!changes.add[layer].length) delete changes.add[layer];
  }

  // Track delete changes
  const removed = buildings.filter((building) => !pendingAdds.has(building));
  if (removed.length) {
    changes.delete[layer] = changes.delete[layer] || [];
    changes.delete[layer].push(...removed);
  }

  for (const building of buildings) {
    // Remove deleted buildings from update changes
    for (const table in changes.update) {
      delete changes.update[table][building];
      if (!Object.keys(changes.update[table]).length)
        delete changes.update[table];
    }

    if (isZoneBuilding) {
      // Delete building from every table that is not surroundings
      for (const table in tables) {
        if (table != 'surroundings' && tables?.[table]?.[building]) {
          delete tables[table][building];
          tables = { ...tables, [table]: { ...tables[table] } };
        }
      }
      // Delete building from zone geojson
      geojsons = deleteGeoJsonFeature(geojsons, 'zone', building);
    } else {
      const type = isTree ? 'trees' : 'surroundings';

      delete tables[type][building];
      tables = { ...tables, [type]: { ...tables[type] } };

      geojsons = deleteGeoJsonFeature(geojsons, type, building);
    }
  }
  onChange?.(changes);
  return { geojsons, tables };
}

/**
 * A free name for a copy of `name`, as `name_`.
 *
 * If that is taken the suffix carries a counter (`name_2`, `name_3`) rather than piling up
 * underscores -- duplicating the same building five times should not produce `B1000_____`.
 * Exported so the duplicate dialog can pre-fill the same suggestion it would otherwise get.
 */
export function suggestDuplicateName(name, taken) {
  if (!taken.has(`${name}_`)) return `${name}_`;
  let counter = 2;
  while (taken.has(`${name}_${counter}`)) counter += 1;
  return `${name}_${counter}`;
}

function duplicateGeoJsonFeature(geojsons, table, building, newName) {
  const tableData = geojsons?.[table];
  const source = tableData?.features?.find(
    (feature) => feature.properties[INDEX_COLUMN] === building,
  );
  // No feature to copy: the caller has already refused the duplicate, so this is only a guard.
  if (!source) return geojsons;

  return {
    ...geojsons,
    [table]: {
      ...tableData,
      features: [
        ...tableData.features,
        {
          ...source,
          properties: { ...source.properties, [INDEX_COLUMN]: newName },
        },
      ],
    },
  };
}

/**
 * Copy one zone building, footprint and all.
 *
 * Only the `zone` row and its geometry are copied. The archetype-derived tables are left alone
 * on purpose: the server regenerates them for any building it sees as new
 * (`archetype_lock.buildings_added`), which is why the UI only offers this while the scenario
 * is locked. Writing them here would be overwritten by that re-map anyway.
 */
export function duplicateBuilding(state, building, newName, changes, onChange) {
  let { geojsons, tables } = state;
  const source = tables?.zone?.[building];
  if (!source || !geojsons?.zone) return { geojsons, tables, created: null };

  tables = { ...tables, zone: { ...tables.zone, [newName]: { ...source } } };
  geojsons = duplicateGeoJsonFeature(geojsons, 'zone', building, newName);

  changes.add.zone = [...(changes.add.zone ?? []), newName];
  onChange?.({ ...changes });

  return { geojsons, tables, created: newName };
}

export const useUpdateInputs = () => {
  const queryClient = useQueryClient();

  const updateChanges = useUpdateChanges();

  return (table = '', buildings = [], properties = []) => {
    const {
      project,
      scenario: scenarioName,
      childScenario,
    } = useProjectStore.getState();
    const childToken = childScenarioToken(childScenario);

    return queryClient.setQueryData(
      ['inputs', project, scenarioName, childToken],
      (oldData) => ({
        ...oldData,
        ...updateData(oldData, table, buildings, properties, updateChanges),
      }),
    );
  };
};

export const useUpdateYearSchedule = () => {
  const queryClient = useQueryClient();

  const updateChanges = useUpdateChanges();

  return (buildings = [], month = '', value = 0) => {
    const { name: projectName, scenario: scenarioName } =
      useProjectStore.getState();
    for (const building of buildings) {
      queryClient.setQueryData(
        ['inputs', 'building-schedule', building, projectName, scenarioName],
        (oldData) => {
          return updateYearSchedule(
            oldData,
            building,
            month,
            value,
            updateChanges,
          );
        },
      );
    }
  };
};

export const useUpdateDaySchedule = () => {
  const queryClient = useQueryClient();

  const updateChanges = useUpdateChanges();

  return (buildings = [], tab = '', day = '', hour = 0, value = '') => {
    const { name: projectName, scenario: scenarioName } =
      useProjectStore.getState();
    for (const building of buildings) {
      queryClient.setQueryData(
        ['inputs', 'building-schedule', building, projectName, scenarioName],
        (oldData) => {
          return updateDaySchedule(
            oldData,
            building,
            tab,
            day,
            hour,
            value,
            updateChanges,
          );
        },
      );
    }
  };
};

export const useDeleteBuildings = () => {
  const queryClient = useQueryClient();

  const changes = useChanges();
  const setChanges = useSetChanges();

  return (buildings = []) => {
    const {
      project,
      scenario: scenarioName,
      childScenario,
    } = useProjectStore.getState();
    const childToken = childScenarioToken(childScenario);

    return queryClient.setQueryData(
      ['inputs', project, scenarioName, childToken],
      (oldData) => {
        // Update the old data
        return {
          ...oldData,
          ...deleteBuildings(oldData, buildings, changes, setChanges),
        };
      },
    );
  };
};

export const useDuplicateBuilding = () => {
  const queryClient = useQueryClient();

  const changes = useChanges();
  const setChanges = useSetChanges();

  return (building, newName) => {
    const {
      project,
      scenario: scenarioName,
      childScenario,
    } = useProjectStore.getState();
    const childToken = childScenarioToken(childScenario);

    // Captured from the updater so the caller can select the new row. `created` describes this
    // one call, so it is not spread into the query data.
    let created = null;
    queryClient.setQueryData(
      ['inputs', project, scenarioName, childToken],
      (oldData) => {
        const result = duplicateBuilding(
          oldData,
          building,
          newName,
          changes,
          setChanges,
        );
        created = result.created;
        return {
          ...oldData,
          geojsons: result.geojsons,
          tables: result.tables,
        };
      },
    );
    return created;
  };
};

export const useResyncInputs = () => {
  const queryClient = useQueryClient();

  return async () => queryClient.invalidateQueries({ queryKey: ['inputs'] });
};
