const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const { spawn, exec } = require('child_process');
const { promisify } = require('util');
const tar = require('tar');
const axios = require('axios');
const inquirer = require('inquirer');
const chalk = require('chalk');

const execAsync = promisify(exec);

/**
 * Template Management System
 * Handles downloading, caching, and applying agent templates
 */
class TemplateManager {
  constructor() {
    this.cacheDir = path.join(os.homedir(), '.claude-deploy', 'templates');
    this.baseTemplateUrl = 'https://api.github.com/repos/candlefish-ai/agent-templates';
    this.fallbackTemplateUrl = 'https://templates.candlefish.ai';
  }

  /**
   * Download agent template from repository
   * @param {Object} agent - Agent configuration
   * @param {string} targetPath - Target deployment path
   * @param {string} templateVersion - Specific template version
   * @returns {Promise<void>}
   */
  async download(agent, targetPath, templateVersion = 'latest') {
    await fs.ensureDir(this.cacheDir);

    try {
      // Try to download from GitHub first
      await this.downloadFromGitHub(agent, targetPath, templateVersion);
    } catch (githubError) {
      console.warn(chalk.yellow('⚠️  GitHub download failed, trying fallback...'));
      try {
        // Fallback to CDN or alternative source
        await this.downloadFromFallback(agent, targetPath, templateVersion);
      } catch (fallbackError) {
        // Generate template locally if downloads fail
        console.warn(chalk.yellow('⚠️  Remote downloads failed, generating template locally...'));
        await this.generateTemplate(agent, targetPath);
      }
    }
  }

  /**
   * Download template from GitHub repository
   * @param {Object} agent - Agent configuration
   * @param {string} targetPath - Target path
   * @param {string} templateVersion - Template version
   */
  async downloadFromGitHub(agent, targetPath, templateVersion) {
    const templateName = this.getTemplateName(agent);
    const cacheKey = `${templateName}-${templateVersion}`;
    const cachePath = path.join(this.cacheDir, `${cacheKey}.tar.gz`);

    // Check cache first
    if (await this.isCacheValid(cachePath)) {
      await this.extractTemplate(cachePath, targetPath);
      return;
    }

    // Download from GitHub
    const downloadUrl = `${this.baseTemplateUrl}/tarball/${templateVersion}`;

    const response = await axios({
      method: 'GET',
      url: downloadUrl,
      responseType: 'stream',
      headers: {
        'User-Agent': 'claude-deploy/1.0.0',
        'Accept': 'application/vnd.github.v3+json'
      },
      timeout: 30000
    });

    // Save to cache
    await fs.ensureDir(path.dirname(cachePath));
    const writeStream = fs.createWriteStream(cachePath);
    response.data.pipe(writeStream);

    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    // Extract to target
    await this.extractTemplate(cachePath, targetPath);
  }

  /**
   * Download template from fallback CDN
   * @param {Object} agent - Agent configuration
   * @param {string} targetPath - Target path
   * @param {string} templateVersion - Template version
   */
  async downloadFromFallback(agent, targetPath, templateVersion) {
    const templateName = this.getTemplateName(agent);
    const downloadUrl = `${this.fallbackTemplateUrl}/${templateName}/${templateVersion}.tar.gz`;

    const response = await axios({
      method: 'GET',
      url: downloadUrl,
      responseType: 'stream',
      timeout: 30000
    });

    const cachePath = path.join(this.cacheDir, `${templateName}-${templateVersion}.tar.gz`);
    await fs.ensureDir(path.dirname(cachePath));

    const writeStream = fs.createWriteStream(cachePath);
    response.data.pipe(writeStream);

    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    await this.extractTemplate(cachePath, targetPath);
  }

  /**
   * Generate template locally when remote downloads fail
   * @param {Object} agent - Agent configuration
   * @param {string} targetPath - Target path
   */
  async generateTemplate(agent, targetPath) {
    await fs.ensureDir(targetPath);

    // Create basic project structure based on agent type
    const structure = this.getProjectStructure(agent);

    for (const dir of structure.directories) {
      await fs.ensureDir(path.join(targetPath, dir));
    }

    // Generate package.json
    await this.generatePackageJson(agent, targetPath);

    // Generate main files based on technology stack
    await this.generateMainFiles(agent, targetPath);

    // Generate configuration files
    await this.generateConfigFiles(agent, targetPath);

    // Generate documentation
    await this.generateDocumentation(agent, targetPath);
  }

