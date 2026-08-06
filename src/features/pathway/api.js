import { apiClient, getScenarioClient } from 'lib/api/axios';
import {
  activeScenarioHeaders,
  scenarioHeaders,
} from 'lib/api/scenarioContext';

const encodePathwayName = (pathwayName) => encodeURIComponent(pathwayName);

// Mirrors jobsStore.createJob's scenarioContext pattern: pass an explicit
// { project, scenarioName, childScenario } to pin a request to the parent
// scenario regardless of which pathway child state is currently active
// (X-CEA-Child-Scenario) -- otherwise falls back to the store's active
// scenario. Used by the pathway-mutation calls below, which must always
// target the parent's outputs/pathways/... tree, never a child state.
const resolveHeaders = (scenarioContext) =>
  scenarioContext ? scenarioHeaders(scenarioContext) : activeScenarioHeaders();

export const fetchPathways = async () => {
  const { data } = await getScenarioClient().get('/pathways/', {
    headers: activeScenarioHeaders(),
  });
  return data?.pathways ?? [];
};

export const fetchPathwayOverview = async () => {
  const { data } = await getScenarioClient().get('/pathways/overview', {
    headers: activeScenarioHeaders(),
  });
  return data;
};

export const createPathway = async (pathwayName, scenarioContext) => {
  const { data } = await apiClient.post(
    '/pathways/',
    { pathway_name: pathwayName },
    { headers: resolveHeaders(scenarioContext) },
  );
  return data;
};

export const deletePathway = async (pathwayName, scenarioContext) => {
  const { data } = await apiClient.delete(
    `/pathways/${encodePathwayName(pathwayName)}`,
    { headers: resolveHeaders(scenarioContext) },
  );
  return data;
};

export const duplicatePathway = async (
  pathwayName,
  newName,
  scenarioContext,
) => {
  const { data } = await apiClient.post(
    `/pathways/${encodePathwayName(pathwayName)}/duplicate`,
    { name: newName },
    { headers: resolveHeaders(scenarioContext) },
  );
  return data;
};

export const fetchPathwayTimeline = async (pathwayName) => {
  const { data } = await getScenarioClient().get(
    `/pathways/${encodePathwayName(pathwayName)}/timeline`,
    { headers: activeScenarioHeaders() },
  );
  return data;
};

export const addPathwayYear = async (pathwayName, year) => {
  const { data } = await apiClient.post(
    `/pathways/${encodePathwayName(pathwayName)}/years/${year}`,
    undefined,
    { headers: activeScenarioHeaders() },
  );
  return data;
};

export const deletePathwayYear = async (pathwayName, year, scenarioContext) => {
  const { data } = await apiClient.delete(
    `/pathways/${encodePathwayName(pathwayName)}/years/${year}`,
    { headers: resolveHeaders(scenarioContext) },
  );
  return data;
};

export const validatePathwayLog = async (pathwayName) => {
  const { data } = await apiClient.post(
    `/pathways/${encodePathwayName(pathwayName)}/validate-log`,
    undefined,
    { headers: activeScenarioHeaders() },
  );
  return data;
};

export const fetchYearEditorOptions = async (pathwayName, year) => {
  const { data } = await getScenarioClient().get(
    `/pathways/${encodePathwayName(pathwayName)}/years/${year}/editor-options`,
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
    `/pathways/${encodePathwayName(pathwayName)}/years/${year}/building-events`,
    { new_buildings: newBuildings, demolished_buildings: demolishedBuildings },
    { headers: activeScenarioHeaders() },
  );
  return data;
};

export const applyTemplatesToYear = async (
  pathwayName,
  year,
  templateNames,
  scenarioContext,
) => {
  const { data } = await apiClient.post(
    `/pathways/${encodePathwayName(pathwayName)}/years/${year}/apply-templates`,
    { template_names: templateNames },
    { headers: resolveHeaders(scenarioContext) },
  );
  return data;
};

export const saveYearYaml = async (
  pathwayName,
  year,
  rawYaml,
  scenarioContext,
) => {
  const { data } = await apiClient.put(
    `/pathways/${encodePathwayName(pathwayName)}/years/${year}/yaml`,
    { raw_yaml: rawYaml },
    { headers: resolveHeaders(scenarioContext) },
  );
  return data;
};

export const fetchInterventionTemplates = async () => {
  const { data } = await getScenarioClient().get('/pathways/templates', {
    headers: activeScenarioHeaders(),
  });
  return {
    names: data?.templates ?? [],
    descriptions: data?.descriptions ?? {},
  };
};

export const deleteInterventionTemplate = async (templateName) => {
  const { data } = await apiClient.delete(
    `/pathways/templates/${encodeURIComponent(templateName)}`,
    { headers: activeScenarioHeaders() },
  );
  return data;
};

export const fetchInterventionTemplate = async (templateName) => {
  const { data } = await getScenarioClient().get(
    `/pathways/templates/${encodeURIComponent(templateName)}`,
    { headers: activeScenarioHeaders() },
  );
  return data;
};

export const fetchTemplateUsage = async (templateName) => {
  const { data } = await getScenarioClient().get(
    `/pathways/templates/${encodeURIComponent(templateName)}/usage`,
    { headers: activeScenarioHeaders() },
  );
  return data?.usage ?? [];
};

export const preSaveDefineTemplateConfig = async (configPayload) => {
  await apiClient.post(
    '/tools/pathway-intervention-templates-define/save-config',
    configPayload,
    { headers: activeScenarioHeaders() },
  );
};

export const preSaveSimulatePathwayConfig = async (pathwayName) => {
  await apiClient.post(
    '/tools/pathway-simulations/save-config',
    { 'existing-pathway-name': pathwayName },
    { headers: activeScenarioHeaders() },
  );
};

export const preSaveBuildingEventsConfig = async (pathwayNames, year) => {
  await apiClient.post(
    '/tools/pathway-update-building-events/save-config',
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
    `/pathways/${encodePathwayName(pathwayName)}/years/${year}/geojson`,
    { headers: activeScenarioHeaders() },
  );
  return data;
};

export const fetchBuildingLifecycle = async (buildingName, pathwayNames) => {
  const pathwayParams = pathwayNames?.length
    ? { pathways: pathwayNames.join(',') }
    : {};
  const { data } = await getScenarioClient().get(
    `/pathways/building-lifecycle/${encodeURIComponent(buildingName)}`,
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
  const { data } = await getScenarioClient().get('/project/state-folder', {
    headers: scenarioHeaders({ project, scenarioName }),
    params: { pathway_name: pathwayName, year },
  });
  return data;
};

export const validateStateYear = async (pathwayName, year) => {
  const { data } = await apiClient.post(
    `/pathways/${encodePathwayName(pathwayName)}/years/${year}/validate-state`,
    undefined,
    { headers: activeScenarioHeaders() },
  );
  return data;
};
