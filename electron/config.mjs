import { app } from 'electron';

import fs from 'fs';
import path from 'path';

const userDataPath = app.getPath('userData');
const configFilePath = path.join(userDataPath, 'config.json');

export function readConfig() {
  try {
    if (fs.existsSync(configFilePath)) {
      const data = fs.readFileSync(configFilePath, 'utf-8');
      return JSON.parse(data);
    } else {
      return {};
    }
  } catch (error) {
    console.error('Error reading config file:', error);
    return {};
  }
}

export function writeConfig(config) {
  try {
    const data = JSON.stringify(config, null, 2);
    fs.writeFileSync(configFilePath, data, 'utf-8');
  } catch (error) {
    console.error('Error writing config file:', error);
  }
}
