import { finished } from 'stream/promises';
import { Readable } from 'stream';
import { createWriteStream, existsSync } from 'fs';
import { dirname } from 'path';
import { mkdir } from 'fs/promises';

export const downloadFile = async (url, dest) => {
  // Ensure directory exists
  const dir = dirname(dest);
  if (!existsSync(dir)) await mkdir(dir);

  // Overwrite file if exists
  const stream = createWriteStream(dest, { flags: 'w' });

  try {
    const { body, status } = await fetch(url);
    if (status >= 400) throw new Error(`Unable to download file at ${url}`);

    await finished(Readable.fromWeb(body).pipe(stream));
  } catch (error) {
    console.error(error);
    stream.close();
    throw error;
  }
};
