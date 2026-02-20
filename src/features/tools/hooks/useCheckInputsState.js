import { useMutationState } from '@tanstack/react-query';

export function useCheckInputsState(tool) {
  const mutationStates = useMutationState({
    filters: { mutationKey: ['checkInputs'] },
    select: (mutation) => ({
      status: mutation.state?.status,
      tool: mutation.state?.variables?.tool,
    }),
  });

  const isChecking = mutationStates.some(
    (m) => m.status === 'pending' && m.tool === tool,
  );

  return { isChecking };
}

export function useResetInputError() {
  const queryClient = useQueryClient();

  const resetInputError = (script) => {
    queryClient.setQueryData([TOOLS_QUERY_KEYS.TOOL_PARAMS, script], (old) =>
      old ? { ...old, inputError: undefined } : old,
    );
  };

  return { resetInputError };
}
