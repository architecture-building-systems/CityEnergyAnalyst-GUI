import { app } from 'electron';
import path from 'path';
import os from 'os';
import { exec, execSync, spawn } from 'child_process';
import { existsSync } from 'fs';
import { CEAError, MicromambaError } from './errors.mjs';
import { downloadFile } from '../download.mjs';
import { promisify } from 'util';

const execAsync = promisify(exec);

const paths = {
  darwin: {
    micromamba: path.join(process.resourcesPath, os.arch(), 'micromamba'),
    root: path.join(app.getPath('documents'), 'CityEnergyAnalyst'),
  },
  win32: {
    micromamba: path.join(
      path.dirname(process.execPath),
      '..',
      'dependencies',
      'micromamba.exe',
    ),
    root: path.join(
      path.dirname(process.execPath),
      '..',
      'dependencies',
      'micromamba',
    ),
  },
};

export const getMicromambaPath = (check = false) => {
  const _path = paths?.[process.platform]?.['micromamba'];

  if (_path == null || !existsSync(_path)) {
    console.debug({ micromambaPath: _path });
    throw new MicromambaError('Unable to find path to micromamba.');
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

export const getCEARootPath = () => {
  const _path = paths?.[process.platform]?.['root'];

  if (_path == null) {
    console.debug({ ceaPath: _path });
    throw new CEAError('Unable to determine path to CEA environment.');
  }

  return _path;
};

export const getCEAenvVersion = async () => {
  const versionCmd = 'python -c "import cea; print(cea.__version__)"';

  try {
    const { stdout } = await execAsync(
      `"${getMicromambaPath()}" -r "${getCEARootPath()}" -n cea run ${versionCmd}`,
    );
    const ceaVersion = stdout.toString().trim();
    console.debug({ ceaVersion });

    return ceaVersion;
  } catch (error) {
    console.error(error);
    throw new CEAError('Could not find CEA in the environment.');
  }
};

export const checkCEAenv = async () => {
  try {
    await execAsync(
      `"${getMicromambaPath(true)}" -r "${getCEARootPath()}" -n cea run cea --version`,
    );
  } catch (error) {
    console.error(error);
    throw new CEAError(
      'CEA environment has not been created or is not configured correctly.',
    );
  }
};

const fetchCondaLock = async (ceaVersion, condaLockPath) => {
  const condaLockUrl = `https://raw.githubusercontent.com/architecture-building-systems/CityEnergyAnalyst/${ceaVersion}/conda-lock.yml`;
  console.debug({
    message: 'Fetching conda-lock.yml',
    condaLockUrl,
    condaLockPath,
  });

  try {
    await downloadFile(condaLockUrl, condaLockPath);
  } catch (error) {
    console.error(error);
    new Error(`Unable to download file from ${condaLockUrl}`);
  }
};

const installCEA = async (ceaVersion) => {
  const ceaGitUrl = `https://github.com/architecture-building-systems/CityEnergyAnalyst.git@${ceaVersion}`;
  console.debug({ message: 'Installing CEA from git', ceaGitUrl });

  // Install CEA to CEA env
  try {
    await new Promise((resolve, reject) => {
      const child = spawn(getMicromambaPath(), [
        '-r',
        getCEARootPath(),
        '-n',
        'cea',
        'run',
        'pip',
        'install',
        `git+${ceaGitUrl}`,
      ]);

      child.stdout.on('data', (data) => {
        console.debug(data.toString().trim());
      });

      var err = '';
      child.stderr.on('data', (data) => {
        err += data.toString();
      });

      child.on('exit', (code) => {
        if (code > 0) {
          reject(err);
        }

        resolve();
      });
    });
  } catch (error) {
    console.error(error);
    throw new MicromambaError('Could not install CEA into CEA environment.');
  }
};

export const createCEAenv = async (ceaVersion) => {
  const condaLockPath = path.join(`${getCEARootPath()}`, 'conda-lock.yml');

  await fetchCondaLock(ceaVersion, condaLockPath);

  // Create CEA env using micromamba
  try {
    await new Promise((resolve, reject) => {
      const child = spawn(getMicromambaPath(), [
        '-r',
        getCEARootPath(),
        '-n',
        'cea',
        'create',
        '-f',
        condaLockPath,
        '-y',
      ]);

      child.stdout.on('data', (data) => {
        console.debug(data.toString().trim());
      });

      var err = '';
      child.stderr.on('data', (data) => {
        err += data.toString();
      });

      child.on('exit', (code) => {
        if (code > 0) {
          reject(err);
        }

        resolve();
      });
    });
  } catch (error) {
    console.error(error);
    throw new MicromambaError('Could not create CEA environment.');
  }

  await installCEA(ceaVersion);
};

export const updateCEAenv = async (ceaVersion) => {
  const condaLockPath = path.join(`${getCEARootPath()}`, 'conda-lock.yml');

  await fetchCondaLock(ceaVersion, condaLockPath);

  // Update CEA env using micromamba
  try {
    await new Promise((resolve, reject) => {
      const child = spawn(getMicromambaPath(), [
        '-r',
        getCEARootPath(),
        '-n',
        'cea',
        'update',
        '-f',
        condaLockPath,
        '-y',
      ]);

      child.stdout.on('data', (data) => {
        console.debug(data.toString().trim());
      });

      var err = '';
      child.stderr.on('data', (data) => {
        err += data.toString();
      });

      child.on('exit', (code) => {
        if (code > 0) {
          reject(err);
        }

        resolve();
      });
    });
  } catch (error) {
    console.error(error);
    throw new MicromambaError('Could not update CEA environment.');
  }

  await installCEA(ceaVersion);
};
