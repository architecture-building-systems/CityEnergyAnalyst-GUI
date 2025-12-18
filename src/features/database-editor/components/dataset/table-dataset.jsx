import {
  useEffect,
  useMemo,
  useRef,
  useImperativeHandle,
  useState,
  useCallback,
} from 'react';
import Tabulator from 'tabulator-tables';
import 'tabulator-tables/dist/css/tabulator.min.css';
import './dataset.css';
import { MissingDataPrompt } from './missing-data-prompt';
import useDatabaseEditorStore, {
  useDatabaseSchema,
  useGetDatabaseColumnChoices,
  useUpdateDatabaseData,
} from 'features/database-editor/stores/databaseEditorStore';
import { getColumnPropsFromDataType } from 'utils/tabulator';
import { TableColumnSchema } from './column-schema';
import { Button, Divider, Modal } from 'antd';
import {
  DeleteOutlined,
  ExclamationCircleOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { DeleteModalContent } from 'features/database-editor/components/delete-modal-content';
import { CreateComponentModal } from 'features/database-editor/components/create-component-modal';
import { DuplicateRowButton } from 'features/database-editor/components/duplicate-row-button';
import { DeleteRowButton } from 'features/database-editor/components/delete-row-button';
import { AddRowButton } from 'features/database-editor/components/add-row-button';

export const TableGroupDataset = ({
  dataKey,
  data,
  indexColumn,
  commonColumns,
  showColumnSchema = false,
  enableRowSelection = false,
}) => {
  const schema = useDatabaseSchema(dataKey);
  const schemaColumns = Object.keys(schema?.columns ?? {});
  const storeData = useDatabaseEditorStore((state) => state.data);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleDelete = (key) => {
    Modal.confirm({
      title: `Delete "${key}"?`,
      icon: <ExclamationCircleOutlined />,
      content: <DeleteModalContent />,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => {
        const newData = structuredClone(storeData);

        // Navigate to the nested location and delete the key
        let current = newData;
        for (let i = 0; i < dataKey.length; i++) {
          const k = dataKey[i].toLowerCase();
          if (i === dataKey.length - 1) {
            // Last key - this is where we delete
            if (current[k]) {
              delete current[k][key];
            }
          } else {
            current = current[k];
          }
        }

        // Update store with new data and add change entry
        const currentState = useDatabaseEditorStore.getState();
        useDatabaseEditorStore.setState({
          data: newData,
          changes: [
            ...currentState.changes,
            {
              action: 'delete',
              dataKey: [...dataKey, key],
              index: key,
              field: indexColumn,
              oldValue: JSON.stringify(data[key] || {}),
              value: '{}',
            },
          ],
        });
      },
    });
  };

  if (data == null) return <MissingDataPrompt dataKey={dataKey} />;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <TableColumnSchema
        columns={schemaColumns}
        columnSchema={schema?.columns}
      />
      {Object.keys(data).map((key) => (
        <div key={key}>
          <TableDataset
            key={[...dataKey, key].join('-')}
            dataKey={[...dataKey, key]}
            name={key}
            data={data?.[key]}
            indexColumn={indexColumn}
            commonColumns={commonColumns}
            showIndex={false}
            schema={schema}
            showColumnSchema={showColumnSchema}
            enableRowSelection={enableRowSelection}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              marginTop: 8,
            }}
          >
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(key)}
            >
              Delete &quot;{key}&quot;
            </Button>
          </div>
          <Divider size="small" />
        </div>
      ))}
      <Button
        type="dashed"
        icon={<PlusOutlined />}
        onClick={() => setIsModalOpen(true)}
      >
        Add New Component
      </Button>

      <CreateComponentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        data={data}
        dataKey={dataKey}
        indexColumn={indexColumn}
      />
    </div>
  );
};

