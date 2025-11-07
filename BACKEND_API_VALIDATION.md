# CEA Backend API Exploration Report
## Parameter Validation Endpoints and Architecture

### Executive Summary

The backend CEA code DOES EXIST at `/Users/zshi/Documents/GitHub/CityEnergyAnalyst`. The API has a well-structured validation system with multiple endpoints for parameter validation across different modules (geometry, databases, tools, projects).

---

## 1. Backend API Structure

### Location
```
/Users/zshi/Documents/GitHub/CityEnergyAnalyst/cea/interfaces/dashboard/
```

### Main API Directories
- **API Routes**: `/api/` - Main API endpoints
- **Server Integration**: `/server/` - Worker process management
- **Configuration**: `app.py`, `settings.py`, `dependencies.py`

### Architecture
- **Framework**: FastAPI
- **Middleware**: CORS enabled, RequestValidationError handling
- **Process Management**: Zombie process reaping for worker processes
- **Database**: SQLite with async adapter
- **Caching**: Redis support (optional)
- **Logging**: Custom CEA server logger

---

## 2. Validation Endpoints Found

### 2.1 Database Validation
**Endpoint**: `POST /api/databases/validate`
**File**: `/cea/interfaces/dashboard/api/databases.py` (lines 63-110)
**Purpose**: Validate database folder structure

```python
@router.post("/validate")
async def validate_database(data: ValidateDatabase):
    """Validate the given databases (only checks if folder structure is correct)"""
    # Supports two validation types: 'path' or 'file'
    # Uses cea4_verify_db() function for validation
```

**Parameters**:
- `type`: Literal['path', 'file']
- `path`: Optional path to database directory
- `file`: Optional uploaded file

**Validation Process**:
1. Accepts a path to database
2. Creates temporary directory structure
3. Copies database files to temp location
4. Runs `cea4_verify_db(scenario, verbose=True)`
5. Returns validation results or raises HTTPException

### 2.2 Building Geometry Validation
**Endpoint**: `POST /api/geometry/buildings/validate`
**File**: `/cea/interfaces/dashboard/api/geometry.py` (lines 58-84)
**Purpose**: Validate building geometry (zone or surroundings)

```python
@router.post("/buildings/validate")
async def validate_building_geometry(data: ValidateGeometry):
    """Validate the given building geometry"""
    # Validates both zone and surroundings geometries
```

**Parameters**:
- `type`: Literal['path', 'file']
- `building`: Literal['zone', 'surroundings']
- `path`: Optional path to geometry file

**Validation Process**:
1. Reads shapefile from provided path
2. Normalizes column names (lowercase)
3. Calls `verify_input_geometry_zone()` or `verify_input_geometry_surroundings()`
4. Returns empty dict on success, or raises HTTPException with error details

### 2.3 Typology Validation
**Endpoint**: `POST /api/geometry/typology/validate`
**File**: `/cea/interfaces/dashboard/api/geometry.py` (lines 94-122)
**Purpose**: Validate typology data structure

```python
@router.post("/typology/validate")
async def validate_typology(data: ValidateTypology):
    """Validate the given typology"""
```

**Supported Formats**:
- `.xlsx` - Excel files using `pd.read_excel()`
- `.shp` - Shapefile using `geopandas.read_file()`

**Validation Process**:
1. Determines file type from extension
2. Reads file into dataframe
3. Normalizes column names (lowercase)
4. Calls `verify_input_typology(typology_df)`
5. Returns empty dict on success, raises HTTPException on error

### 2.4 Scenario Name Validation
**Function**: `validate_scenario_name(scenario_name: str)`
**File**: `/cea/interfaces/dashboard/api/project.py` (lines 655-660)
**Purpose**: Prevent directory traversal and invalid scenario names

```python
def validate_scenario_name(scenario_name: str):
    if scenario_name == "." or scenario_name == ".." or os.path.basename(scenario_name) != scenario_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid scenario name: {scenario_name}. Name should not contain path components.",
        )
```

**Validations**:
- Rejects "." and ".." (directory navigation attempts)
- Ensures no path separators in scenario name
- Uses `os.path.basename()` for path safety

---

## 3. Parameter Configuration System

### Parameter Types
The CEA backend uses a sophisticated parameter system with multiple parameter types defined in `/cea/config.py`:

**Core Parameter Classes**:
- `Parameter` - Base class
- `PathParameter` - File system paths
- `NullablePathParameter` - Optional paths
- `FileParameter` - File references
- `BooleanParameter` - Boolean values
- `IntegerParameter` - Integer values
- `RealParameter` - Float values
- `StringParameter` - String values
- `ChoiceParameter` - Enumerated selections
- `MultiChoiceParameter` - Multiple selections
- `DatabasePathParameter` - Database references
- `WeatherPathParameter` - Weather file references
- `BuildingsParameter` - Building selections
- `DateParameter` - Date values
- `ColumnChoiceParameter` - Column selection from data
- And many specialized parameter types...

