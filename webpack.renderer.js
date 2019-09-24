const merge = require('webpack-merge');
module.exports = function(config) {
  config.entry.renderer.unshift(
    ...(process.env.PLAIN_HMR ? [] : ['react-hot-loader/patch'])
  );
  config = merge.smart(config, {
    module: {
      rules: [
        {
          test: /\.js$/,
          include: /node_modules\/react-dom/,
          use: ['react-hot-loader/webpack']
        },
        {
          test: /\.mjs$/,
          include: /node_modules/,
          type: 'javascript/auto'
        }
      ]
    }
  });

  return config;
};
