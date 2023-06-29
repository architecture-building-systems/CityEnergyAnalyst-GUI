const rules = require('./webpack.rules');
const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

rules.push({
  test: /\.css$/,
  use: ['style-loader', 'css-loader'],
});

const assets = ['static'];
const copyPlugins = new CopyWebpackPlugin({
  patterns: assets.map((asset) => ({
    from: path.resolve(__dirname, 'src', 'renderer', asset),
    to: path.resolve(__dirname, '.webpack/renderer', asset),
  })),
});

module.exports = {
  // Put your normal webpack config below here
  module: {
    rules,
  },
  plugins: [copyPlugins],
  cache: {
    type: 'filesystem',
  },
};
