# Backend Validation API - Code Examples

## Overview
This document provides concrete code examples for using the CEA backend validation endpoints. The backend includes comprehensive validation for:
- Tool parameters
- Input geometries (zone, surroundings)
- Database structures
- Typology data
- Building properties and schedules

---

## 1. Tool Parameter Validation

### Get Tool Parameters with Validation Schema

**Endpoint**: `GET /api/tools/{tool_name}`

**Backend Code** (`/cea/interfaces/dashboard/api/tools.py`, lines 41-66):
```python
@router.get('/{tool_name}')
async def get_tool_properties(config: CEAConfig, tool_name: str) -> ToolProperties:
    script = cea.scripts.by_name(tool_name, plugins=config.plugins)
    
    parameters = []
    categories = defaultdict(list)
    for _, parameter in config.matching_parameters(script.parameters):
        parameter_dict = deconstruct_parameters(parameter, config)
        
        if parameter.category:
            categories[parameter.category].append(parameter_dict)
        else:
            parameters.append(parameter_dict)
    
    return ToolProperties(
        name=tool_name,
        label=script.label,
        description=script.description,
        categorical_parameters=categories,
        parameters=parameters,
    )
```

**Returns**: Object with parameter metadata including:
```json
{
    "name": "tool_name",
    "label": "Tool Label",
    "description": "Tool description",
    "categorical_parameters": {
        "category_name": [
            {
                "name": "param1",
                "type": "IntegerParameter",
                "value": 10,
                "nullable": false,
                "help": "Parameter description",
                "constraints": {"min": 0, "max": 100}
            }
        ]
    },
    "parameters": [...]
}
```

### Save Tool Configuration with Validation

**Endpoint**: `POST /api/tools/{tool_name}/save-config`

**Backend Code** (`/cea/interfaces/dashboard/api/tools.py`, lines 97-110):
```python
@router.post('/{tool_name}/save-config', dependencies=[CEASeverDemoAuthCheck])
async def save_tool_config(config: CEAConfig, tool_name: str, payload: Dict[str, Any]):
    """Save the configuration for this tool to the configuration file"""
    for parameter in parameters_for_script(tool_name, config):
        if parameter.name != 'scenario' and parameter.name in payload:
            value = payload[parameter.name]
            print('%s: %s' % (parameter.name, value))
            parameter.set(value)  # <-- Validation happens here via parameter.set()
    
    if isinstance(config, CEADatabaseConfig):
        await config.save()
    else:
        config.save()
    return 'Success'
```

**Frontend Usage** (`/src/features/tools/stores/toolsStore.js`, lines 85-103):
```javascript
saveToolParams: async (tool, params) => {
    set((state) => ({
        toolSaving: { ...state.toolSaving, isSaving: true },
    }));

    try {
        const response = await apiClient.post(
            `/api/tools/${tool}/save-config`,
            params,  // { param1: value1, param2: value2, ... }
        );
        return response.data;
    } catch (error) {
        throw error;
    } finally {
        set((state) => ({
            toolSaving: { ...state.toolSaving, isSaving: false },
        }));
    }
},
```

### Check Tool Inputs Before Execution

**Endpoint**: `POST /api/tools/{tool_name}/check`

**Backend Code** (`/cea/interfaces/dashboard/api/tools.py`, lines 113-142):
```python
@router.post('/{tool_name}/check')
async def check_tool_inputs(config: CEAConfig, tool_name: str, payload: Dict[str, Any]):
    # Set config parameters
    for parameter in parameters_for_script(tool_name, config):
        if parameter.name in payload:
            value = payload[parameter.name]
            parameter.set(value)  # Validates parameters
    
    # Check for missing input files
    script = cea.scripts.by_name(tool_name, plugins=config.plugins)
    schema_data = schemas(config.plugins)
    
    script_suggestions = set()
    for method_name, path in script.missing_input_files(config):
        _script_suggestions = schema_data[method_name]['created_by']
        if _script_suggestions is not None:
            script_suggestions.update(_script_suggestions)
    
    if script_suggestions:
        scripts = []
        for script_suggestion in script_suggestions:
            _script = cea.scripts.by_name(script_suggestion, plugins=config.plugins)
            scripts.append({"label": _script.label, "name": _script.name})
        
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Missing input files",
                "script_suggestions": list(scripts)
            }
        )
```

