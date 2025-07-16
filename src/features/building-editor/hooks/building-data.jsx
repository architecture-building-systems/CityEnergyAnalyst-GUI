import { useInputs } from 'features/input-editor/hooks/queries/useInputs';
import { useUpdateInputs } from 'features/input-editor/hooks/updates/useUpdateInputs';

export const useBuildingData = (building) => {
  const { data: inputData } = useInputs();
  const updateInputData = useUpdateInputs();

  const data = {};
  const columns = inputData?.columns ?? {};

  if (!building) return { data, columns, updateData: updateInputData };

  for (const table of Object.keys(inputData?.tables ?? {})) {
    data[table] = inputData?.tables?.[table]?.[building];
  }

  return { data, columns, updateData: updateInputData };
};
