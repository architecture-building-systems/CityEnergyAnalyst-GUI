import { apiClient } from 'lib/api/axios';

const encodePathwayName = (pathwayName) => encodeURIComponent(pathwayName);

export const fetchPathways = async () => {
  const { data } = await apiClient.get('/api/pathways/');
  return data?.pathways ?? [];
};

export const fetchPathwayOverview = async () => {
  const { data } = await apiClient.get('/api/pathways/overview');
  return data;
};

export const createPathway = async (pathwayName) => {
  const { data } = await apiClient.post('/api/pathways/', {
    pathway_name: pathwayName,
  });
  return data;
};

export const fetchPathwayTimeline = async (pathwayName) => {
  const { data } = await apiClient.get(
    `/api/pathways/${encodePathwayName(pathwayName)}/timeline`,
  );
  return data;
};

export const addPathwayYear = async (pathwayName, year) => {
  const { data } = await apiClient.post(
    `/api/pathways/${encodePathwayName(pathwayName)}/years/${year}`,
  );
  return data;
};

export const deletePathwayYear = async (pathwayName, year) => {
  const { data } = await apiClient.delete(
    `/api/pathways/${encodePathwayName(pathwayName)}/years/${year}`,
  );
  return data;
};

export const validatePathwayLog = async (pathwayName) => {
  const { data } = await apiClient.post(
    `/api/pathways/${encodePathwayName(pathwayName)}/validate-log`,
  );
  return data;
};

export const fetchYearEditorOptions = async (pathwayName, year) => {
  const { data } = await apiClient.get(
    `/api/pathways/${encodePathwayName(pathwayName)}/years/${year}/editor-options`,
  );
  return data;
};

export const saveBuildingEvents = async (
  pathwayName,
  year,
  newBuildings,
  demolishedBuildings,
) => {
  const { data } = await apiClient.post(
    `/api/pathways/${encodePathwayName(pathwayName)}/years/${year}/building-events`,
    {
      new_buildings: newBuildings,
      demolished_buildings: demolishedBuildings,
    },
  );
  return data;
};

export const applyTemplatesToYear = async (
  pathwayName,
  year,
  templateNames,
) => {
  const { data } = await apiClient.post(
    `/api/pathways/${encodePathwayName(pathwayName)}/years/${year}/apply-templates`,
    {
      template_names: templateNames,
    },
  );
  return data;
};

export const saveYearYaml = async (pathwayName, year, rawYaml) => {
  const { data } = await apiClient.put(
    `/api/pathways/${encodePathwayName(pathwayName)}/years/${year}/yaml`,
    {
      raw_yaml: rawYaml,
    },
  );
  return data;
};

export const fetchInterventionTemplates = async () => {
  const { data } = await apiClient.get('/api/pathways/templates');
  return {
    names: data?.templates ?? [],
    descriptions: data?.descriptions ?? {},
  };
};

export const deleteInterventionTemplate = async (templateName) => {
  const { data } = await apiClient.delete(
    `/api/pathways/templates/${encodeURIComponent(templateName)}`,
  );
  return data;
};

export const fetchInterventionTemplate = async (templateName) => {
  const { data } = await apiClient.get(
    `/api/pathways/templates/${encodeURIComponent(templateName)}`,
  );
  return data;
};

export const fetchTemplateUsage = async (templateName) => {
  const { data } = await apiClient.get(
    `/api/pathways/templates/${encodeURIComponent(templateName)}/usage`,
  );
  return data?.usage ?? [];
};

export const preSaveDefineTemplateConfig = async (configPayload) => {
  await apiClient.post(
    '/api/tools/pathway-intervention-templates-define/save-config',
    configPayload,
  );
};

export const preSaveSimulatePathwayConfig = async (pathwayName) => {
  await apiClient.post('/api/tools/pathway-simulations/save-config', {
    'existing-pathway-name': pathwayName,
  });
};

export const preSaveBuildingEventsConfig = async (pathwayNames, year) => {
  await apiClient.post(
    '/api/tools/pathway-update-building-events/save-config',
    {
      'existing-pathway-names': pathwayNames.join(', '),
      'year-of-state': year,
      'buildings-to-construct': '',
      'buildings-to-demolish': '',
    },
  );
};

export const fetchStateGeojson = async (pathwayName, year) => {
  const { data } = await apiClient.get(
    `/api/pathways/${encodePathwayName(pathwayName)}/years/${year}/geojson`,
  );
  return data;
};

export const fetchBuildingLifecycle = async (buildingName, pathwayNames) => {
  const params = pathwayNames?.length
    ? `?pathways=${pathwayNames.map(encodePathwayName).join(',')}`
    : '';
  const { data } = await apiClient.get(
    `/api/pathways/building-lifecycle/${encodeURIComponent(buildingName)}${params}`,
  );
  return data;
};

export const fetchStateFolderPath = async (pathwayName, year, project, scenarioName) => {
  const { data } = await apiClient.get('/api/project/state-folder', {
    params: {
      pathway_name: pathwayName,
      year,
      ...(project != null && scenarioName != null
        ? { project, scenario_name: scenarioName }
        : {}),
    },
  });
  return data;
};

export const validateStateYear = async (pathwayName, year) => {
  const { data } = await apiClient.post(
    `/api/pathways/${encodePathwayName(pathwayName)}/years/${year}/validate-state`,
  );
  return data;
};
