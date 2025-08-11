import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  overwrite: true,
  schema: {
    'https://5x6gs2o6b6.execute-api.us-east-1.amazonaws.com/prod/graphql': {
      headers: {
        'Content-Type': 'application/json',
      },
    },
  },
  documents: 'src/**/*.{ts,tsx}',
  generates: {
    'src/gql/': {
      preset: 'client',
      config: {
        useTypeImports: true,
      },
      plugins: [],
    },
    'src/gql/introspection.json': {
      plugins: ['introspection'],
      config: {
        minify: true,
      },
    },
  },
  hooks: {
    afterAllFileWrite: ['prettier --write'],
  },
};

export default config;
