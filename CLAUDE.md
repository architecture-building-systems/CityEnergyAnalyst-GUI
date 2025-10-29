# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Setup
- `yarn` - Install dependencies (yarn package manager is required)

### Development
- `yarn dev` - Start web development server on http://localhost:5173/
- `yarn electron:dev` - Start Electron desktop app in development mode
- `yarn dev-electron` - Start Vite in Electron mode (internal command)

### Build
- `yarn build` - Build web version to `dist/` folder
- `yarn build-electron` - Build Electron version
- `yarn electron:build` - Build Electron desktop app to `out/` folder
- `yarn electron:release` - Build and publish Electron app

### Code Quality
- `yarn lint:fix` - Run ESLint with auto-fix on src/ directory
- `yarn lint:format` - Run Prettier formatting on all relevant files

## Architecture Overview

### Dual Platform App
This is a React application that can run both as a web app and as an Electron desktop app. The build process creates different outputs for each platform:
- **Web**: Uses BrowserRouter, builds to `dist/`, connects to external CEA server
- **Electron**: Uses HashRouter (for file:// protocol), builds with base path `./`, output to `out/`
  - Manages CEA Python backend lifecycle (start/stop CEA server automatically)
  - Shows splash screen during CEA environment setup and server startup
  - Auto-update functionality via `electron-updater`
  - IPC communication for native dialogs and external links
  - Separate build configs: `vite.config.mjs` (web), `vite.electron.config.js` (Electron main/preload)

### Feature-Based Architecture
The codebase uses a feature-based architecture in `src/features/`:
- `auth/` - Authentication and login functionality
- `building-editor/` - Building data editing interface
- `dashboard/` - Main dashboard with plots and layouts
- `database-editor/` - Database editing tools with table interfaces
- `input-editor/` - Input parameter editing with schedule management
- `jobs/` - Job processing and monitoring
- `map/` - MapLibre-based mapping with deck.gl layers and drawing tools
- `project/` - Project management with scenarios and tools
- `scenario/` - Scenario creation and management
- `status-bar/` - Application status and help menus
- `tools/` - Analysis tools interface
- `upload-download/` - File upload/download functionality

Each feature follows the pattern: `components/`, `hooks/`, `stores/`, `constants.js`

### State Management
- **Zustand** for global state management (stores in each feature)
- **React Query** (@tanstack/react-query) for server state and caching
- Feature-specific stores: `projectStore`, `mapStore`, `inputEditorStore`, etc.

### Key Technologies
- **React 19** with Vite build system
- **Ant Design (antd)** for UI components with custom theming
- **MapLibre GL** + **deck.gl** for mapping and geospatial visualization
- **React Router 7** for navigation
- **Electron** for desktop app with CEA backend process management
- **Socket.io** for real-time communication with CEA backend
- **Handsontable** for spreadsheet-like data editing

### Backend Integration
The app connects to a CEA (City Energy Analyst) backend server:
- Default URL: `http://127.0.0.1:5050`
- Electron version manages CEA Python backend process lifecycle via micromamba
- CEA process spawning in `electron/cea/process.mjs`
- Real-time updates via Socket.io with connection management (`src/lib/socket.js`)
- REST API calls via axios
- **Important**: When registering Socket.io event listeners, use `waitForConnection()` from `src/lib/socket.js` to ensure socket is connected before registering listeners

### Project Structure Patterns
- `/src/app/` - Main app pages and routing
- `/src/components/` - Shared components
- `/src/features/` - Feature modules
- `/src/stores/` - Global stores (navigation, server, user)
- `/src/lib/` - API utilities and socket configuration
- `/electron/` - Electron main process and CEA integration
- Barrel exports used extensively (index.js files)

### Environment Configuration
- `VITE_CEA_URL` - CEA backend URL (default: `http://127.0.0.1:5050`)
- Vite env variables accessible via `import.meta.env`
- `import.meta.env.DEV` for development mode checks
- `app.isPackaged` in Electron to detect production build

### Development Notes
- Uses absolute imports via Vite path resolution (`vite-tsconfig-paths` plugin)
- React Strict Mode enabled
- Code splitting at route level with lazy loading
- ESLint + Prettier for code quality (no test setup)
- Development title prefix shows `[DEV]` in browser tab
- Platform detection: `isElectron()` utility determines runtime environment
- Router selection: HashRouter for Electron (file:// protocol), BrowserRouter for web
- Navigation: Custom `navigationStore` (Zustand) provides navigation blocking for unsaved changes