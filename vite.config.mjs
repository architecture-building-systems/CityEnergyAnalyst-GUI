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

  const baseConfig = {
    plugins: [react(), svgr(svgrOptions)],
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
            manualChunks: (id) => {
              // Vendor chunks for better caching
              if (id.includes('node_modules')) {
                if (id.includes('react') || id.includes('react-dom')) {
                  return 'react-vendor';
                }
                if (id.includes('react-router')) {
                  return 'router-vendor';
                }
                if (id.includes('antd') || id.includes('@ant-design')) {
                  return 'ui-vendor';
                }
                if (id.includes('@tanstack/react-query')) {
                  return 'query-vendor';
                }
                if (id.includes('maplibre-gl') || id.includes('deck.gl')) {
                  return 'map-vendor';
                }
                if (
                  id.includes('zustand') ||
                  id.includes('axios') ||
                  id.includes('date-fns')
                ) {
                  return 'util-vendor';
                }
                return 'vendor';
              }
            },
          },
        },
        // Optimize chunk size
        chunkSizeWarningLimit: 1000,
      },
    };
  }
});
