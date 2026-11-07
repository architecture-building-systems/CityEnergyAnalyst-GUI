import { apiClient } from 'lib/api/axios';
import { scenarioHeaders } from 'lib/api/scenarioContext';

/**
 * Open the HTML report a report tool wrote for a scenario, in a new browser tab.
 *
 * The report is fetched through `apiClient` (auth + `X-CEA-*` headers) rather than
 * navigated to directly, since a plain tab navigation carries neither - then shown
 * from a blob URL. The tab is opened before the fetch, while still inside the click
 * handler, so popup blockers let it through.
 *
 * @param {string} script - Report tool's script name
 * @param {object} scenarioContext - `{ project, scenarioName, childScenario }`
 */
export const openReport = async (script, scenarioContext) => {
  const reportWindow = window.open('', '_blank');
  if (reportWindow) {
    reportWindow.document.title = 'Loading report...';
    reportWindow.document.body.textContent = 'Loading report...';
  }

  try {
    const response = await apiClient.get(
      `/reports/builders/${encodeURIComponent(script)}/html`,
      { headers: scenarioHeaders(scenarioContext), responseType: 'blob' },
    );
    const url = URL.createObjectURL(
      new Blob([response.data], { type: 'text/html' }),
    );
    if (reportWindow) reportWindow.location.href = url;
    else window.open(url, '_blank');
  } catch (error) {
    reportWindow?.close();
    // With responseType 'blob', the error body is a Blob too
    const detail = await error?.response?.data?.text?.().catch(() => null);
    let message = error?.message ?? 'Could not open the report.';
    try {
      message = JSON.parse(detail)?.detail ?? message;
    } catch {
      // Not a JSON error body - keep the generic message
    }
    throw new Error(message);
  }
};
