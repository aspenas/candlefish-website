import { execaCommand } from 'execa';
import chalk from 'chalk';
import ora from 'ora';
import semver from 'semver';

interface SystemRequirement {
  name: string;
  command: string;
  minVersion?: string;
  checkVersion?: (version: string) => boolean;
  installUrl?: string;
  required: boolean;
}

const SYSTEM_REQUIREMENTS: SystemRequirement[] = [
  {
    name: 'Node.js',
    command: 'node --version',
    minVersion: '18.0.0',
    installUrl: 'https://nodejs.org/',
    required: true,
  },
  {
    name: 'npm',
    command: 'npm --version',
    minVersion: '9.0.0',
    installUrl: 'https://nodejs.org/',
    required: true,
  },
  {
    name: 'Git',
    command: 'git --version',
    installUrl: 'https://git-scm.com/',
    required: true,
  },
  {
    name: 'Netlify CLI',
    command: 'netlify --version',
    installUrl: 'https://docs.netlify.com/cli/get-started/',
    required: false,
  },
];

export async function checkSystemRequirements(): Promise<void> {
  const spinner = ora('Checking system requirements...').start();

  const results: { requirement: SystemRequirement; installed: boolean; version?: string }[] = [];

  for (const requirement of SYSTEM_REQUIREMENTS) {
    try {
      const { stdout } = await execaCommand(requirement.command);
      const versionMatch = stdout.match(/v?(\d+\.\d+\.\d+)/);
      const version = versionMatch ? versionMatch[1] : stdout.trim();

      let isValid = true;
      if (requirement.minVersion && version) {
        isValid = semver.gte(version, requirement.minVersion);
      }

      results.push({
        requirement,
        installed: isValid,
        version: version || undefined,
      });
    } catch (error) {
      results.push({
        requirement,
        installed: false,
      });
    }
  }

  spinner.stop();

  // Display results
  console.log(chalk.bold('\n📋 System Requirements Check:\n'));

  let hasErrors = false;
  let hasWarnings = false;

  for (const result of results) {
    const { requirement, installed, version } = result;
    const status = installed ? chalk.green('✓') : chalk.red('✗');
    const versionText = version ? chalk.gray(`(${version})`) : '';

    console.log(`${status} ${requirement.name} ${versionText}`);

    if (!installed) {
      if (requirement.required) {
        hasErrors = true;
        console.log(`  ${chalk.red('Required')}: Install from ${requirement.installUrl}`);
      } else {
        hasWarnings = true;
        console.log(`  ${chalk.yellow('Optional')}: Install from ${requirement.installUrl}`);
      }
    } else if (requirement.minVersion && version && !semver.gte(version, requirement.minVersion)) {
      hasErrors = true;
      console.log(`  ${chalk.red('Version too old')}: Requires ${requirement.minVersion}+`);
    }
  }

  if (hasErrors) {
    console.error(chalk.red('\n❌ Some required dependencies are missing or outdated.'));
    console.error('Please install or update them before continuing.\n');
    process.exit(1);
  }

  if (hasWarnings) {
    console.log(chalk.yellow('\n⚠️  Some optional dependencies are missing.'));
    console.log('You can install them later if needed.\n');
  } else {
    console.log(chalk.green('\n✅ All requirements satisfied!\n'));
  }
}

export async function checkCommand(command: string): Promise<boolean> {
  try {
    await execaCommand(command);
    return true;
  } catch (error) {
    return false;
  }
}

export async function getPackageManager(): Promise<'npm' | 'yarn' | 'pnpm'> {
  const managers = [
    { name: 'pnpm' as const, command: 'pnpm --version' },
    { name: 'yarn' as const, command: 'yarn --version' },
    { name: 'npm' as const, command: 'npm --version' },
  ];

  for (const manager of managers) {
    if (await checkCommand(manager.command)) {
      return manager.name;
    }
  }

  return 'npm'; // fallback
}
