# City Energy Analyst GUI

This is the new interface of CEA in Electron.

Made with the help of `electron-webpack`.

## Getting Started (development)

Simply clone down this repository, install dependencies, and get started on your application.

The use of the [yarn](https://yarnpkg.com/) package manager is **strongly** recommended, as opposed to using `npm`.
The use of the [VS Code](https://code.visualstudio.com/) editor is also recommended.

```bash
git clone https://github.com/architecture-building-systems/cea-electron.git

# install dependencies
yarn
```

### Development Scripts

```bash
# run application in development mode
yarn dev

# compile source code and create webpack output
yarn compile

# `yarn compile` & create build with electron-builder
yarn dist

# `yarn compile` & create unpacked build with electron-builder
yarn dist:dir
```
