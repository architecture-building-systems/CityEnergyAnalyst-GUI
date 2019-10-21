import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { app, dialog } from 'electron';

let cea;

export function createCEAProcess(BrowserWindow, callback) {
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

  cea.stdout.on('data', function(data) {
    console.log(data.toString('utf8'));
  });

  cea.stderr.on('data', function(data) {
    console.log(data.toString('utf8'));
  });

  // Show Error message box when CEA encounters any error on startup
  cea.stderr.on('data', showStartupError);
  function showStartupError(message) {
    dialog.showMessageBox(BrowserWindow, {
      type: 'error',
      title: 'CEA Error',
      message: message.toString('utf8')
    });
  }

  checkCEAStarted(() => {
    // Remove Error message box listener after successful startup
    cea.stderr.removeListener('data', showStartupError);
    callback();
  });

  return cea;
}

export async function isCEAAlive() {
  try {
    const resp = await axios.get(`${process.env.CEA_URL}/server/alive`);
    return resp.status == 200;
  } catch (error) {
    console.log(error.response || 'No Response');
    return false;
  }
}

function checkCEAStarted(callback) {
  let timeout;
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
  const interval = setInterval(async () => {
    const alive = await isCEAAlive();
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
