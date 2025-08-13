const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const { spawn, exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

/**
 * Claude Code Integration Manager
 * Handles Claude Code installation, configuration, and project setup
 */
class ClaudeIntegration {
  constructor() {
    this.claudeConfigPath = path.join(os.homedir(), '.claude');
    this.settingsPath = path.join(this.claudeConfigPath, 'settings.json');
  }

  /**
   * Check if Claude Code is installed and accessible
   * @returns {Promise<Object>} Installation status
   */
  async checkInstallation() {
    try {
      // Try to find claude-code in PATH
      const { stdout } = await execAsync('which claude-code');
      const claudePath = stdout.trim();

      if (!claudePath) {
        throw new Error('Claude Code not found in PATH');
      }

      // Verify it's executable
      try {
        const { stdout: version } = await execAsync('claude-code --version');
        return {
          installed: true,
          path: claudePath,
          version: version.trim(),
          accessible: true
        };
      } catch (versionError) {
        return {
          installed: true,
          path: claudePath,
          version: 'unknown',
          accessible: false,
          error: 'Cannot determine version'
        };
      }

    } catch (error) {
      // Try alternative locations
      const commonPaths = [
        '/usr/local/bin/claude-code',
        '/opt/homebrew/bin/claude-code',
        path.join(os.homedir(), '.local/bin/claude-code'),
        path.join(os.homedir(), 'bin/claude-code')
      ];

      for (const testPath of commonPaths) {
        if (await fs.pathExists(testPath)) {
          try {
            const { stdout: version } = await execAsync(`${testPath} --version`);
            return {
              installed: true,
              path: testPath,
              version: version.trim(),
              accessible: true
            };
          } catch (versionError) {
            return {
              installed: true,
              path: testPath,
              version: 'unknown',
              accessible: false
            };
          }
        }
      }

      return {
        installed: false,
        path: null,
        version: null,
        accessible: false,
        error: error.message
      };
    }
  }

  /**
   * Setup Claude Code integration configuration
   * @returns {Promise<void>}
   */
  async setupIntegration() {
    // Ensure .claude directory exists
    await fs.ensureDir(this.claudeConfigPath);

    // Load existing settings or create new ones
    let settings = {};
    if (await fs.pathExists(this.settingsPath)) {
      try {
        settings = await fs.readJson(this.settingsPath);
      } catch (error) {
        console.warn('Could not parse existing settings.json, creating new one');
      }
    }

    // Add/update MCP servers configuration
    const mcpServers = {
      postgres: {
        command: 'npx',
        args: ['@modelcontextprotocol/server-postgres']
      },
      github: {
        command: 'npx',
        args: ['@modelcontextprotocol/server-github']
      },
      aws: {
        command: 'npx',
        args: ['@modelcontextprotocol/server-aws']
      },
      context7: {
        command: 'npx',
        args: ['@modelcontextprotocol/server-context7']
      },
      huggingface: {
        command: 'npx',
        args: ['@modelcontextprotocol/server-huggingface']
      },
      anthropic: {
        command: 'npx',
        args: ['@modelcontextprotocol/server-anthropic']
      },
      openai: {
        command: 'npx',
        args: ['@modelcontextprotocol/server-openai']
      }
    };

    // Merge with existing MCP servers
    settings.mcpServers = {
      ...settings.mcpServers,
      ...mcpServers
    };

    // Add candlefish-ai specific configuration
    settings.candlefishAi = {
      deployTool: '@candlefish-ai/claude-code-deploy',
      version: require('../package.json').version,
      configuredAt: new Date().toISOString(),
      features: {
        agentDeployment: true,
        templateManagement: true,
        npmIntegration: true
      }
    };

    // Save updated settings
    await fs.writeJson(this.settingsPath, settings, { spaces: 2 });

    // Set appropriate permissions
    await fs.chmod(this.settingsPath, 0o644);
  }

  /**
   * Setup Claude Code for a specific project
   * @param {string} projectPath - Path to project directory
   * @param {Object} agent - Agent configuration
   * @returns {Promise<void>}
   */
  async setupProject(projectPath, agent) {
    const projectClaudeDir = path.join(projectPath, '.claude');
    await fs.ensureDir(projectClaudeDir);

    // Create project-specific Claude configuration
    const projectConfig = {
      projectName: agent.name,
      projectType: agent.category,
      technologies: agent.technologies,
      complexity: agent.complexity,
      features: agent.features,
      configuredBy: '@candlefish-ai/claude-code-deploy',
      configuredAt: new Date().toISOString(),

      // Claude Code specific settings
      settings: {
        autoSave: true,
        aiAssistance: true,
        codeAnalysis: true,
        autoComplete: true
      },

      // Agent-specific prompts and instructions
      prompts: this.generateAgentPrompts(agent),

      // Project structure hints for Claude
      structure: this.generateProjectStructure(agent)
    };

    // Save project configuration
    const projectConfigPath = path.join(projectClaudeDir, 'project.json');
    await fs.writeJson(projectConfigPath, projectConfig, { spaces: 2 });

    // Create agent-specific instructions file
    const instructionsPath = path.join(projectClaudeDir, 'instructions.md');
    const instructions = this.generateInstructions(agent);
    await fs.writeFile(instructionsPath, instructions);

    // Create gitignore for Claude directory if needed
    const gitignorePath = path.join(projectPath, '.gitignore');
    if (await fs.pathExists(gitignorePath)) {
      const gitignoreContent = await fs.readFile(gitignorePath, 'utf8');
      if (!gitignoreContent.includes('.claude/')) {
        await fs.appendFile(gitignorePath, '\n# Claude Code configuration\n.claude/\n');
      }
    } else {
      await fs.writeFile(gitignorePath, '# Claude Code configuration\n.claude/\n');
    }
  }

  /**
   * Generate agent-specific prompts for Claude Code
   * @param {Object} agent - Agent configuration
   * @returns {Object} Prompts object
   */
  generateAgentPrompts(agent) {
    const basePrompts = {
      initialization: `You are working on a ${agent.title} project. This is a ${agent.complexity} level ${agent.category} project using ${agent.technologies.join(', ')}.`,

      codeReview: `When reviewing code for this ${agent.title} project, focus on ${agent.category} best practices, ${agent.technologies.join(' and ')} conventions, and ${agent.complexity === 'advanced' ? 'enterprise-grade' : 'production-ready'} code quality.`,

      debugging: `For debugging this ${agent.title} project, consider the specific challenges of ${agent.category} development and the interaction between ${agent.technologies.join(', ')}.`,

      optimization: `When optimizing this ${agent.title} project, focus on ${agent.category}-specific performance considerations and leverage the strengths of ${agent.technologies.join(', ')}.`
    };

    // Add technology-specific prompts
    const techPrompts = {};

    if (agent.technologies.includes('React')) {
      techPrompts.react = 'Follow React best practices: use functional components, hooks, and modern React patterns. Ensure proper state management and component lifecycle handling.';
    }

    if (agent.technologies.includes('Node.js')) {
      techPrompts.nodejs = 'Follow Node.js best practices: use async/await, proper error handling, and security considerations. Implement proper logging and monitoring.';
    }

    if (agent.technologies.includes('Docker')) {
      techPrompts.docker = 'Ensure Docker best practices: multi-stage builds, minimal base images, proper layer caching, and security scanning.';
    }

    if (agent.technologies.includes('PostgreSQL') || agent.technologies.includes('MongoDB')) {
      techPrompts.database = 'Follow database best practices: proper indexing, query optimization, data validation, and backup strategies.';
    }

    return {
      ...basePrompts,
      technologies: techPrompts
    };
  }

  /**
   * Generate project structure hints for Claude Code
   * @param {Object} agent - Agent configuration
   * @returns {Object} Structure object
   */
  generateProjectStructure(agent) {
    const structure = {
      type: agent.category,
      technologies: agent.technologies,
      complexity: agent.complexity
    };

    // Add category-specific structure hints
    switch (agent.category) {
      case 'backend':
        structure.patterns = ['MVC', 'API Routes', 'Database Models', 'Middleware'];
        structure.directories = ['src/', 'controllers/', 'models/', 'routes/', 'middleware/', 'tests/'];
        break;

      case 'frontend':
        structure.patterns = ['Component-based', 'State Management', 'Routing'];
        structure.directories = ['src/', 'components/', 'pages/', 'hooks/', 'utils/', 'tests/'];
        break;

      case 'fullstack':
        structure.patterns = ['Client-Server', 'API Integration', 'Database Layer'];
        structure.directories = ['client/', 'server/', 'shared/', 'database/', 'tests/'];
        break;

      case 'mobile':
        structure.patterns = ['Screen-based', 'Navigation', 'Native Integration'];
        structure.directories = ['src/', 'screens/', 'components/', 'navigation/', 'services/', 'tests/'];
        break;

      case 'devops':
        structure.patterns = ['Infrastructure as Code', 'Pipeline Configuration', 'Monitoring'];
        structure.directories = ['terraform/', 'docker/', 'kubernetes/', 'scripts/', 'monitoring/'];
        break;

      default:
        structure.patterns = ['Modular Architecture', 'Separation of Concerns'];
        structure.directories = ['src/', 'lib/', 'tests/', 'docs/'];
    }

    return structure;
  }

  /**
   * Generate instructions file for the project
   * @param {Object} agent - Agent configuration
   * @returns {string} Instructions markdown content
   */
  generateInstructions(agent) {
    return `# ${agent.title} - Claude Code Instructions

## Project Overview
${agent.description}

**Category:** ${agent.category}
**Complexity:** ${agent.complexity}
**Technologies:** ${agent.technologies.join(', ')}

## Key Features
${agent.features.map(feature => `- ${feature}`).join('\n')}

## Development Guidelines

### Code Quality Standards
- Follow ${agent.category} best practices
- Implement comprehensive error handling
- Write unit tests for critical functionality
- Use TypeScript where applicable for type safety
- Follow the project's linting and formatting rules

### Technology-Specific Guidelines
${agent.technologies.map(tech => `- **${tech}**: Follow ${tech} best practices and conventions`).join('\n')}

### Project Structure
This project follows a ${agent.category} architecture pattern with clear separation of concerns.

### Common Commands
\`\`\`bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Lint code
npm run lint
\`\`\`

## Claude Code Integration
This project is configured for optimal Claude Code integration with:
- Automatic code analysis
- Context-aware suggestions
- Technology-specific prompts
- Best practice enforcement

## Getting Help
Use Claude Code's AI assistance for:
- Code review and optimization
- Debugging and problem-solving
- Architecture decisions
- Best practice recommendations
- Performance optimization

---
*This project was set up using @candlefish-ai/claude-code-deploy*
`;
  }

  /**
   * Initialize Claude Code in a project directory
   * @param {string} projectPath - Path to project
   * @returns {Promise<Object>} Initialization result
   */
  async initializeClaudeInProject(projectPath) {
    try {
      const { stdout, stderr } = await execAsync('claude-code init', {
        cwd: projectPath,
        timeout: 30000
      });

      return {
        success: true,
        output: stdout,
        error: stderr
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get Claude Code status for a project
   * @param {string} projectPath - Path to project
   * @returns {Promise<Object>} Status information
   */
  async getProjectStatus(projectPath) {
    const claudeDir = path.join(projectPath, '.claude');
    const configExists = await fs.pathExists(path.join(claudeDir, 'project.json'));
    const instructionsExist = await fs.pathExists(path.join(claudeDir, 'instructions.md'));

    return {
      claudeConfigured: configExists && instructionsExist,
      configPath: claudeDir,
      hasConfig: configExists,
      hasInstructions: instructionsExist
    };
  }

  /**
   * Update Claude Code configuration for a project
   * @param {string} projectPath - Path to project
   * @param {Object} updates - Configuration updates
   * @returns {Promise<void>}
   */
  async updateProjectConfig(projectPath, updates) {
    const configPath = path.join(projectPath, '.claude', 'project.json');

    if (!(await fs.pathExists(configPath))) {
      throw new Error('Claude Code configuration not found for this project');
    }

    const currentConfig = await fs.readJson(configPath);
    const updatedConfig = {
      ...currentConfig,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    await fs.writeJson(configPath, updatedConfig, { spaces: 2 });
  }

  /**
   * Validate Claude Code integration
   * @returns {Promise<Object>} Validation result
   */
  async validateIntegration() {
    const checks = [];

    // Check Claude Code installation
    const installation = await this.checkInstallation();
    checks.push({
      name: 'Claude Code Installation',
      passed: installation.installed && installation.accessible,
      details: installation
    });

    // Check configuration directory
    const configDirExists = await fs.pathExists(this.claudeConfigPath);
    checks.push({
      name: 'Configuration Directory',
      passed: configDirExists,
      details: { path: this.claudeConfigPath, exists: configDirExists }
    });

    // Check settings file
    const settingsExist = await fs.pathExists(this.settingsPath);
    checks.push({
      name: 'Settings File',
      passed: settingsExist,
      details: { path: this.settingsPath, exists: settingsExist }
    });

    // If settings exist, validate MCP servers
    if (settingsExist) {
      try {
        const settings = await fs.readJson(this.settingsPath);
        const hasMcpServers = settings.mcpServers && Object.keys(settings.mcpServers).length > 0;
        checks.push({
          name: 'MCP Servers Configuration',
          passed: hasMcpServers,
          details: {
            configured: hasMcpServers,
            servers: hasMcpServers ? Object.keys(settings.mcpServers) : []
          }
        });
      } catch (error) {
        checks.push({
          name: 'Settings Validation',
          passed: false,
          details: { error: error.message }
        });
      }
    }

    const allPassed = checks.every(check => check.passed);
    return {
      valid: allPassed,
      checks,
      summary: {
        total: checks.length,
        passed: checks.filter(c => c.passed).length,
        failed: checks.filter(c => !c.passed).length
      }
    };
  }
}

// Create singleton instance
const claudeIntegration = new ClaudeIntegration();

module.exports = {
  checkInstallation: () => claudeIntegration.checkInstallation(),
  setupIntegration: () => claudeIntegration.setupIntegration(),
  setupProject: (projectPath, agent) => claudeIntegration.setupProject(projectPath, agent),
  initializeClaudeInProject: (projectPath) => claudeIntegration.initializeClaudeInProject(projectPath),
  getProjectStatus: (projectPath) => claudeIntegration.getProjectStatus(projectPath),
  updateProjectConfig: (projectPath, updates) => claudeIntegration.updateProjectConfig(projectPath, updates),
  validateIntegration: () => claudeIntegration.validateIntegration()
};