  /**
   * Extract template archive to target path
   * @param {string} archivePath - Path to archive
   * @param {string} targetPath - Target extraction path
   */
  async extractTemplate(archivePath, targetPath) {
    await fs.ensureDir(targetPath);

    await tar.extract({
      file: archivePath,
      cwd: targetPath,
      strip: 1 // Remove top-level directory from archive
    });
  }

  /**
   * Check if cached template is still valid
   * @param {string} cachePath - Path to cached file
   * @returns {Promise<boolean>} Cache validity
   */
  async isCacheValid(cachePath) {
    if (!(await fs.pathExists(cachePath))) {
      return false;
    }

    const stats = await fs.stat(cachePath);
    const age = Date.now() - stats.mtime.getTime();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    return age < maxAge;
  }

  /**
   * Get template name based on agent configuration
   * @param {Object} agent - Agent configuration
   * @returns {string} Template name
   */
  getTemplateName(agent) {
    return `${agent.category}-${agent.name}`;
  }

  /**
   * Configure project with user input or provided configuration
   * @param {Object} agent - Agent configuration
   * @returns {Promise<Object>} Project configuration
   */
  async configure(agent) {
    console.log(chalk.cyan(`\n🔧 Configuring ${agent.title}`));
    console.log(chalk.gray(agent.description));

    const questions = this.getConfigurationQuestions(agent);
    const answers = await inquirer.prompt(questions);

    return {
      ...answers,
      agent: agent.name,
      category: agent.category,
      technologies: agent.technologies,
      configuredAt: new Date().toISOString()
    };
  }

  /**
   * Get configuration questions based on agent type
   * @param {Object} agent - Agent configuration
   * @returns {Array} Inquirer questions
   */
  getConfigurationQuestions(agent) {
    const baseQuestions = [
      {
        type: 'input',
        name: 'projectName',
        message: 'Project name:',
        default: agent.name,
        validate: (input) => {
          if (!input || input.trim().length === 0) {
            return 'Project name is required';
          }
          if (!/^[a-z0-9-_]+$/.test(input)) {
            return 'Project name should only contain lowercase letters, numbers, hyphens, and underscores';
          }
          return true;
        }
      },
      {
        type: 'input',
        name: 'description',
        message: 'Project description:',
        default: agent.description
      },
      {
        type: 'input',
        name: 'author',
        message: 'Author name:',
        default: () => {
          try {
            return require('os').userInfo().username;
          } catch {
            return '';
          }
        }
      }
    ];

    // Add technology-specific questions
    const techQuestions = [];

    if (agent.technologies.includes('Node.js')) {
      techQuestions.push({
        type: 'list',
        name: 'nodeVersion',
        message: 'Node.js version:',
        choices: ['18', '20', '21'],
        default: '20'
      });
    }

    if (agent.technologies.includes('PostgreSQL') || agent.technologies.includes('MongoDB')) {
      techQuestions.push({
        type: 'input',
        name: 'databaseName',
        message: 'Database name:',
        default: (answers) => answers.projectName.replace(/[^a-z0-9]/g, '_')
      });
    }

    if (agent.technologies.includes('Docker')) {
      techQuestions.push({
        type: 'confirm',
        name: 'includeDocker',
        message: 'Include Docker configuration?',
        default: true
      });
    }

    if (agent.category === 'backend') {
      techQuestions.push({
        type: 'input',
        name: 'port',
        message: 'Server port:',
        default: '3000',
        validate: (input) => {
          const port = parseInt(input);
          if (isNaN(port) || port < 1000 || port > 65535) {
            return 'Port must be a number between 1000 and 65535';
          }
          return true;
        }
      });
    }

    return [...baseQuestions, ...techQuestions];
  }

  /**
   * Apply configuration to project files
   * @param {string} projectPath - Project path
   * @param {Object} agent - Agent configuration
   * @param {Object} config - Project configuration
   */
  async apply(projectPath, agent, config) {
    // Update package.json with configuration
    await this.updatePackageJson(projectPath, config);

    // Update configuration files
    await this.updateConfigFiles(projectPath, agent, config);

    // Update environment files
    await this.updateEnvironmentFiles(projectPath, config);

    // Update Docker files if needed
    if (config.includeDocker && agent.technologies.includes('Docker')) {
      await this.updateDockerFiles(projectPath, config);
    }

    // Update README with project-specific information
    await this.updateReadme(projectPath, agent, config);
  }