export const TableDataset = ({
  dataKey,
  name,
  data,
  indexColumn,
  commonColumns,
  schema,
  showIndex,
  freezeIndex,
  showColumnSchema,
  enableRowSelection,
  onRowSelectionChanged,
  useDataColumnOrder,
  ref,
}) => {
  const tabulatorRef = useRef();
  const [selectedCount, setSelectedCount] = useState(0);

  const handleRowSelectionChanged = useCallback(
    (data, rows) => {
      setSelectedCount(rows.length);
      if (onRowSelectionChanged) {
        onRowSelectionChanged(data, rows);
      }
    },
    [onRowSelectionChanged],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {name != null && (
        <small>
          <u>{name}</u>
        </small>
      )}

      {data == null ? (
        <MissingDataPrompt dataKey={dataKey} />
      ) : (
        <>
          {enableRowSelection && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div></div>
              <div style={{ display: 'flex', gap: 12 }}>
                <DuplicateRowButton
                  data={data}
                  dataKey={dataKey}
                  index={indexColumn}
                  schema={schema}
                  tabulatorRef={tabulatorRef}
                  selectedCount={selectedCount}
                />
                <DeleteRowButton
                  dataKey={dataKey}
                  index={indexColumn}
                  tabulatorRef={tabulatorRef}
                  selectedCount={selectedCount}
                />
                <AddRowButton
                  data={data}
                  dataKey={dataKey}
                  index={indexColumn}
                  schema={schema}
                />
              </div>
            </div>
          )}
          <EntityDetails
            data={data}
            indexColumn={indexColumn}
            commonColumns={commonColumns}
          />
          <EntityDataTable
            ref={enableRowSelection ? tabulatorRef : ref}
            dataKey={dataKey}
            data={data}
            indexColumn={indexColumn}
            commonColumns={commonColumns}
            showIndex={showIndex}
            freezeIndex={freezeIndex}
            schema={schema}
            showColumnSchema={showColumnSchema}
            enableRowSelection={enableRowSelection}
            onRowSelectionChanged={handleRowSelectionChanged}
            useDataColumnOrder={useDataColumnOrder}
          />
        </>
      )}
    </div>
  );
};

const EntityDetails = ({ data, indexColumn, commonColumns }) => {
  // Use first row to determine common columns
  const firstRow = data?.[0];
  if (firstRow == null || !commonColumns?.length) return null;

  return (
    <div>
      {commonColumns.map(
        (column) =>
          column !== indexColumn && (
            <div
              key={column}
              style={{
                display: 'flex',
                fontSize: 12,

                gap: 12,
              }}
            >
              <b style={{ flex: 1 }}>{column}</b>
              <span style={{ flex: 12 }}>{firstRow?.[column] ?? '-'}</span>
            </div>
          ),
      )}
    </div>
  );
};

