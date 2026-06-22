import { app } from 'electron';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import { chmodSync, existsSync } from 'fs';
import { chmod } from 'fs/promises';

import { downloadFile } from '../download.mjs';
import { MicromambaError } from './errors.mjs';

// Pinned micromamba release tag. Bump here to upgrade.
// micromamba-releases tags include a build suffix (e.g. "-0"); the binary's
// own --version output is the leading semver portion.
const MICROMAMBA_RELEASE = '2.0.7-0';
const MICROMAMBA_VERSION = MICROMAMBA_RELEASE.split('-')[0];

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

// Runs `<binPath> --version` and returns the trimmed version string.
// Throws MicromambaError if the binary cannot be executed.
const probeMicromambaVersion = (binPath) => {
  try {
    return execSync(`"${binPath}" --version`).toString().trim();
  } catch (error) {
    console.error(error);
    throw new MicromambaError('Unable to run micromamba.');
  }
};

const setExecutableBit = (binPath) => {
  if (process.platform === 'win32') return;
  try {
    chmodSync(binPath, 0o755);
  } catch (error) {
    console.error('Could not set micromamba executable bit:', error);
  }
};

export const ensureMicromamba = async (onProgress = () => {}) => {
  const target = getMicromambaTargetPath();
  if (target == null) {
    throw new MicromambaError(
      `Unsupported platform for micromamba: ${process.platform}`,
    );
  }

  // If a binary is already in place, verify it's runnable and the right version.
  // Otherwise fall through to (re)download.
  if (existsSync(target)) {
    setExecutableBit(target);
    try {
      const version = probeMicromambaVersion(target);
      if (version === MICROMAMBA_VERSION) return target;
      onProgress(
        `Found micromamba ${version} (expected ${MICROMAMBA_VERSION}); re-downloading...`,
      );
    } catch {
      onProgress('Existing micromamba is not runnable; re-downloading...');
    }
  }

  const asset = MICROMAMBA_DOWNLOAD?.[process.platform]?.[os.arch()];
  if (!asset) {
    throw new MicromambaError(
      `No micromamba release available for ${process.platform}/${os.arch()}`,
    );
  }

  const url = `https://github.com/mamba-org/micromamba-releases/releases/download/${MICROMAMBA_RELEASE}/${asset}`;
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

  // Sanity check the downloaded binary
  const version = probeMicromambaVersion(target);
  if (version !== MICROMAMBA_VERSION) {
    throw new MicromambaError(
      `Downloaded micromamba reports version ${version}, expected ${MICROMAMBA_VERSION}.`,
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

  setExecutableBit(_path);

  if (check) probeMicromambaVersion(_path);

  return _path;
};
