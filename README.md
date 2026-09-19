# City Energy Analyst GUI

Made with the help of [`electron-builder`](https://www.electron.build).

There are currently two possible build targets for the GUI. One for desktop (using Electron) and one for the web.

Official Windows builds of the desktop installer (see `build/installer.nsh`) send
anonymous, aggregate telemetry about install/update outcomes, so we don't have to
rely on users reporting installer bugs - see
[cityenergyanalyst.com/docs/privacy](https://cityenergyanalyst.com/docs/privacy)
for details. It only runs when `build/telemetry-key.nsh` is generated at build
time from a `POSTHOG_API_KEY` secret; local and fork builds send nothing.

## Getting Started (development)

Simply clone down this repository, install dependencies, and get started on your application.

The use of the [yarn](https://yarnpkg.com/) package manager and [VS Code](https://code.visualstudio.com/) editor is recommended for development.

e.g.

```bash
git clone https://github.com/architecture-building-systems/CityEnergyAnalyst-GUI.git

cd CityEnergyAnalyst-GUI

# install dependencies
yarn
```

### Development Scripts

For desktop version

```bash
# app will be launched using electron
yarn electron:dev
```

For web version

```bash
# web app will be accessible from the browser on http://localhost:5173/
yarn dev
```

### Build Scripts

For desktop version

```bash
# compiles source code and creates the OS specific application in the `out` folder
yarn electron:build
```

For web version

```bash
# bundles source code and creates the web files in the `dist` folder
yarn build
```
