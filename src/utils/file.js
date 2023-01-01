import axios from 'axios';
import path from 'path-browserify';

class FileNotFoundError extends Error {
  constructor(message, options) {
    // Need to pass `options` as the second parameter to install the "cause" property.
    super(message, options);
  }
}

export const getContentInfo = async (
  content_path = '',
  content_type = 'directory',
  root_path = null
) => {
  try {
    const url = `${import.meta.env.VITE_CEA_URL}/api/contents/${content_path}`;
    const { data } = await axios.get(url, {
      params: { type: content_type, ...(root_path && { root: root_path }) },
    });
    return data;
  } catch (error) {
    if (error.response.status == 404) throw new FileNotFoundError();
    else throw error;
  }
};

export const checkExist = async (
  content_path,
  content_type,
  root_path = null
) => {
  try {
    await getContentInfo(content_path, content_type, root_path);
    return true;
  } catch (error) {
    if (error instanceof FileNotFoundError) return false;
    else throw error;
  }
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
