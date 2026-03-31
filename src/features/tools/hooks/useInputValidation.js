import { useEffect, useState } from 'react';
import { useCheckInputsMutation } from './mutations';
import { getFormValues } from '../utils';

/**
 * Validates tool inputs and manages validation errors.
 * Triggers validation whenever parameters or form data changes.
 */
const useInputValidation = (
    script,
    parameters,
    categoricalParameters,
    form,
    onError,
    dataUpdatedAt
) => {
    const [inputError, setInputError] = useState(undefined);
    const { mutateAsync: checkInputs } = useCheckInputsMutation();

    useEffect(() => {
        if (!script || !parameters || !form) return;

        let isMounted = true;

        const validateInputs = async () => {
            setInputError(undefined);

            try {
                const formParams = await getFormValues(
                    form,
                    parameters,
                    categoricalParameters,
                    onError
                );

                if (!isMounted) return;

                if (formParams) {
                    await checkInputs({ tool: script, parameters: formParams });
                    if (isMounted) {
                        setInputError(null);
                    }
                }
            } catch (err) {
                if (isMounted) {
                    const message =
                        err.response?.data?.detail ||
                        err.response?.statusText ||
                        err.message ||
                        'Unexpected error validating inputs';
                    setInputError(message);
                }
            }
        };

        validateInputs();

        return () => {
            isMounted = false;
        };
    }, [
        script,
        parameters,
        categoricalParameters,
        dataUpdatedAt,
        checkInputs,
        form,
        onError,
    ]);

    return inputError;
};

export default useInputValidation;
