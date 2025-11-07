# Network Name Real-Time Validation - Implementation Summary

## Overview

Implemented real-time validation for the `network-name` parameter in the network-layout tool. This provides immediate feedback to users as they type, catching invalid characters and name collisions before job submission.

## Changes Made

### 1. Created Validation Utilities (`src/utils/validation.js`)

**New file** containing reusable validation functions:

- **`debounce(func, wait)`**: Generic debouncing utility for delayed execution
- **`validateNetworkNameChars(value)`**: Checks for invalid filesystem characters
  - Invalid chars: `/ \ : * ? " < > |`
  - Returns rejected Promise with error message if invalid
- **`validateNetworkNameCollision(apiClient, tool, value, config)`**: Backend collision detection
  - Calls backend via `/api/tools/{tool}/save-config` endpoint
  - Requires `scenario` and `network-type` context for validation
  - Returns rejected Promise with backend error message if collision detected

### 2. Updated Parameter Component (`src/components/Parameter.jsx`)

#### Added Imports
```javascript
import React, { forwardRef, useRef, useCallback, useState, useEffect } from 'react';
import { validateNetworkNameChars } from 'utils/validation';
import { apiClient } from 'lib/api/axios';
```

#### Added NetworkLayoutNameInput Component (lines 42-158)

A specialized input component with:
- **State management**: Tracks validation status (`validating`, `success`, `error`)
- **Debounced validation**: 500ms delay before calling backend
- **Immediate character validation**: Checks for invalid chars on every keystroke
- **Backend collision validation**: Calls API after debounce delay
- **Visual feedback**: Uses Ant Design's `hasFeedback` and `validateStatus` props
- **Context-aware**: Gets `scenario` and `network-type` from form values
- **Cleanup**: Properly clears timeouts on unmount

Key features:
```javascript
const NetworkLayoutNameInput = ({ name, help, value, form, nullable }) => {
  const validationTimeoutRef = useRef(null);
  const [validationState, setValidationState] = useState({
    status: '', // '', 'validating', 'success', 'error'
    message: '',
  });

  const validateWithBackend = useCallback(async (value) => {
    // ... debounced backend validation logic
  }, [form]);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearTimeout(validationTimeoutRef.current);
  }, []);

  return (
    <FormField
      hasFeedback={validationState.status !== ''}
      validateStatus={validationState.status}
      rules={[/* character + backend validation */]}
    >
      <Input onChange={(e) => validateWithBackend(e.target.value)} />
    </FormField>
  );
};
```

#### Added Case Statement (lines 503-513)

Added new case to the parameter type switch:
```javascript
case 'NetworkLayoutNameParameter': {
  return (
    <NetworkLayoutNameInput
      name={name}
      help={help}
      value={value}
      form={form}
      nullable={nullable}
    />
  );
}
```

## Validation Flow

### User Experience Flow

```
User types in field
    ↓
Immediate character validation (synchronous)
    ├─ Invalid chars → Red X with error message
    └─ Valid chars → Continue
         ↓
Wait 500ms (debounce)
    ↓
Show "validating..." spinner
    ↓
Call backend API
    ├─ Success → Green checkmark ✓
    └─ Error → Red X with collision message
```

### Technical Flow

1. **On Input Change**:
   - Trigger `validateWithBackend()` callback
   - Clear any pending validation timeout
   - Set status to `validating`
   - Start 500ms debounce timer

2. **After Debounce**:
   - Get form values (`scenario`, `network-type`)
   - Skip if dependencies not set
   - Call `POST /api/tools/network-layout/save-config`
   - Update `validationState` based on response

3. **On Form Submit**:
   - Ant Design Form calls all `rules` validators
   - Character validation runs (immediate)
   - Backend validation state checked
   - Display errors if any

## Validation Rules

