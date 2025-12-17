import { Button } from 'antd';
import { TableDataset } from './table-dataset';
import { ScheduleAreaChart } from 'features/database-editor/components/ScheduleAreaChart';
import { useEffect, useState } from 'react';
import { MissingDataPrompt } from './missing-data-prompt';
import {
  useDatabaseSchema,
  useUpdateDatabaseData,
} from 'features/database-editor/stores/databaseEditorStore';

export const UseTypeDataset = ({ dataKey, dataset }) => {
  // Consist of two keys: use_types and schedules.
  // use_types is an object with keys as use_types and values as properties.
  // schedules is an object with keys as use_types and values as schedules.

  const [selectedUseType, setSelectedUseType] = useState(null);

  // Ensure data is valid
  const useTypeData = dataset?.use_types;
  const scheduleData = dataset?.schedules;

  // Try to get all use types from use_types or schedules
  const useTypes = Array.from(
    new Set([
      ...Object.keys(useTypeData || {}),
      ...Object.keys(scheduleData?.monthly_multipliers || {}),
      ...Object.keys(scheduleData?._library || {}),
    ]),
  );

  // Select first use type if none selected or selected use type is not in use types
  const activeUseType = selectedUseType ?? useTypes?.[0];

  const selectedUseTypeData = useTypeData?.[activeUseType];
  const selectedMultiplierData =
    scheduleData?.monthly_multipliers?.[activeUseType];
  const selectedLibraryData = scheduleData?._library?.[activeUseType];

  if (!useTypes.length) return <MissingDataPrompt dataKey={dataKey} />;

  return (
    <div
      className="cea-database-editor-database-use-type"
      style={{
        display: 'flex',
        gap: 12,

        flex: 1,
        minWidth: 0, // Prevents flex from growing
      }}
    >
      <UseTypeButtons
        types={useTypes}
        selected={activeUseType}
        onSelected={setSelectedUseType}
      />
      {activeUseType && useTypes.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            minWidth: 0,
          }}
        >
          <div>Properties</div>
          <UseTypePropertiesDataset
            dataKey={[...dataKey, 'use_types']}
            useType={activeUseType}
            data={selectedUseTypeData ? [selectedUseTypeData] : null}
          />

          <div>Schedules</div>
          <UseTypePropertiesSchedulesDataset
            name={'Monthly Multipliers'}
            dataKey={[...dataKey, 'schedules', 'monthly_multipliers']}
            useType={activeUseType}
            data={selectedMultiplierData ? [selectedMultiplierData] : null}
          />
          <UseTypeSchedules
            dataKey={[...dataKey, 'schedules', '_library']}
            useType={activeUseType}
            data={selectedLibraryData}
          />
        </div>
      )}
    </div>
  );
};

const UseTypePropertiesDataset = ({ dataKey, data, useType }) => {
  // Have to fetch using dataKey without the useType in dataKey
  const schema = useDatabaseSchema(dataKey);
  const _dataKey = [...dataKey, useType];
  return (
    <TableDataset
      key={_dataKey.join('_')}
      dataKey={_dataKey}
      data={data}
      schema={schema}
      indexColumn={'use_type'}
      showIndex={false}
    />
  );
};

const UseTypePropertiesSchedulesDataset = ({
  dataKey,
  data,
  name,
  useType,
}) => {
  // Have to fetch using dataKey without the useType in dataKey
  const schema = useDatabaseSchema(dataKey);
  const _dataKey = [...dataKey, useType];
  return (
    <TableDataset
      key={_dataKey.join('_')}
      dataKey={_dataKey}
      name={name}
      data={data}
      schema={schema}
      indexColumn={'use_type'}
      showIndex={false}
    />
  );
};

const UseTypeButtons = ({ types, selected, onSelected }) => {
  return (
    <div className="cea-database-editor-database-dataset-buttons">
      {types.map((useType) => (
        <Button
          key={useType}
          onClick={() => onSelected?.(useType)}
          type={useType === selected ? 'primary' : 'default'}
        >
          {useType.toUpperCase()}
        </Button>
      ))}
    </div>
  );
};