  /**
   * Install project dependencies
   * @param {string} projectPath - Project path
   * @param {Object} agent - Agent configuration
   */
  async installDependencies(projectPath, agent) {
    const packageJsonPath = path.join(projectPath, 'package.json');

    if (!(await fs.pathExists(packageJsonPath))) {
      // No package.json, skip installation
      return;
    }

    try {
      // Determine package manager
      const hasYarnLock = await fs.pathExists(path.join(projectPath, 'yarn.lock'));
      const hasPnpmLock = await fs.pathExists(path.join(projectPath, 'pnpm-lock.yaml'));

      let command = 'npm install';
      if (hasPnpmLock) {
        command = 'pnpm install';
      } else if (hasYarnLock) {
        command = 'yarn install';
      }

      await execAsync(command, {
        cwd: projectPath,
        timeout: 300000 // 5 minutes
      });

    } catch (error) {
      console.warn(chalk.yellow('⚠️  Could not install dependencies automatically'));
      console.log(chalk.gray('Run the following command in your project directory:'));
      console.log(chalk.cyan('  npm install'));
    }
  }

  /**
   * Get project structure based on agent category
   * @param {Object} agent - Agent configuration
   * @returns {Object} Project structure
   */
  getProjectStructure(agent) {
    const structures = {
      backend: {
        directories: ['src', 'src/controllers', 'src/models', 'src/routes', 'src/middleware', 'src/utils', 'tests', 'docs'],
        mainFile: 'src/app.js',
        testFile: 'tests/app.test.js'
      },
      frontend: {
        directories: ['src', 'src/components', 'src/pages', 'src/hooks', 'src/utils', 'src/styles', 'public', 'tests'],
        mainFile: 'src/App.jsx',
        testFile: 'src/App.test.jsx'
      },
      fullstack: {
        directories: ['client', 'server', 'shared', 'client/src', 'server/src', 'tests'],
        mainFile: 'server/src/app.js',
        testFile: 'tests/app.test.js'
      },
      mobile: {
        directories: ['src', 'src/screens', 'src/components', 'src/navigation', 'src/services', 'src/utils', 'assets', 'tests'],
        mainFile: 'src/App.jsx',
        testFile: 'src/App.test.jsx'
      },
      devops: {
        directories: ['terraform', 'docker', 'kubernetes', 'scripts', 'monitoring', 'docs'],
        mainFile: 'docker-compose.yml',
        testFile: 'tests/infrastructure.test.js'
      },
      'ai-ml': {
        directories: ['src', 'src/models', 'src/api', 'src/utils', 'data', 'notebooks', 'tests'],
        mainFile: 'src/main.py',
        testFile: 'tests/test_main.py'
      },
      data: {
        directories: ['src', 'src/pipelines', 'src/transforms', 'src/utils', 'data', 'sql', 'tests'],
        mainFile: 'src/pipeline.py',
        testFile: 'tests/test_pipeline.py'
      },
      security: {
        directories: ['src', 'src/auth', 'src/encryption', 'src/middleware', 'src/utils', 'tests', 'docs'],
        mainFile: 'src/app.js',
        testFile: 'tests/security.test.js'
      }
    };

    return structures[agent.category] || structures.backend;
  }

  /**
   * Generate package.json for the project
   * @param {Object} agent - Agent configuration
   * @param {string} targetPath - Target path
   */
  async generatePackageJson(agent, targetPath) {
    const structure = this.getProjectStructure(agent);

    const packageJson = {
      name: agent.name,
      version: '1.0.0',
      description: agent.description,
      main: structure.mainFile,
      scripts: this.getScripts(agent),
      keywords: [agent.category, ...agent.technologies.map(t => t.toLowerCase())],
      author: '',
      license: 'MIT',
      dependencies: this.getDependencies(agent),
      devDependencies: this.getDevDependencies(agent)
    };

    await fs.writeJson(path.join(targetPath, 'package.json'), packageJson, { spaces: 2 });
  }

  /**
   * Get npm scripts based on agent type
   * @param {Object} agent - Agent configuration
   * @returns {Object} NPM scripts
   */
  getScripts(agent) {
    const baseScripts = {
      test: 'jest',
      lint: 'eslint .',
      'lint:fix': 'eslint . --fix'
    };

    if (agent.category === 'backend') {
      return {
        ...baseScripts,
        start: 'node src/app.js',
        dev: 'nodemon src/app.js',
        build: 'echo "No build step required"'
      };
    }

    if (agent.category === 'frontend') {
      return {
        ...baseScripts,
        start: 'react-scripts start',
        build: 'react-scripts build',
        dev: 'npm start'
      };
    }

    if (agent.category === 'mobile') {
      return {
        ...baseScripts,
        start: 'expo start',
        android: 'expo start --android',
        ios: 'expo start --ios',
        web: 'expo start --web'
      };
    }

    return baseScripts;
  }

