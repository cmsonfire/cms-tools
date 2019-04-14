/**
 * webpack.config.js
 */
const path = require('path')

const externals = {
  '@emotion/core': {
    root: ['NetlifyCmsDefaultExports', 'EmotionCore'],
    commonjs2: '@emotion/core',
    commonjs: '@emotion/core',
    amd: '@emotion/core',
    umd: '@emotion/core',
  },
  '@emotion/styled': {
    root: ['NetlifyCmsDefaultExports', 'EmotionStyled'],
    commonjs2: '@emotion/styled',
    commonjs: '@emotion/styled',
    amd: '@emotion/styled',
    umd: '@emotion/styled',
  },
  lodash: {
    root: ['NetlifyCmsDefaultExports', 'Lodash'],
    commonjs2: 'lodash',
    commonjs: 'lodash',
    amd: 'lodash',
    umd: 'lodash',
  },
  react: {
    root: 'React',
    commonjs2: 'react',
    commonjs: 'react',
    amd: 'react',
    umd: 'react',
  },
  uuid: {
    root: ['NetlifyCmsDefaultExports', 'UUId'],
    commonjs2: 'uuid',
    commonjs: 'uuid',
    amd: 'uuid',
    umd: 'uuid',
  },
}

const baseConfig = {
  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /(node_modules)/,
        use: {
          loader: 'babel-loader',
          options: {
            rootMode: 'upward',
          },
        },
      },
      {
        test: /\.m?jsx$/,
        exclude: /(node_modules)/,
        use: {
          loader: 'babel-loader',
          options: {
            rootMode: 'upward',
          },
        },
      },
      {
        test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,
        exclude: /(node_modules)/,
        use: {
          loader: 'svg-inline-loader',
        },
      },
      {
        test: /\.css$/,
        include: [/node_modules/],
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  plugins: [],
}

const defaultConfig = {
  ...baseConfig,
  entry: {
    index: './src/index.js',
  },
  output: {
    path: path.join(__dirname, 'dist'),
    filename: '[name].js',
    library: 'NetlifyCmsBackendFirestore',
    libraryTarget: 'umd',
    libraryExport: 'NetlifyCmsBackendFirestore',
    umdNamedDefine: true,
  },
  /**
   * Exclude peer dependencies from package bundles.
   */
  externals,
}

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production'
  defaultConfig.devtool = isProduction ? 'nosources-source-map' : 'source-map'

  return [defaultConfig]
}
