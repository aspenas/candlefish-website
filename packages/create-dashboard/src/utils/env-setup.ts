import { join } from 'path';
import { writeFile, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import chalk from 'chalk';
import ora from 'ora';
import prompts from 'prompts';

interface EnvConfig {
  [key: string]: {
    value?: string;
    description: string;
    required: boolean;
    default?: string;
  };
}

const ENV_CONFIG: EnvConfig = {
  VITE_APP_NAME: {
    description: 'Application name displayed in the dashboard',
    required: true,
    default: 'Candlefish Dashboard',
  },
  VITE_APP_VERSION: {
    description: 'Application version',
    required: false,
    default: '1.0.0',
  },
  VITE_API_URL: {
    description: 'API base URL',
    required: false,
    default: 'https://api.candlefish.ai',
  },
  NETLIFY_AUTH_TOKEN: {
    description: 'Netlify authentication token for deployments',
    required: false,
  },
  NETLIFY_SITE_ID: {
    description: 'Netlify site ID for deployments',
    required: false,
  },
  VITE_SENTRY_DSN: {
    description: 'Sentry DSN for error tracking',
    required: false,
  },
  VITE_ANALYTICS_ID: {
    description: 'Google Analytics tracking ID',
    required: false,
  },
  VITE_ENVIRONMENT: {
    description: 'Environment name (development, staging, production)',
    required: true,
    default: 'development',
  },
};

export async function setupEnvironment(targetDir: string) {
  const envPath = join(targetDir, '.env');
  const envExamplePath = join(targetDir, '.env.example');

  // Create .env.example file
  await createEnvExample(envExamplePath);

  // Check if .env already exists
  const envExists = existsSync(envPath);

  if (envExists) {
    const response = await prompts({
      type: 'confirm',
      name: 'updateEnv',
      message: '.env file exists. Update with missing variables?',
      initial: true,
    });

    if (response.updateEnv) {
      await updateEnvFile(envPath);
    }
  } else {
    const response = await prompts({
      type: 'confirm',
      name: 'createEnv',
      message: 'Create .env file with default values?',
      initial: true,
    });

    if (response.createEnv) {
      await createEnvFile(envPath);
    }
  }
}

async function createEnvExample(filePath: string) {
  const spinner = ora('Creating .env.example...').start();

  try {
    let content = '# Candlefish Dashboard Environment Variables\n';
    content += '# Copy this file to .env and fill in your values\n\n';

    for (const [key, config] of Object.entries(ENV_CONFIG)) {
      content += `# ${config.description}\n`;
      if (config.required) {
        content += `# REQUIRED\n`;
      }
      content += `${key}=${config.default || ''}\n\n`;
    }

    await writeFile(filePath, content);
    spinner.succeed('.env.example created');
  } catch (error) {
    spinner.fail('Failed to create .env.example');
    throw error;
  }
}

async function createEnvFile(filePath: string) {
  const spinner = ora('Creating .env file...').start();

  try {
    let content = '# Candlefish Dashboard Environment Variables\n';
    content += `# Generated on ${new Date().toISOString()}\n\n`;

    // Get project name from package.json if available
    const projectName = await getProjectName(filePath);

    for (const [key, config] of Object.entries(ENV_CONFIG)) {
      let value = config.default || '';

      // Smart defaults based on context
      if (key === 'VITE_APP_NAME' && projectName) {
        value = projectName;
      } else if (key === 'VITE_ENVIRONMENT') {
        value = 'development';
      }

      content += `${key}=${value}\n`;
    }

    await writeFile(filePath, content);
    spinner.succeed('.env file created');

    console.log(chalk.yellow('⚠️  Remember to:'));
    console.log('  - Fill in your actual values in .env');
    console.log('  - Never commit .env to version control');
    console.log('  - Use .env.example as a reference for others');
  } catch (error) {
    spinner.fail('Failed to create .env file');
    throw error;
  }
}

async function updateEnvFile(filePath: string) {
  const spinner = ora('Updating .env file...').start();

  try {
    const existingContent = await readFile(filePath, 'utf-8');
    const existingVars = parseEnvFile(existingContent);

    let newContent = existingContent;
    let addedVars: string[] = [];

    for (const [key, config] of Object.entries(ENV_CONFIG)) {
      if (!existingVars.has(key)) {
        newContent += `\n# ${config.description}\n`;
        newContent += `${key}=${config.default || ''}\n`;
        addedVars.push(key);
      }
    }

    await writeFile(filePath, newContent);

    if (addedVars.length > 0) {
      spinner.succeed(`Updated .env with ${addedVars.length} new variables`);
      console.log(chalk.blue('Added variables:'), addedVars.join(', '));
    } else {
      spinner.succeed('.env file is up to date');
    }
  } catch (error) {
    spinner.fail('Failed to update .env file');
    throw error;
  }
}

function parseEnvFile(content: string): Set<string> {
  const vars = new Set<string>();
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key] = trimmed.split('=');
      if (key) {
        vars.add(key);
      }
    }
  }

  return vars;
}

async function getProjectName(envFilePath: string): Promise<string | null> {
  try {
    const packageJsonPath = join(envFilePath, '../package.json');
    const packageJsonContent = await readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageJsonContent);
    return packageJson.name || null;
  } catch (error) {
    return null;
  }
}
