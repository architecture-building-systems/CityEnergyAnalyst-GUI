import { shell } from 'electron';
import log from 'electron-log/main';

export const initLog = () => {
  // Optional, initialize the logger for any renderer process
  log.initialize();

  console.log = log.log;
  console.error = log.error;
  console.debug = log.debug;

  return log;
};

export const openLog = () => {
  const logFilePath = log.transports.file.getFile().path;
  shell.openPath(logFilePath);
};
