import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));

const external = [
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.peerDependencies || {}),
  'react',
  'react-dom',
  'react/jsx-runtime'
];

const commonPlugins = [
  resolve({
    browser: true,
    preferBuiltins: false,
  }),
  commonjs(),
];

export default [
  // Main bundle
  {
    input: 'src/index.ts',
    output: [
      {
        file: pkg.main,
        format: 'cjs',
        sourcemap: true,
      },
      {
        file: pkg.module,
        format: 'es',
        sourcemap: true,
      },
    ],
    external,
    plugins: [
      ...commonPlugins,
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
        declarationMap: false,
      }),
    ],
  },
  
  // Hooks bundle (optional React dependency)
  {
    input: 'src/hooks/index.ts',
    output: [
      {
        file: 'dist/hooks/index.js',
        format: 'cjs',
        sourcemap: true,
      },
      {
        file: 'dist/hooks/index.esm.js',
        format: 'es',
        sourcemap: true,
      },
    ],
    external,
    plugins: [
      ...commonPlugins,
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
        declarationMap: false,
      }),
    ],
  },

  // Utils bundle
  {
    input: 'src/utils/index.ts',
    output: [
      {
        file: 'dist/utils/index.js',
        format: 'cjs',
        sourcemap: true,
      },
      {
        file: 'dist/utils/index.esm.js',
        format: 'es',
        sourcemap: true,
      },
    ],
    external,
    plugins: [
      ...commonPlugins,
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
        declarationMap: false,
      }),
    ],
  },

  // Type definitions
  {
    input: 'src/index.ts',
    output: {
      file: pkg.types,
      format: 'es',
    },
    plugins: [dts()],
  },

  // Hooks type definitions
  {
    input: 'src/hooks/index.ts',
    output: {
      file: 'dist/hooks/index.d.ts',
      format: 'es',
    },
    plugins: [dts()],
  },

  // Utils type definitions
  {
    input: 'src/utils/index.ts',
    output: {
      file: 'dist/utils/index.d.ts',
      format: 'es',
    },
    plugins: [dts()],
  },
];