#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const packageJson = require('../package.json');
const { init, deploy, listAgents, authenticate, checkStatus } = require('../lib/index');

const program = new Command();

// Configure CLI
program
  .name('claude-deploy')
  .description('Professional agent deployment and integration toolkit for Claude Code')
  .version(packageJson.version);

// Global error handler
process.on('uncaughtException', (error) => {
  console.error(chalk.red('❌ Unexpected error:'), error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('❌ Unhandled promise rejection:'), reason);
  process.exit(1);
});

// Commands
program
  .command('init')
  .description('Initialize Claude Code deployment configuration')
  .option('-f, --force', 'Force reinitialize existing configuration')
  .option('--skip-auth', 'Skip NPM authentication check')
  .option('--config-path <path>', 'Custom configuration path')
  .action(async (options) => {
    try {
      console.log(chalk.blue('🚀 Initializing Claude Code deployment...'));
      await init(options);
      console.log(chalk.green('✅ Initialization complete!'));
    } catch (error) {
      console.error(chalk.red('❌ Initialization failed:'), error.message);
      process.exit(1);
    }
  });

program
  .command('auth')
  .description('Authenticate with NPM and verify access tokens')
  .option('--token <token>', 'NPM authentication token')
  .option('--check-only', 'Only verify existing authentication')
  .action(async (options) => {
    try {
      console.log(chalk.blue('🔑 Managing NPM authentication...'));
      await authenticate(options);
      console.log(chalk.green('✅ Authentication successful!'));
    } catch (error) {
      console.error(chalk.red('❌ Authentication failed:'), error.message);
      process.exit(1);
    }
  });

program
  .command('list')
  .description('List all available agents with categories and descriptions')
  .option('-c, --category <category>', 'Filter by category')
  .option('-s, --search <term>', 'Search agents by name or description')
  .option('--json', 'Output in JSON format')
  .action(async (options) => {
    try {
      console.log(chalk.blue('📋 Listing available agents...'));
      await listAgents(options);
    } catch (error) {
      console.error(chalk.red('❌ Failed to list agents:'), error.message);
      process.exit(1);
    }
  });

program
  .command('deploy <agent-name>')
  .description('Deploy a specific agent with templates and configuration')
  .option('-p, --path <path>', 'Target deployment path')
  .option('--template <template>', 'Specific template version')
  .option('--no-interactive', 'Run in non-interactive mode')
  .option('--config <config>', 'JSON configuration string')
  .action(async (agentName, options) => {
    try {
      console.log(chalk.blue(`🚀 Deploying agent: ${agentName}...`));
      await deploy(agentName, options);
      console.log(chalk.green('✅ Deployment complete!'));
    } catch (error) {
      console.error(chalk.red('❌ Deployment failed:'), error.message);
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Check Claude Code installation and configuration status')
  .option('--verbose', 'Show detailed status information')
  .action(async (options) => {
    try {
      console.log(chalk.blue('🔍 Checking system status...'));
      await checkStatus(options);
    } catch (error) {
      console.error(chalk.red('❌ Status check failed:'), error.message);
      process.exit(1);
    }
  });

// Help customization
program.on('--help', () => {
  console.log('');
  console.log(chalk.cyan('Examples:'));
  console.log('  $ claude-deploy init                    # Initialize configuration');
  console.log('  $ claude-deploy auth                    # Authenticate with NPM');
  console.log('  $ claude-deploy list                    # List all agents');
  console.log('  $ claude-deploy list -c backend         # List backend agents');
  console.log('  $ claude-deploy deploy express-api      # Deploy Express API agent');
  console.log('  $ claude-deploy status --verbose        # Check detailed status');
  console.log('');
  console.log(chalk.cyan('Agent Categories:'));
  console.log('  • backend       - API servers, databases, microservices');
  console.log('  • frontend      - React, Vue, Angular applications');
  console.log('  • fullstack     - Complete application stacks');
  console.log('  • mobile        - React Native, iOS, Android apps');
  console.log('  • devops        - Docker, CI/CD, monitoring tools');
  console.log('  • ai-ml         - Machine learning and AI integrations');
  console.log('  • data          - Analytics, ETL, data processing');
  console.log('  • security      - Authentication, encryption, compliance');
  console.log('');
  console.log(chalk.cyan('Documentation:'));
  console.log('  GitHub: https://github.com/candlefish-ai/claude-code-deploy');
  console.log('  Website: https://candlefish.ai');
});

// Parse and execute
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