  /**
   * Get dependencies based on agent technologies
   * @param {Object} agent - Agent configuration
   * @returns {Object} Dependencies
   */
  getDependencies(agent) {
    const deps = {};

    if (agent.technologies.includes('Express')) {
      Object.assign(deps, {
        express: '^4.18.2',
        cors: '^2.8.5',
        helmet: '^7.1.0'
      });
    }

    if (agent.technologies.includes('React')) {
      Object.assign(deps, {
        react: '^18.2.0',
        'react-dom': '^18.2.0',
        'react-router-dom': '^6.8.0'
      });
    }

    if (agent.technologies.includes('MongoDB')) {
      deps.mongoose = '^8.0.0';
    }

    if (agent.technologies.includes('PostgreSQL')) {
      deps.pg = '^8.11.0';
    }

    if (agent.technologies.includes('JWT')) {
      deps.jsonwebtoken = '^9.0.0';
    }

    return deps;
  }

  /**
   * Get dev dependencies based on agent type
   * @param {Object} agent - Agent configuration
   * @returns {Object} Dev dependencies
   */
  getDevDependencies(agent) {
    const devDeps = {
      jest: '^29.0.0',
      eslint: '^8.0.0',
      prettier: '^3.0.0'
    };

    if (agent.technologies.includes('Node.js')) {
      Object.assign(devDeps, {
        nodemon: '^3.0.0',
        supertest: '^6.3.0'
      });
    }

    if (agent.technologies.includes('TypeScript')) {
      Object.assign(devDeps, {
        typescript: '^5.0.0',
        '@types/node': '^20.0.0'
      });
    }

    return devDeps;
  }

  /**
   * Generate main application files
   * @param {Object} agent - Agent configuration
   * @param {string} targetPath - Target path
   */
  async generateMainFiles(agent, targetPath) {
    const structure = this.getProjectStructure(agent);

    if (agent.category === 'backend') {
      await this.generateBackendFiles(agent, targetPath, structure);
    } else if (agent.category === 'frontend') {
      await this.generateFrontendFiles(agent, targetPath, structure);
    }

    // Generate test file
    await this.generateTestFile(agent, targetPath, structure);
  }

  /**
   * Generate backend application files
   * @param {Object} agent - Agent configuration
   * @param {string} targetPath - Target path
   * @param {Object} structure - Project structure
   */
  async generateBackendFiles(agent, targetPath, structure) {
    const appContent = `const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to ${agent.title}',
    version: '1.0.0',
    status: 'running'
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(\`🚀 ${agent.title} running on port \${PORT}\`);
  });
}

module.exports = app;
`;

    await fs.writeFile(path.join(targetPath, structure.mainFile), appContent);
  }

  /**
   * Generate frontend application files
   * @param {Object} agent - Agent configuration
   * @param {string} targetPath - Target path
   * @param {Object} structure - Project structure
   */
  async generateFrontendFiles(agent, targetPath, structure) {
    const appContent = `import React from 'react';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>${agent.title}</h1>
        <p>${agent.description}</p>
        <p>Built with ${agent.technologies.join(', ')}</p>
      </header>
    </div>
  );
}

export default App;
`;

    await fs.writeFile(path.join(targetPath, structure.mainFile), appContent);
  }

  /**
   * Generate test file
   * @param {Object} agent - Agent configuration
   * @param {string} targetPath - Target path
   * @param {Object} structure - Project structure
   */
  async generateTestFile(agent, targetPath, structure) {
    const testContent = agent.category === 'backend'
      ? this.generateBackendTest(agent)
      : this.generateFrontendTest(agent);

    await fs.writeFile(path.join(targetPath, structure.testFile), testContent);
  }

  /**
   * Generate backend test content
   * @param {Object} agent - Agent configuration
   * @returns {string} Test content
   */
  generateBackendTest(agent) {
    return `const request = require('supertest');
const app = require('../src/app');

describe('${agent.title}', () => {
  test('GET / should return welcome message', async () => {
    const response = await request(app)
      .get('/')
      .expect(200);

    expect(response.body.message).toContain('${agent.title}');
  });

  test('GET /health should return health status', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body.status).toBe('healthy');
  });

  test('GET /nonexistent should return 404', async () => {
    await request(app)
      .get('/nonexistent')
      .expect(404);
  });
});
`;
  }

