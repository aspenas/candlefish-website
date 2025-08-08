import { execa } from 'execa';
import chalk from 'chalk';
import ora from 'ora';
import prompts from 'prompts';
import { existsSync } from 'fs';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

interface DeployOptions {
  platform?: string;
  prod?: boolean;
  preview?: boolean;
}

interface NetlifyConfig {
  siteId?: string;
  authToken?: string;
}

export async function deployProject(options: DeployOptions = {}) {
  console.log(chalk.cyan('🚀 Deploying project...\n'));

  // Validate project structure
  if (!existsSync('package.json')) {
    console.error(chalk.red('Error: No package.json found. Are you in a Candlefish project?'));
    process.exit(1);
  }

  // Ensure build exists
  if (!existsSync('dist')) {
    const response = await prompts({
      type: 'confirm',
      name: 'build',
      message: 'No build found. Build project first?',
      initial: true,
    });

    if (response.build) {
      await runBuild();
    } else {
      console.log(chalk.yellow('Deployment cancelled. Build project first.'));
      process.exit(0);
    }
  }

  // Deploy based on platform
  switch (options.platform) {
    case 'netlify':
    default:
      await deployToNetlify(options);
      break;
  }
}

async function runBuild() {
  const spinner = ora('Building project...').start();

  try {
    await execa('npm', ['run', 'build'], { stdio: 'pipe' });
    spinner.succeed('Build completed');
  } catch (error) {
    spinner.fail('Build failed');
    console.error(chalk.red('Build error:'), (error as Error).message);
    process.exit(1);
  }
}

async function deployToNetlify(options: DeployOptions) {
  console.log(chalk.blue('📡 Deploying to Netlify...\n'));

  // Check Netlify CLI
  const hasNetlifyCI = await checkNetlifyCLI();
  if (!hasNetlifyCI) {
    console.error(chalk.red('Netlify CLI not found. Install it first:'));
    console.log(chalk.cyan('  npm install -g netlify-cli'));
    process.exit(1);
  }

  // Get deployment configuration
  const config = await getNetlifyConfig();

  const spinner = ora('Deploying to Netlify...').start();

  try {
    // Build deployment command
    const args = ['deploy'];

    if (options.prod && !options.preview) {
      args.push('--prod');
    }

    args.push('--dir=dist');

    // Add site ID if available
    if (config.siteId) {
      args.push('--site', config.siteId);
    }

    // Execute deployment
    const result = await execa('netlify', args, {
      stdio: 'pipe',
      env: {
        ...process.env,
        ...(config.authToken && { NETLIFY_AUTH_TOKEN: config.authToken }),
      },
    });

    spinner.succeed('Deployment completed successfully');

    // Parse deployment output for URLs
    const output = result.stdout;
    const urlMatch = output.match(/Website URL: (https?:\/\/[^\s]+)/);
    const deployMatch = output.match(/Website Draft URL: (https?:\/\/[^\s]+)/);

    if (urlMatch) {
      console.log(chalk.green('🌐 Live URL:'), chalk.cyan(urlMatch[1]));
    }

    if (deployMatch && options.preview) {
      console.log(chalk.blue('🔗 Preview URL:'), chalk.cyan(deployMatch[1]));
    }

    // Save deployment info
    await saveDeploymentInfo(config, urlMatch?.[1]);

    console.log(chalk.green('\n✅ Deployment successful!'));

  } catch (error) {
    spinner.fail('Deployment failed');

    if ((error as any).stdout) {
      console.log('\n' + chalk.gray('Deployment output:'));
      console.log((error as any).stdout);
    }

    if ((error as any).stderr) {
      console.log('\n' + chalk.gray('Deployment errors:'));
      console.log((error as any).stderr);
    }

    // Common error handling
    if ((error as Error).message.includes('Not authorized')) {
      console.log(chalk.yellow('\n💡 Authentication required:'));
      console.log(chalk.cyan('  netlify login'));
    }

    if ((error as Error).message.includes('No site id specified')) {
      console.log(chalk.yellow('\n💡 Site setup required:'));
      console.log(chalk.cyan('  netlify init'));
    }

    process.exit(1);
  }
}

async function checkNetlifyCLI(): Promise<boolean> {
  try {
    await execa('netlify', ['--version'], { stdio: 'pipe' });
    return true;
  } catch (error) {
    return false;
  }
}

async function getNetlifyConfig(): Promise<NetlifyConfig> {
  const config: NetlifyConfig = {};

  // Try to get config from environment
  config.authToken = process.env.NETLIFY_AUTH_TOKEN;
  config.siteId = process.env.NETLIFY_SITE_ID;

  // Try to get config from .env file
  if (existsSync('.env')) {
    try {
      const envContent = await readFile('.env', 'utf-8');
      const authTokenMatch = envContent.match(/^NETLIFY_AUTH_TOKEN=(.+)$/m);
      const siteIdMatch = envContent.match(/^NETLIFY_SITE_ID=(.+)$/m);

      if (authTokenMatch && !config.authToken) {
        config.authToken = authTokenMatch[1];
      }

      if (siteIdMatch && !config.siteId) {
        config.siteId = siteIdMatch[1];
      }
    } catch (error) {
      // .env file reading is optional
    }
  }

  // Try to get config from Netlify CLI
  if (!config.siteId) {
    try {
      const result = await execa('netlify', ['status', '--json'], { stdio: 'pipe' });
      const status = JSON.parse(result.stdout);
      if (status.siteInfo?.id) {
        config.siteId = status.siteInfo.id;
      }
    } catch (error) {
      // Netlify status is optional
    }
  }

  return config;
}

async function saveDeploymentInfo(config: NetlifyConfig, url?: string) {
  if (!url) return;

  try {
    const deploymentInfo = {
      url,
      siteId: config.siteId,
      deployedAt: new Date().toISOString(),
    };

    await writeFile(
      'deployment-info.json',
      JSON.stringify(deploymentInfo, null, 2)
    );
  } catch (error) {
    // Saving deployment info is optional
  }
}
