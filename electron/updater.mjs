import electronUpdater from 'electron-updater';

export function getAutoUpdater() {
  // Using destructuring to access autoUpdater due to the CommonJS module of 'electron-updater'.
  // It is a workaround for ESM compatibility issues, see https://github.com/electron-userland/electron-builder/issues/7976.
  const { autoUpdater } = electronUpdater;

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;

  // autoUpdater.forceDevUpdateConfig = true;

  return autoUpdater;
}
