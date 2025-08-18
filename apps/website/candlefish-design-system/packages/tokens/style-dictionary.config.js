const StyleDictionary = require('style-dictionary');
const path = require('path');

// Custom transform for letter spacing percentages to em
StyleDictionary.registerTransform({
  name: 'letterSpacing/em',
  type: 'value',
  matcher: (token) => token.type === 'letterSpacing',
  transformer: (token) => {
    const val = token.value;
    if (typeof val === 'string' && val.endsWith('em')) {
      return val;
    }
    if (typeof val === 'string' && val.endsWith('%')) {
      const num = parseFloat(val.replace('%', ''));
      return `${(num / 100).toFixed(4)}em`;
    }
    return val;
  }
});

// Custom format for CSS with better organization
StyleDictionary.registerFormat({
  name: 'css/variables-organized',
  formatter: function(dictionary, config) {
    const header = `/**
 * Candlefish Design Tokens
 * Generated on ${new Date().toISOString()}
 * Do not edit directly - edit tokens.candlefish.json instead
 */\n\n`;

    const groups = {
      color: [],
      typography: [],
      spacing: [],
      borderRadius: [],
      boxShadow: [],
      component: [],
      other: []
    };

    dictionary.allProperties.forEach(prop => {
      const cssVar = `  --${prop.name}: ${prop.value};`;
      const category = prop.path[0];

      if (groups[category]) {
        groups[category].push(cssVar);
      } else {
        groups.other.push(cssVar);
      }
    });

    let output = header + ':root {\n';

    Object.entries(groups).forEach(([category, vars]) => {
      if (vars.length > 0) {
        output += `\n  /* ${category.charAt(0).toUpperCase() + category.slice(1)} */\n`;
        output += vars.join('\n') + '\n';
      }
    });

    output += '}\n';

    return output;
  }
});

module.exports = {
  source: [path.join(__dirname, 'tokens', 'tokens.candlefish.json')],

  platforms: {
    'web/css': {
      transformGroup: 'css',
      transforms: ['attribute/cti', 'name/cti/kebab', 'letterSpacing/em'],
      buildPath: 'build/web/css/',
      files: [{
        destination: 'variables.css',
        format: 'css/variables-organized',
        options: {
          outputReferences: true
        }
      }]
    },

    'web/scss': {
      transformGroup: 'scss',
      transforms: ['attribute/cti', 'name/cti/kebab', 'letterSpacing/em'],
      buildPath: 'build/web/scss/',
      files: [{
        destination: '_tokens.scss',
        format: 'scss/variables',
        options: {
          outputReferences: true
        }
      }]
    },

    'web/js': {
      transformGroup: 'js',
      transforms: ['attribute/cti', 'name/cti/constant', 'letterSpacing/em'],
      buildPath: 'build/web/js/',
      files: [{
        destination: 'tokens.js',
        format: 'javascript/module-flat'
      }]
    },

    'web/json': {
      transformGroup: 'js',
      buildPath: 'build/web/json/',
      files: [{
        destination: 'tokens.json',
        format: 'json/flat'
      }]
    }
  }
};
