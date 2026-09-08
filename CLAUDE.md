# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Backend Integration
The app connects to a CEA (City Energy Analyst) backend server:
- Default URL: `http://127.0.0.1:5050` (`VITE_CEA_URL` env var)
- Electron version manages CEA Python backend process lifecycle via micromamba; CEA process spawning in `electron/cea/process.mjs`
- **Important**: When registering Socket.io event listeners, use `waitForConnection()` from `src/lib/socket.js` to ensure the socket is connected before registering listeners
- **Backend Code Location**: If the `CityEnergyAnalyst` folder exists in the same directory as this repo, the backend code can be examined at `../CityEnergyAnalyst/cea/interfaces/dashboard`

### Development Notes
- Navigation: Custom `navigationStore` (Zustand) provides navigation blocking for unsaved changes