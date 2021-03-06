module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          node: 'current',
        },
      },
    ],
  ],
  sourceMaps: true,
  plugins: ['@babel/plugin-proposal-object-rest-spread', '@babel/plugin-transform-modules-commonjs'],
};
