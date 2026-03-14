import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchProjectChoices } from 'features/project/stores/projectStore';

export const PROJECT_CHOICES_QUERY_KEY = 'projectChoices';

export const useProjectChoicesQuery = () => {
  return useQuery({
    queryKey: [PROJECT_CHOICES_QUERY_KEY],
    queryFn: fetchProjectChoices,
    refetchOnWindowFocus: false,
  });
};

export const useInvalidateProjectChoices = () => {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: [PROJECT_CHOICES_QUERY_KEY] });
};
