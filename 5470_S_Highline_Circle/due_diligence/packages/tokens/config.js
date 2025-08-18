module.exports = {
  source: ['tokens.candlefish.json'],
  format: {
    candlefishCss: function({ dictionary }) {
      const props = dictionary.allProperties.map(prop => {
        const name = prop.name.replace(/_/g, '-');
        return `  --cf-${name}: ${prop.value};`;
      }).join('\n');
      return `:root {\n${props}\n}\n`;
    }
  },
  platforms: {
    css: {
      transformGroup: 'css',
      buildPath: 'dist/css/',
      files: [
        { destination: 'tokens.css', format: 'css/variables', options: { outputReferences: true } },
        { destination: 'candlefish.css', format: 'candlefishCss' }
      ]
    },
    js: {
      transformGroup: 'js',
      buildPath: 'dist/js/',
      files: [{ destination: 'tokens.cjs', format: 'javascript/module' }]
    },
    json: {
      transformGroup: 'js',
      buildPath: 'dist/json/',
      files: [{ destination: 'tokens.json', format: 'json' }]
    }
  }
}
