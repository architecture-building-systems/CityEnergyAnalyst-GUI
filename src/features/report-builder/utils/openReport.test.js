import { apiClient } from 'lib/api/axios';
import { isReportJob } from 'features/report-builder/components/OpenReportButton';

import { openReport } from './openReport';

// vi.mock calls are hoisted above these imports by Vitest, so the bindings
// above already resolve to the mocked implementations.
vi.mock('lib/api/axios', async () => {
  const actual = await vi.importActual('lib/api/axios');
  return {
    ...actual,
    apiClient: { get: vi.fn() },
  };
});

const context = {
  project: '/projects/zrh',
  scenarioName: 'baseline',
  childScenario: null,
};

describe('openReport', () => {
  let reportWindow;

  beforeEach(() => {
    reportWindow = {
      document: { title: '', body: { textContent: '' } },
      location: { href: '' },
      close: vi.fn(),
    };
    vi.spyOn(window, 'open').mockReturnValue(reportWindow);
    URL.createObjectURL = vi.fn(() => 'blob:report');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches the report with scenario headers and shows it in the new tab', async () => {
    apiClient.get.mockResolvedValue({ data: new Blob(['<html></html>']) });

    await openReport('upv-design-helper', context);

    expect(window.open).toHaveBeenCalledWith('', '_blank');
    expect(apiClient.get).toHaveBeenCalledWith(
      '/reports/builders/upv-design-helper/html',
      {
        headers: {
          'X-CEA-Project': '/projects/zrh',
          'X-CEA-Scenario-Name': 'baseline',
        },
        responseType: 'blob',
      },
    );
    expect(reportWindow.location.href).toBe('blob:report');
  });

  it("closes the tab and surfaces the server's detail when the report is missing", async () => {
    apiClient.get.mockRejectedValue({
      message: 'Request failed with status code 404',
      response: {
        data: new Blob([
          JSON.stringify({ detail: "Report not found. Run 'UPV' first." }),
        ]),
      },
    });

    await expect(openReport('upv-design-helper', context)).rejects.toThrow(
      "Report not found. Run 'UPV' first.",
    );
    expect(reportWindow.close).toHaveBeenCalled();
  });
});

describe('isReportJob', () => {
  const builders = [{ name: 'upv-design-helper', label: 'UPV' }];

  it('matches jobs of report tools only', () => {
    expect(isReportJob(builders, { script: 'upv-design-helper' })).toBe(true);
    expect(isReportJob(builders, { script: 'demand' })).toBe(false);
    expect(isReportJob(undefined, { script: 'upv-design-helper' })).toBe(false);
  });
});