### Parameter Validation Methods
**File**: `/cea/interfaces/dashboard/api/dashboards.py` (lines 35-67)

```python
def get_parameters_from_plot(config, plot, scenario_name=None):
    parameters = []
    # Sets parameter values with validation via parameter.set()
    try:
        parameter.set(plot.parameters[pname])
    except AssertionError as e:
        # Handles validation errors
        if isinstance(parameter, cea.config.MultiChoiceParameter):
            parameter.set([])
```

**Key Functions**:
- `deconstruct_parameters(p)` - Converts parameter to dict with type, value, constraints
- `parameter.set(value)` - Sets and validates parameter value (raises AssertionError on invalid)
- `parameter.get()` - Gets validated value

### Deconstructed Parameter Format
**File**: `/cea/interfaces/dashboard/api/utils.py`

Each parameter is converted to a dictionary:
```python
{
    'name': str,
    'type': str,  # ClassName of parameter type
    'nullable': bool,
    'help': str,
    'value': Any,  # Current value
    'choices': list,  # If ChoiceParameter
    'constraints': dict,  # If specified in schema
    'nullable': bool,
    'extensions': list,  # File extensions if applicable
}
```

---

## 4. Tool Configuration Validation

### Tool Parameters Endpoint
**Endpoint**: `GET /api/tools/{tool_name}`
**File**: `/cea/interfaces/dashboard/api/tools.py` (lines 41-66)
**Purpose**: Get tool parameters with validation constraints

**Returns**: ToolProperties object with:
- `parameters`: List of general parameters
- `categorical_parameters`: Dict of categorized parameters
- Each parameter includes validation metadata

### Save Tool Configuration
**Endpoint**: `POST /api/tools/{tool_name}/save-config`
**File**: `/cea/interfaces/dashboard/api/tools.py` (lines 97-110)
**Purpose**: Save and validate tool configuration

```python
@router.post('/{tool_name}/save-config', dependencies=[CEASeverDemoAuthCheck])
async def save_tool_config(config: CEAConfig, tool_name: str, payload: Dict[str, Any]):
    """Save the configuration for this tool to the configuration file"""
    for parameter in parameters_for_script(tool_name, config):
        if parameter.name != 'scenario' and parameter.name in payload:
            value = payload[parameter.name]
            parameter.set(value)  # Validates here
```

### Check Tool Inputs
**Endpoint**: `POST /api/tools/{tool_name}/check`
**File**: `/cea/interfaces/dashboard/api/tools.py` (lines 113-142)
**Purpose**: Validate tool input files before execution

```python
@router.post('/{tool_name}/check')
async def check_tool_inputs(config: CEAConfig, tool_name: str, payload: Dict[str, Any]):
    # Sets parameters for validation
    for parameter in parameters_for_script(tool_name, config):
        if parameter.name in payload:
            value = payload[parameter.name]
            parameter.set(value)  # Validates
    
    # Checks for missing input files
    for method_name, path in script.missing_input_files(config):
        # Suggests scripts to create missing files
```

---

## 5. Input Editor Validation

### Building Properties Validation
**Endpoint**: `GET /api/inputs/building-properties`
**File**: `/cea/interfaces/dashboard/api/inputs.py` (lines 120-122, 239-302)
**Purpose**: Get building properties with validation schema

**Returns**: Building property structure with:
```python
{
    'tables': {
        'zone': {...},
        'envelope': {...},
        'internal-loads': {...},
        'indoor-comfort': {...},
        'hvac': {...},
        'supply': {...},
        'surroundings': {...},
        'trees': {...}
    },
    'columns': {
        'zone': {
            'column_name': {
                'type': str,
                'choices': list,
                'constraints': dict,
                'regex': str,
                'nullable': bool,
                'description': str,
                'unit': str
            }
        }
    }
}
```

**Validation Constraints Extracted From**:
- Database schema definitions (`schemas.yml`)
- Column definitions with:
  - Type validation (`type` field)
  - Choice constraints (`choices` field)
  - Regex patterns (`regex` field)
  - Nullable settings (`nullable` field)

### Save All Inputs
**Endpoint**: `PUT /api/inputs/all-inputs`
**File**: `/cea/interfaces/dashboard/api/inputs.py` (lines 159-236)
**Purpose**: Save and validate all input data

**Validates**:
- Shapefile geometry for GeoJSON inputs
- CSV data structure for building properties
- Schedule file formats
- Coordinate reference systems

---

## 6. Frontend API Integration

### Tools Store
**File**: `/src/features/tools/stores/toolsStore.js`
**Usage Example**:
```javascript
// Fetch tool parameters with validation metadata
await apiClient.get(`/api/tools/${tool}`);

// Save parameters with validation
await apiClient.post(`/api/tools/${tool}/save-config`, params);

// Check tool inputs before execution
await apiClient.post(`/api/tools/${tool}/check`, payload);

// Restore default values
await apiClient.post(`/api/tools/${tool}/default`);
```

### Scenario Creation Validation
**Files**:
- `/src/features/scenario/components/CreateScenarioForms/ContextForm.jsx`
- `/src/features/scenario/components/CreateScenarioForms/GeometryForm.jsx`

