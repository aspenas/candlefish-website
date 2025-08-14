const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const inquirer = require('inquirer');
const ora = require('ora');

const auth = require('./auth');
const agents = require('./agents');
const claudeIntegration = require('./claude-integration');
const config = require('./config');
const templates = require('./templates');

/**
 * Initialize Claude Code deployment configuration
 * @param {Object} options - Initialization options
 * @param {boolean} options.force - Force reinitialize
 * @param {boolean} options.skipAuth - Skip authentication
 * @param {string} options.configPath - Custom config path
 */
async function init(options = {}) {
  const spinner = ora('Initializing configuration...').start();

  try {
    // Check if configuration already exists
    if (!options.force && await config.exists()) {
      spinner.stop();
      const { proceed } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'proceed',
          message: 'Configuration already exists. Reinitialize?',
          default: false
        }
      ]);

      if (!proceed) {
        console.log(chalk.yellow('⏸️  Initialization cancelled.'));
        return;
      }
      spinner.start('Reinitializing configuration...');
    }

    // Check Claude Code installation
    spinner.text = 'Checking Claude Code installation...';
    const claudeStatus = await claudeIntegration.checkInstallation();

    if (!claudeStatus.installed) {
      spinner.fail('Claude Code not found!');
      console.log(chalk.red('\n❌ Claude Code is not installed or not in PATH.'));
      console.log(chalk.cyan('📥 Install Claude Code:'));
      console.log('   curl -fsSL https://claude.ai/install.sh | sh');
      throw new Error('Claude Code installation required');
    }

    // Check NPM authentication (unless skipped)
    if (!options.skipAuth) {
      spinner.text = 'Verifying NPM authentication...';
      try {
        await auth.verifyToken();
      } catch (error) {
        spinner.warn('NPM authentication issue detected');
        console.log(chalk.yellow('\n⚠️  NPM authentication needs setup.'));
        console.log(chalk.cyan('🔑 Run: claude-deploy auth'));
      }
    }

    // Create configuration
    spinner.text = 'Creating configuration...';
    const configData = {
      version: require('../package.json').version,
      claudePath: claudeStatus.path,
      initialized: new Date().toISOString(),
      npmRegistry: 'https://registry.npmjs.org/',
      agents: {
        defaultCategory: 'backend',
        defaultPath: process.cwd()
      }
    };

    await config.save(configData, options.configPath);

    // Initialize Claude Code integration
    spinner.text = 'Setting up Claude Code integration...';
    await claudeIntegration.setupIntegration();

    spinner.succeed('Configuration initialized successfully!');

    console.log(chalk.green('\n✅ Setup complete!'));
    console.log(chalk.cyan('📋 Next steps:'));
    console.log('   1. Run: claude-deploy list');
    console.log('   2. Run: claude-deploy deploy <agent-name>');

  } catch (error) {
    spinner.fail('Initialization failed');
    throw error;
  }
}

/**
 * Authenticate with NPM
 * @param {Object} options - Authentication options
 * @param {string} options.token - NPM token
 * @param {boolean} options.checkOnly - Only verify existing auth
 */
async function authenticate(options = {}) {
  if (options.checkOnly) {
    const spinner = ora('Checking authentication status...').start();
    try {
      const tokenInfo = await auth.verifyToken();
      spinner.succeed('Authentication valid');
      console.log(chalk.green('\n✅ NPM authentication is valid'));
      console.log(chalk.cyan(`🔑 Token: ${tokenInfo.token.substring(0, 10)}...`));
      return;
    } catch (error) {
      spinner.fail('Authentication check failed');
      throw error;
    }
  }

  if (options.token) {
    const spinner = ora('Validating provided token...').start();
    try {
      await auth.setToken(options.token);
      const tokenInfo = await auth.verifyToken();
      spinner.succeed('Token validated and saved');
      console.log(chalk.green('\n✅ NPM token configured successfully'));
      return;
    } catch (error) {
      spinner.fail('Token validation failed');
      throw error;
    }
  }

  // Interactive authentication
  const { token } = await inquirer.prompt([
    {
      type: 'password',
      name: 'token',
      message: 'Enter your NPM authentication token:',
      mask: '*',
      validate: (input) => {
        if (!input || input.length < 10) {
          return 'Please enter a valid NPM token';
        }
        return true;
      }
    }
  ]);

  const spinner = ora('Validating token...').start();
  try {
    await auth.setToken(token);
    await auth.verifyToken();
    spinner.succeed('Authentication successful');
  } catch (error) {
    spinner.fail('Authentication failed');
    throw error;
  }
}

/**
 * List available agents
 * @param {Object} options - List options
 * @param {string} options.category - Filter by category
 * @param {string} options.search - Search term
 * @param {boolean} options.json - JSON output
 */
