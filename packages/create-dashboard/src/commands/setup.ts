import { join, resolve } from 'path';
import { existsSync, mkdirSync, readdirSync } from 'fs';
import { unlink } from 'fs/promises';
import fsExtra from 'fs-extra';
const { copy, writeJSON, readJSON } = fsExtra;
import { execa } from 'execa';
import chalk from 'chalk';
import ora from 'ora';
import prompts from 'prompts';
import validatePackageName from 'validate-npm-package-name';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { getPackageManager } from '../utils/system-check.js';
import { setupEnvironment } from '../utils/env-setup.js';
import { validateSetup } from './validate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface SetupOptions {
  template?: string;
  skipGit?: boolean;
  skipInstall?: boolean;
}

export async function setupDashboard(projectName?: string, options: SetupOptions = {}) {
  console.log(chalk.cyan('🚀 Setting up Candlefish AI Dashboard...\n'));

  // Determine project name and directory
  let targetDir = process.cwd();
  let isCurrentDir = true;

  if (projectName) {
    const validation = validatePackageName(projectName);
    if (!validation.validForNewPackages) {
      console.error(chalk.red('Invalid package name:'), projectName);
      if (validation.errors) {
        validation.errors.forEach(error => console.error(chalk.red('  -'), error));
      }
      process.exit(1);
    }

    targetDir = resolve(projectName);
    isCurrentDir = false;

    if (existsSync(targetDir) && readdirSync(targetDir).length > 0) {
      const response = await prompts({
        type: 'confirm',
        name: 'overwrite',
        message: `Directory ${projectName} is not empty. Continue anyway?`,
        initial: false,
      });

      if (!response.overwrite) {
        process.exit(1);
      }
    }

    if (!existsSync(targetDir)) {
      mkdirSync(targetDir, { recursive: true });
    }
  }

  // Check if this is an existing Candlefish project
  const packageJsonPath = join(targetDir, 'package.json');
  const isExisting = existsSync(packageJsonPath);

  if (isExisting) {
    console.log(chalk.blue('📦 Existing project detected. Upgrading configuration...\n'));
  } else if (isCurrentDir) {
    const response = await prompts({
      type: 'confirm',
      name: 'initHere',
      message: 'Initialize Candlefish dashboard in current directory?',
      initial: false,
    });

    if (!response.initHere) {
      process.exit(1);
    }
  }

  // Copy template files
  await copyTemplate(targetDir, options.template || 'default');

  // Setup package.json
  await setupPackageJson(targetDir, projectName || 'candlefish-dashboard', isExisting);

  // Setup environment
  await setupEnvironment(targetDir);

  // Install dependencies
  if (!options.skipInstall) {
    await installDependencies(targetDir);
  }

  // Initialize git
  if (!options.skipGit && !existsSync(join(targetDir, '.git'))) {
    await initializeGit(targetDir);
  }

  // Validate setup
  process.chdir(targetDir);
  await validateSetup({ fix: true });

  console.log(chalk.green('✅ Setup complete!\n'));

  // Display next steps
  displayNextSteps(projectName, isCurrentDir, options);
}

async function copyTemplate(targetDir: string, template: string) {
  const spinner = ora('Copying template files...').start();

  try {
    const templateDir = join(__dirname, '../../templates', template);

    if (!existsSync(templateDir)) {
      throw new Error(`Template '${template}' not found`);
    }

    await copy(templateDir, targetDir, {
      filter: (src) => {
        // Skip node_modules and other build artifacts
        return !src.includes('node_modules') &&
               !src.includes('dist') &&
               !src.includes('.git');
      },
    });

    spinner.succeed('Template files copied');
  } catch (error) {
    spinner.fail('Failed to copy template files');
    throw error;
  }
}

async function setupPackageJson(targetDir: string, projectName: string, isExisting: boolean) {
  const packageJsonPath = join(targetDir, 'package.json');

  let packageJson: any = {
    name: projectName,
    version: '1.0.0',
    private: true,
    type: 'module',
  };

  if (isExisting) {
    try {
      packageJson = await readJSON(packageJsonPath);
    } catch (error) {
      console.warn(chalk.yellow('Warning: Could not read existing package.json'));
    }
  }

  // Merge with template package.json
  const templatePackageJsonPath = join(targetDir, 'package.template.json');
  if (existsSync(templatePackageJsonPath)) {
    const templatePackageJson = await readJSON(templatePackageJsonPath);
    packageJson = {
      ...packageJson,
      ...templatePackageJson,
      name: packageJson.name, // preserve project name
      version: packageJson.version, // preserve version
    };

    // Remove template file
    await unlink(templatePackageJsonPath);
  }

  await writeJSON(packageJsonPath, packageJson, { spaces: 2 });
}

async function installDependencies(targetDir: string) {
  const packageManager = await getPackageManager();
  const spinner = ora(`Installing dependencies with ${packageManager}...`).start();

  try {
    await execa(packageManager, ['install'], {
      cwd: targetDir,
      stdio: 'pipe'
    });
    spinner.succeed('Dependencies installed');
  } catch (error) {
    spinner.fail('Failed to install dependencies');
    console.error(chalk.red('Error:'), (error as Error).message);
    console.log(chalk.yellow('You can install dependencies manually later with:'));
    console.log(chalk.cyan(`  cd ${targetDir}`));
    console.log(chalk.cyan(`  ${packageManager} install`));
  }
}

async function initializeGit(targetDir: string) {
  const spinner = ora('Initializing git repository...').start();

  try {
    await execa('git', ['init'], { cwd: targetDir });
    await execa('git', ['add', '.'], { cwd: targetDir });
    await execa('git', ['commit', '-m', 'Initial commit: Candlefish dashboard setup'], { cwd: targetDir });
    spinner.succeed('Git repository initialized');
  } catch (error) {
    spinner.fail('Failed to initialize git repository');
    console.warn(chalk.yellow('You can initialize git manually later with:'));
    console.log(chalk.cyan('  git init'));
    console.log(chalk.cyan('  git add .'));
    console.log(chalk.cyan('  git commit -m "Initial commit"'));
  }
}

function displayNextSteps(projectName?: string, isCurrentDir?: boolean, options: SetupOptions = {}) {
  console.log(chalk.bold('🎉 Next Steps:\n'));

  if (projectName && !isCurrentDir) {
    console.log(chalk.cyan(`  cd ${projectName}`));
  }

  if (options.skipInstall) {
    console.log(chalk.cyan('  npm install'));
  }

  console.log(chalk.cyan('  npx create-candlefish-dashboard dev    # Start development server'));
  console.log(chalk.cyan('  npx create-candlefish-dashboard build  # Build for production'));
  console.log(chalk.cyan('  npx create-candlefish-dashboard deploy # Deploy to Netlify'));
  console.log(chalk.cyan('  npx create-candlefish-dashboard test   # Run tests'));

  console.log('\n' + chalk.bold('📚 Documentation:'));
  console.log(chalk.cyan('  https://docs.candlefish.ai'));
  console.log(chalk.cyan('  https://github.com/candlefish-ai/candlefish-ai'));

  console.log('');
}