**Response on Success**: Empty response (200 OK)

**Response on Error**:
```json
{
    "message": "Missing input files",
    "script_suggestions": [
        {"label": "Generate Zone", "name": "generate_zone"},
        {"label": "Generate Surroundings", "name": "generate_surroundings"}
    ]
}
```

---

## 2. Parameter Deconstructing

### Helper Function for Parameter Metadata

**Backend Code** (`/cea/interfaces/dashboard/api/utils.py`, lines 5-35):
```python
def deconstruct_parameters(p: cea.config.Parameter, config=None):
    params = {'name': p.name, 'type': type(p).__name__, 'nullable': False, 'help': p.help}
    
    try:
        if isinstance(p, cea.config.BuildingsParameter):
            params['value'] = []
        else:
            params["value"] = p.get()
    except cea.ConfigError as e:
        print(e)
        params["value"] = ""

    if isinstance(p, cea.config.ChoiceParameter):
        params['choices'] = p._choices

    if isinstance(p, cea.config.WeatherPathParameter):
        locator = cea.inputlocator.InputLocator(config.scenario)
        params['choices'] = {wn: locator.get_weather(wn) for wn in locator.get_weather_names()}

    elif isinstance(p, cea.config.DatabasePathParameter):
        params['choices'] = p._choices

    if hasattr(p, "_extensions") or hasattr(p, "extensions"):
        params["extensions"] = getattr(p, "_extensions", None) or getattr(p, "extensions")

    try:
        params["nullable"] = p.nullable
    except AttributeError:
        pass

    return params
```

**Returns**:
```python
{
    'name': 'parameter_name',
    'type': 'IntegerParameter',  # or 'ChoiceParameter', 'StringParameter', etc
    'nullable': False,
    'help': 'Parameter description from code',
    'value': 42,  # Current value
    'choices': [1, 2, 3],  # Only if ChoiceParameter
    'extensions': ['.epw'],  # Only if FileParameter
}
```

---

## 3. Database Validation

### Validate Database Structure

**Endpoint**: `POST /api/databases/validate`

**Backend Code** (`/cea/interfaces/dashboard/api/databases.py`, lines 57-110):
```python
class ValidateDatabase(BaseModel):
    type: Literal['path', 'file']
    path: Optional[str] = None
    file: Optional[str] = None

@router.post("/validate")
async def validate_database(data: ValidateDatabase):
    """Validate the given databases (only checks if the folder structure is correct)"""
    if data.type == 'path':
        if data.path is None:
            raise HTTPException(status_code=400, detail="Missing path")
        
        database_path = secure_path(data.path)
        try:
            with tempfile.TemporaryDirectory() as tmpdir:
                scenario = os.path.join(tmpdir, "scenario")
                temp_db_path = os.path.join(scenario, "inputs", "database")
                os.makedirs(temp_db_path, exist_ok=True)
                
                # Copy databases to temp directory
                shutil.copytree(database_path, temp_db_path, dirs_exist_ok=True)
                
                try:
                    dict_missing_db = cea4_verify_db(scenario, verbose=True)
                except Exception as e:
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail=str(e),
                    )
            
            if dict_missing_db:
                errors = {db: missing_files for db, missing_files in dict_missing_db.items() if missing_files}
                if errors:
                    print(json.dumps(errors))
        
        except IOError as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Uncaught exception: {str(e)}",
            )
        
        return {}
    return {}
```

**Frontend Usage** (`/src/features/scenario/components/CreateScenarioForms/ContextForm.jsx`):
```javascript
const response = await apiClient.post(`/api/databases/validate`, {
    type: 'path',
    path: databasePath
});
```