  /**
   * Generate frontend test content
   * @param {Object} agent - Agent configuration
   * @returns {string} Test content
   */
  generateFrontendTest(agent) {
    return `import { render, screen } from '@testing-library/react';
import App from './App';

test('renders ${agent.title}', () => {
  render(<App />);
  const titleElement = screen.getByText(/${agent.title}/i);
  expect(titleElement).toBeInTheDocument();
});

test('renders description', () => {
  render(<App />);
  const descElement = screen.getByText(/Built with/i);
  expect(descElement).toBeInTheDocument();
});
`;
  }

  /**
   * Generate configuration files
   * @param {Object} agent - Agent configuration
   * @param {string} targetPath - Target path
   */
  async generateConfigFiles(agent, targetPath) {
    // Generate .gitignore
    await this.generateGitignore(agent, targetPath);

    // Generate .env.example
    await this.generateEnvExample(agent, targetPath);

    // Generate eslint config
    await this.generateEslintConfig(targetPath);

    // Generate prettier config
    await this.generatePrettierConfig(targetPath);
  }

  /**
   * Generate .gitignore file
   * @param {Object} agent - Agent configuration
   * @param {string} targetPath - Target path
   */
  async generateGitignore(agent, targetPath) {
    const gitignoreContent = `# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Build outputs
build/
dist/
*.tgz
*.tar.gz

# IDE files
.vscode/
.idea/
*.swp
*.swo

# OS files
.DS_Store
Thumbs.db

# Logs
logs/
*.log

# Claude Code configuration
.claude/

# Database
*.db
*.sqlite

${agent.technologies.includes('Docker') ? `
# Docker
.dockerignore
` : ''}

${agent.category === 'frontend' ? `
# Frontend specific
coverage/
.nyc_output/
` : ''}
`;

    await fs.writeFile(path.join(targetPath, '.gitignore'), gitignoreContent);
  }

  /**
   * Generate .env.example file
   * @param {Object} agent - Agent configuration
   * @param {string} targetPath - Target path
   */
  async generateEnvExample(agent, targetPath) {
    let envContent = `# ${agent.title} Environment Variables
NODE_ENV=development
`;

    if (agent.category === 'backend') {
      envContent += 'PORT=3000\n';
    }

    if (agent.technologies.includes('MongoDB')) {
      envContent += 'MONGODB_URI=mongodb://localhost:27017/database\n';
    }

    if (agent.technologies.includes('PostgreSQL')) {
      envContent += `DATABASE_URL=postgresql://username:password@localhost:5432/database\n`;
    }

    if (agent.technologies.includes('JWT')) {
      envContent += 'JWT_SECRET=your-secret-key\n';
    }

    await fs.writeFile(path.join(targetPath, '.env.example'), envContent);
  }

  /**
   * Generate ESLint configuration
   * @param {string} targetPath - Target path
   */
  async generateEslintConfig(targetPath) {
    const eslintConfig = {
      extends: ['eslint:recommended'],
      env: {
        node: true,
        es2021: true,
        jest: true
      },
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
      },
      rules: {
        'no-console': 'warn',
        'no-unused-vars': 'error'
      }
    };

