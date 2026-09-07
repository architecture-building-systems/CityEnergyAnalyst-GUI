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
  useRenameDatabaseRowIndex,
  useMaterialsAvailable,
  MATERIAL_LAYER_COLUMNS,
  DERIVED_ENVELOPE_COLUMNS,
  rowHasMaterialLayer,
} from 'features/database-editor/stores/databaseEditorStore';
import { arraysEqual } from 'utils';
import {
  getColumnPropsFromDataType,
  setDataPreservingScroll,
} from 'utils/tabulator';
import { TableColumnSchema } from './column-schema';
import {
  Button,
  Divider,
  Modal,
  Form,
  Input,
  Select,
  Alert,
  message,
} from 'antd';
import {
  DeleteOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { DeleteModalContent } from 'features/database-editor/components/delete-modal-content';
import { CreateComponentModal } from 'features/database-editor/components/create-component-modal';
import { DuplicateRowButton } from 'features/database-editor/components/duplicate-row-button';
import { DeleteRowButton } from 'features/database-editor/components/delete-row-button';
import { AddRowButton } from 'features/database-editor/components/add-row-button';
import { useDemoMode } from 'stores/demoStore';
import { HiddenInDemo } from 'components/HiddenInDemo';

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
        const currentState = useDatabaseEditorStore.getState();
        const newData = structuredClone(currentState.data);

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
          <HiddenInDemo>
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
          </HiddenInDemo>
          <Divider size="small" />
        </div>
      ))}
      <HiddenInDemo>
        <Button
          type="dashed"
          icon={<PlusOutlined />}
          onClick={() => setIsModalOpen(true)}
        >
          Add New Component
        </Button>
      </HiddenInDemo>

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
  ref,
}) => {
  const tabulatorRef = useRef();
  const [selectedCount, setSelectedCount] = useState(0);
  const demoMode = useDemoMode();
  // Row add/delete/duplicate are write actions the demo API doesn't
  // support - suppress selection entirely rather than show buttons that
  // would only fail.
  const rowSelectionEnabled = enableRowSelection && !demoMode;

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
          {rowSelectionEnabled && (
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
            dataKey={dataKey}
            schema={schema}
          />
          <EntityDataTable
            ref={rowSelectionEnabled ? tabulatorRef : ref}
            dataKey={dataKey}
            data={data}
            indexColumn={indexColumn}
            commonColumns={commonColumns}
            showIndex={showIndex}
            freezeIndex={freezeIndex}
            schema={schema}
            showColumnSchema={showColumnSchema}
            enableRowSelection={rowSelectionEnabled}
            onRowSelectionChanged={handleRowSelectionChanged}
          />
        </>
      )}
    </div>
  );
};

