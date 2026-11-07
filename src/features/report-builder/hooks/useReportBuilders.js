import { useQuery } from '@tanstack/react-query';
import { apiClient } from 'lib/api/axios';

export const REPORT_BUILDERS_QUERY_KEY = ['reportBuilders'];

const fetchReportBuilders = async () => {
  const response = await apiClient.get('/reports/builders');
  return response.data.builders;
};

// Report tools (CEA's and plugins') - the scripts whose scripts.yml entry declares the HTML report they write.
export const useReportBuilders = ({ enabled = true } = {}) =>
  useQuery({
    queryKey: REPORT_BUILDERS_QUERY_KEY,
    queryFn: fetchReportBuilders,
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

export default useReportBuilders;
