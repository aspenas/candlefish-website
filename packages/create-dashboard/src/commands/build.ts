import { execaCommand } from 'execa';
import chalk from 'chalk';
import ora from 'ora';
import { existsSync } from 'fs';
import { join } from 'path';

interface BuildOptions {
  config?: string;
  analyze?: boolean;
}

export async function buildProject(options: BuildOptions = {}) {
  console.log(chalk.cyan('🔨 Building project for production...\n'));

  // Validate project structure
  if (!existsSync('package.json')) {
    console.error(chalk.red('Error: No package.json found. Are you in a Candlefish project?'));
    process.exit(1);
  }

  const spinner = ora('Building project...').start();

  try {
    // Determine build command based on config
    let buildCmd = 'npm run build';

    if (options.config === 'family') {
      buildCmd = 'npm run family:build';
    }

    // Run the build
    const result = await execaCommand(buildCmd, {
      stdio: 'pipe',
    });

    spinner.succeed('Build completed successfully');

    // Check if dist directory was created
    if (existsSync('dist')) {
      console.log(chalk.green('✅ Build output available in ./dist'));

      // Show build stats if possible
      try {
        const { stdout: sizeInfo } = await execaCommand('du -sh dist', {
          stdio: 'pipe',
        });
        console.log(chalk.blue('📦 Build size:'), sizeInfo.split('\t')[0]);
      } catch (error) {
        // Size info not critical
      }
    }

    // Bundle analysis
    if (options.analyze) {
      console.log(chalk.blue('\n📊 Analyzing bundle...'));
      try {
        await execaCommand('npx vite-bundle-analyzer dist', {
          stdio: 'inherit',
        });
      } catch (error) {
        console.warn(chalk.yellow('Bundle analysis failed. Install vite-bundle-analyzer for detailed analysis.'));
      }
    }

    // Build validation
    await validateBuild();

  } catch (error) {
    spinner.fail('Build failed');
    console.error(chalk.red('Build error:'), (error as Error).message);

    if ((error as any).stdout) {
      console.log('\n' + chalk.gray('Build output:'));
      console.log((error as any).stdout);
    }

    if ((error as any).stderr) {
      console.log('\n' + chalk.gray('Build errors:'));
      console.log((error as any).stderr);
    }

    process.exit(1);
  }

  console.log(chalk.green('\n✅ Build completed successfully!'));
  console.log(chalk.blue('Next steps:'));
  console.log(chalk.cyan('  npx create-candlefish-dashboard deploy  # Deploy to production'));
  console.log(chalk.cyan('  npx create-candlefish-dashboard validate # Validate build'));
}

async function validateBuild() {
  const spinner = ora('Validating build...').start();

  try {
    // Check required files
    const requiredFiles = [
      'dist/index.html',
      'dist/assets',
    ];

    const missingFiles = requiredFiles.filter(file => !existsSync(file));

    if (missingFiles.length > 0) {
      throw new Error(`Missing build files: ${missingFiles.join(', ')}`);
    }

    // Check index.html content
    const indexContent = await import('fs').then(fs =>
      fs.promises.readFile('dist/index.html', 'utf-8')
    );

    if (!indexContent.includes('<!DOCTYPE html>')) {
      throw new Error('Invalid index.html format');
    }

    // Check for critical resources
    const hasAssets = existsSync('dist/assets') &&
      (await import('fs').then(fs => fs.promises.readdir('dist/assets'))).length > 0;

    if (!hasAssets) {
      console.warn(chalk.yellow('⚠️  No assets found in build'));
    }

    spinner.succeed('Build validation passed');
  } catch (error) {
    spinner.fail('Build validation failed');
    throw error;
  }
}
