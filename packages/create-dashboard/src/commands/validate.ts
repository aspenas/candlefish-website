import { existsSync } from 'fs';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { runLinting, runTypeCheck } from './test.js';

interface ValidateOptions {
  fix?: boolean;
}

interface ValidationResult {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  fixable?: boolean;
}

export async function validateSetup(options: ValidateOptions = {}) {
  console.log(chalk.cyan('🔍 Validating project setup...\n'));

  const results: ValidationResult[] = [];

  // Run all validations
  results.push(await validatePackageJson());
  results.push(await validateEnvironment());
  results.push(await validateBuildConfig());
  results.push(await validateNetlifyConfig());
  results.push(await validateGitIgnore());
  results.push(await validateTypeScript());

  // Try to fix issues if requested
  if (options.fix) {
    await attemptFixes(results);
  }

  // Run code quality checks
  try {
    await runLinting();
    results.push({
      name: 'ESLint',
      status: 'pass',
      message: 'No linting errors found',
    });
  } catch (error) {
    results.push({
      name: 'ESLint',
      status: 'fail',
      message: 'Linting errors found',
    });
  }

  try {
    await runTypeCheck();
    results.push({
      name: 'TypeScript',
      status: 'pass',
      message: 'No type errors found',
    });
  } catch (error) {
    results.push({
      name: 'TypeScript',
      status: 'fail',
      message: 'Type errors found',
    });
  }

  // Display results
  displayResults(results);

  // Exit with appropriate code
  const hasErrors = results.some(r => r.status === 'fail');
  const hasWarnings = results.some(r => r.status === 'warn');

  if (hasErrors) {
    console.log(chalk.red('\n❌ Validation failed with errors'));
    if (!options.fix) {
      console.log(chalk.yellow('Run with --fix to attempt automatic fixes'));
    }
    process.exit(1);
  } else if (hasWarnings) {
    console.log(chalk.yellow('\n⚠️  Validation completed with warnings'));
  } else {
    console.log(chalk.green('\n✅ All validations passed!'));
  }
}

async function validatePackageJson(): Promise<ValidationResult> {
  try {
    if (!existsSync('package.json')) {
      return {
        name: 'package.json',
        status: 'fail',
        message: 'package.json not found',
        fixable: false,
      };
    }

    const content = await readFile('package.json', 'utf-8');
    const packageJson = JSON.parse(content);

    // Check required fields
    const requiredFields = ['name', 'version', 'scripts'];
    const missingFields = requiredFields.filter(field => !packageJson[field]);

    if (missingFields.length > 0) {
      return {
        name: 'package.json',
        status: 'fail',
        message: `Missing required fields: ${missingFields.join(', ')}`,
        fixable: true,
      };
    }

    // Check required scripts
    const requiredScripts = ['dev', 'build'];
    const missingScripts = requiredScripts.filter(script => !packageJson.scripts?.[script]);

    if (missingScripts.length > 0) {
      return {
        name: 'package.json',
        status: 'warn',
        message: `Missing recommended scripts: ${missingScripts.join(', ')}`,
        fixable: true,
      };
    }

    return {
      name: 'package.json',
      status: 'pass',
      message: 'Valid package.json configuration',
    };

  } catch (error) {
    return {
      name: 'package.json',
      status: 'fail',
      message: `Invalid JSON: ${(error as Error).message}`,
      fixable: false,
    };
  }
}

async function validateEnvironment(): Promise<ValidationResult> {
  const hasEnvExample = existsSync('.env.example');
  const hasEnv = existsSync('.env');

  if (!hasEnvExample) {
    return {
      name: 'Environment',
      status: 'warn',
      message: '.env.example not found',
      fixable: true,
    };
  }

  if (!hasEnv) {
    return {
      name: 'Environment',
      status: 'warn',
      message: '.env not found - copy from .env.example',
      fixable: true,
    };
  }

  return {
    name: 'Environment',
    status: 'pass',
    message: 'Environment configuration found',
  };
}

async function validateBuildConfig(): Promise<ValidationResult> {
  const hasViteConfig = existsSync('vite.config.ts') || existsSync('vite.config.js');

  if (!hasViteConfig) {
    return {
      name: 'Build Config',
      status: 'fail',
      message: 'No Vite configuration found',
      fixable: true,
    };
  }

  return {
    name: 'Build Config',
    status: 'pass',
    message: 'Vite configuration found',
  };
}

async function validateNetlifyConfig(): Promise<ValidationResult> {
  const hasNetlifyToml = existsSync('netlify.toml');
  const hasRedirects = existsSync('public/_redirects');

  if (!hasNetlifyToml && !hasRedirects) {
    return {
      name: 'Netlify Config',
      status: 'warn',
      message: 'No Netlify configuration found',
      fixable: true,
    };
  }

  return {
    name: 'Netlify Config',
    status: 'pass',
    message: 'Netlify configuration found',
  };
}

