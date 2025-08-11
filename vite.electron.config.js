// vite.electron.config.js
import { defineConfig } from 'vite';
import { builtinModules } from 'module';
import path from 'path';

export default defineConfig({
  build: {
    outDir: 'dist-electron',
    lib: {
      entry: {
        main: path.resolve(__dirname, 'electron/main.mjs'),
        preload: path.resolve(__dirname, 'electron/preload.js'),
      },
      formats: ['cjs'],
    },
    rollupOptions: {
      external: [
        'electron',
        ...builtinModules,
        ...builtinModules.map((m) => `node:${m}`),
      ],
      output: {
        entryFileNames: '[name].js',
        format: 'cjs',
      },
    },
  },
});