async function listAgents(options = {}) {
  try {
    const agentList = await agents.getAgents(options);

    if (options.json) {
      console.log(JSON.stringify(agentList, null, 2));
      return;
    }

    // Display agents in formatted table
    console.log(chalk.cyan('\n📦 Available Agents:\n'));

    const categories = agents.getCategories();
    for (const category of categories) {
      const categoryAgents = agentList.filter(agent => agent.category === category);

      if (categoryAgents.length === 0) continue;
      if (options.category && options.category !== category) continue;

      console.log(chalk.bold.blue(`\n${category.toUpperCase()}:`));

      categoryAgents.forEach(agent => {
        const status = agent.deployed ? chalk.green('✓') : chalk.gray('○');
        console.log(`  ${status} ${chalk.bold(agent.name)}`);
        console.log(`    ${chalk.gray(agent.description)}`);
        console.log(`    ${chalk.dim(`Technologies: ${agent.technologies.join(', ')}`)}`);
      });
    }

    const totalCount = agentList.length;
    const deployedCount = agentList.filter(a => a.deployed).length;

    console.log(chalk.cyan(`\n📊 Total: ${totalCount} agents (${deployedCount} deployed)`));

  } catch (error) {
    throw new Error(`Failed to list agents: ${error.message}`);
  }
}

/**
 * Deploy a specific agent
 * @param {string} agentName - Name of agent to deploy
 * @param {Object} options - Deployment options
 * @param {string} options.path - Target path
 * @param {string} options.template - Template version
 * @param {boolean} options.interactive - Interactive mode
 * @param {string} options.config - JSON configuration
 */
async function deploy(agentName, options = {}) {
  const spinner = ora(`Preparing to deploy ${agentName}...`).start();

  try {
    // Get agent information
    const agent = await agents.getAgent(agentName);
    if (!agent) {
      throw new Error(`Agent '${agentName}' not found`);
    }

    // Determine deployment path
    let deployPath = options.path;
    if (!deployPath) {
      const configData = await config.load();
      deployPath = configData.agents.defaultPath || process.cwd();
    }

    // Create project directory
    const projectPath = path.join(deployPath, agentName);

    if (await fs.pathExists(projectPath)) {
      spinner.stop();
      const { overwrite } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'overwrite',
          message: `Directory '${agentName}' already exists. Overwrite?`,
          default: false
        }
      ]);

      if (!overwrite) {
        console.log(chalk.yellow('⏸️  Deployment cancelled.'));
        return;
      }

      spinner.start(`Overwriting ${agentName}...`);
      await fs.remove(projectPath);
    }

    // Download and extract template
    spinner.text = 'Downloading template...';
    await templates.download(agent, projectPath, options.template);

    // Configure project
    spinner.text = 'Configuring project...';
    let projectConfig = {};

    if (options.config) {
      try {
        projectConfig = JSON.parse(options.config);
      } catch (error) {
        throw new Error(`Invalid JSON configuration: ${error.message}`);
      }
    } else if (options.interactive !== false) {
      spinner.stop();
      projectConfig = await templates.configure(agent);
      spinner.start('Applying configuration...');
    }

    await templates.apply(projectPath, agent, projectConfig);

    // Setup Claude Code integration
    spinner.text = 'Setting up Claude Code integration...';
    await claudeIntegration.setupProject(projectPath, agent);

    // Install dependencies
    spinner.text = 'Installing dependencies...';
    await templates.installDependencies(projectPath, agent);

    spinner.succeed(`Successfully deployed ${agentName}!`);

    console.log(chalk.green(`\n✅ Agent '${agentName}' deployed successfully!`));
    console.log(chalk.cyan(`📁 Location: ${projectPath}`));
    console.log(chalk.cyan('🚀 Next steps:'));
    console.log(`   cd ${agentName}`);
    console.log('   claude-code init');
    console.log('   npm start');

  } catch (error) {
    spinner.fail('Deployment failed');
    throw error;
  }
}

/**
 * Check system status
 * @param {Object} options - Status options
 * @param {boolean} options.verbose - Detailed output
 */
async function checkStatus(options = {}) {
  const checks = [
    {
      name: 'Claude Code Installation',
      check: claudeIntegration.checkInstallation
    },
    {
      name: 'NPM Authentication',
      check: auth.verifyToken
    },
    {
      name: 'Configuration',
      check: config.exists
    }
  ];

  console.log(chalk.blue('\n🔍 System Status Check:\n'));

  for (const { name, check } of checks) {
    try {
      const result = await check();
      console.log(chalk.green(`✅ ${name}: OK`));

      if (options.verbose && result) {
        if (typeof result === 'object') {
          Object.entries(result).forEach(([key, value]) => {
            console.log(chalk.dim(`    ${key}: ${value}`));
          });
        }
      }
    } catch (error) {
      console.log(chalk.red(`❌ ${name}: FAILED`));
      if (options.verbose) {
        console.log(chalk.dim(`    Error: ${error.message}`));
      }
    }
  }

  console.log();
}

module.exports = {
  init,
  authenticate,
  listAgents,
  deploy,
  checkStatus
};
