import { Command } from 'commander';
import chalk from 'chalk';
import { setupDashboard } from './commands/setup.js';
import { buildProject } from './commands/build.js';
import { startDev } from './commands/dev.js';
import { deployProject } from './commands/deploy.js';
import { runTests } from './commands/test.js';
import { validateSetup } from './commands/validate.js';
import { checkSystemRequirements } from './utils/system-check.js';

const program = new Command();

program
  .name('create-candlefish-dashboard')
  .description('Create and manage Candlefish AI dashboard applications')
  .version('1.0.0');

program
  .command('setup [project-name]')
  .description('Initialize a new dashboard project or setup existing one')
  .option('-t, --template <template>', 'Project template', 'default')
  .option('--skip-git', 'Skip git initialization')
  .option('--skip-install', 'Skip dependency installation')
  .action(async (projectName, options) => {
    await checkSystemRequirements();
    await setupDashboard(projectName, options);
  });

program
  .command('build')
  .description('Build project for production')
  .option('-c, --config <config>', 'Build configuration', 'default')
  .option('--analyze', 'Analyze bundle size')
  .action(async (options) => {
    await buildProject(options);
  });

program
  .command('dev')
  .description('Start development server')
  .option('-p, --port <port>', 'Port number', '5173')
  .option('--host <host>', 'Host address', 'localhost')
  .option('--open', 'Open browser automatically')
  .action(async (options) => {
    await startDev(options);
  });

program
  .command('deploy')
  .description('Deploy to production')
  .option('-p, --platform <platform>', 'Deployment platform', 'netlify')
  .option('--prod', 'Deploy to production', true)
  .option('--preview', 'Deploy as preview')
  .action(async (options) => {
    await deployProject(options);
  });

program
  .command('test')
  .description('Run test suite')
  .option('--coverage', 'Generate coverage report')
  .option('--watch', 'Watch for changes')
  .option('--e2e', 'Run end-to-end tests')
  .action(async (options) => {
    await runTests(options);
  });

program
  .command('validate')
  .description('Validate project configuration')
  .option('--fix', 'Automatically fix issues')
  .action(async (options) => {
    await validateSetup(options);
  });

export async function main() {
  try {
    console.log(chalk.cyan('🐟 Candlefish AI Dashboard CLI\n'));
    await program.parseAsync(process.argv);
  } catch (error) {
    console.error(chalk.red('Error:'), (error as Error).message);
    process.exit(1);
  }
}
