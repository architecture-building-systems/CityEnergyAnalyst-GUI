import { useQueryClient } from '@tanstack/react-query';
import { useProjectStore } from '../../components/Project/store';
import { INDEX_COLUMN } from '../../components/InputEditor/constants';

const BUILDING_GEOMETRY_NAMES = ['zone', 'surroundings'];

function updateGeoJsonProperty(geojsons, table, building, property, value) {
  const _building = geojsons[table].features.find(
    (feature) => feature.properties[INDEX_COLUMN] == building,
  );
  if (_building)
    _building.properties = {
      ..._building.properties,
      [property]: value,
      ...(_building.properties.REFERENCE ? { REFERENCE: 'User - Input' } : {}),
    };
  return {
    ...geojsons,
    [table]: { ...geojsons[table], features: geojsons[table].features },
  };
}

function updateData(state, table, buildings, properties) {
  let { geojsons, tables, changes, columns } = state;
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
      updateChanges(
        changes,
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

function updateYearSchedule(state, buildings, month, value) {
  let { schedules, changes } = state;
  for (const building of buildings) {
    // Track update changes
    updateChanges(
      changes,
      'schedules',
      building,
      `MONTHLY_MULTIPLIER_${months_short[month]}`,
      schedules[building].MONTHLY_MULTIPLIER[month],
      value,
    );

    let monthSchedule = schedules[building].MONTHLY_MULTIPLIER;
    monthSchedule[month] = value;
    schedules = {
      ...schedules,
      [building]: {
        ...schedules[building],
        MONTHLY_MULTIPLIER: monthSchedule,
      },
    };
  }
  return { schedules };
}

function updateDaySchedule(state, buildings, tab, day, hour, value) {
  let { schedules, changes } = state;
  for (const building of buildings) {
    // Track update changes
    updateChanges(
      changes,
      'schedules',
      building,
      `${tab}_${day}_${hour + 1}`,
      schedules[building].SCHEDULES[tab][day][hour],
      value,
    );

    let daySchedule = schedules[building].SCHEDULES[tab][day];
    daySchedule[hour] = value;
    schedules = {
      ...schedules,
      [building]: {
        ...schedules[building],
        SCHEDULES: {
          ...schedules[building].SCHEDULES,
          [tab]: {
            ...schedules[building].SCHEDULES[tab],
            [day]: daySchedule,
          },
        },
      },
    };
  }
  return { schedules };
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

function deleteBuildings(state, buildings) {
  let { geojsons, tables } = state;
  const isZoneBuilding = !!tables?.zone?.[buildings[0]];
  const isTree = !!tables?.trees?.[buildings[0]];

  const changes = {};

  // Track delete changes
  const layer = isZoneBuilding ? 'zone' : isTree ? 'trees' : 'surroundings';
  changes.delete[layer] = changes.delete[layer] || [];
  changes.delete[layer].push(...buildings);

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
  return { geojsons, tables, changes };
}

export const useUpdateInputs = () => {
  const queryClient = useQueryClient();

  const projectName = useProjectStore((state) => state.name);
  const scenarioName = useProjectStore((state) => state.scenario);

  return (table = '', buildings = [], properties = []) =>
    queryClient.setQueryData(
      ['inputs', projectName, scenarioName],
      (oldData) => {
        // Update the old data
        return {
          ...oldData,
          ...updateData(oldData, table, buildings, properties),
        };
      },
    );
};

export const useUpdateYearSchedule = () => {
  const queryClient = useQueryClient();

  const projectName = useProjectStore((state) => state.name);
  const scenarioName = useProjectStore((state) => state.scenario);

  return (buildings = [], month = '', value = 0) =>
    queryClient.setQueryData(
      ['inputs', projectName, scenarioName],
      (oldData) => {
        return {
          ...oldData,
          ...updateYearSchedule(oldData, buildings, month, value),
        };
      },
    );
};

export const useUpdateDaySchedule = () => {
  const queryClient = useQueryClient();

  const projectName = useProjectStore((state) => state.name);
  const scenarioName = useProjectStore((state) => state.scenario);

  return (buildings = [], tab = '', day = '', hour = 0, value = '') =>
    queryClient.setQueryData(
      ['inputs', projectName, scenarioName],
      (oldData) => {
        return {
          ...oldData,
          ...updateDaySchedule(oldData, buildings, tab, day, hour, value),
        };
      },
    );
};

export const useDeleteBuildings = () => {
  const queryClient = useQueryClient();

  const projectName = useProjectStore((state) => state.name);
  const scenarioName = useProjectStore((state) => state.scenario);

  return (buildings = []) =>
    queryClient.setQueryData(
      ['inputs', projectName, scenarioName],
      (oldData) => {
        // Update the old data
        return {
          ...oldData,
          ...deleteBuildings(oldData, buildings),
        };
      },
    );
};

export const useResyncInputs = () => {
  const queryClient = useQueryClient();

  const projectName = useProjectStore((state) => state.name);
  const scenarioName = useProjectStore((state) => state.scenario);

  return () =>
    queryClient.invalidateQueries(['inputs', projectName, scenarioName]);
};
