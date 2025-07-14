import { useQueryClient } from '@tanstack/react-query';
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

function deleteBuildings(state, buildings, changes, onChange) {
  let { geojsons, tables } = state;
  const isZoneBuilding = !!tables?.zone?.[buildings[0]];
  const isTree = !!tables?.trees?.[buildings[0]];

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
  onChange?.(changes);
  return { geojsons, tables };
}

export const useUpdateInputs = () => {
  const queryClient = useQueryClient();

  const projectName = useProjectStore((state) => state.name);
  const scenarioName = useProjectStore((state) => state.scenario);

  const updateChanges = useUpdateChanges();

  return (table = '', buildings = [], properties = []) =>
    queryClient.setQueryData(
      ['inputs', projectName, scenarioName],
      (oldData) => ({
        ...oldData,
        ...updateData(oldData, table, buildings, properties, updateChanges),
      }),
    );
};

export const useUpdateYearSchedule = () => {
  const queryClient = useQueryClient();

  const projectName = useProjectStore((state) => state.name);
  const scenarioName = useProjectStore((state) => state.scenario);

  const updateChanges = useUpdateChanges();

  return (buildings = [], month = '', value = 0) => {
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

  const projectName = useProjectStore((state) => state.name);
  const scenarioName = useProjectStore((state) => state.scenario);

  const updateChanges = useUpdateChanges();

  return (buildings = [], tab = '', day = '', hour = 0, value = '') => {
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

  const projectName = useProjectStore((state) => state.name);
  const scenarioName = useProjectStore((state) => state.scenario);

  const changes = useChanges();
  const setChanges = useSetChanges();

  return (buildings = []) =>
    queryClient.setQueryData(
      ['inputs', projectName, scenarioName],
      (oldData) => {
        // Update the old data
        return {
          ...oldData,
          ...deleteBuildings(oldData, buildings, changes, setChanges),
        };
      },
    );
};

export const useResyncInputs = () => {
  const queryClient = useQueryClient();

  const projectName = useProjectStore((state) => state.name);
  const scenarioName = useProjectStore((state) => state.scenario);

  return async () =>
    queryClient.invalidateQueries(['inputs', projectName, scenarioName]);
};