    await fs.writeJson(path.join(targetPath, '.eslintrc.json'), eslintConfig, { spaces: 2 });
  }

  /**
   * Generate Prettier configuration
   * @param {string} targetPath - Target path
   */
  async generatePrettierConfig(targetPath) {
    const prettierConfig = {
      semi: true,
      trailingComma: 'es5',
      singleQuote: true,
      printWidth: 80,
      tabWidth: 2
    };

    await fs.writeJson(path.join(targetPath, '.prettierrc'), prettierConfig, { spaces: 2 });
  }

  /**
   * Generate documentation files
   * @param {Object} agent - Agent configuration
   * @param {string} targetPath - Target path
   */
  async generateDocumentation(agent, targetPath) {
    const readmeContent = `# ${agent.title}

${agent.description}

## Technologies

${agent.technologies.map(tech => `- ${tech}`).join('\n')}

## Features

${agent.features.map(feature => `- ${feature}`).join('\n')}

## Getting Started

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Copy environment variables:
   \`\`\`bash
   cp .env.example .env
   \`\`\`

3. Start the development server:
   \`\`\`bash
   npm run dev
   \`\`\`

## Available Scripts

- \`npm start\` - Start the application
- \`npm run dev\` - Start in development mode
- \`npm test\` - Run tests
- \`npm run lint\` - Run linter
- \`npm run build\` - Build for production

## Project Structure

\`\`\`
${this.getProjectStructure(agent).directories.map(dir => dir + '/').join('\n')}
\`\`\`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License
`;

    await fs.writeFile(path.join(targetPath, 'README.md'), readmeContent);
  }

  /**
   * Update package.json with user configuration
   * @param {string} projectPath - Project path
   * @param {Object} config - Configuration
   */
  async updatePackageJson(projectPath, config) {
    const packageJsonPath = path.join(projectPath, 'package.json');

    if (!(await fs.pathExists(packageJsonPath))) {
      return;
    }

    const packageJson = await fs.readJson(packageJsonPath);

    if (config.projectName) {
      packageJson.name = config.projectName;
    }

    if (config.description) {
      packageJson.description = config.description;
    }

    if (config.author) {
      packageJson.author = config.author;
    }

    await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
  }

  /**
   * Update configuration files with user settings
   * @param {string} projectPath - Project path
   * @param {Object} agent - Agent configuration
   * @param {Object} config - User configuration
   */
  async updateConfigFiles(projectPath, agent, config) {
    // Update any agent-specific configuration files
    if (config.port && agent.category === 'backend') {
      await this.updateServerPort(projectPath, config.port);
    }
  }

  /**
   * Update environment files with configuration
   * @param {string} projectPath - Project path
   * @param {Object} config - Configuration
   */
  async updateEnvironmentFiles(projectPath, config) {
    const envPath = path.join(projectPath, '.env.example');

    if (!(await fs.pathExists(envPath))) {
      return;
    }

    let envContent = await fs.readFile(envPath, 'utf8');

    if (config.port) {
      envContent = envContent.replace(/PORT=\d+/, `PORT=${config.port}`);
    }

    if (config.databaseName) {
      envContent = envContent.replace(/database/g, config.databaseName);
    }

    await fs.writeFile(envPath, envContent);
  }

  /**
   * Update Docker files with configuration
   * @param {string} projectPath - Project path
   * @param {Object} config - Configuration
   */
  async updateDockerFiles(projectPath, config) {
    const dockerfilePath = path.join(projectPath, 'Dockerfile');

    if (config.nodeVersion && await fs.pathExists(dockerfilePath)) {
      let dockerContent = await fs.readFile(dockerfilePath, 'utf8');
      dockerContent = dockerContent.replace(/FROM node:\d+/, `FROM node:${config.nodeVersion}`);
      await fs.writeFile(dockerfilePath, dockerContent);
    }
  }

  /**
   * Update README with project-specific information
   * @param {string} projectPath - Project path
   * @param {Object} agent - Agent configuration
   * @param {Object} config - Configuration
   */
  async updateReadme(projectPath, agent, config) {
    const readmePath = path.join(projectPath, 'README.md');

    if (!(await fs.pathExists(readmePath))) {
      return;
    }

    let readmeContent = await fs.readFile(readmePath, 'utf8');

    if (config.projectName && config.projectName !== agent.name) {
      readmeContent = readmeContent.replace(new RegExp(agent.title, 'g'), config.projectName);
    }

    if (config.description && config.description !== agent.description) {
      readmeContent = readmeContent.replace(agent.description, config.description);
    }

    await fs.writeFile(readmePath, readmeContent);
  }

  /**
   * Update server port in configuration files
   * @param {string} projectPath - Project path
   * @param {string} port - Port number
   */
  async updateServerPort(projectPath, port) {
    const appFile = path.join(projectPath, 'src/app.js');

    if (await fs.pathExists(appFile)) {
      let appContent = await fs.readFile(appFile, 'utf8');
      appContent = appContent.replace(/PORT \|\| \d+/, `PORT || ${port}`);
      await fs.writeFile(appFile, appContent);
    }
  }
}

// Create singleton instance
const templateManager = new TemplateManager();

module.exports = {
  download: (agent, targetPath, templateVersion) => templateManager.download(agent, targetPath, templateVersion),
  configure: (agent) => templateManager.configure(agent),
  apply: (projectPath, agent, config) => templateManager.apply(projectPath, agent, config),
  installDependencies: (projectPath, agent) => templateManager.installDependencies(projectPath, agent)
};
