import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  if (mode === 'electron')
    return {
      plugins: [react()],
      base: './',
    };
  else
    return {
      plugins: [react()],
    };
});
