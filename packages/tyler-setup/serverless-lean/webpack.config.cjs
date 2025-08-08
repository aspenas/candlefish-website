const path = require('path');
const nodeExternals = require('webpack-node-externals');

module.exports = {
  entry: {
    'handlers/health': './src/handlers/health.js',
    'handlers/auth': './src/handlers/auth.js',
    'handlers/users': './src/handlers/users.js',
    'handlers/contractors': './src/handlers/contractors.js',
    'handlers/secrets': './src/handlers/secrets.js',
    'handlers/rotation': './src/handlers/rotation.js',
    'handlers/config': './src/handlers/config.js',
    'handlers/claude': './src/handlers/claude.js',
    'handlers/audit': './src/handlers/audit.js',
    'handlers/authorizer': './src/handlers/authorizer.js',
    'handlers/cleanup': './src/handlers/cleanup.js',
  },
  target: 'node',
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  externals: [nodeExternals()],
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', { targets: { node: '18' } }]
            ]
          }
        }
      }
    ]
  },
  output: {
    libraryTarget: 'commonjs2',
    path: path.join(__dirname, '.webpack'),
    filename: '[name].js'
  },
  optimization: {
    minimize: true
  }
};