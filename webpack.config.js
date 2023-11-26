const path = require('path');

module.exports = {
  entry: './public/js/main.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
    publicPath: '/', 
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
          },
        },
      },
    ],
  },
  devServer: {
    static: {
        directory: path.join(__dirname, 'public'),
    },
    compress: true,
    port: 8080,
    open: true,
    hot: true,
    historyApiFallback: true,
    proxy: {
        '/rooms': 'http://localhost:4000'
      },
  },
  mode: 'development',
};
