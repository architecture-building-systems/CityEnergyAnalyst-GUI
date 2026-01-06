# Database Editor - Claude Code Guide

> **Backend Data Format:** See [DATA_FORMAT.md](./DATA_FORMAT.md) for detailed explanation of the JSON response structure from `/api/inputs/databases` endpoint.

## CRITICAL RULES - Read First

When working with the database editor, you MUST follow these invariants:

1. **Nested structures require special handling** - USE types (`ARCHETYPES > USE`) and CONVERSION components (`COMPONENTS > CONVERSION`) store arrays nested under component names
2. **Use position-based deletion for nested structures** - Rows share the same index value, so use array position (0, 1, 2) instead
3. **Always deep clone Zustand state** - Use `structuredClone(data)`, never `{...data}`
4. **Tabulator requires arrays** - Passing objects causes "data.slice is not a function" error
5. **getNestedValue lowercases keys** - Extract component names before using this helper
6. **Schema may be undefined** - For nested component dataKeys, infer structure from existing data

---

## When Modifying Store Operations

### Pattern: Nested Structure Detection & Handling

**Use this pattern in ALL store operations (add/update/delete):**

```javascript
// STEP 1: Detect nested structure and extract component name
let _dataKey = dataKey;
let _index;

if (
  arrayStartsWith(_dataKey, ['ARCHETYPES', 'USE']) ||
  arrayStartsWith(_dataKey, ['COMPONENTS', 'CONVERSION'])
) {
  _dataKey = dataKey.slice(0, -1); // Remove last element
  _index = dataKey[dataKey.length - 1]; // Save component name (case-sensitive!)
}

// STEP 2: Get parent table
const table = getNestedValue(state.data, _dataKey);

// STEP 3: Use Immer to update
const newData = produce(state.data, (draft) => {
  const draftTable = getNestedValue(draft, _dataKey);

  // STEP 4: Access nested array via component name
  let targetArray = draftTable;
  if (_index !== undefined && draftTable?.[_index]) {
    targetArray = draftTable[_index]; // NOW working with the component's array
  }

  // STEP 5: Operate on targetArray
  // ...
});
```

**Why this pattern:**

- Component names like `ACH1`, `OFFICE` are case-sensitive
- `getNestedValue()` lowercases keys, so we must extract and use `_index` separately
- Nested arrays need explicit access via `draftTable[_index]`

### DO / DON'T Examples

#### Deep Cloning

```javascript
// ❌ DON'T - Shallow copy
const newData = { ...data };

// ✅ DO - Deep clone
const newData = structuredClone(data);
```

#### Accessing Nested Arrays

```javascript
// ❌ DON'T - Missing nested array access
const targetArray = getNestedValue(draft, _dataKey);
targetArray.push(rowData); // Fails! targetArray is object with component keys

// ✅ DO - Extract and access component array
const draftTable = getNestedValue(draft, _dataKey);
const targetArray = draftTable[_index]; // Now it's the actual array
targetArray.push(rowData);
```

#### Change Tracking DataKey

```javascript
// ❌ DON'T - Missing component name
dataKey: ['COMPONENTS', 'CONVERSION', 'absorption_chillers'];

// ✅ DO - Include component name
dataKey: ['COMPONENTS', 'CONVERSION', 'absorption_chillers', 'ACH1'];
```

---

## When Adding Row Operations

### Position-Based vs Index-Based Deletion

**For nested structures, use positions (numbers). For regular tables, use index values (strings).**

```javascript
// In delete-row-button.jsx or similar
const isNestedStructure =
  (dataKey.length >= 3 &&
    dataKey[0] === 'ARCHETYPES' &&
    dataKey[1] === 'USE') ||
  (dataKey.length >= 4 &&
    dataKey[0] === 'COMPONENTS' &&
    dataKey[1] === 'CONVERSION');

const rowIndices = isNestedStructure
  ? selectedRows.map((row) => row.getPosition()) // Numbers: 0, 1, 2
  : selectedRows.map((row) => row.getData()[index]); // Strings: 'ROW1', 'ROW2'
```

**Why:** In nested structures, all rows have the same index value (e.g., all ACH1 rows have `code='ACH1'`). Using positions ensures correct row identification.

