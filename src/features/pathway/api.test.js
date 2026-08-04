import { apiClient, getScenarioClient } from 'lib/api/axios';

import * as pathwayApi from './api';

// Table-driven regression net for the mechanical /api-prefix strip: every
// exported function here just builds a URL and delegates to one of two
// clients. A future edit that reintroduces a stray '/api' segment, or drops
// one, fails here instead of at runtime.
vi.mock('lib/api/axios', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
  getScenarioClient: vi.fn(),
}));

vi.mock('lib/api/scenarioContext', () => ({
  activeScenarioHeaders: vi.fn(() => ({ 'X-CEA-Scenario-Name': 'baseline' })),
  scenarioHeaders: vi.fn(() => ({ 'X-CEA-Project': 'my-project' })),
}));

const scenarioClient = { get: vi.fn() };

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
  it('fetchPathways -> GET /pathways/', async () => {
    await pathwayApi.fetchPathways();
    expect(scenarioClient.get).toHaveBeenCalledWith(
      '/pathways/',
      expect.any(Object),
    );
  });

  it('fetchPathwayOverview -> GET /pathways/overview', async () => {
    await pathwayApi.fetchPathwayOverview();
    expect(scenarioClient.get).toHaveBeenCalledWith(
      '/pathways/overview',
      expect.any(Object),
    );
  });

  it('fetchPathwayTimeline -> GET /pathways/{name}/timeline', async () => {
    await pathwayApi.fetchPathwayTimeline('demo');
    expect(scenarioClient.get).toHaveBeenCalledWith(
      '/pathways/demo/timeline',
      expect.any(Object),
    );
  });

  it('fetchYearEditorOptions -> GET /pathways/{name}/years/{year}/editor-options', async () => {
    await pathwayApi.fetchYearEditorOptions('demo', 2030);
    expect(scenarioClient.get).toHaveBeenCalledWith(
      '/pathways/demo/years/2030/editor-options',
      expect.any(Object),
    );
  });

  it('fetchInterventionTemplates -> GET /pathways/templates', async () => {
    await pathwayApi.fetchInterventionTemplates();
    expect(scenarioClient.get).toHaveBeenCalledWith(
      '/pathways/templates',
      expect.any(Object),
    );
  });

  it('fetchInterventionTemplate -> GET /pathways/templates/{name}', async () => {
    await pathwayApi.fetchInterventionTemplate('my-template');
    expect(scenarioClient.get).toHaveBeenCalledWith(
      '/pathways/templates/my-template',
      expect.any(Object),
    );
  });

  it('fetchTemplateUsage -> GET /pathways/templates/{name}/usage', async () => {
    await pathwayApi.fetchTemplateUsage('my-template');
    expect(scenarioClient.get).toHaveBeenCalledWith(
      '/pathways/templates/my-template/usage',
      expect.any(Object),
    );
  });

  it('fetchStateGeojson -> GET /pathways/{name}/years/{year}/geojson', async () => {
    await pathwayApi.fetchStateGeojson('demo', 2030);
    expect(scenarioClient.get).toHaveBeenCalledWith(
      '/pathways/demo/years/2030/geojson',
      expect.any(Object),
    );
  });

  it('fetchBuildingLifecycle -> GET /pathways/building-lifecycle/{building}', async () => {
    await pathwayApi.fetchBuildingLifecycle('B1', ['demo']);
    expect(scenarioClient.get).toHaveBeenCalledWith(
      '/pathways/building-lifecycle/B1',
      expect.objectContaining({ params: { pathways: 'demo' } }),
    );
  });

  it('fetchStateFolderPath -> GET /project/state-folder', async () => {
    await pathwayApi.fetchStateFolderPath('demo', 2030, 'proj', 'baseline');
    expect(scenarioClient.get).toHaveBeenCalledWith(
      '/project/state-folder',
      expect.objectContaining({
        params: { pathway_name: 'demo', year: 2030 },
      }),
    );
  });
});

