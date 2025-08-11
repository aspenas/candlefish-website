import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const distDir = join(process.cwd(), 'dist');
const tokensDir = join(distDir, 'tokens');

mkdirSync(tokensDir, { recursive: true });

const colorTokens = {
  color: {
    brand: {
      primary: '#11D9E6',
      ink: '#0D1214',
      surface: '#082C32',
    },
    neutral: {
      100: '#F2F5F6',
      200: '#E6EBED',
      300: '#CBD5D9',
      400: '#AFBEC4',
      500: '#93A7AF',
      600: '#798F99',
      700: '#5F7782',
      800: '#485E68',
      900: '#31454E',
    },
    accent: {
      warn: '#D97706',
      ok: '#10B981',
    },
  },
};

const typeTokens = {
  type: {
    h1: { size: 40, line: 48, weight: 'Medium', tracking: 0.01 },
    h2: { size: 28, line: 36, weight: 'Medium', tracking: 0.01 },
    h3: { size: 20, line: 28, weight: 'Medium', tracking: 0.01 },
    body: { size: 16, line: 24, weight: 'Regular', tracking: 0 },
    small: { size: 14, line: 20, weight: 'Regular', tracking: 0 },
    family: 'Inter',
  },
};

writeFileSync(join(tokensDir, 'color.json'), JSON.stringify(colorTokens, null, 2));
writeFileSync(join(tokensDir, 'type.json'), JSON.stringify(typeTokens, null, 2));

console.log('Wrote tokens to', tokensDir);
