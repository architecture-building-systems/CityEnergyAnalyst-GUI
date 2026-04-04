import { useCallback, useEffect, useRef } from 'react';

/**
 * Handles form reset with special handling for BuildingsParameter fields.
 * BuildingsParameter values are preserved during reset since the backend returns them as empty.
 */
const useFormReset = (form, params, script, dataUpdatedAt) => {
  const paramsRef = useRef(params);

  useEffect(() => {
    paramsRef.current = params;
  }, [params]);

  const resetForm = useCallback(() => {
    if (!form) return;

    const parameters = paramsRef.current?.parameters;
    const categoricalParameters = paramsRef.current?.categorical_parameters;

    // Preserve BuildingsParameter values since backend returns them as empty
    const buildingValues = {};
    const collectBuildingValues = (paramList) => {
      for (const p of paramList || []) {
        if (p.type === 'BuildingsParameter') {
          try {
            const val = form.getFieldValue(p.name);
            if (val != null) buildingValues[p.name] = val;
          } catch {
            // Field may not exist, continue
          }
        }
      }
    };

    collectBuildingValues(parameters);
    Object.values(categoricalParameters || {}).forEach(collectBuildingValues);

    form.resetFields();

    if (Object.keys(buildingValues).length > 0) {
      form.setFieldsValue(buildingValues);
    }
  }, [form]);

  // Auto-reset when script or data changes
  useEffect(() => {
    resetForm();
  }, [script, dataUpdatedAt, resetForm]);

  return resetForm;
};

export default useFormReset;
