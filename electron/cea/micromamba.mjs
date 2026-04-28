import { app } from 'electron';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import { chmodSync, existsSync } from 'fs';
import { chmod } from 'fs/promises';

import { downloadFile } from '../download.mjs';
import { MicromambaError } from './errors.mjs';

// Pinned micromamba version. Bump here to upgrade.
const MICROMAMBA_VERSION = '2.0.7-0';

// micromamba-releases asset names per platform/arch
const MICROMAMBA_DOWNLOAD = {
  darwin: { x64: 'micromamba-osx-64', arm64: 'micromamba-osx-arm64' },
  win32: { x64: 'micromamba-win-64.exe' },
};

const getMicromambaDir = () => path.join(app.getPath('userData'), 'micromamba');
const getMicromambaBinaryName = () =>
  process.platform === 'win32' ? 'micromamba.exe' : 'micromamba';

const getMicromambaTargetPath = () => {
  if (!MICROMAMBA_DOWNLOAD?.[process.platform]) return null;
  return path.join(getMicromambaDir(), getMicromambaBinaryName());
};

export const ensureMicromamba = async (onProgress = () => { }) => {
  const target = getMicromambaTargetPath();
  if (target == null) {
    throw new MicromambaError(
      `Unsupported platform for micromamba: ${process.platform}`,
    );
  }

  if (existsSync(target)) return target;

  const asset = MICROMAMBA_DOWNLOAD?.[process.platform]?.[os.arch()];
  if (!asset) {
    throw new MicromambaError(
      `No micromamba release available for ${process.platform}/${os.arch()}`,
    );
  }

  const url = `https://github.com/mamba-org/micromamba-releases/releases/download/${MICROMAMBA_VERSION}/${asset}`;
  onProgress(`Downloading micromamba ${MICROMAMBA_VERSION}...`);

  try {
    await downloadFile(url, target);
    if (process.platform !== 'win32') {
      await chmod(target, 0o755);
    }
  } catch (error) {
    console.error(error);
    throw new MicromambaError(
      `Failed to download micromamba from ${url}: ${error.message}`,
    );
  }

  return target;
};

export const getMicromambaPath = (check = false) => {
  const _path = getMicromambaTargetPath();

  if (_path == null || !existsSync(_path)) {
    console.debug({ micromambaPath: _path });
    throw new MicromambaError('Unable to find path to micromamba.');
  }

  // Ensure executable bit is set
  if (process.platform !== 'win32') {
    try {
      chmodSync(_path, 0o755);
    } catch (error) {
      console.error('Could not set micromamba executable bit:', error);
    }
  }

  // Try running micromamba
  if (check) {
    try {
      execSync(`"${_path}" --version`);
    } catch (error) {
      console.error(error);
      throw new MicromambaError('Unable to run micromamba.');
    }
  }

  return _path;
};
