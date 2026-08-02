import { apiClient, getScenarioClient } from 'lib/api/axios';

import * as canvasApi from './canvas';

// Table-driven regression net for the mechanical /api-prefix strip - also
// covers `const BASE = '/canvas'` (canvas.js:19) as a single point of truth:
// if BASE regresses to '/api/canvas', every test in this file fails together.
vi.mock('lib/api/axios', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
  getScenarioClient: vi.fn(),
}));

vi.mock('lib/api/scenarioContext', () => ({
  scenarioHeaders: vi.fn(() => ({ 'X-CEA-Scenario-Name': 'baseline' })),
}));

const scenarioClient = { get: vi.fn() };
const ctx = { project: 'my-project', scenario: 'baseline' };

beforeEach(() => {
  vi.clearAllMocks();
  getScenarioClient.mockReturnValue(scenarioClient);
  apiClient.get.mockResolvedValue({ data: {} });
  apiClient.post.mockResolvedValue({ data: {} });
  apiClient.put.mockResolvedValue({ data: {} });
  apiClient.delete.mockResolvedValue({ data: {} });
  scenarioClient.get.mockResolvedValue({ data: {} });
});

describe('reads via getScenarioClient (demo-mode-aware)', () => {
  it('listSavedCanvases -> GET /canvas/', async () => {
    await canvasApi.listSavedCanvases(ctx);
    expect(scenarioClient.get).toHaveBeenCalledWith(
      '/canvas/',
      expect.any(Object),
    );
  });

  it('readSavedCanvas -> GET /canvas/{name}', async () => {
    await canvasApi.readSavedCanvas({ ...ctx, name: 'my-canvas' });
    expect(scenarioClient.get).toHaveBeenCalledWith(
      '/canvas/my-canvas',
      expect.any(Object),
    );
  });
});

describe('writes via apiClient (demo mode has no write routes)', () => {
  it('createCanvas -> POST /canvas/', async () => {
    await canvasApi.createCanvas({ ...ctx, name: 'my-canvas' });
    expect(apiClient.post).toHaveBeenCalledWith(
      '/canvas/',
      { name: 'my-canvas' },
      expect.any(Object),
    );
  });

  it('updateSavedCanvas -> PUT /canvas/{name}', async () => {
    const payload = { layout: {} };
    await canvasApi.updateSavedCanvas({ ...ctx, name: 'my-canvas', payload });
    expect(apiClient.put).toHaveBeenCalledWith(
      '/canvas/my-canvas',
      payload,
      expect.any(Object),
    );
  });

  it('deleteSavedCanvas -> DELETE /canvas/{name}', async () => {
    await canvasApi.deleteSavedCanvas({ ...ctx, name: 'my-canvas' });
    expect(apiClient.delete).toHaveBeenCalledWith(
      '/canvas/my-canvas',
      expect.any(Object),
    );
  });

  it('duplicateCanvas -> POST /canvas/{name}/duplicate', async () => {
    await canvasApi.duplicateCanvas({ ...ctx, name: 'my-canvas', as: 'copy' });
    expect(apiClient.post).toHaveBeenCalledWith(
      '/canvas/my-canvas/duplicate',
      { name: 'copy' },
      expect.any(Object),
    );
  });
});

describe('zip export / import', () => {
  it('exportCanvasZip -> GET /canvas/{name}/export as a blob', async () => {
    await canvasApi.exportCanvasZip({ ...ctx, name: 'my-canvas' });
    expect(apiClient.get).toHaveBeenCalledWith(
      '/canvas/my-canvas/export',
      expect.objectContaining({ responseType: 'blob' }),
    );
  });

  it('importCanvasZip -> POST /canvas/import as multipart form data', async () => {
    const file = new File(['content'], 'canvas.zip');
    await canvasApi.importCanvasZip({ ...ctx, file, as: 'renamed' });
    expect(apiClient.post).toHaveBeenCalledWith(
      '/canvas/import',
      expect.any(FormData),
      expect.objectContaining({
        params: { as: 'renamed' },
        headers: expect.objectContaining({
          'Content-Type': 'multipart/form-data',
        }),
      }),
    );
  });
});

describe('name encoding at call sites', () => {
  it('encodes special characters in the canvas name', async () => {
    await canvasApi.readSavedCanvas({ ...ctx, name: 'a/b c' });
    expect(scenarioClient.get).toHaveBeenCalledWith(
      '/canvas/a%2Fb%20c',
      expect.any(Object),
    );
  });
});
