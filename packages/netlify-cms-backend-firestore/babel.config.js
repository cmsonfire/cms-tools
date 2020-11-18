console.log('Babel for netlify-cms-backend-firestore!');
const pkgVersion = require('./package.json').version;

module.exports = {
  presets: ['@babel/preset-env', '@babel/preset-react'],
  plugins: [
    '@babel/plugin-syntax-jsx',
    '@babel/plugin-transform-runtime',
    [
      'transform-define',
      {
        PACKAGE_VERSION: `${pkgVersion}`,
      },
    ],
  ],
};
