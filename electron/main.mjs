import { app, BrowserWindow, dialog } from 'electron';

import { killCEAProcess } from './cea/process.mjs';
import { getAutoUpdater } from './updater.mjs';
import { initLog, openLog } from './log.mjs';
import { createMainWindow, createSplashWindow } from './windows.mjs';
import { runPreflightChecks } from './preflight.mjs';
import { registerIpcHandlers } from './ipc.mjs';

const appVersion = app.getVersion();
const CEA_HOST = '127.0.0.1';
const CEA_PORT = '5050';
const CEA_URL = `http://${CEA_HOST}:${CEA_PORT}`;

// global references (necessary to prevent windows from being garbage collected)
let mainWindow;
let splashWindow;

const log = initLog();
const autoUpdater = getAutoUpdater();
autoUpdater.logger = log;

const startMainWindow = () => {
  mainWindow = createMainWindow();
  mainWindow.once('ready-to-show', () => splashWindow?.close());
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

const startSplashWindow = () => {
  splashWindow = createSplashWindow();

  splashWindow.on('closed', async () => {
    if (!mainWindow) {
      try {
        await killCEAProcess();
      } catch (error) {
        console.error('Error killing CEA process from splash window:', error);
      }
    }
    splashWindow = null;
  });

  splashWindow.once('ready-to-show', async () => {
    console.log(`CEA GUI version: ${appVersion}`);
    try {
      await runPreflightChecks({
        splashWindow,
        autoUpdater,
        appVersion,
        isPackaged: app.isPackaged,
        url: CEA_URL,
        onCEAReady: startMainWindow,
      });
    } catch (error) {
      console.error(error);

      const errorMessage = error?.message
        ? `Details:\n${error.message}\n\n`
        : '';
      const index = dialog.showMessageBoxSync(splashWindow, {
        type: 'error',
        title: 'CEA Error',
        message:
          'CEA has encountered an error on startup.\n The application will exit now.',
        detail: `${errorMessage}You can report this error to us at our GitHub page\n (https://github.com/architecture-building-systems/CityEnergyAnalyst/issues).`,
        buttons: ['Show logs', 'Exit'],
        defaultId: 0,
        cancelId: 1,
      });

      if (index == 0) openLog();
      app.exit();
    }
  });
};

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('ready', () => {
    startSplashWindow();
  });

  app.on('activate', () => {
    if (!BrowserWindow.getAllWindows().length) {
      startMainWindow();
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

    try {
      console.debug('Waiting for CEA process to terminate...');
      await killCEAProcess();
      console.debug('CEA process terminated successfully');
    } catch (error) {
      console.error('Error killing CEA process:', error);
    }

    console.debug('Exiting app...');
    app.exit();
  });
}

registerIpcHandlers({ getMainWindow: () => mainWindow, appVersion });
