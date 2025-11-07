# Backend Parameter Validation Exploration - Complete Index

## Overview

This index documents the complete exploration of the CEA backend parameter validation system. The backend code exists and has been thoroughly documented with code examples, usage patterns, and implementation recommendations.

## Status

- **Backend Status**: EXISTS at `/Users/zshi/Documents/GitHub/CityEnergyAnalyst`
- **Framework**: FastAPI
- **Documentation**: COMPLETE
- **Ready for**: Frontend implementation planning

## Documents in This Exploration

### 1. BACKEND_API_VALIDATION.md
**Comprehensive API Reference Guide (461 lines)**

This is the main technical reference document. Contains:

#### Sections:
1. **Backend API Structure** - Framework, directories, architecture overview
2. **Validation Endpoints Found** - 4 main endpoints with code
3. **Parameter Configuration System** - 15+ parameter types explained
4. **Tool Configuration Validation** - Tool parameter endpoints
5. **Input Editor Validation** - Building properties and input validation
6. **Frontend API Integration** - How frontend uses the backend
7. **Error Handling** - Error codes and responses
8. **Key Validation Functions** - CEA core validation functions
9. **Implementation Recommendations** - 5-step guidance for frontend
10. **Summary Table** - Quick endpoint reference

**Best for**: Understanding the complete validation architecture

**Read this when you need to**: Understand how parameter validation works end-to-end

---

### 2. BACKEND_VALIDATION_EXAMPLES.md
**Concrete Code Examples (565 lines)**

Practical implementation guide with real code from the backend and frontend. Contains:

#### Sections:
1. **Tool Parameter Validation**
   - Get tool parameters with schema
   - Save tool configuration
   - Check tool inputs

2. **Parameter Deconstructing**
   - Helper function for metadata
   - Return format example

3. **Database Validation**
   - Validate database structure
   - Code example and usage

4. **Geometry Validation**
   - Zone/Surroundings validation
   - Typology validation

5. **Input Data Validation**
   - Building properties endpoint
   - Schema response format

6. **Error Handling Examples**
   - Validation errors (422)
   - Client errors (400)
   - Server errors (500)

7. **Parameter Types Available**
   - Complete list of 15+ types
   - Usage patterns

**Best for**: Copy-paste ready examples and implementation patterns

**Read this when you need to**: Implement specific validation features

---

### 3. CLAUDE.md (Project Instructions)
**Located**: `/Users/zshi/Documents/GitHub/CityEnergyAnalyst-GUI/CLAUDE.md`

Contains project architecture and guidelines including:
- Development commands
- Dual platform (web + Electron) setup
- Feature-based architecture overview
- Key technologies and libraries
- Backend integration patterns

**Best for**: Understanding the project structure and constraints

---

## Key Validation Endpoints Summary

| Endpoint | Method | Purpose | Implementation File |
|----------|--------|---------|-------------------|
| `/api/tools/{tool}` | GET | Get parameter metadata with validation constraints | `tools.py:41-66` |
| `/api/tools/{tool}/save-config` | POST | Save and validate tool parameters | `tools.py:97-110` |
| `/api/tools/{tool}/check` | POST | Validate input files exist before execution | `tools.py:113-142` |
| `/api/databases/validate` | POST | Validate database folder structure | `databases.py:63-110` |
| `/api/geometry/buildings/validate` | POST | Validate zone/surroundings geometry | `geometry.py:58-84` |
| `/api/geometry/typology/validate` | POST | Validate typology data structure | `geometry.py:94-122` |
| `/api/inputs/building-properties` | GET | Get building properties with validation schema | `inputs.py:120-122` |
| `/api/inputs/all-inputs` | PUT | Save and validate all input data | `inputs.py:159-236` |

## Backend File Structure

