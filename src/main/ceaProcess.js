import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { app, dialog } from 'electron';

let cea;
let timeout;
let interval;

export function createCEAProcess(url, BrowserWindow, callback) {
  console.log(`createCEAProcess(${url})`);
  // For windows
  if (process.platform === 'win32') {
    let scriptPath = path.join(
      path.dirname(process.execPath),
      '/../',
      'dashboard.bat'
    );
    // Fallback to default install path
    if (!fs.existsSync(scriptPath))
      scriptPath = path.join(
        process.env.USERPROFILE,
        'Documents',
        'CityEnergyAnalyst',
        'dashboard.bat'
      );
    console.log(scriptPath);
    cea = require('child_process').spawn('cmd.exe', ['/c', scriptPath]);
  }

  cea.stdout.on('data', function (data) {
    console.log(data.toString('utf8'));
  });

  cea.stderr.on('data', function (data) {
    console.log(data.toString('utf8'));
  });

  // Show Error message box when CEA encounters any error on startup
  let startupError = '';
  cea.stderr.on('data', saveStartupError);
  cea.on('exit', showStartupError);

  function saveStartupError(message) {
    startupError += message.toString('utf8');
  }
  function showStartupError() {
    dialog.showMessageBox(BrowserWindow, {
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
    cea.stderr.removeListener('data', saveStartupError);
    cea.removeListener('exit', showStartupError);
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
  console.log(`isCEAAlive(${url})`);
  try {
    const resp = await axios.get(`${url}/server/alive`);
    return resp.status == 200;
  } catch (error) {
    console.log(error.response || 'No Response');
    return false;
  }
}

function checkCEAStarted(url, callback) {
  console.log(`checkCEAStarted(${url})`);
  const runCallbackOnce = (() => {
    let executed = false;
    return () => {
      if (!executed) {
        executed = true;
        callback();
      }
    };
  })();

  // Check every 1 seconds
  var bound_url = url;
  console.log(`checkCEAStarted(bound_url=${bound_url})`);
  interval = setInterval(async () => {
    const alive = await isCEAAlive(bound_url);
    if (alive) {
      clearInterval(interval);
      timeout && clearTimeout(timeout);
      runCallbackOnce();
    }
  }, 1000);

  // Stop checking after 1 min
  timeout = setTimeout(() => {
    clearInterval(interval);
  }, 60000);
}