const EntityDetails = ({
  data,
  indexColumn,
  commonColumns,
  dataKey,
  schema,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  const updateDatabaseData = useUpdateDatabaseData();

  // Use first row to determine common columns
  const firstRow = data?.[0];
  if (firstRow == null || !commonColumns?.length) return null;

  const editableColumns = commonColumns.filter((col) => col !== indexColumn);

  const handleEdit = () => {
    // Initialize form with current values
    const initialValues = {};
    editableColumns.forEach((col) => {
      initialValues[col] = firstRow[col];
    });
    form.setFieldsValue(initialValues);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    form.submit();
  };

  const handleFormSubmit = (values) => {
    // Update all rows with the new common column values
    data.forEach((row) => {
      editableColumns.forEach((column) => {
        const oldValue = row[column];
        const newValue = values[column];
        if (oldValue !== newValue) {
          updateDatabaseData(
            dataKey,
            row[indexColumn], // Use the row's index value
            column,
            oldValue,
            newValue,
          );
        }
      });
    });

    setIsModalOpen(false);
    form.resetFields();
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    form.resetFields();
  };

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ flex: 1 }}>
            {editableColumns.map((column) => (
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
            ))}
          </div>
          <HiddenInDemo>
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={handleEdit}
              style={{ marginLeft: 8 }}
            >
              Edit
            </Button>
          </HiddenInDemo>
        </div>
      </div>

      <Modal
        title="Edit Common Properties"
        open={isModalOpen}
        onOk={handleSave}
        onCancel={handleCancel}
        okText="Save"
        cancelText="Cancel"
      >
        <Form
          form={form}
          onFinish={handleFormSubmit}
          layout="vertical"
          requiredMark="optional"
        >
          {editableColumns.map((column) => {
            const colSchema = schema?.columns?.[column];
            const hasChoices = colSchema?.choice !== undefined;

            if (hasChoices) {
              const values = colSchema.choice?.values || [];
              return (
                <Form.Item
                  key={column}
                  label={column}
                  name={column}
                  tooltip={colSchema?.description}
                >
                  <Select placeholder={`Select ${column}`}>
                    {values.map((value) => (
                      <Select.Option key={value} value={value}>
                        {value}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              );
            }

            return (
              <Form.Item
                key={column}
                label={column}
                name={column}
                tooltip={colSchema?.description}
              >
                <Input placeholder={`Enter ${column}`} />
              </Form.Item>
            );
          })}
        </Form>
      </Modal>
    </>
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
  ref,
}) => {
  const divRef = useRef();
  const tabulatorRef = useRef();
  const demoMode = useDemoMode();
  // Marks the store update this table is about to cause, so the sync effect can skip it.
  const editedHereRef = useRef(false);

  // Expose specific Tabulator methods to parent components
  useImperativeHandle(
    ref,
    () => ({
      getSelectedRows: () => tabulatorRef.current?.getSelectedRows() || [],
      getSelectedData: () => tabulatorRef.current?.getSelectedData() || [],
      setData: (data) => setDataPreservingScroll(tabulatorRef.current, data),
      selectRow: (row) => tabulatorRef.current?.selectRow(row),
      deselectRow: (row) => tabulatorRef.current?.deselectRow(row),
      getRows: () => tabulatorRef.current?.getRows() || [],
      getData: () => tabulatorRef.current?.getData() || [],
    }),
    [],
  );

  const columnSchema = schema?.columns;

  // Set to null if columnSchema is already available to avoid recalculating from data on every change
  const firstRowKeys = useMemo(() => {
    if (columnSchema) return null;
    return data?.[0] ?? null;
  }, [columnSchema, data]);

  const materialsAvailable = useMaterialsAvailable();

  const hiddenColumns = useMemo(() => {
    if (materialsAvailable) return commonColumns;
    // Without MATERIALS.csv the layer columns have nothing to reference, so they are noise —
    // unless this table already holds layer values, which the user needs to see to fix.
    const layersUsed = (data ?? []).some((row) =>
      MATERIAL_LAYER_COLUMNS.some(
        (c) => row?.[c] != null && row[c] !== '' && row[c] !== 0,
      ),
    );
    if (layersUsed) return commonColumns;
    return [...(commonColumns ?? []), ...MATERIAL_LAYER_COLUMNS];
  }, [commonColumns, materialsAvailable, data]);

  const columns = useMemo(() => {
    const columnKeys = Object.keys(columnSchema ?? firstRowKeys ?? {});

    // Filter columns to either show only the index column or hide the common columns based on props
    const filtered = columnKeys.filter((c) =>
      c === indexColumn ? showIndex : !(hiddenColumns || []).includes(c),
    );
    if (showIndex && filtered.includes(indexColumn)) {
      return [indexColumn, ...filtered.filter((c) => c !== indexColumn)];
    }
    return filtered;
  }, [columnSchema, indexColumn, hiddenColumns, showIndex, firstRowKeys]);

  const getColumnChoices = useGetDatabaseColumnChoices();
  const updateDatabaseData = useUpdateDatabaseData();
  const renameDatabaseRowIndex = useRenameDatabaseRowIndex();

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
        // Demo scenarios are read-only. Tabulator 4.x has no table-wide
        // editable option, so it must be set per-column here.
        editable: !demoMode,
      };

      if (_frozenIndex) {
        colDef.cssClass = 'frozen-index';
        colDef.hozAlign = 'left';
      }

      // Saved keys stay read-only: other tables reference them and we have no foreign-key
      // validation yet. A row added since the last save has no referents, so it can be named.
      // Read `changes` at edit time rather than closing over it — Tabulator applies these
      // definitions once at construction, so a captured value would never see a row added
      // afterwards, nor the clearing of `changes` on save that must lock the row again.
      if (column == indexColumn) {
        colDef.editor = 'input';
        colDef.editable = demoMode
          ? false
          : (cell) => {
              const rowIndex = cell.getRow().getIndex();
              return useDatabaseEditorStore
                .getState()
                .changes.some(
                  (change) =>
                    (change.action === 'create' ||
                      change.action === 'duplicate') &&
                    change.index === rowIndex &&
                    arraysEqual(change.dataKey, dataKey),
                );
            };
        return colDef;
      }

      // A row with material layers derives its U/GHG on save, so typing one here would be
      // silently replaced. Lock the cell instead, and say why. Clearing the layers makes the
      // row direct-property-based and the cell editable again.
      if (DERIVED_ENVELOPE_COLUMNS.includes(column)) {
        colDef.editable = demoMode
          ? false
          : (cell) => !rowHasMaterialLayer(cell.getRow().getData());
        colDef.formatter = (cell) => {
          // Style the cell element rather than returning markup: the value comes from the
          // database, and both branches must run so that clearing a row's layers also clears
          // the styling a previous render applied.
          const derived = rowHasMaterialLayer(cell.getRow().getData());
          const element = cell.getElement();
          element.title = derived
            ? 'Derived from the material layers of this row'
            : '';
          element.style.color = derived ? '#888' : '';
          element.style.fontStyle = derived ? 'italic' : '';
          return cell.getValue() ?? '';
        };
      }

      // Handle columns with choices
      if (_colSchema?.choice != undefined) {
        const values = _colSchema?.choice?.values || [];
        const lookup = _colSchema.choice?.lookup;
        const nullable = _colSchema?.nullable ?? false;
        let columnChoices = lookup
          ? getColumnChoices(lookup?.path, lookup?.column)
          : values;
        // A select editor can only offer what it lists, so a nullable column needs an explicit
        // blank — otherwise the dropdown can set a value but never clear one.
        if (nullable) {
          columnChoices = Array.isArray(columnChoices)
            ? ['', ...columnChoices]
            : { '': '(none)', ...(columnChoices ?? {}) };
        }

        return {
          ...colDef,
          editor: 'select',
          formatter: (cell) => {
            const value = cell.getValue() ?? '';
            const element = cell.getElement();
            if (!nullable && value === '') {
              element.style.border = '1px red solid';
            } else {
              element.style.border = '';
            }
            return `${value} <span style="float: right; color: #777; margin-left: 4px;">▼</span>`;
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
    demoMode,
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

          if (field === indexColumn) {
            // The index is the row's identity, not one of its fields — renaming moves it.
            const result = renameDatabaseRowIndex(
              dataKey,
              indexColumn,
              oldValue,
              value,
            );
            if (!result.ok) {
              message.error(result.reason);
              cell.restoreOldValue();
            } else if (result.name !== value) {
              message.info(`Saved as ${result.name}.`);
              // No store change means no setData refresh, so the cell would keep the raw
              // text the user typed and the row's index would no longer match the store.
              if (result.name === oldValue) cell.restoreOldValue();
            }
            return;
          }

          editedHereRef.current = true;
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
    renameDatabaseRowIndex,
    enableRowSelection,
    onRowSelectionChanged,
    demoMode,
  ]);

  // Re-render when the data changes elsewhere: a row added or deleted, a save that derived new
  // values, a scenario switch. An edit made in this table is skipped -- the cell already shows
  // the new value, and rebuilding the rows would cost the user their scroll position.
  useEffect(() => {
    if (editedHereRef.current) {
      editedHereRef.current = false;
      return;
    }
    if (tabulatorRef.current && data) {
      // Deep clone to ensure Tabulator receives mutable data
      setDataPreservingScroll(tabulatorRef.current, structuredClone(data));
    }
  }, [data]);

  return (
    <>
      {columnSchema ? (
        showColumnSchema ? (
          <TableColumnSchema columns={columns} columnSchema={columnSchema} />
        ) : null
      ) : (
        <Alert
          title="Schema for this dataset is not available. Editing is disabled."
          type="warning"
          showIcon
        />
      )}
      <div style={{ margin: 12 }} ref={divRef} />
    </>
  );
};
