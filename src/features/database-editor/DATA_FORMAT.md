# Database Backend Response Format

This document describes the JSON data structure returned by `/api/inputs/databases` endpoint.

## Top-Level Structure

```javascript
{
  "archetypes": { /* construction, use, etc. */ },
  "components": { /* conversion, distribution, etc. */ }
}
```

---

## Regular Object Structure

Most tables use simple object structure with unique keys:

```javascript
"construction_types": {
  "STANDARD1": {
    "Es": 0.82,
    "Hs": 0.82,
    "description": "Stone and Masonry from 1000's to 1920's",
    "year_start": 1000,
    "year_end": 1920,
    // ... more properties
  },
  "STANDARD2": { /* ... */ },
  "STANDARD3": { /* ... */ }
}
```

**Characteristics:**

- Each key (`STANDARD1`, `STANDARD2`) is unique
- Values are objects with properties
- Easy to access: `data['STANDARD1']`

---

## Nested Structure 1: USE Types

**Path:** `archetypes > use`

```javascript
"use": {
  "use_types": {
    "OFFICE": {
      "RH_max_pc": 60,
      "Tcs_set_C": 26,
      "Occ_m2p": 14.0,
      // ... more properties
    },
    "RETAIL": { /* ... */ },
    "MULTI_RES": { /* ... */ }
  },
  "schedules": {
    "monthly_multipliers": {
      "OFFICE": {
        "Jan": 0.8,
        "Feb": 0.8,
        // ... 12 months
      },
      "RETAIL": { /* ... */ }
    },
    "_library": {
      "OFFICE": [
        {
          "hour": "Weekday_00",
          "occupancy": 0.0,
          "appliances": 0.1,
          "lighting": 0.1,
          "hot_water": 0.0,
          "heating": "SETBACK",
          "cooling": "OFF",
          "processes": 0,
          "servers": 0,
          "electromobility": 0
        },
        {
          "hour": "Weekday_01",
          "occupancy": 0.0,
          // ... same properties
        }
        // ... 72 rows total (24 hours x 3 day types)
      ],
      "RETAIL": [/* ... */]
    }
  }
}
```

**Characteristics:**

- **3 sections** per use type: `use_types`, `monthly_multipliers`, `_library`
- `use_types`: Object with properties
- `monthly_multipliers`: Object with 12 month values
- `_library`: **Array of schedule rows** (72 rows per use type)
- Use type names appear as **keys** in all 3 sections
- Schedule rows have `hour` field: `"Weekday_00"` to `"Weekday_23"`, `"Saturday_00"` to `"Saturday_23"`, `"Sunday_00"` to `"Sunday_23"`

**DataKey Examples:**

- Properties: `['ARCHETYPES', 'USE', 'use_types', 'OFFICE']`
- Monthly multipliers: `['ARCHETYPES', 'USE', 'schedules', 'monthly_multipliers', 'OFFICE']`
- Schedule library: `['ARCHETYPES', 'USE', 'schedules', '_library', 'OFFICE']`

---

## Nested Structure 2: CONVERSION Components

**Path:** `components > conversion`

```javascript
"conversion": {
  "absorption_chillers": {
    "ACH1": [
      {
        "code": "ACH1",
        "description": "LiBr single effect - indirect abdc",
        "type": "single",
        "cap_min": 0,
        "cap_max": 51150,
        "unit": "W",
        "currency": "USD-2015",
        "reference": "ASHRAE 90.1/2019...",
        // ... more properties
      },
      {
        "code": "ACH1",  // Same code!
        "description": "LiBr single effect - indirect",
        "type": "single",
        "cap_min": 51150,
        "cap_max": 1176000,
        // ... more properties
      }
      // More rows with same code
    ],
    "ACH2": [/* ... array of rows */],
    "BOILER_1": [/* ... array of rows */]
  },
  "boilers": { /* ... similar structure */ },
  "chillers": { /* ... similar structure */ }
}
```

**Characteristics:**

- Component names (`ACH1`, `ACH2`, `BOILER_1`) are **keys**
- Each component value is an **array of rows**
- **All rows in array have same `code`** value (matches component name)
- Rows differ by other properties (capacity ranges, efficiency ratings, etc.)
- Common columns: `code`, `type`, `description`, `currency`, `unit`, `reference`

**DataKey Example:**

- `['COMPONENTS', 'CONVERSION', 'absorption_chillers', 'ACH1']`

---

## Key Differences: Regular vs Nested

| Aspect                 | Regular Tables          | USE Types               | CONVERSION Components      |
| ---------------------- | ----------------------- | ----------------------- | -------------------------- |
| **Structure**          | Object with unique keys | 3 related sections      | Component → Array          |
| **Key uniqueness**     | Each key is unique      | Same key in 3 places    | Keys are component names   |
| **Values**             | Simple objects          | Object + Object + Array | Array of rows              |
| **Row identification** | By unique key           | By position (0-71)      | By position (0-N)          |
| **Index duplication**  | No                      | N/A                     | Yes (all rows same `code`) |

---

## Why Position-Based Operations Matter

### Regular Tables

```javascript
// Can delete by key
delete data['STANDARD1'];

// Can identify row by index column
const row = data.find((r) => r.code === 'STANDARD1');
```

### Nested Structures (USE / CONVERSION)

```javascript
// ❌ WRONG - All rows have same code
const row = data['ACH1'].find((r) => r.code === 'ACH1'); // Returns first match only!

// ✅ CORRECT - Use array position
const row = data['ACH1'][0]; // First row
const row = data['ACH1'][1]; // Second row
```

This is why deletion/selection in nested structures **must use numeric positions** instead of index column values.

---

## Empty Database Response

When database is empty (no files uploaded):

```javascript
// Status: 404 Not Found
{
  "detail": "Database not found"
}
```

The frontend sets `isEmpty: true` and shows empty state.

---

## Common Column Patterns

### Construction Types

- `type_*`: References to other tables (e.g., `type_wall`, `type_roof`)
- `*_starts`, `*_ends`: Date ranges (e.g., `hvac_cool_starts: "15|05"`)
- `year_start`, `year_end`: Numeric ranges

### USE Types Properties

- `*_C`: Temperature values in Celsius
- `*_pc`: Percentage values
- `*_Wm2`: Power density (Watts per square meter)
- `*_ldp`: Liters per day per person
- `*_ghp`: Grams per hour per person

### CONVERSION Components

- `cap_min`, `cap_max`: Capacity ranges
- `*_rating`: Efficiency ratings
- `LT_yr`: Lifetime in years
- `O&M_%`, `IR_%`: Percentage values for operation/maintenance and interest rate

---

## Example DataKeys in Use

```javascript
// Regular table
['ARCHETYPES', 'CONSTRUCTION', 'construction_types', 'STANDARD1'][
  // USE type - properties
  ('ARCHETYPES', 'USE', 'use_types', 'OFFICE')
][
  // USE type - monthly multipliers
  ('ARCHETYPES', 'USE', 'schedules', 'monthly_multipliers', 'OFFICE')
][
  // USE type - hourly schedules
  ('ARCHETYPES', 'USE', 'schedules', '_library', 'OFFICE')
][
  // CONVERSION component
  ('COMPONENTS', 'CONVERSION', 'absorption_chillers', 'ACH1')
];
```

---

**Last Updated:** 2025-12-18
