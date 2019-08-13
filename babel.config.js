/* eslint global-require: off */

const developmentEnvironments = ['development', 'test'];

const developmentPlugins = [require('react-hot-loader/babel')];

const productionPlugins = [];

module.exports = api => {
  const development = api.env(developmentEnvironments);

  return {
    presets: [require('@babel/preset-env'), require('@babel/preset-react')],
    plugins: [
      require('@babel/plugin-proposal-class-properties'),
      ['import', { libraryName: 'antd', style: 'css' }],
      ...(development ? developmentPlugins : productionPlugins)
    ]
  };
};
