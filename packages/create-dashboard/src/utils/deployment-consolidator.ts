import { existsSync } from 'fs';
import { writeFile, readFile } from 'fs/promises';
import { join } from 'path';
import { execa } from 'execa';
import chalk from 'chalk';
import ora from 'ora';

interface DeploymentConfig {
  platform: 'netlify' | 'vercel' | 'aws' | 'gcp';
  siteId?: string;
  authToken?: string;
  buildDir: string;
  buildCommand: string;
  domain?: string;
}

interface ConsolidatedDeployment {
  main: DeploymentConfig;
  family?: DeploymentConfig;
  additional?: DeploymentConfig[];
}

export async function consolidateDeploymentScripts(projectDir: string): Promise<void> {
  const spinner = ora('Consolidating deployment scripts...').start();

  try {
    // Analyze existing deployment scripts
    const deploymentConfigs = await analyzeExistingDeployments(projectDir);

    // Create unified deployment configuration
    const unifiedConfig = createUnifiedConfig(deploymentConfigs);

    // Generate new deployment script
    await generateUnifiedDeploymentScript(projectDir, unifiedConfig);

    // Create deployment configuration file
    await createDeploymentConfig(projectDir, unifiedConfig);

    spinner.succeed('Deployment scripts consolidated');

    console.log(chalk.green('✅ Created unified deployment system:'));
    console.log(chalk.cyan('  scripts/deploy.js       # Unified deployment script'));
    console.log(chalk.cyan('  deployment.config.json  # Deployment configuration'));
    console.log(chalk.cyan('  Use: npx create-candlefish-dashboard deploy'));

  } catch (error) {
    spinner.fail('Failed to consolidate deployment scripts');
    throw error;
  }
}

async function analyzeExistingDeployments(projectDir: string): Promise<any[]> {
  const deploymentScripts = [
    'deploy.sh',
    'deploy-now.sh',
    'deploy-claude-site.sh',
    'deploy-family-dashboard.sh',
    'direct-netlify-deploy.sh',
    'netlify-deploy-api.sh',
  ];

  const configs: any[] = [];

  for (const script of deploymentScripts) {
    const scriptPath = join(projectDir, script);
    if (existsSync(scriptPath)) {
      try {
        const content = await readFile(scriptPath, 'utf-8');
        const config = parseDeploymentScript(script, content);
        if (config) {
          configs.push(config);
        }
      } catch (error) {
        console.warn(chalk.yellow(`Warning: Could not parse ${script}`));
      }
    }
  }

  return configs;
}