```
CityEnergyAnalyst/
├── cea/
│   ├── config.py                          # Parameter classes and validation
│   ├── interfaces/dashboard/
│   │   ├── app.py                        # FastAPI setup, error handlers
│   │   ├── api/
│   │   │   ├── databases.py              # Database validation
│   │   │   ├── geometry.py               # Geometry/typology validation
│   │   │   ├── tools.py                  # Tool parameter validation
│   │   │   ├── inputs.py                 # Input data validation
│   │   │   ├── dashboards.py             # Parameter handling
│   │   │   └── utils.py                  # deconstruct_parameters()
│   │   └── dependencies.py               # Dependency injection
│   └── datamanagement/
│       └── databases_verification.py     # Geometry/typology verification
```

## Frontend Files Using Backend Validation

```
CityEnergyAnalyst-GUI/src/
├── features/
│   ├── tools/stores/toolsStore.js
│   │   └── Uses: GET /api/tools/{tool}
│   │   └── Uses: POST /api/tools/{tool}/save-config
│   ├── input-editor/stores/inputEditorStore.js
│   └── scenario/components/CreateScenarioForms/
│       ├── ContextForm.jsx
│       │   └── Uses: POST /api/databases/validate
│       └── GeometryForm.jsx
│           └── Uses: POST /api/geometry/buildings/validate
└── lib/api/axios.js
    └── API client for requests
```

## Parameter Validation Metadata

Each parameter returned from `GET /api/tools/{tool}` includes:

```json
{
    "name": "parameter_name",
    "type": "IntegerParameter",
    "value": 42,
    "nullable": false,
    "help": "Parameter description",
    "constraints": {"min": 0, "max": 100},
    "regex": "[optional pattern]",
    "choices": ["option1", "option2"],
    "extensions": [".epw"],
    "category": "Category Name"
}
```

## Parameter Types Available

- PathParameter, NullablePathParameter
- FileParameter, ResumeFileParameter, InputFileParameter
- BooleanParameter
- IntegerParameter, RealParameter
- StringParameter
- ChoiceParameter, MultiChoiceParameter
- DatabasePathParameter, WeatherPathParameter
- BuildingsParameter
- DateParameter
- ColumnChoiceParameter, ColumnMultiChoiceParameter
- NetworkLayoutNameParameter
- OptimizationIndividualListParameter
- PlantNodeParameter, ScenarioNameParameter
- UseTypeRatioParameter, GenerationParameter, SystemParameter
- And more specialized types...

## Error Handling

### HTTP Status Codes

- **200 OK**: Validation successful
- **400 Bad Request**: Client error (missing path, invalid type)
- **422 Unprocessable Entity**: FastAPI validation error
- **500 Internal Server Error**: Server-side exception

### Error Response Format

```json
{
    "detail": "Error message or list of validation errors"
}
```

For FastAPI validation errors:
```json
{
    "detail": [
        {
            "loc": ["body", "type"],
            "msg": "error message",
            "type": "error_type"
        }
    ]
}
```

## How to Use This Documentation

### For Frontend Developers

1. **Start here**: Read BACKEND_API_VALIDATION.md sections 1-4
2. **Then**: Look at BACKEND_VALIDATION_EXAMPLES.md sections 1-3
3. **Finally**: Reference specific endpoints as needed

### For Integration

1. **Quick lookup**: Use the Summary Table above
2. **Implementation**: Copy examples from BACKEND_VALIDATION_EXAMPLES.md
3. **Reference**: Check BACKEND_API_VALIDATION.md for details

### For Architecture Understanding

1. **Read**: BACKEND_API_VALIDATION.md section 1 (Backend API Structure)
2. **Review**: Section 3 (Parameter Configuration System)
3. **Reference**: Parameter types in section 10

### For Error Handling

1. **See**: BACKEND_API_VALIDATION.md section 7
2. **Examples**: BACKEND_VALIDATION_EXAMPLES.md section 6

## Implementation Checklist

Based on the exploration findings, here's what's needed for frontend parameter validation:

