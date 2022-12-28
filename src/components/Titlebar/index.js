import { useEffect, useState } from 'react';
import TitleBar from 'frameless-titlebar';

export default function Titlebar() {
  const [maximized, setMaximized] = useState(true);
  const handleClose = () => {
    ipcRenderer.invoke('main-window-close');
  };
  const handleMinimize = () => {
    ipcRenderer.invoke('main-window-minimize');
  };
  const handleMaximize = () => {
    if (maximized) {
      ipcRenderer.invoke('main-window-restore');
    } else {
      ipcRenderer.invoke('main-window-maximize');
    }
  };

  useEffect(() => {
    const onMaximized = () => setMaximized(true);
    const onRestore = () => setMaximized(false);
    ipcRenderer.on('main-window-maximize', onMaximized);
    ipcRenderer.on('main-window-unmaximize', onRestore);
    return () => {};
  }, []);

  return (
    <div>
      <TitleBar
        platform={process.platform} // win32, darwin, linux
        title="City Energy Analyst"
        theme={{
          barTheme: 'dark',
          menuDimItems: false,
          showIconDarwin: false,
          barBackgroundColor: 'rgb(36, 37, 38)',
          barColor: 'rgb(230, 230, 230)',
        }}
        onClose={handleClose}
        onMinimize={handleMinimize}
        onMaximize={handleMaximize}
        onDoubleClick={handleMaximize}
        disableMinimize={false}
        disableMaximize={false}
        maximized={maximized}
      />
    </div>
  );
}
