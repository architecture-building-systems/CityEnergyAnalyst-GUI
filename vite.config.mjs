import { defineConfig } from 'vite';
import svgr from 'vite-plugin-svgr';
import react from '@vitejs/plugin-react-swc';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const svgrOptions = {
    // svgr options: https://react-svgr.com/docs/options/
    svgrOptions: {
      exportType: 'default',
      ref: true,
      svgo: false,
      titleProp: true,
    },
    include: '**/*.svg',
  };
  if (mode === 'electron')
    return {
      plugins: [react(), svgr(svgrOptions)],
      base: './',
    };
  else
    return {
      plugins: [react(), svgr(svgrOptions)],
    };
});