- [ ] Fetch parameter metadata from `GET /api/tools/{tool}`
- [ ] Implement type-based validation (Integer, String, Boolean, etc.)
- [ ] Apply constraint validation (min/max, regex patterns)
- [ ] Create choice-based dropdowns/selects
- [ ] Mark required vs. optional fields
- [ ] Display help text for each parameter
- [ ] Call save-config endpoint for submission
- [ ] Call check endpoint before tool execution
- [ ] Display error messages from backend
- [ ] Show file extension hints for file parameters
- [ ] Validate geometry/database/typology before save
- [ ] Show validation constraints to users

## Quick Reference Links

### Main Endpoints

**Parameter Metadata**: `GET /api/tools/{tool_name}`
- Returns validation schema for all parameters
- See BACKEND_VALIDATION_EXAMPLES.md Section 1

**Save Configuration**: `POST /api/tools/{tool_name}/save-config`
- Submits validated parameters
- See BACKEND_VALIDATION_EXAMPLES.md Section 1

**Check Inputs**: `POST /api/tools/{tool_name}/check`
- Validates input files before execution
- See BACKEND_VALIDATION_EXAMPLES.md Section 1

**Database Validation**: `POST /api/databases/validate`
- Validates database structure
- See BACKEND_VALIDATION_EXAMPLES.md Section 3

**Geometry Validation**: `POST /api/geometry/buildings/validate`
- Validates building geometry
- See BACKEND_VALIDATION_EXAMPLES.md Section 4

**Input Validation**: `GET /api/inputs/building-properties`
- Gets building properties with schema
- See BACKEND_VALIDATION_EXAMPLES.md Section 5

## Key Insights

1. **Metadata-Driven**: Parameter metadata is available - use it to generate forms
2. **Dual Validation**: Frontend validates for UX, backend validates for integrity
3. **Detailed Errors**: Backend provides specific error messages
4. **Type System**: 20+ parameter types with built-in validation
5. **Extensible**: Custom parameter types can be added to backend
6. **Already Used**: Frontend already uses some validation endpoints
7. **No New Endpoints Needed**: All required validation endpoints exist
8. **Well Documented**: Backend code is clear and follows FastAPI conventions

## Files Created

1. **BACKEND_API_VALIDATION.md** (461 lines)
   - Location: Frontend repo root
   - Type: Comprehensive reference
   - Coverage: All endpoints and parameter system

2. **BACKEND_VALIDATION_EXAMPLES.md** (565 lines)
   - Location: Frontend repo root
   - Type: Implementation guide
   - Coverage: Code examples and patterns

3. **BACKEND_EXPLORATION_INDEX.md** (this file)
   - Location: Frontend repo root
   - Type: Navigation and summary
   - Coverage: Overview and guidance

## Next Steps

1. Review BACKEND_API_VALIDATION.md for complete understanding
2. Study BACKEND_VALIDATION_EXAMPLES.md for implementation patterns
3. Plan frontend components based on parameter types
4. Implement parameter metadata fetching
5. Create dynamic form generation based on metadata
6. Implement client-side validation
7. Integrate with existing toolsStore.js
8. Test with actual tool parameters

## Contact Points

**Frontend Tools**: `/src/features/tools/stores/toolsStore.js`
**Backend Tools**: `/cea/interfaces/dashboard/api/tools.py`
**Parameter System**: `/cea/config.py`
**Documentation**: Start with BACKEND_API_VALIDATION.md

## Revision History

- **2025-11-07**: Initial exploration completed
  - Backend code discovered and documented
  - All validation endpoints mapped
  - Code examples extracted
  - Documentation created

---

**Generated**: 2025-11-07
**Status**: Complete - Ready for implementation planning
**Backend**: CityEnergyAnalyst (CEA) FastAPI Dashboard
**Frontend**: CityEnergyAnalyst-GUI (React/Vite)