function parseDeploymentScript(filename: string, content: string): DeploymentConfig | null {
  const config: Partial<DeploymentConfig> = {
    platform: 'netlify', // Default assumption
    buildDir: 'dist',
    buildCommand: 'npm run build',
  };

  // Extract site ID
  const siteIdMatch = content.match(/SITE_ID[="']([^"']+)['"]/);
  if (siteIdMatch) {
    config.siteId = siteIdMatch[1];
  }

  // Extract site ID from netlify deploy command
  const netlifySiteMatch = content.match(/--site[=\s]+([^\s]+)/);
  if (netlifySiteMatch) {
    config.siteId = netlifySiteMatch[1];
  }

  // Extract build directory
  const buildDirMatch = content.match(/--dir[=\s]+([^\s]+)/);
  if (buildDirMatch) {
    config.buildDir = buildDirMatch[1].replace('./', '');
  }

  // Extract domain from comments or echo statements
  const domainMatch = content.match(/https?:\/\/([^\/\s"']+)/);
  if (domainMatch) {
    config.domain = domainMatch[1];
  }

  // Determine deployment type based on filename
  if (filename.includes('family')) {
    config.domain = config.domain || 'candlefish.ai/docs/privileged/family/';
  } else if (filename.includes('claude')) {
    config.domain = config.domain || 'claude.candlefish.ai';
  } else {
    config.domain = config.domain || 'candlefish.ai';
  }

  return config as DeploymentConfig;
}

function createUnifiedConfig(configs: any[]): ConsolidatedDeployment {
  // Find main deployment (usually the one without specific prefixes)
  const mainConfig = configs.find(c =>
    c.domain === 'candlefish.ai' ||
    !c.domain?.includes('family') && !c.domain?.includes('claude')
  ) || configs[0];

  // Find family deployment
  const familyConfig = configs.find(c =>
    c.domain?.includes('family') || c.domain?.includes('privileged')
  );

  // Find claude-specific deployment
  const claudeConfig = configs.find(c =>
    c.domain?.includes('claude')
  );

  const unified: ConsolidatedDeployment = {
    main: mainConfig || {
      platform: 'netlify',
      siteId: 'ed200909-886f-47ca-950c-58727dca0b9c', // Default from scripts
      buildDir: 'dist',
      buildCommand: 'npm run build',
      domain: 'candlefish.ai',
    },
  };

  if (familyConfig) {
    unified.family = {
      ...familyConfig,
      buildCommand: 'npm run family:build',
    };
  }

  if (claudeConfig && claudeConfig !== mainConfig) {
    unified.additional = [claudeConfig];
  }

  return unified;
}

async function generateUnifiedDeploymentScript(projectDir: string, config: ConsolidatedDeployment): Promise<void> {
  const scriptContent = `#!/usr/bin/env node

/**
 * Unified Deployment Script for Candlefish Dashboard
 * Consolidates all deployment configurations into a single script
 * Generated by @candlefish/create-dashboard
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const deploymentConfig = ${JSON.stringify(config, null, 2)};

async function deploy(target = 'main', options = {}) {
  const { preview = false, skipBuild = false } = options;

  console.log(\`🚀 Deploying \${target} to \${preview ? 'preview' : 'production'}...\`);

  const targetConfig = getTargetConfig(target);
  if (!targetConfig) {
    throw new Error(\`Unknown deployment target: \${target}\`);
  }

  // Build if needed
  if (!skipBuild) {
    console.log('📦 Building project...');
    try {
      execSync(targetConfig.buildCommand, { stdio: 'inherit' });
    } catch (error) {
      console.error('❌ Build failed');
      process.exit(1);
    }
  }

  // Validate build output
  if (!existsSync(targetConfig.buildDir)) {
    console.error(\`❌ Build directory not found: \${targetConfig.buildDir}\`);
    process.exit(1);
  }

  // Deploy based on platform
  await deployToPlatform(targetConfig, preview);

  console.log('✅ Deployment complete!');
  if (targetConfig.domain) {
    console.log(\`🌐 Visit: https://\${targetConfig.domain}\`);
  }
}

function getTargetConfig(target) {
  switch (target) {
    case 'main':
      return deploymentConfig.main;
    case 'family':
      return deploymentConfig.family;
    default:
      return deploymentConfig.additional?.find(c => c.domain?.includes(target));
  }
}

async function deployToPlatform(config, preview) {
  switch (config.platform) {
    case 'netlify':
      await deployToNetlify(config, preview);
      break;
    default:
      throw new Error(\`Unsupported platform: \${config.platform}\`);
  }
}

async function deployToNetlify(config, preview) {
  const args = ['netlify', 'deploy'];

  if (!preview) {
    args.push('--prod');
  }

  args.push('--dir', config.buildDir);

  if (config.siteId) {
    args.push('--site', config.siteId);
  }

  try {
    execSync(args.join(' '), { stdio: 'inherit' });
  } catch (error) {
    console.error('❌ Netlify deployment failed');
    console.error('💡 Make sure you are logged in: netlify login');
    process.exit(1);
  }
}

// CLI interface
const args = process.argv.slice(2);
const target = args[0] || 'main';
const preview = args.includes('--preview');
const skipBuild = args.includes('--skip-build');

deploy(target, { preview, skipBuild }).catch(error => {
  console.error('❌ Deployment failed:', error.message);
  process.exit(1);
});
`;

  const scriptsDir = join(projectDir, 'scripts');
  if (!existsSync(scriptsDir)) {
    await import('fs').then(fs => fs.promises.mkdir(scriptsDir, { recursive: true }));
  }

  await writeFile(join(scriptsDir, 'deploy.js'), scriptContent);

  // Make executable
  await import('fs').then(fs => fs.promises.chmod(join(scriptsDir, 'deploy.js'), '755'));
}

async function createDeploymentConfig(projectDir: string, config: ConsolidatedDeployment): Promise<void> {
  const configWithMetadata = {
    ...config,
    _metadata: {
      generatedBy: '@candlefish/create-dashboard',
      generatedAt: new Date().toISOString(),
      version: '1.0.0',
    },
    _usage: {
      main: 'npx create-candlefish-dashboard deploy',
      family: 'npx create-candlefish-dashboard deploy family',
      preview: 'npx create-candlefish-dashboard deploy --preview',
    },
  };

  await writeFile(
    join(projectDir, 'deployment.config.json'),
    JSON.stringify(configWithMetadata, null, 2)
  );
}