async function validateGitIgnore(): Promise<ValidationResult> {
  if (!existsSync('.gitignore')) {
    return {
      name: '.gitignore',
      status: 'warn',
      message: '.gitignore not found',
      fixable: true,
    };
  }

  try {
    const content = await readFile('.gitignore', 'utf-8');
    const requiredPatterns = ['node_modules', 'dist', '.env'];
    const missingPatterns = requiredPatterns.filter(pattern => !content.includes(pattern));

    if (missingPatterns.length > 0) {
      return {
        name: '.gitignore',
        status: 'warn',
        message: `Missing patterns: ${missingPatterns.join(', ')}`,
        fixable: true,
      };
    }

    return {
      name: '.gitignore',
      status: 'pass',
      message: 'Complete .gitignore configuration',
    };

  } catch (error) {
    return {
      name: '.gitignore',
      status: 'fail',
      message: `Cannot read .gitignore: ${(error as Error).message}`,
      fixable: false,
    };
  }
}

async function validateTypeScript(): Promise<ValidationResult> {
  if (!existsSync('tsconfig.json')) {
    return {
      name: 'TypeScript Config',
      status: 'warn',
      message: 'tsconfig.json not found',
      fixable: true,
    };
  }

  try {
    const content = await readFile('tsconfig.json', 'utf-8');
    JSON.parse(content); // Validate JSON

    return {
      name: 'TypeScript Config',
      status: 'pass',
      message: 'Valid TypeScript configuration',
    };

  } catch (error) {
    return {
      name: 'TypeScript Config',
      status: 'fail',
      message: `Invalid tsconfig.json: ${(error as Error).message}`,
      fixable: false,
    };
  }
}

async function attemptFixes(results: ValidationResult[]) {
  const spinner = ora('Attempting to fix issues...').start();

  for (const result of results) {
    if (result.fixable && result.status !== 'pass') {
      try {
        await fixIssue(result);
        result.status = 'pass';
        result.message = `Fixed: ${result.message}`;
      } catch (error) {
        // Fix attempt failed, keep original status
      }
    }
  }

  spinner.succeed('Fix attempts completed');
}

async function fixIssue(result: ValidationResult) {
  switch (result.name) {
    case 'Environment':
      if (result.message.includes('.env.example')) {
        await createEnvExample();
      }
      break;

    case '.gitignore':
      await fixGitIgnore();
      break;

    case 'Netlify Config':
      await createNetlifyConfig();
      break;

    case 'TypeScript Config':
      if (result.message.includes('not found')) {
        await createTsConfig();
      }
      break;
  }
}

async function createEnvExample() {
  const content = `# Candlefish Dashboard Environment Variables
VITE_APP_NAME=Candlefish Dashboard
VITE_APP_VERSION=1.0.0
VITE_API_URL=https://api.candlefish.ai
VITE_ENVIRONMENT=development

# Deployment
NETLIFY_AUTH_TOKEN=
NETLIFY_SITE_ID=

# Optional
VITE_SENTRY_DSN=
VITE_ANALYTICS_ID=
`;
  await writeFile('.env.example', content);
}

async function fixGitIgnore() {
  const patterns = [
    'node_modules/',
    'dist/',
    '.env',
    '.DS_Store',
    '*.log',
    'coverage/',
  ];

  let content = '';
  if (existsSync('.gitignore')) {
    content = await readFile('.gitignore', 'utf-8');
  }

  for (const pattern of patterns) {
    if (!content.includes(pattern)) {
      content += `\n${pattern}`;
    }
  }

  await writeFile('.gitignore', content.trim() + '\n');
}

async function createNetlifyConfig() {
  const content = `[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
`;
  await writeFile('netlify.toml', content);
}

async function createTsConfig() {
  const content = {
    compilerOptions: {
      target: "ES2020",
      useDefineForClassFields: true,
      lib: ["ES2020", "DOM", "DOM.Iterable"],
      module: "ESNext",
      skipLibCheck: true,
      moduleResolution: "bundler",
      allowImportingTsExtensions: true,
      resolveJsonModule: true,
      isolatedModules: true,
      noEmit: true,
      jsx: "react-jsx",
      strict: true,
      noUnusedLocals: true,
      noUnusedParameters: true,
      noFallthroughCasesInSwitch: true
    },
    include: ["src"],
    references: [{ path: "./tsconfig.node.json" }]
  };

  await writeFile('tsconfig.json', JSON.stringify(content, null, 2));
}

function displayResults(results: ValidationResult[]) {
  console.log(chalk.bold('\n📋 Validation Results:\n'));

  for (const result of results) {
    const icon = getStatusIcon(result.status);
    const color = getStatusColor(result.status);

    console.log(`${icon} ${chalk.bold(result.name)}: ${color(result.message)}`);
  }
}

function getStatusIcon(status: string): string {
  switch (status) {
    case 'pass':
      return chalk.green('✓');
    case 'warn':
      return chalk.yellow('⚠');
    case 'fail':
      return chalk.red('✗');
    default:
      return '?';
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'pass':
      return chalk.green;
    case 'warn':
      return chalk.yellow;
    case 'fail':
      return chalk.red;
    default:
      return chalk.gray;
  }
}