const extractSchedule = (data, schedule) => {
  if (data == null) return [];

  // Sort rows by hour number to ensure correct order
  const sortByHour = (rows) => {
    return [...rows].sort((a, b) => {
      const hourA = parseInt(a.hour.split('_')[1]);
      const hourB = parseInt(b.hour.split('_')[1]);
      return hourA - hourB;
    });
  };

  const weekdayRows = data.filter((schedule) =>
    schedule.hour.includes('Weekday_'),
  );
  const weekday = sortByHour(weekdayRows).map((row) => row[schedule]);

  const saturdayRows = data.filter((schedule) =>
    schedule.hour.includes('Saturday_'),
  );
  const saturday = sortByHour(saturdayRows).map((row) => row[schedule]);

  const sundayRows = data.filter((schedule) =>
    schedule.hour.includes('Sunday_'),
  );
  const sunday = sortByHour(sundayRows).map((row) => row[schedule]);

  return { weekday, saturday, sunday };
};

const ScheduleButtons = ({ schedules, selected, onSelected }) => {
  useEffect(() => {
    // Select first schedule if none selected or selected schedule is not in schedules
    if (
      schedules?.length &&
      (selected == null || !schedules.includes(selected))
    )
      onSelected?.(schedules[0]);
  }, [schedules, selected, onSelected]);

  return (
    <div
      className="cea-database-editor-database-dataset-buttons"
      style={{ flexDirection: 'row', overflowX: 'auto', paddingBottom: 12 }}
    >
      {schedules.map((schedule) => (
        <Button
          key={schedule}
          onClick={() => onSelected?.(schedule)}
          type={schedule === selected ? 'primary' : 'default'}
        >
          {schedule.toUpperCase()}
        </Button>
      ))}
    </div>
  );
};

const UseTypeSchedules = ({ dataKey, useType, data }) => {
  // Data is array of schedule objects
  // schedules format {"hour":"Weekday_12","occupancy":0.5,"appliances":0.85, ... }
  // hour can be "Weekday_1","Saturday_2", "Sunday_3"
  // const schema = useDatabaseSchema(dataKey);

  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const updateDatabaseData = useUpdateDatabaseData();

  if (data == null) return <MissingDataPrompt dataKey={dataKey} />;

  const schedules = Object.keys(data?.[0] ?? {}).filter((key) => key != 'hour');
  const selectedScheduleData = extractSchedule(data, selectedSchedule);

  // Create handler to update schedule data when chart points are dragged
  const handleScheduleChange = (dayType, updatedData) => {
    if (!selectedSchedule || !data) {
      console.error('handleScheduleChange: missing selectedSchedule or data');
      return;
    }

    // Determine the hour prefix based on day type
    let hourPrefix;
    if (dayType === 'weekday') hourPrefix = 'Weekday_';
    else if (dayType === 'saturday') hourPrefix = 'Saturday_';
    else if (dayType === 'sunday') hourPrefix = 'Sunday_';

    // Include useType in the dataKey for proper nesting
    const fullDataKey = [...dataKey, useType];

    // Update each hour's value in the data array, but only if it changed
    updatedData.forEach((value, hourIndex) => {
      // Pad hour index with leading zero to match data format (e.g., "00", "01", "02")
      const paddedHour = hourIndex.toString().padStart(2, '0');
      const hourLabel = `${hourPrefix}${paddedHour}`;

      // Find the row with this hour label in the original data
      const rowIndex = data.findIndex((row) => row.hour === hourLabel);

      if (rowIndex !== -1 && rowIndex !== undefined) {
        const oldValue = data[rowIndex][selectedSchedule];
        // Only update if the value actually changed
        if (oldValue !== value) {
          updateDatabaseData(
            fullDataKey,
            rowIndex,
            selectedSchedule,
            oldValue,
            value,
            { hour: hourLabel }, // Pass hour label for display
          );
        }
      } else {
        console.warn(`Could not find row for hour label: ${hourLabel} in data`);
      }
    });
  };

  return (
    <div
      className="cea-database-editor-database-use-type-schedules"
      style={{
        display: 'flex',
        flexDirection: 'column',

        gap: 12,
      }}
    >
      <ScheduleButtons
        schedules={schedules}
        selected={selectedSchedule}
        onSelected={setSelectedSchedule}
      />

      {selectedScheduleData != null &&
      ['heating', 'cooling'].includes(selectedSchedule) ? (
        <div>TODO</div>
      ) : (
        <div>
          {Object.keys(selectedScheduleData).map((dayType) => {
            return (
              <ScheduleAreaChart
                key={dayType}
                data={selectedScheduleData[dayType]}
                title={dayType}
                onDataChange={(updatedData) =>
                  handleScheduleChange(dayType, updatedData)
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
