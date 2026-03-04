import { useQuery } from '@tanstack/react-query';
import { apiClient } from 'lib/api/axios';

export const TOOL_LIST_QUERY_KEY = ['toolList'];

const fetchToolList = async () => {
  const response = await apiClient.get('/api/tools/');
  return response.data;
};

export const useToolList = () => {
  return useQuery({
    queryKey: TOOL_LIST_QUERY_KEY,
    queryFn: fetchToolList,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};

export default useToolList;
