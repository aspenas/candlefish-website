import { execa } from 'execa';
import chalk from 'chalk';
import ora from 'ora';
import { existsSync } from 'fs';

interface DevOptions {
  port?: string;
  host?: string;
  open?: boolean;
}

export async function startDev(options: DevOptions = {}) {
  console.log(chalk.cyan('🚀 Starting development server...\n'));

  // Validate project structure
  if (!existsSync('package.json')) {
    console.error(chalk.red('Error: No package.json found. Are you in a Candlefish project?'));
    process.exit(1);
  }

  const spinner = ora('Starting development server...').start();

  try {
    // Build command arguments
    const args = ['run', 'dev'];

    // Add port if specified
    if (options.port && options.port !== '5173') {
      args.push('--', '--port', options.port);
    }

    // Add host if specified
    if (options.host && options.host !== 'localhost') {
      args.push('--', '--host', options.host);
    }

    // Add open flag if specified
    if (options.open) {
      args.push('--', '--open');
    }

    spinner.stop();

    console.log(chalk.green('✅ Development server starting...'));
    console.log(chalk.blue('📱 Local:'), `http://localhost:${options.port || '5173'}`);

    if (options.host !== 'localhost') {
      console.log(chalk.blue('🌐 Network:'), `http://${options.host}:${options.port || '5173'}`);
    }

    console.log(chalk.gray('\nPress Ctrl+C to stop the server\n'));

    // Start the development server
    const childProcess = execa('npm', args, {
      stdio: 'inherit',
    });

    // Handle process termination
    process.on('SIGINT', () => {
      console.log(chalk.yellow('\n🛑 Shutting down development server...'));
      childProcess.kill('SIGTERM');
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      childProcess.kill('SIGTERM');
      process.exit(0);
    });

    await childProcess;

  } catch (error) {
    spinner.fail('Failed to start development server');

    if ((error as any).code === 'EADDRINUSE') {
      console.error(chalk.red(`Port ${options.port || '5173'} is already in use.`));
      console.log(chalk.yellow('Try a different port:'));
      console.log(chalk.cyan(`  npx create-candlefish-dashboard dev --port 3000`));
    } else {
      console.error(chalk.red('Dev server error:'), (error as Error).message);
    }

    process.exit(1);
  }
}
