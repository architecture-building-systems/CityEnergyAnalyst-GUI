import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

import { app, dialog } from 'electron';

import { getMicromambaPath, getCEARootPath } from './env.mjs';

let cea;
let timeout;
let interval;
let startupError = '';

export function createCEAProcess(url, BrowserWindow, callback) {
  console.log(`createCEAProcess(${url})`);
  // For windows
  if (process.platform === 'win32') {
    let scriptPath = path.join(
      path.dirname(process.execPath),
      '/../',
      'dashboard.bat',
    );
    // Fallback to default install path
    if (!fs.existsSync(scriptPath))
      scriptPath = path.join(
        process.env.USERPROFILE,
        'Documents',
        'CityEnergyAnalyst',
        'dashboard.bat',
      );
    console.log(scriptPath);
    cea = spawn('cmd.exe', ['/c', scriptPath]);
  } else if (process.platform === 'darwin') {
    cea = spawn(getMicromambaPath(), [
      '-r',
      getCEARootPath(),
      '-n',
      'cea',
      'run',
      'cea',
      'dashboard',
    ]);
  }

  if (cea) {
    // Attach cea output to console
    cea.stdout.on('data', function (data) {
      console.log(data.toString('utf8').trim());
    });

    cea.stderr.on('data', function (data) {
      console.error(data.toString('utf8').trim());
    });

    // Show Error message box when CEA encounters any error on startup
    cea.stderr.on('data', saveStartupError);
    cea.on('exit', showStartupError);
  }

  function saveStartupError(message) {
    startupError += message.toString('utf8');
  }

  function showStartupError() {
    dialog.showMessageBoxSync(BrowserWindow, {
      type: 'error',
      title: 'CEA Error',
      message: 'CEA has encounted an error on startup',
      detail: startupError,
      buttons: ['Exit CEA'],
    });
    app.exit();
  }

  checkCEAStarted(url, () => {
    // Remove Error message box listener after successful startup
    if (cea) {
      cea.stderr.removeListener('data', saveStartupError);
      cea.removeListener('exit', showStartupError);
    }
    callback();
  });

  return cea;
}

// Kill process and stop all timed events
export function killCEAProcess() {
  if (cea) {
    cea.removeAllListeners('exit');
    process.kill(cea.pid);
  }
  interval && clearInterval(interval);
  timeout && clearTimeout(timeout);
}

export async function isCEAAlive(url) {
  console.debug(`isCEAAlive(${url})`);
  try {
    const { status } = await fetch(`${url}/server/alive`);
    return status == 200;
  } catch (error) {
    console.error(error.response || 'No Response');
    return false;
  }
}

function checkCEAStarted(url, callback) {
  console.debug(`checkCEAStarted(${url})`);
  const runCallbackOnce = (() => {
    let executed = false;
    return () => {
      if (!executed) {
        executed = true;
        callback();
      }
    };
  })();

  // Check every 3 seconds
  var bound_url = url;
  console.debug(`checkCEAStarted(bound_url=${bound_url})`);
  interval = setInterval(async () => {
    const alive = await isCEAAlive(bound_url);
    if (alive) {
      clearInterval(interval);
      timeout && clearTimeout(timeout);
      runCallbackOnce();
    }
  }, 3000);

  // Stop checking after 5 min
  timeout = setTimeout(() => {
    clearInterval(interval);
  }, 300000);
}
