import { dialog } from 'electron';

import { isCEAAlive, createCEAProcess } from './cea/process.mjs';
import {
  checkCEAenv,
  createCEAenv,
  getCEAenvVersion,
  updateCEAenv,
} from './cea/env.mjs';
import { ensureMicromamba } from './cea/micromamba.mjs';
import { CEAError, MicromambaError } from './cea/errors.mjs';
import { readConfig, writeConfig } from './config.mjs';
import { checkInternet } from './utils.mjs';

const sendPreflightEvent = (splashWindow, message) => {
  console.log(message);
  splashWindow.webContents.send('preflightEvents', message);
};

async function checkForGUIUpdate({ splashWindow, autoUpdater }) {
  const send = (msg) => sendPreflightEvent(splashWindow, msg);

  try {
    send('Checking for GUI update...');
    let info;

    autoUpdater.on('update-available', (_info) => {
      send('Update available.');
      info = { ..._info, updateAvailable: true };
    });
    autoUpdater.on('update-not-available', (_info) => {
      send('No update available.');
      info = { ..._info, updateAvailable: false };
    });

    const updateResult = await autoUpdater.checkForUpdates();
    // autoUpdater.checkForUpdates() returns null if in dev mode
    if (updateResult == null) return false;

    console.debug(info);

    // Ignore if unable to get version information
    if (!info?.version) return false;
    // Ignore if update is not available
    if (!info?.updateAvailable) return false;
    // Ignore if found in config
    const userConfig = readConfig();
    if (userConfig?.ignoreVersions == info.version) return false;

    const { response, checkboxChecked } = await dialog.showMessageBox(
      splashWindow,
      {
        title: 'Update found',
        type: 'info',
        defaultId: 0,
        message: `A new update was found (${info.version}).\n Do you want to install it?`,
        // detail: `${info.updateInfo.releaseNotes}`,
        checkboxLabel: 'Remember my decision for this version',
        buttons: ['Install', 'Skip'],
      },
    );

    if (response == 0) {
      autoUpdater.on('download-progress', (progressObj) => {
        let logMessage = `Download speed: ${(progressObj.bytesPerSecond / 1000).toFixed(0)}kB/s`;
        logMessage = `${logMessage} - Downloaded ${progressObj.percent.toFixed(2)}%\n`;
        logMessage = `${logMessage} (${progressObj.transferred.toFixed(0)}/${progressObj.total.toFixed(0)})`;
        send(logMessage);
      });

      autoUpdater.on('update-downloaded', () => {
        send('Update downloaded; Installing now.');
      });

      await autoUpdater.downloadUpdate();
      return true;
    } else if (response == 1) {
      send('Update Ignored.');

      // Save preference
      if (checkboxChecked) {
        writeConfig({ ignoreVersions: info.version });
      }

      return false;
    }
  } catch (error) {
    console.error(error);
    // Ignore error for now and continue to launch GUI
    send('Update failed.');
  } finally {
    autoUpdater.removeAllListeners();
  }
}

export async function runPreflightChecks({
  splashWindow,
  autoUpdater,
  appVersion,
  isPackaged,
  url,
  onCEAReady,
}) {
  const send = (msg) => sendPreflightEvent(splashWindow, msg);

  // Check for internet connection
  const internetConnection = await checkInternet();

  // Check for GUI update (only in production and with internet connection)
  if (internetConnection) {
    const updateAvailable = await checkForGUIUpdate({
      splashWindow,
      autoUpdater,
    });
    if (updateAvailable) {
      send('Restarting to install update...');
      autoUpdater.quitAndInstall();
      return;
    }
  }

  // Start immediately if cea is already running
  if (await isCEAAlive(url)) {
    console.log('cea backend already running...');
    onCEAReady();
    return;
  }

  // Ensure micromamba is downloaded (only needed in packaged builds — dev uses local CEA)
  if (isPackaged) {
    try {
      await ensureMicromamba(send);
    } catch (error) {
      if (!internetConnection) {
        send('No internet connection');
        throw new MicromambaError(
          'micromamba is not installed and no internet connection is available to download it.',
        );
      }
      throw error;
    }
  }

  // Check for CEA environment (only in production)
  if (isPackaged) {
    send('Checking for CEA environment...');
    let ceaEnvExists = true;
    let ceaEnvIsEditable = false;

    try {
      ceaEnvIsEditable = await checkCEAenv();
    } catch (error) {
      // Will throw CEAError if env does not exist
      if (error instanceof CEAError) ceaEnvExists = false;
      // Exit on any other errors
      else throw error;
    }

    // Create CEA env is does not exist
    if (!ceaEnvExists) {
      // Throw error if no internet connection
      if (!internetConnection) {
        send('No internet connection');
        throw new CEAError(
          'Unable to verify/create CEA environment. (No internet connection)',
        );
      }

      send(
        `Creating CEA environment (${appVersion})...\n(this might take a few minutes)`,
      );
      // Fetch CEA version that is the same as the app
      await createCEAenv(`v${appVersion}`);
    }

    // Only update CEA from github if not installed as editable package
    if (!ceaEnvIsEditable && internetConnection) {
      // Check CEA version
      const ceaVersion = await getCEAenvVersion();
      console.debug({ appVersion, ceaVersion });

      // Update CEA if outdated
      if (ceaVersion != appVersion) {
        send(`Updating CEA environment (${ceaVersion} -> ${appVersion})...`);
        await updateCEAenv(`v${appVersion}`);
      }
    }
  }

  // Check if CEA server is already running, only start if not
  send('Starting CEA Desktop...');
  const alive = await isCEAAlive(url);
  if (alive) {
    console.log('cea backend already running...');
    onCEAReady();
    return;
  } else {
    console.log('cea backend not running, starting...');
    createCEAProcess(url, splashWindow, () => {
      console.log('cea backend process created...');
      onCEAReady();
    });
  }
}
