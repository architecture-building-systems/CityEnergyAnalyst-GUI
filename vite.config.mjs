import { defineConfig } from 'vite';
import svgr from 'vite-plugin-svgr';
import react from '@vitejs/plugin-react-swc';
import tsconfigPaths from 'vite-tsconfig-paths';

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

  const baseConfig = {
    plugins: [react(), svgr(svgrOptions), tsconfigPaths()],
  };

  if (mode === 'electron') {
    return {
      ...baseConfig,
      base: './',
    };
  } else {
    return {
      ...baseConfig,
      build: {
        rollupOptions: {
          output: {
            manualChunks: {
              'react-vendor': ['react', 'react/jsx-runtime'],
              'react-dom-vendor': ['react-dom', 'react-dom/client'],
              'router-vendor': ['react-router'],
              'ui-vendor': [
                'antd',
                '@ant-design/icons',
                '@ant-design/compatible',
              ],
              'query-vendor': ['@tanstack/react-query'],
              'map-vendor': ['maplibre-gl', 'deck.gl'],
              'util-vendor': ['zustand', 'axios', 'date-fns'],
            },
          },
        },
        // Optimize chunk size
        chunkSizeWarningLimit: 1000,
      },
    };
  }
});
