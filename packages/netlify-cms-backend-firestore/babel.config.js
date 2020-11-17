console.log('Babel for netlify-cms-backend-firestore!')

module.exports = {
  presets: ['@babel/preset-env', '@babel/preset-react'],
  plugins: ['@babel/plugin-syntax-jsx', '@babel/plugin-transform-runtime'],
}
