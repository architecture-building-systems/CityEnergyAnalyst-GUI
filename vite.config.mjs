import { defineConfig } from 'vite';
import svgr from 'vite-plugin-svgr';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const svgrOptions = {
    include: '**/*.svg',
  };

  const baseConfig = {
    plugins: [react(), svgr(svgrOptions), tsconfigPaths()],
    build: {
      rollupOptions: {
        output: {
          advancedChunks: {
            groups: [
              { name: 'react-vendor', test: /\/react(-dom)?\/(?!.*router)/ },
              { name: 'router-vendor', test: /\/react-router/ },
              { name: 'ui-vendor', test: /\/(antd|@ant-design)/ },
              { name: 'query-vendor', test: /\/@tanstack\/react-query/ },
              { name: 'map-vendor', test: /\/(maplibre-gl|deck\.gl)/ },
              { name: 'util-vendor', test: /\/(zustand|axios|date-fns)/ },
            ],
          },
        },
      },
      // Optimize chunk size
      chunkSizeWarningLimit: 1000,
    },
  };

  if (mode === 'electron') {
    return {
      ...baseConfig,
      base: './',
    };
  } else {
    return baseConfig;
  }
});
