import { apiClient, getScenarioClient } from 'lib/api/axios';
import {
  activeScenarioHeaders,
  scenarioHeaders,
} from 'lib/api/scenarioContext';

const encodePathwayName = (pathwayName) => encodeURIComponent(pathwayName);

export const fetchPathways = async () => {
  const { data } = await getScenarioClient().get('/api/pathways/', {
    headers: activeScenarioHeaders(),
  });
  return data?.pathways ?? [];
};

export const fetchPathwayOverview = async () => {
  const { data } = await getScenarioClient().get('/api/pathways/overview', {
    headers: activeScenarioHeaders(),
  });
  return data;
};

export const createPathway = async (pathwayName) => {
  const { data } = await apiClient.post(
    '/api/pathways/',
    { pathway_name: pathwayName },
    { headers: activeScenarioHeaders() },
  );
  return data;
};

export const fetchPathwayTimeline = async (pathwayName) => {
  const { data } = await getScenarioClient().get(
    `/api/pathways/${encodePathwayName(pathwayName)}/timeline`,
    { headers: activeScenarioHeaders() },
  );
  return data;
};

export const addPathwayYear = async (pathwayName, year) => {
  const { data } = await apiClient.post(
    `/api/pathways/${encodePathwayName(pathwayName)}/years/${year}`,
    undefined,
    { headers: activeScenarioHeaders() },
  );
  return data;
};

export const deletePathwayYear = async (pathwayName, year) => {
  const { data } = await apiClient.delete(
    `/api/pathways/${encodePathwayName(pathwayName)}/years/${year}`,
    { headers: activeScenarioHeaders() },
  );
  return data;
};

export const validatePathwayLog = async (pathwayName) => {
  const { data } = await apiClient.post(
    `/api/pathways/${encodePathwayName(pathwayName)}/validate-log`,
    undefined,
    { headers: activeScenarioHeaders() },
  );
  return data;
};

export const fetchYearEditorOptions = async (pathwayName, year) => {
  const { data } = await getScenarioClient().get(
    `/api/pathways/${encodePathwayName(pathwayName)}/years/${year}/editor-options`,
    { headers: activeScenarioHeaders() },
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
    { new_buildings: newBuildings, demolished_buildings: demolishedBuildings },
    { headers: activeScenarioHeaders() },
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
    { template_names: templateNames },
    { headers: activeScenarioHeaders() },
  );
  return data;
};

export const saveYearYaml = async (pathwayName, year, rawYaml) => {
  const { data } = await apiClient.put(
    `/api/pathways/${encodePathwayName(pathwayName)}/years/${year}/yaml`,
    { raw_yaml: rawYaml },
    { headers: activeScenarioHeaders() },
  );
  return data;
};

export const fetchInterventionTemplates = async () => {
  const { data } = await getScenarioClient().get('/api/pathways/templates', {
    headers: activeScenarioHeaders(),
  });
  return {
    names: data?.templates ?? [],
    descriptions: data?.descriptions ?? {},
  };
};

export const deleteInterventionTemplate = async (templateName) => {
  const { data } = await apiClient.delete(
    `/api/pathways/templates/${encodeURIComponent(templateName)}`,
    { headers: activeScenarioHeaders() },
  );
  return data;
};

export const fetchInterventionTemplate = async (templateName) => {
  const { data } = await getScenarioClient().get(
    `/api/pathways/templates/${encodeURIComponent(templateName)}`,
    { headers: activeScenarioHeaders() },
  );
  return data;
};

export const fetchTemplateUsage = async (templateName) => {
  const { data } = await getScenarioClient().get(
    `/api/pathways/templates/${encodeURIComponent(templateName)}/usage`,
    { headers: activeScenarioHeaders() },
  );
  return data?.usage ?? [];
};

export const preSaveDefineTemplateConfig = async (configPayload) => {
  await apiClient.post(
    '/api/tools/pathway-intervention-templates-define/save-config',
    configPayload,
    { headers: activeScenarioHeaders() },
  );
};

export const preSaveSimulatePathwayConfig = async (pathwayName) => {
  await apiClient.post(
    '/api/tools/pathway-simulations/save-config',
    { 'existing-pathway-name': pathwayName },
    { headers: activeScenarioHeaders() },
  );
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
    { headers: activeScenarioHeaders() },
  );
};

export const fetchStateGeojson = async (pathwayName, year) => {
  const { data } = await getScenarioClient().get(
    `/api/pathways/${encodePathwayName(pathwayName)}/years/${year}/geojson`,
    { headers: activeScenarioHeaders() },
  );
  return data;
};

export const fetchBuildingLifecycle = async (buildingName, pathwayNames) => {
  const pathwayParams = pathwayNames?.length
    ? { pathways: pathwayNames.join(',') }
    : {};
  const { data } = await getScenarioClient().get(
    `/api/pathways/building-lifecycle/${encodeURIComponent(buildingName)}`,
    { params: pathwayParams, headers: activeScenarioHeaders() },
  );
  return data;
};

export const fetchStateFolderPath = async (
  pathwayName,
  year,
  project,
  scenarioName,
) => {
  const { data } = await getScenarioClient().get('/api/project/state-folder', {
    headers: scenarioHeaders({ project, scenarioName }),
    params: { pathway_name: pathwayName, year },
  });
  return data;
};

export const validateStateYear = async (pathwayName, year) => {
  const { data } = await apiClient.post(
    `/api/pathways/${encodePathwayName(pathwayName)}/years/${year}/validate-state`,
    undefined,
    { headers: activeScenarioHeaders() },
  );
  return data;
};
