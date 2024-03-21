# City Energy Analyst GUI

Made with the help of [`electron-builder`](https://www.electron.build).

There are currently two possible build targets for the GUI. One for desktop (using Electron) and one for the web.

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
