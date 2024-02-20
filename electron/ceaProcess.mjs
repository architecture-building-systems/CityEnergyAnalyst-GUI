import axios from 'axios';
import { app, dialog } from 'electron';
import fs from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let cea;
let timeout;
let interval;
let startupError = '';

export function createCEAProcess(url, callback) {
  console.log(`createCEAProcess(${url})`);
  let cea;

  switch (process.platform) {
    case 'win32': {
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
      break;
    }
    case 'darwin': {
      checkCEAStarted(url);
      break;
    }
    default:
      throw new Error('Start CEA dashboard server manually.');
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
    dialog.showMessageBoxSync({
      type: 'error',
      title: 'CEA Error',
      message: 'CEA has encountered an error on startup',
      detail: startupError,
      buttons: ['Exit CEA'],
    });
    app.exit();
  }

  // Remove Error message box listener after successful startup
  checkCEAStarted(url, () => {
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
    const resp = await axios.get(`${url}/server/alive`);
    return resp.status == 200;
  } catch (error) {
    console.error(error.response || 'No Response');
    return false;
  }
}

function checkCEAStarted(url, callback = () => {}) {
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

  // Check every 1 seconds
  var bound_url = url;
  console.debug(`checkCEAStarted(bound_url=${bound_url})`);
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