**Usage Examples**:
```javascript
// Validate database structure
await apiClient.post(`/api/databases/validate`, {
    type: 'path' | 'file',
    path: dbPath
});

// Validate building geometry
await apiClient.post(`/api/geometry/buildings/validate`, {
    type: 'path' | 'file',
    building: 'zone' | 'surroundings',
    path: geometryPath
});

// Validate typology
await apiClient.post(`/api/geometry/typology/validate`, {
    type: 'path' | 'file',
    path: typologyPath
});
```

---

## 7. Error Handling

### Request Validation Errors
**File**: `/cea/interfaces/dashboard/app.py` (lines 116-128)

```python
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.error(f"Found validation errors: {exc.errors()}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors()},
        headers={"Access-Control-Allow-Origin": get_settings().cors_origin}
    )
```

### Global Exception Handler
**File**: `/cea/interfaces/dashboard/app.py` (lines 130-141)

Returns 500 status with error details for uncaught exceptions.

---

## 8. Key Validation Functions from CEA Core

### Database Verification
- `cea4_verify_db(scenario, verbose=True)` - Validates database folder structure
- Returns dict of missing files per database

### Geometry Verification
- `verify_input_geometry_zone(building_df)` - Validates zone geometry
- `verify_input_geometry_surroundings(building_df)` - Validates surroundings
- `verify_input_typology(typology_df)` - Validates typology structure
- `verify_input_terrain(terrain_path)` - Validates terrain raster

### Coordinate System
- `get_geographic_coordinate_system()` - EPSG:4326 (WGS 84)
- `get_projected_coordinate_system(lat, lon)` - Calculates appropriate UTM zone

---

## 9. Implementation Recommendations

### For Frontend Parameter Validation

1. **Fetch Parameter Metadata**:
   - Call `GET /api/tools/{tool}/` to get parameter schema
   - Extract `constraints`, `regex`, `choices`, `nullable` from response
   - Use this to validate before submission

2. **Implement Pre-submission Validation**:
   - Regex validation on string parameters
   - Choice validation on enum parameters
   - Type validation on numeric/boolean parameters
   - Null checks on non-nullable fields

3. **Add Validation Feedback**:
   - Show constraint information in form labels
   - Display regex patterns as examples
   - Highlight required vs optional fields
   - Show choices as dropdowns/multi-selects

4. **Call Save-Config Endpoint**:
   - Submit validated parameters to `POST /api/tools/{tool}/save-config`
   - Handle validation errors (HTTPException with 400-422 status)
   - Display validation error messages from backend

5. **Pre-execution Validation**:
   - Call `POST /api/tools/{tool}/check` before tool execution
   - Validates all input files exist
   - Returns script suggestions if files are missing

---

## 10. Summary Table

| Endpoint | Method | Purpose | Validation |
|----------|--------|---------|-----------|
| `/api/databases/validate` | POST | Validate database structure | `cea4_verify_db()` |
| `/api/geometry/buildings/validate` | POST | Validate zone/surroundings | `verify_input_geometry_*()` |
| `/api/geometry/typology/validate` | POST | Validate typology | `verify_input_typology()` |
| `/api/tools/{tool}` | GET | Get tool parameters | Provides schema with constraints |
| `/api/tools/{tool}/save-config` | POST | Save tool configuration | `parameter.set()` validates |
| `/api/tools/{tool}/check` | POST | Check tool inputs | Verifies input files exist |
| `/api/inputs/building-properties` | GET | Get building properties | Returns schema with constraints |
| `/api/inputs/all-inputs` | PUT | Save input data | Validates geometry and formats |

---

## Files Referenced

### Backend (Python - CityEnergyAnalyst)
```
/Users/zshi/Documents/GitHub/CityEnergyAnalyst/
├── cea/interfaces/dashboard/
│   ├── app.py (FastAPI setup, error handlers)
│   ├── api/
│   │   ├── databases.py (database validation)
│   │   ├── geometry.py (geometry validation)
│   │   ├── tools.py (tool parameters, validation)
│   │   ├── inputs.py (building properties, input validation)
│   │   ├── project.py (project/scenario management)
│   │   ├── dashboards.py (parameter deconstructing)
│   │   └── utils.py (deconstruct_parameters())
│   └── dependencies.py (injection dependencies)
├── config.py (Parameter types and validation logic)
└── datamanagement/
    └── databases_verification.py (geometry/typology verification)
```

### Frontend (React - CityEnergyAnalyst-GUI)
```
/Users/zshi/Documents/GitHub/CityEnergyAnalyst-GUI/src/
├── features/
│   ├── tools/stores/toolsStore.js (tool API integration)
│   ├── input-editor/stores/inputEditorStore.js (input validation)
│   └── scenario/components/CreateScenarioForms/
│       ├── ContextForm.jsx (database validation)
│       └── GeometryForm.jsx (geometry validation)
└── lib/api/axios.js (API client)
```