---

## 4. Geometry Validation

### Validate Building Geometry (Zone or Surroundings)

**Endpoint**: `POST /api/geometry/buildings/validate`

**Backend Code** (`/cea/interfaces/dashboard/api/geometry.py`, lines 52-84):
```python
class ValidateGeometry(BaseModel):
    type: Literal['path', 'file']
    building: Literal['zone', 'surroundings']
    path: Optional[str] = None
    file: Optional[str] = None

@router.post("/buildings/validate")
async def validate_building_geometry(data: ValidateGeometry):
    """Validate the given building geometry"""
    if data.type == 'path':
        if data.path is None:
            raise HTTPException(status_code=400, detail="Missing path")
        
        try:
            building_df = gpd.read_file(data.path)
            if data.building == 'zone':
                # Make sure zone column names are in correct case
                building_df.columns = [col.lower() for col in building_df.columns]
                rename_dict = {col.lower(): col for col in COLUMNS_ZONE_GEOMETRY}
                building_df.rename(columns=rename_dict, inplace=True)
                
                verify_input_geometry_zone(building_df)
            elif data.building == 'surroundings':
                verify_input_geometry_surroundings(building_df)
        except Exception as e:
            print(e)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=str(e),
            )
        
        return {}
```

**Frontend Usage** (`/src/features/scenario/components/CreateScenarioForms/GeometryForm.jsx`):
```javascript
const response = await apiClient.post(`/api/geometry/buildings/validate`, {
    type: 'path',
    building: 'zone',  // or 'surroundings'
    path: geometryPath
});
```

### Validate Typology Data

**Endpoint**: `POST /api/geometry/typology/validate`

**Backend Code** (`/cea/interfaces/dashboard/api/geometry.py`, lines 87-122):
```python
class ValidateTypology(BaseModel):
    type: Literal['path', 'file']
    path: Optional[str] = None
    file: Optional[str] = None

@router.post("/typology/validate")
async def validate_typology(data: ValidateTypology):
    """Validate the given typology"""
    if data.type == 'path':
        if data.path is None:
            raise HTTPException(status_code=400, detail="Missing path")
        
        _, extension = os.path.splitext(data.path)
        try:
            if extension == ".xlsx":
                typology_df = pd.read_excel(data.path)
            else:
                typology_df = gpd.read_file(data.path)
            
            # Make sure typology column names are in correct case
            typology_df.columns = [col.lower() for col in typology_df.columns]
            rename_dict = {col.lower(): col for col in COLUMNS_ZONE_TYPOLOGY}
            typology_df.rename(columns=rename_dict, inplace=True)
            
            verify_input_typology(typology_df)
        except Exception as e:
            print(e)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=str(e),
            )
        
        return {}
```

**Frontend Usage**:
```javascript
const response = await apiClient.post(`/api/geometry/typology/validate`, {
    type: 'path',
    path: typologyPath  // Accepts .xlsx or .shp
});
```

---

## 5. Input Data Validation

### Get Building Properties with Validation Schema

**Endpoint**: `GET /api/inputs/building-properties`

