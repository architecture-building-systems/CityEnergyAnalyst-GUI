import { useEffect } from 'react';
import useToolsStore, {
  useCheckMissingInputs,
} from 'features/tools/stores/toolsStore';
import { getFormValues } from '../utils';

const useToolParams = (script, form, parameters, categoricalParameters) => {
  const fetchToolParams = useToolsStore((state) => state.fetchToolParams);
  const resetToolParams = useToolsStore((state) => state.resetToolParams);
  const checkMissingInputs = useCheckMissingInputs();

  useEffect(() => {
    const fetchParams = async () => {
      if (script) await fetchToolParams(script);
      else resetToolParams();

      // Reset form fields to ensure they are in sync with the fetched parameters
      form.resetFields();

      // Check for missing inputs after fetching parameters
      const params = await getFormValues(
        form,
        parameters,
        categoricalParameters,
      );
      if (params) checkMissingInputs(script, params);
    };

    fetchParams();
  }, [script, form]);
};

export default useToolParams;