### In Store: Detecting Position-Based Deletion

```javascript
// In deleteDatabaseRows
const usingPositions = rowIndices.every((idx) => typeof idx === 'number');

if (usingPositions) {
  // Delete by position - sort descending to avoid index shifting
  const sortedPositions = Array.from(rowIndices).sort((a, b) => b - a);
  for (const position of sortedPositions) {
    targetArray.splice(position, 1);
  }
} else {
  // Delete by index column value - iterate backwards
  for (let i = targetArray.length - 1; i >= 0; i--) {
    if (indicesToDelete.has(targetArray[i][indexCol])) {
      targetArray.splice(i, 1);
    }
  }
}
```

---

## When Working with Schema

### Schema May Be Undefined

For nested component dataKeys like `['COMPONENTS', 'CONVERSION', 'absorption_chillers', 'ACH1']`, schema is often undefined because it's stored at parent level.

**Pattern: Fallback to Data Inference**

```javascript
let columns = [];

if (schema?.columns) {
  // Use schema if available
  columns = Object.keys(schema.columns);
} else {
  // Infer from existing data
  const firstRow = Array.isArray(data) ? data[0] : Object.values(data)[0];
  if (firstRow && typeof firstRow === 'object') {
    columns = Object.keys(firstRow);
  }
}

// Initialize row with appropriate defaults
columns.forEach((col) => {
  if (schema?.columns?.[col]) {
    const type = schema.columns[col].type;
    newRow[col] = type === 'float' || type === 'int' ? 0 : '';
  } else {
    // Infer type from sample data
    const sampleValue = firstRow?.[col];
    newRow[col] = typeof sampleValue === 'number' ? 0 : '';
  }
});
```

---

## Data Structure Reference

### Regular Tables

```javascript
// Array
data = [
  { code: 'ROW1', value: 10 },
  { code: 'ROW2', value: 20 },
];

// Object
data = {
  ROW1: { value: 10 },
  ROW2: { value: 20 },
};
```

### Nested: USE Types

```javascript
dataKey: ['ARCHETYPES', 'USE', 'schedules', '_library', 'OFFICE'];

structure: archetypes.use.schedules._library = {
  OFFICE: [
    /* array of rows */
  ],
  RETAIL: [
    /* array of rows */
  ],
};
```

### Nested: CONVERSION Components

```javascript
dataKey: ['COMPONENTS', 'CONVERSION', 'absorption_chillers', 'ACH1']

structure:
components.conversion.absorption_chillers = {
  ACH1: [
    { code: 'ACH1', type: 'single', ... },
    { code: 'ACH1', type: 'double', ... }  // Same code!
  ],
  ACH2: [/* array of rows */]
}
```

---

## Change Tracking

### Action Types

Always include `action` property in changes:

- `'update'` - Field edited
- `'create'` - New row/component added
- `'duplicate'` - Row duplicated
- `'delete'` - Row/component deleted

### Change Object Structure

```javascript
{
  action: 'update',
  dataKey: ['COMPONENTS', 'CONVERSION', 'absorption_chillers', 'ACH1'],
  index: 'ACH1',        // For regular: string value
  // OR
  index: 'position_0',  // For nested: 'position_' prefix + number
  field: 'type',
  oldValue: 'single',
  value: 'double',
  displayInfo: { hour: 'Weekday_12' }  // Optional metadata
}
```

### Critical: Always Use Full DataKey

```javascript
// ❌ WRONG - Changes list won't show component name
useDatabaseEditorStore.setState({
  changes: [
    ...state.changes,
    {
      dataKey: ['COMPONENTS', 'CONVERSION', 'absorption_chillers'],
      // ...
    },
  ],
});

// ✅ CORRECT - Include component name
useDatabaseEditorStore.setState({
  changes: [
    ...state.changes,
    {
      dataKey: ['COMPONENTS', 'CONVERSION', 'absorption_chillers', 'ACH1'],
      // ...
    },
  ],
});
```

---

## Component Patterns

### TableGroupDataset Pattern

Renders multiple components (e.g., ACH1, ACH2, ACH3):

- Fetches schema ONCE at parent level: `useDatabaseSchema(dataKey)`
- Maps over component keys: `Object.keys(data).map(key => ...)`
- Passes full dataKey to child: `dataKey={[...dataKey, key]}`

