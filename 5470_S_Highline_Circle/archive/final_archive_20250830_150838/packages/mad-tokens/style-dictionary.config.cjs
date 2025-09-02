const { fileHeader, formattedVariables } = require('style-dictionary/utils');

function cssVarFormatter({ dictionary }) {
  return `${fileHeader({})}:root{\n${formattedVariables({
    format: 'css',
    dictionary,
    formatPropertyName: ({ name }) => `--mad-${name}`
  })}\n}\n`;
}

module.exports = {
  source: ['tokens.mad.json'],
  platforms: {
    css: {
      transformGroup: 'css',
      buildPath: 'dist/css/',
      files: [
        { destination: 'tokens.css', format: 'css/variables', options: { outputReferences: true } },
        { destination: 'mad.css', format: cssVarFormatter }
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
