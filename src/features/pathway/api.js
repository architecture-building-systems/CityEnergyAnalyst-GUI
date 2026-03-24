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

export const applyTemplatesToYear = async (pathwayName, year, templateNames) => {
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

export const validateStateYear = async (pathwayName, year) => {
  const { data } = await apiClient.post(
    `/api/pathways/${encodePathwayName(pathwayName)}/years/${year}/validate-state`,
  );
  return data;
};