const EntityDataTable = ({
  dataKey,
  data,
  schema,
  indexColumn,
  commonColumns,
  showIndex = true,
  freezeIndex = true,
  showColumnSchema = true,
  enableRowSelection = false,
  onRowSelectionChanged,
  useDataColumnOrder = true,
  ref,
}) => {
  const divRef = useRef();
  const tabulatorRef = useRef();

  // Expose specific Tabulator methods to parent components
  useImperativeHandle(
    ref,
    () => ({
      getSelectedRows: () => tabulatorRef.current?.getSelectedRows() || [],
      getSelectedData: () => tabulatorRef.current?.getSelectedData() || [],
      setData: (data) => tabulatorRef.current?.setData(data),
      selectRow: (row) => tabulatorRef.current?.selectRow(row),
      deselectRow: (row) => tabulatorRef.current?.deselectRow(row),
      getRows: () => tabulatorRef.current?.getRows() || [],
      getData: () => tabulatorRef.current?.getData() || [],
    }),
    [],
  );

  const columnSchema = schema?.columns;

  const getColumnChoices = useGetDatabaseColumnChoices();
  const updateDatabaseData = useUpdateDatabaseData();

  const schemaColumnKeys = useMemo(
    () => Object.keys(columnSchema ?? {}),
    [columnSchema],
  );

  // Get columns from data if useDataColumnOrder is true
  const dataColumnKeys = useMemo(() => {
    if (!useDataColumnOrder || !data || data.length === 0) return [];
    return Object.keys(data[0] || {});
  }, [useDataColumnOrder, data]);

  const columnsFromSchema = useMemo(() => {
    // Use data column order if flag is set
    const sourceColumns = useDataColumnOrder
      ? dataColumnKeys
      : schemaColumnKeys;

    if (sourceColumns.length === 0) return [];
    const filtered = sourceColumns.filter((c) =>
      c === indexColumn ? showIndex : !(commonColumns || []).includes(c),
    );
    if (showIndex && filtered.includes(indexColumn)) {
      return [indexColumn, ...filtered.filter((c) => c !== indexColumn)];
    }
    return filtered;
  }, [
    schemaColumnKeys,
    dataColumnKeys,
    useDataColumnOrder,
    indexColumn,
    commonColumns,
    showIndex,
  ]);

  const columns = columnsFromSchema;

  // Convert columns to tabulator format
  const tabulatorColumns = useMemo(() => {
    const cols = columns.map((column) => {
      const _frozenIndex = showIndex && column == indexColumn && freezeIndex;

      const _colSchema = columnSchema?.[column];
      const colDef = {
        title: column,
        field: column,
        headerTooltip: _colSchema?.description
          ? `${_colSchema.description}${_colSchema?.unit ? ` ${_colSchema.unit}` : ''}`
          : false,
        frozen: _frozenIndex,
      };

      if (_frozenIndex) {
        colDef.cssClass = 'frozen-index';
        colDef.hozAlign = 'left';
      }

      // FIXME: Prevent edits for index column until we can implement better validation of foreign key references
      if (column == indexColumn) {
        return colDef;
      }

      // Handle columns with choices
      if (_colSchema?.choice != undefined) {
        const values = _colSchema?.choice?.values || [];
        const lookup = _colSchema.choice?.lookup;
        const columnChoices = lookup
          ? getColumnChoices(lookup?.path, lookup?.column)
          : values;

        return {
          ...colDef,
          editor: 'select',
          formatter: (cell) => {
            return `${cell.getValue()} <span style="float: right; color: #777; margin-left: 4px;">▼</span>`;
          },
          editorParams: {
            values: columnChoices,
            listItemFormatter: Array.isArray(columnChoices)
              ? undefined
              : (value, label) => {
                  if (!label) return value;
                  return `${value} : ${label}`;
                },
          },
        };
      }

      // Handle regular columns
      if (_colSchema?.type != undefined) {
        const dataTypeProps = getColumnPropsFromDataType(_colSchema, column);
        return { ...colDef, ...dataTypeProps };
      }

      return colDef;
    });

    // Add row selection column at the beginning if enabled
    if (enableRowSelection) {
      return [
        {
          formatter: 'rowSelection',
          titleFormatter: 'rowSelection',
          hozAlign: 'center',
          headerSort: false,
          width: 40,
          frozen: true,
        },
        ...cols,
      ];
    }

    return cols;
  }, [
    columns,
    columnSchema,
    indexColumn,
    freezeIndex,
    showIndex,
    enableRowSelection,
    getColumnChoices,
  ]);

  useEffect(() => {
    if (tabulatorRef.current == null) {
      const config = {
        data: structuredClone(data), // Deep clone to ensure mutability
        columns: tabulatorColumns,
        layout: 'fitDataFill',
        layoutColumnsOnNewData: true,
        index: indexColumn,
        cellEdited: (cell) => {
          const field = cell.getField();
          const value = cell.getValue();
          const index = cell.getRow().getIndex();
          const position = cell.getRow().getPosition();
          const oldValue = cell.getOldValue();

          // Pass both index and position - let the store decide which to use
          updateDatabaseData(
            dataKey,
            index,
            field,
            oldValue,
            value,
            undefined,
            position,
          );
        },
      };

      // Add row selection config if enabled
      if (enableRowSelection && onRowSelectionChanged)
        config.rowSelectionChanged = onRowSelectionChanged;

      tabulatorRef.current = new Tabulator(divRef.current, config);
    }
  }, [
    data,
    dataKey,
    indexColumn,
    tabulatorColumns,
    updateDatabaseData,
    enableRowSelection,
    onRowSelectionChanged,
  ]);

  // Update table data when data changes (e.g., when a new row is added)
  useEffect(() => {
    if (tabulatorRef.current && data) {
      // Deep clone to ensure Tabulator receives mutable data
      tabulatorRef.current.setData(structuredClone(data));
    }
  }, [data]);

  return (
    <>
      {columnSchema && showColumnSchema && (
        <TableColumnSchema columns={columns} columnSchema={columnSchema} />
      )}
      <div style={{ margin: 12 }} ref={divRef} />
    </>
  );
};