### TableDataset Pattern

Renders single table:

- May receive `schema` as prop (could be undefined)
- When `enableRowSelection={true}`, shows Add/Duplicate/Delete buttons
- Renders EntityDetails (editable common properties)
- Renders EntityDataTable (Tabulator instance)

### EntityDetails Pattern

Shows common columns (description, type, currency, etc.):

- Reads from `data[0]` (first row)
- Edit button opens modal form
- Updates ALL rows on save
- Each field change creates separate update in changes

---

## Tabulator Requirements

### Must Receive Array

```javascript
// ❌ WRONG - Object will cause error
<EntityDataTable data={draftTable} />  // draftTable = { ACH1: [...], ACH2: [...] }

// ✅ CORRECT - Access nested array
<EntityDataTable data={draftTable[componentName]} />  // componentName = 'ACH1'
```

### Cell Edit Handling

```javascript
cellEdited: (cell) => {
  const field = cell.getField();
  const value = cell.getValue();
  const index = cell.getRow().getIndex(); // Row identifier (string or number)
  const position = cell.getRow().getPosition(); // Numeric position (0, 1, 2...)
  const oldValue = cell.getOldValue();

  // For nested structures, pass position
  updateDatabaseData(
    dataKey,
    index,
    field,
    oldValue,
    value,
    undefined,
    position,
  );
};
```

---

## Quick Checklist: Before Committing Changes

When modifying database editor operations:

**Nested Structure Handling:**

- [ ] Detects nested structure using `arrayStartsWith`
- [ ] Slices dataKey: `_dataKey = dataKey.slice(0, -1)`
- [ ] Extracts component name: `_index = dataKey[dataKey.length - 1]`
- [ ] Accesses nested array: `targetArray = draftTable[_index]`

**Position-Based Operations:**

- [ ] Checks if operation is on nested structure
- [ ] Uses `row.getPosition()` for nested, `row.getData()[index]` for regular
- [ ] Store detects using `typeof idx === 'number'`
- [ ] Sorts positions descending before deletion

**Change Tracking:**

- [ ] Includes `action` property
- [ ] Uses FULL dataKey (including component name)
- [ ] Properly handles position-based index (`position_${num}`)

**State Updates:**

- [ ] Uses `structuredClone()` for mutable copies
- [ ] Uses `produce()` from Immer for state updates
- [ ] Doesn't mutate state directly

**Schema Handling:**

- [ ] Checks if schema exists before using
- [ ] Has fallback to infer from data when schema unavailable
- [ ] Handles both schema-based and inferred columns

---

## File Locations

**Documentation:**

- `DATA_FORMAT.md` - Backend JSON response structure and examples

**Store:** `src/features/database-editor/stores/databaseEditorStore.js`

- `updateDatabaseData` (line 214)
- `addDatabaseRow` (line 378)
- `deleteDatabaseRows` (line 448)

**Main Component:** `src/features/database-editor/components/dataset/table-dataset.jsx`

- `TableGroupDataset` (line 32)
- `TableDataset` (line 155)
- `EntityDetails` (line 247)
- `EntityDataTable` (line 384)

**Row Actions:**

- `src/features/database-editor/components/add-row-button.jsx`
- `src/features/database-editor/components/delete-row-button.jsx`
- `src/features/database-editor/components/duplicate-row-button.jsx`

**Changes:** `src/features/database-editor/components/changes-list.jsx`

---

## Common Errors & Solutions

### "data.slice is not a function"

**Cause:** Tabulator received object instead of array
**Solution:** Access nested array via `draftTable[_index]`

### All rows deleted instead of selected row

**Cause:** Using index value when rows share same index
**Solution:** Use position-based deletion for nested structures

### "Cannot add property, object is not extensible"

**Cause:** Shallow copy of frozen state
**Solution:** Use `structuredClone(data)`

### Component name lost in changes

**Cause:** dataKey missing component name
**Solution:** Use full dataKey including last element

### Schema undefined error

**Cause:** Schema not available at nested component level
**Solution:** Infer structure from existing data as fallback

---

**Last Updated:** 2025-12-18