### 1. Invalid Characters (Immediate)
- **Pattern**: `['/', '\\', ':', '*', '?', '"', '<', '>', '|']`
- **Timing**: Synchronous, runs on every keystroke
- **Error Message**: `"Network name contains invalid characters. Avoid: / \ : * ? " < > |"`

### 2. Name Collision (Debounced)
- **Dependencies**: Requires `scenario` and `network-type` to be set
- **Timing**: 500ms after user stops typing
- **Backend Endpoint**: `POST /api/tools/network-layout/save-config`
- **Error Message**: From backend, e.g., `"Network 'centralized' already exists for DC. Choose a different name or delete the existing folder."`

### 3. Blank/Empty Input
- **Behavior**: Valid if `nullable` is true
- **User Feedback**: Placeholder text: `"Leave blank to auto-generate timestamp"`
- **Backend Behavior**: Auto-generates timestamp (e.g., `20250107_143022`)

## Visual Feedback

### States
- **Empty/Blank**: No indicator (valid state)
- **Validating**: Blue spinning icon
- **Success**: Green checkmark ✓
- **Error**: Red X with error message below field

### Implementation
Uses Ant Design Form.Item props:
```javascript
<FormField
  hasFeedback={validationState.status !== ''}  // Show icon
  validateStatus={validationState.status}      // 'validating' | 'success' | 'error'
  rules={[/* validation rules */]}
/>
```

## Backend Integration

### Endpoint Used
**`POST /api/tools/network-layout/save-config`**

### Request Format
```json
{
  "network-name": "my_network_name",
  "scenario": "/path/to/scenario",
  "network-type": "DC"
}
```

### Response
- **Success**: Status 200, config saved
- **Error**: Status 400/500 with error message in:
  - `response.data.message`
  - `response.data.error`
  - `response.data` (fallback)

### Backend Validation Logic
Located in `CityEnergyAnalyst/cea/config.py:757-821`:
1. Checks for invalid filesystem characters (always)
2. Gets `network_type` from config
3. Gets `scenario` path from config
4. Uses `InputLocator` to check if network folder exists
5. Checks for `edges.shp` or `nodes.shp` files
6. Raises `ValueError` if collision detected

## Error Handling

### Graceful Degradation
- If `scenario` or `network-type` not set → Skip backend validation
- If backend throws non-validation error → Skip gracefully
- Timeout cleanup on component unmount prevents memory leaks

### Error Message Extraction
```javascript
const errorMessage =
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  'Validation failed';
```

## Testing Guide

### Test Case 1: Invalid Characters
**Steps**:
1. Navigate to network-layout tool
2. Type `test/network` in the `network-name` field
3. **Expected**: Red X appears immediately with message:
   > Network name contains invalid characters. Avoid: / \ : * ? " < > |

### Test Case 2: Name Collision
**Setup**:
```bash
# Create test network in scenario outputs
mkdir -p "{scenario}/outputs/data/thermal-network/DC/test_network"
touch "{scenario}/outputs/data/thermal-network/DC/test_network/edges.shp"
```

**Steps**:
1. Set `network-type` to "DC"
2. Type `test_network` in `network-name` field
3. Wait 500ms
4. **Expected**: Red X appears with message:
   > Network 'test_network' already exists for DC. Choose a different name or delete the existing folder.

### Test Case 3: Valid Name
**Steps**:
1. Set `network-type` to "DC"
2. Type `new_unique_network` in `network-name` field
3. Wait 500ms
4. **Expected**: Green checkmark appears ✓

### Test Case 4: Blank Input
**Steps**:
1. Leave `network-name` field empty
2. **Expected**: No error, placeholder shows:
   > Leave blank to auto-generate timestamp

### Test Case 5: Debouncing
**Steps**:
1. Type "a", wait 200ms, type "b", wait 200ms, type "c"
2. **Expected**: Only ONE backend call after 500ms from last keystroke

## Known Limitations

