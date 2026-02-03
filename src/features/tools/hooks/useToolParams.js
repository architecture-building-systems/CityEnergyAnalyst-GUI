import { useEffect } from 'react';
import useToolsStore from 'features/tools/stores/toolsStore';

const useToolParams = (script, form, getForm, checkMissingInputs) => {
  const fetchToolParams = useToolsStore((state) => state.fetchToolParams);
  const resetToolParams = useToolsStore((state) => state.resetToolParams);

  useEffect(() => {
    const fetchParams = async () => {
      if (script) await fetchToolParams(script);
      else resetToolParams();

      // Reset form fields to ensure they are in sync with the fetched parameters
      form.resetFields();

      // Check for missing inputs after fetching parameters
      const params = await getForm();
      if (params) checkMissingInputs(params);
    };

    fetchParams();
  }, [script, fetchToolParams, resetToolParams, form, getForm, checkMissingInputs]);
};

export default useToolParams;