describe('writes via apiClient (always the real backend, never demo)', () => {
  it('createPathway -> POST /pathways/', async () => {
    await pathwayApi.createPathway('demo');
    expect(apiClient.post).toHaveBeenCalledWith(
      '/pathways/',
      { pathway_name: 'demo' },
      expect.any(Object),
    );
  });

  it('addPathwayYear -> POST /pathways/{name}/years/{year}', async () => {
    await pathwayApi.addPathwayYear('demo', 2030);
    expect(apiClient.post).toHaveBeenCalledWith(
      '/pathways/demo/years/2030',
      undefined,
      expect.any(Object),
    );
  });

  it('deletePathwayYear -> DELETE /pathways/{name}/years/{year}', async () => {
    await pathwayApi.deletePathwayYear('demo', 2030);
    expect(apiClient.delete).toHaveBeenCalledWith(
      '/pathways/demo/years/2030',
      expect.any(Object),
    );
  });

  it('validatePathwayLog -> POST /pathways/{name}/validate-log', async () => {
    await pathwayApi.validatePathwayLog('demo');
    expect(apiClient.post).toHaveBeenCalledWith(
      '/pathways/demo/validate-log',
      undefined,
      expect.any(Object),
    );
  });

  it('saveBuildingEvents -> POST /pathways/{name}/years/{year}/building-events', async () => {
    await pathwayApi.saveBuildingEvents('demo', 2030, ['B1'], ['B2']);
    expect(apiClient.post).toHaveBeenCalledWith(
      '/pathways/demo/years/2030/building-events',
      { new_buildings: ['B1'], demolished_buildings: ['B2'] },
      expect.any(Object),
    );
  });

  it('applyTemplatesToYear -> POST /pathways/{name}/years/{year}/apply-templates', async () => {
    await pathwayApi.applyTemplatesToYear('demo', 2030, ['t1']);
    expect(apiClient.post).toHaveBeenCalledWith(
      '/pathways/demo/years/2030/apply-templates',
      { template_names: ['t1'] },
      expect.any(Object),
    );
  });

  it('saveYearYaml -> PUT /pathways/{name}/years/{year}/yaml', async () => {
    await pathwayApi.saveYearYaml('demo', 2030, 'raw: yaml');
    expect(apiClient.put).toHaveBeenCalledWith(
      '/pathways/demo/years/2030/yaml',
      { raw_yaml: 'raw: yaml' },
      expect.any(Object),
    );
  });

  it('deleteInterventionTemplate -> DELETE /pathways/templates/{name}', async () => {
    await pathwayApi.deleteInterventionTemplate('my-template');
    expect(apiClient.delete).toHaveBeenCalledWith(
      '/pathways/templates/my-template',
      expect.any(Object),
    );
  });

  it('preSaveDefineTemplateConfig -> POST /tools/pathway-intervention-templates-define/save-config', async () => {
    await pathwayApi.preSaveDefineTemplateConfig({ a: 1 });
    expect(apiClient.post).toHaveBeenCalledWith(
      '/tools/pathway-intervention-templates-define/save-config',
      { a: 1 },
      expect.any(Object),
    );
  });

  it('preSaveSimulatePathwayConfig -> POST /tools/pathway-simulations/save-config', async () => {
    await pathwayApi.preSaveSimulatePathwayConfig('demo');
    expect(apiClient.post).toHaveBeenCalledWith(
      '/tools/pathway-simulations/save-config',
      { 'existing-pathway-name': 'demo' },
      expect.any(Object),
    );
  });

  it('preSaveBuildingEventsConfig -> POST /tools/pathway-update-building-events/save-config', async () => {
    await pathwayApi.preSaveBuildingEventsConfig(['demo'], 2030);
    expect(apiClient.post).toHaveBeenCalledWith(
      '/tools/pathway-update-building-events/save-config',
      expect.objectContaining({
        'existing-pathway-names': 'demo',
        'year-of-state': 2030,
      }),
      expect.any(Object),
    );
  });

  it('validateStateYear -> POST /pathways/{name}/years/{year}/validate-state', async () => {
    await pathwayApi.validateStateYear('demo', 2030);
    expect(apiClient.post).toHaveBeenCalledWith(
      '/pathways/demo/years/2030/validate-state',
      undefined,
      expect.any(Object),
    );
  });
});

describe('encodePathwayName / encodeURIComponent at call sites', () => {
  it('encodes slashes and spaces in a pathway name before building the URL', async () => {
    await pathwayApi.fetchPathwayTimeline('has space/slash');
    expect(scenarioClient.get).toHaveBeenCalledWith(
      '/pathways/has%20space%2Fslash/timeline',
      expect.any(Object),
    );
  });

  it('encodes special characters in a template name', async () => {
    await pathwayApi.fetchInterventionTemplate('a/b c');
    expect(scenarioClient.get).toHaveBeenCalledWith(
      '/pathways/templates/a%2Fb%20c',
      expect.any(Object),
    );
  });
});