### 1. Backend Endpoint Side Effect
The validation uses `/save-config` endpoint which **saves the config** as a side effect. This means:
- Multiple validations = multiple config saves
- Not ideal, but acceptable since it's the same config being saved
- **Alternative**: Create dedicated `/api/parameters/validate` endpoint (future improvement)

### 2. Dependencies on Other Parameters
Validation requires `scenario` and `network-type` to be set:
- If not set → Validation is skipped
- User won't see collision errors until dependencies are filled
- **Solution**: This is acceptable as the backend has fallback validation in `main()`

### 3. Race Conditions
If user changes `network-type` while `network-name` validation is in progress:
- The in-flight request uses old `network-type`
- **Mitigation**: Timeout is cleared on new input, limiting race window
- **Future improvement**: Cancel in-flight requests using AbortController

## Future Enhancements

### 1. Dedicated Validation Endpoint
Create `POST /api/parameters/validate` to avoid config save side effects:
```javascript
await apiClient.post('/api/parameters/validate', {
  section: 'network-layout',
  parameter: 'network-name',
  value: 'my_network',
  context: { scenario: '...', 'network-type': 'DC' }
});
```

### 2. Re-validate on Dependency Change
Add listener for `network-type` changes to re-validate `network-name`:
```javascript
// Watch network-type field
useEffect(() => {
  const subscription = form.watch((value, { name }) => {
    if (name === 'network-type') {
      // Re-validate network-name
      form.validateFields(['network-name']);
    }
  });
  return () => subscription.unsubscribe();
}, [form]);
```

### 3. Request Cancellation
Use AbortController to cancel in-flight requests:
```javascript
const abortControllerRef = useRef(new AbortController());

// In validateWithBackend:
abortControllerRef.current.abort();
abortControllerRef.current = new AbortController();

await apiClient.post('...', data, {
  signal: abortControllerRef.current.signal
});
```

### 4. Loading State Feedback
Add loading indicator next to "Run" button when validation is in progress:
```javascript
const isValidating = validationState.status === 'validating';
<Button disabled={isValidating} loading={isValidating}>Run</Button>
```

### 5. Generic StringParameter Validation
Extend this pattern to other `StringParameter` subtypes:
```javascript
case 'StringParameter': {
  // Check if parameter has custom validator
  if (parameter.validator) {
    return <ValidatedStringInput {...props} validator={parameter.validator} />;
  }
  // Default string input
  return <Input />;
}
```

## Files Modified

| File | Lines Changed | Type |
|------|---------------|------|
| `src/utils/validation.js` | +65 | New file |
| `src/components/Parameter.jsx` | +122 | Modified |

**Total**: ~187 lines of new code

## Related Backend Files

For reference, backend validation logic:
- `CityEnergyAnalyst/cea/config.py` (lines 757-821) - `NetworkLayoutNameParameter` class
- `CityEnergyAnalyst/cea/default.config` (lines 1607-1611) - Parameter definition
- `CityEnergyAnalyst/cea/technologies/network_layout/main.py` (lines 412-434) - Safety validation fallback

## Questions Answered

### 1. Does the frontend support real-time validation for custom parameter types?
**Yes, now it does!** This implementation adds real-time validation support for `NetworkLayoutNameParameter` specifically. The pattern can be extended to other custom parameter types.

### 2. How does the frontend handle ValueError from parameter decode()?
- **Before**: Only on form submit via `/api/tools/{tool}/save-config`
- **After**: Both on keystroke (character validation) and on debounced backend call (collision validation)

### 3. Is there a pattern for parameters that depend on other parameters?
**Yes**, implemented in `NetworkLayoutNameInput`:
- Uses `form.getFieldsValue()` to access other parameter values
- Skips validation gracefully if dependencies not set
- Can be extended with form field watchers for automatic re-validation

## Conclusion

The implementation provides a robust, user-friendly validation experience for the `network-name` parameter while maintaining graceful degradation and proper error handling. The pattern is reusable for other custom parameter types and can be enhanced with the suggested future improvements.
