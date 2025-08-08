import { execaCommand, execa } from 'execa';
import chalk from 'chalk';
import ora from 'ora';
import { existsSync } from 'fs';

interface TestOptions {
  coverage?: boolean;
  watch?: boolean;
  e2e?: boolean;
}

export async function runTests(options: TestOptions = {}) {
  console.log(chalk.cyan('🧪 Running test suite...\n'));

  // Validate project structure
  if (!existsSync('package.json')) {
    console.error(chalk.red('Error: No package.json found. Are you in a Candlefish project?'));
    process.exit(1);
  }

  try {
    // Run different types of tests based on options
    if (options.e2e) {
      await runE2ETests();
    } else {
      await runUnitTests(options);
    }

    console.log(chalk.green('\n✅ All tests passed!'));

  } catch (error) {
    console.error(chalk.red('\n❌ Tests failed'));
    process.exit(1);
  }
}

async function runUnitTests(options: TestOptions) {
  const spinner = ora('Running unit tests...').start();

  try {
    // Check if we have Jest or Vitest configuration
    const hasJest = existsSync('jest.config.js') || existsSync('jest.config.json');
    const hasVitest = existsSync('vitest.config.ts') || existsSync('vitest.config.js');

    let testCommand = 'test';
    let testRunner = 'npm';

    if (hasVitest) {
      testCommand = 'vitest run';
    } else if (hasJest) {
      testCommand = 'jest';
    }

    // Add coverage if requested
    if (options.coverage) {
      if (hasVitest) {
        testCommand += ' --coverage';
      } else if (hasJest) {
        testCommand += ' --coverage';
      }
    }

    // Add watch mode if requested
    if (options.watch) {
      if (hasVitest) {
        testCommand = 'vitest';  // vitest runs in watch mode by default
      } else if (hasJest) {
        testCommand += ' --watch';
      }
    }

    spinner.stop();

    const result = await execaCommand(`npm run ${testCommand}`, {
      stdio: 'inherit',
    });

    if (options.coverage) {
      console.log(chalk.blue('\n📊 Coverage report generated'));
      if (existsSync('coverage/lcov-report/index.html')) {
        console.log(chalk.cyan('View detailed coverage: coverage/lcov-report/index.html'));
      }
    }

  } catch (error) {
    spinner.fail('Unit tests failed');
    throw error;
  }
}

async function runE2ETests() {
  const spinner = ora('Running end-to-end tests...').start();

  try {
    // Check if we have Playwright or Cypress
    const hasPlaywright = existsSync('playwright.config.ts') || existsSync('playwright.config.js');
    const hasCypress = existsSync('cypress.config.js') || existsSync('cypress.config.ts');

    if (hasPlaywright) {
      spinner.text = 'Running Playwright tests...';
      await execa('npx', ['playwright', 'test'], {
        stdio: 'inherit',
      });
    } else if (hasCypress) {
      spinner.text = 'Running Cypress tests...';
      await execa('npx', ['cypress', 'run'], {
        stdio: 'inherit',
      });
    } else {
      spinner.fail('No E2E test framework found');
      console.log(chalk.yellow('Install Playwright or Cypress to run E2E tests:'));
      console.log(chalk.cyan('  npm install -D @playwright/test'));
      console.log(chalk.cyan('  npm install -D cypress'));
      return;
    }

    spinner.succeed('E2E tests completed');

  } catch (error) {
    spinner.fail('E2E tests failed');

    // Check if it's a browser installation issue
    if ((error as Error).message.includes('browser') || (error as Error).message.includes('chromium')) {
      console.log(chalk.yellow('\n💡 Browser installation may be required:'));
      if (existsSync('playwright.config.ts')) {
        console.log(chalk.cyan('  npx playwright install'));
      }
    }

    throw error;
  }
}

export async function runLinting() {
  const spinner = ora('Running linter...').start();

  try {
    // Check for different linting setups
    const hasESLint = existsSync('.eslintrc.js') || existsSync('.eslintrc.json') || existsSync('eslint.config.js');

    if (hasESLint) {
      await execa('npm', ['run', 'lint'], { stdio: 'pipe' });
      spinner.succeed('Linting passed');
    } else {
      spinner.warn('No linting configuration found');
    }

  } catch (error) {
    spinner.fail('Linting failed');
    console.error(chalk.red('Lint errors:'), (error as any).stdout || (error as Error).message);
    throw error;
  }
}

export async function runTypeCheck() {
  const spinner = ora('Running type check...').start();

  try {
    // Check if TypeScript is configured
    if (existsSync('tsconfig.json')) {
      await execa('npm', ['run', 'typecheck'], { stdio: 'pipe' });
      spinner.succeed('Type check passed');
    } else {
      spinner.warn('No TypeScript configuration found');
    }

  } catch (error) {
    spinner.fail('Type check failed');
    console.error(chalk.red('Type errors:'), (error as any).stdout || (error as Error).message);
    throw error;
  }
}
