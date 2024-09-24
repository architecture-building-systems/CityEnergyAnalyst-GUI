import { app, BrowserWindow, ipcMain, dialog, shell, screen } from 'electron';
import path, { dirname } from 'path';

import {
  isCEAAlive,
  createCEAProcess,
  killCEAProcess,
} from './cea/process.mjs';
import { fileURLToPath } from 'url';
import { getAutoUpdater } from './updater.mjs';
import {
  checkCEAenv,
  createCEAenv,
  getCEAenvVersion,
  updateCEAenv,
} from './cea/env.mjs';
import { CEAError } from './cea/errors.mjs';
import { initLog, openLog } from './log.mjs';
import { readConfig, writeConfig } from './config.mjs';
import { checkInternet } from './utils.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const appVersion = app.getVersion();
const CEA_HOST = '127.0.0.1';
const CEA_PORT = '5050';
const CEA_URL = `http://${CEA_HOST}:${CEA_PORT}`;

// global reference to mainWindow (necessary to prevent window from being garbage collected)
let mainWindow;
let splashWindow;

const log = initLog();

const gotTheLock = app.requestSingleInstanceLock();
const autoUpdater = getAutoUpdater();

autoUpdater.logger = log;

if (!gotTheLock) {
  app.quit();
} else {
  app.on('ready', () => {
    createSplashWindow(CEA_URL);
  });

  app.on('activate', () => {
    if (!BrowserWindow.getAllWindows().length) {
      createMainWindow();
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('will-quit', async (event) => {
    event.preventDefault();

    mainWindow && mainWindow.close();
    splashWindow && splashWindow.close();

    killCEAProcess();

    console.debug('Exiting app...');
    app.exit();
  });
}

const createMainWindow = () => {
  const displays = screen.getAllDisplays();
  // Find the primary display or the one with the highest resolution
  const primaryDisplay = displays.find((display) => display.isPrimary);
  const display =
    primaryDisplay ||
    displays.reduce((a, b) =>
      a.workArea.width * a.workArea.height >
      b.workArea.width * b.workArea.height
        ? a
        : b,
    );

  mainWindow = new BrowserWindow({
    show: false,
    width: Math.min(display.workArea.width, 1920),
    height: Math.min(display.workArea.height, 1080),
    backgroundColor: 'white',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, './preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      devTools: !app.isPackaged,
    },
  });

  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  } else {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.openDevTools();
  }

  mainWindow.once('ready-to-show', () => {
    splashWindow && splashWindow.close();
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.on('new-window', (event, url) => {
    event.preventDefault();
    mainWindow.loadURL(url);
  });
};

function createSplashWindow(url) {
  splashWindow = new BrowserWindow({
    height: 300,
    width: 500,
    resizable: false,
    maximizable: false,
    show: false,
    frame: false,
    backgroundColor: '#2e2c29',
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, './preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      devTools: !app.isPackaged,
    },
  });

  // hides the traffic lights for macOS
  if (process.platform == 'darwin')
    splashWindow.setWindowButtonVisibility(false);

  if (app.isPackaged) {
    splashWindow.loadURL(
      `file://${path.join(__dirname, '../dist/index.html#splash')}`,
    );
  } else {
    splashWindow.loadURL('http://localhost:5173/splash');
    splashWindow.openDevTools();
  }

  splashWindow.once('ready-to-show', async () => {
    splashWindow.show();
    console.log(`CEA GUI version: ${appVersion}`);

    const preflightChecks = async () => {
      const sendPreflightEvent = (message) => {
        console.log(message);
        splashWindow.webContents.send('preflightEvents', message);
      };

      // Check for internet connection
      const internetConnection = await checkInternet();
      if (!internetConnection) {
        sendPreflightEvent('No internet connection');
        throw new CEAError(
          'Unable to check for CEA environment. (No internet connection)',
        );
      }

      const checkUpdates = async () => {
        try {
          sendPreflightEvent('Checking for GUI update...');
          let info;

          autoUpdater.on('update-available', (_info) => {
            sendPreflightEvent('Update available.');
            info = { ..._info, updateAvailable: true };
          });
          autoUpdater.on('update-not-available', (_info) => {
            sendPreflightEvent('No update available.');
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
              sendPreflightEvent(logMessage);
            });

            autoUpdater.on('update-downloaded', () => {
              sendPreflightEvent('Update downloaded; Installing now.');
            });

            await autoUpdater.downloadUpdate();
            return true;
          } else if (response == 1) {
            sendPreflightEvent('Update Ignored.');

            // Save preference
            if (checkboxChecked) {
              writeConfig({ ignoreVersions: info.version });
            }

            return false;
          }
        } catch (error) {
          console.error(error);
          // Ignore error for now and continue to launch GUI
          sendPreflightEvent('Update failed.');
        } finally {
          autoUpdater.removeAllListeners();
        }
      };

      // Check for GUI update (only in production)
      const updateAvailable = await checkUpdates();
      if (updateAvailable) {
        sendPreflightEvent('Restarting to install update...');
        autoUpdater.quitAndInstall();
        return;
      }

      // Start immediately if cea is already running
      if (await isCEAAlive(url)) {
        console.log('cea dashboard already running...');
        createMainWindow();
        return;
      }

      // Check for CEA environment (only in production)
      if (app.isPackaged) {
        sendPreflightEvent('Checking for CEA environment...');
        var ceaEnvExists = true;
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
          sendPreflightEvent(
            `Creating CEA environment (${appVersion})...\n(this might take a few minutes)`,
          );
          // Fetch CEA version that is the same as the app
          await createCEAenv(`v${appVersion}`);
        }

        // Only update CEA from github if not installed as editable package
        if (!ceaEnvIsEditable) {
          // Check CEA version
          const ceaVersion = await getCEAenvVersion();
          console.debug({ appVersion, ceaVersion });

          // Update CEA if outdated
          if (ceaVersion != appVersion) {
            sendPreflightEvent(
              `Updating CEA environment (${ceaVersion} -> ${appVersion})...`,
            );
            await updateCEAenv(`v${appVersion}`);
          }
        }
      }

      // Check if CEA server is already running, only start if not
      sendPreflightEvent('Starting CEA Dashboard...');
      const alive = await isCEAAlive(url);
      if (alive) {
        console.log('cea dashboard already running...');
        createMainWindow();
        return;
      } else {
        console.log('cea dashboard not running, starting...');
        createCEAProcess(url, splashWindow, () => {
          console.log('cea dashboard process created...');
          createMainWindow();
          return;
        });
      }
    };

    try {
      await preflightChecks();
    } catch (error) {
      console.error(error);

      const errorMessage = error?.message
        ? `Details:\n${error.message}\n\n`
        : '';
      dialog.showMessageBoxSync(splashWindow, {
        type: 'error',
        title: 'CEA Error',
        message:
          'CEA has encounted an error on startup.\n The application will exit now.',
        detail: `${errorMessage}You can report this error to us at our GitHub page\n (https://github.com/architecture-building-systems/CityEnergyAnalyst/issues).`,
        buttons: ['Show logs'],
      });
      openLog();
      app.exit();
    }
  });

  splashWindow.on('closed', () => {
    !mainWindow && killCEAProcess();
    splashWindow = null;
  });
}

ipcMain.handle('open-dialog', async (_, arg) => {
  const { filePaths } = await dialog.showOpenDialog(mainWindow, arg);
  return filePaths;
});

ipcMain.handle('open-external', async (_, { url }) => {
  await shell.openExternal(url);
});

ipcMain.handle('get-app-version', () => appVersion);
