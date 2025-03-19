import path from 'path-browserify';
import { apiClient } from '../api/axios';

export class FileNotFoundError extends Error {
  constructor(message, options) {
    // Need to pass `options` as the second parameter to install the "cause" property.
    super(message, options);
  }
}

export class InvalidContentType extends Error {
  constructor(message, options) {
    // Need to pass `options` as the second parameter to install the "cause" property.
    super(message, options);
  }
}

export const getContentInfo = async (
  content_path = '',
  content_type = 'directory',
) => {
  try {
    const { data } = await apiClient.get('/api/contents', {
      params: { content_type, content_path },
    });
    return data;
  } catch (error) {
    const message = error?.response?.data?.detail ?? 'Unknown error';
    if (error.response.status == 404) throw new FileNotFoundError(message);
    if (error.response.status == 400) throw new InvalidContentType(message);
    else throw error;
  }
};

export const checkExist = async (content_path, content_type) => {
  await getContentInfo(content_path, content_type);
  return true;
};

const isWin = (fullPath) => {
  const { base } = path.parse(fullPath);
  return base == fullPath;
};

export const dirname = (fullPath) => {
  if (isWin(fullPath))
    return path.dirname(fullPath.replace(/\\/g, '/')).replace(/\//g, '\\');
  else return path.dirname(fullPath);
};

export const joinPath = (dir, suffix) => {
  return path.join(dir, suffix);
};

export const basename = (fullPath) => {
  if (isWin(fullPath))
    return path.basename(fullPath.replace(/\\/g, '/')).replace(/\//g, '\\');
  else return path.basename(fullPath);
};

export const sanitizePath = (baseDir, userInput, levelDepth = null) => {
  // Resolve the absolute path
  const resolvedPath = path.resolve(baseDir, userInput);

  // Check if the resolved path starts with the base directory
  if (!resolvedPath.startsWith(baseDir)) {
    // If the path is outside the base directory, handle it appropriately
    throw new Error('Invalid path: Outside of base directory');
  }

  if (levelDepth !== null) {
    // Remove the base directory part and split the remaining path
    const relativePath = path.relative(baseDir, resolvedPath);
    const pathSegments = relativePath.split(path.sep);

    // Check if the path is within the specified level depth
    if (pathSegments.length > levelDepth) {
      throw new Error('Invalid path: Too many levels down');
    }
  }
};
