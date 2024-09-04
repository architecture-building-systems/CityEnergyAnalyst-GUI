import { defineConfig } from 'vite';
import svgr from 'vite-plugin-svgr';
import react from '@vitejs/plugin-react-swc';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  if (mode === 'electron')
    return {
      plugins: [react(), svgr()],
      base: './',
    };
  else
    return {
      plugins: [react(), svgr()],
    };
});