**Backend Code** (`/cea/interfaces/dashboard/api/inputs.py`, lines 239-302):
```python
def get_building_properties(scenario: str):
    locator = cea.inputlocator.InputLocator(scenario)
    store = {'tables': {}, 'columns': {}}
    
    for db in INPUTS:
        db_info = INPUTS[db]
        locator_method = db_info['location']
        file_path = getattr(locator, locator_method)()
        file_type = db_info['file_type']
        db_columns = db_info['columns']
        
        # Get building property data from file
        try:
            if file_type == 'shp':
                table_df = geopandas.read_file(file_path)
                table_df = pd.DataFrame(table_df.drop(columns='geometry'))
                # ... process dataframe
                store['tables'][db] = json.loads(table_df.set_index('name').to_json(orient='index'))
            else:
                table_df = pd.read_csv(file_path)
                store['tables'][db] = table_df.set_index("name").to_dict(orient='index')
        except (IOError, DriverError, ValueError, FileNotFoundError) as e:
            store['tables'][db] = None
        
        # Get column definitions from schema
        columns = defaultdict(dict)
        try:
            for column_name, column in db_columns.items():
                columns[column_name]['type'] = column['type']
                if 'choice' in column:
                    path = getattr(locator, column['choice']['lookup']['path'])()
                    columns[column_name]['path'] = path
                    columns[column_name]['choices'] = get_choices(column['choice'], path)
                if 'constraints' in column:
                    columns[column_name]['constraints'] = column['constraints']
                if 'regex' in column:
                    columns[column_name]['regex'] = column['regex']
                    if 'example' in column:
                        columns[column_name]['example'] = column['example']
                if 'nullable' in column:
                    columns[column_name]['nullable'] = column['nullable']
                
                columns[column_name]['description'] = column["description"]
                columns[column_name]['unit'] = column["unit"]
            store['columns'][db] = dict(columns)
        except Exception as e:
            store['tables'][db] = None
            store['columns'][db] = None
    
    return store
```

**Returns**:
```json
{
    "tables": {
        "zone": {
            "building1": {
                "name": "building1",
                "floor_height": 3.5,
                "footprint": 1000.0
            }
        }
    },
    "columns": {
        "zone": {
            "name": {
                "type": "text",
                "description": "Building name",
                "unit": "-",
                "nullable": false
            },
            "floor_height": {
                "type": "number",
                "constraints": {"min": 2, "max": 5},
                "description": "Average floor height",
                "unit": "m",
                "nullable": false
            }
        }
    }
}
```

---

## 6. Error Handling Examples

### Validation Error (422 Unprocessable Entity)

**Backend Handler** (`/cea/interfaces/dashboard/app.py`, lines 116-128):
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

**Response Example**:
```json
{
    "detail": [
        {
            "loc": ["body", "type"],
            "msg": "value is not a valid enumeration member; permitted: 'path', 'file'",
            "type": "type_error.enum"
        }
    ]
}
```

### Client Error (400 Bad Request)

**Response Example**:
```json
{
    "detail": "Missing path"
}
```

### Server Error (500 Internal Server Error)

**Response Example**:
```json
{
    "detail": "Uncaught exception: [error message]"
}
```

---

## 7. Parameter Types Available

The backend supports these parameter types (from `/cea/config.py`):

- `PathParameter` - File system path
- `NullablePathParameter` - Optional file path
- `FileParameter` - File reference
- `BooleanParameter` - True/False value
- `IntegerParameter` - Whole number with optional constraints
- `RealParameter` - Decimal number with optional constraints
- `StringParameter` - Text value with optional regex validation
- `ChoiceParameter` - Enumerated value from fixed list
- `MultiChoiceParameter` - Multiple selections from fixed list
- `DatabasePathParameter` - Reference to database
- `WeatherPathParameter` - Reference to weather file
- `BuildingsParameter` - Select buildings from project
- `DateParameter` - Date value
- `ColumnChoiceParameter` - Select column from data
- `ColumnMultiChoiceParameter` - Select multiple columns
- And many more specialized types...

---

## Summary

The CEA backend provides:

1. **Comprehensive Parameter Metadata**: Get parameter types, constraints, choices, nullable flags
2. **Pre-validation via Endpoints**: Validate geometries, databases, typology before saving
3. **Backend Validation**: Parameter.set() validates each parameter value
4. **Error Reporting**: Detailed error messages for validation failures
5. **Schema Information**: Column definitions with types, constraints, descriptions, units

The frontend can use this to:
- Display appropriate form fields (dropdowns for choices, text for strings, etc)
- Show validation constraints to users
- Validate locally before submission
- Call validation endpoints for complex data
- Display helpful error messages when validation fails
