import { finished } from 'stream/promises';
import { Readable } from 'stream';
import { createWriteStream, existsSync } from 'fs';
import { dirname } from 'path';
import { mkdir } from 'fs/promises';

const fetchWithRetry = async (url, options = {}, retries = 3, delay = 1000) => {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP error. Status: ${response.status}`);
    }
    return response;
  } catch (error) {
    if (retries > 0) {
      console.debug(`Retrying... (${retries} retries left)`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retries - 1, delay);
    } else {
      throw new Error(`Failed to fetch ${url}: ${error.message}`);
    }
  }
};

export const downloadFile = async (url, dest) => {
  // Ensure directory exists
  const dir = dirname(dest);
  if (!existsSync(dir)) await mkdir(dir);

  // Overwrite file if exists
  const stream = createWriteStream(dest, { flags: 'w' });

  try {
    const { body } = await fetchWithRetry(url);
    await finished(Readable.fromWeb(body).pipe(stream));
  } catch (error) {
    stream.close();
    throw error;
  }
};
