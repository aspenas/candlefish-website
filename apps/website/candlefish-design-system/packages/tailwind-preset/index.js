/**
 * Candlefish Tailwind Preset
 * Extends Tailwind with Candlefish design system tokens
 */

const theme = require('@candlefish/tokens/tailwind/theme');
const components = require('@candlefish/tokens/tailwind/components');

module.exports = {
  theme: {
    extend: theme
  },
  content: [],
  plugins: [components]
};
