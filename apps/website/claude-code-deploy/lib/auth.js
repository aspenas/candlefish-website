const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const axios = require('axios');
const chalk = require('chalk');

const AUTH_CONFIG_PATH = path.join(os.homedir(), '.claude-deploy', 'auth.json');
const NPM_REGISTRY_URL = 'https://registry.npmjs.org/';

/**
 * NPM Authentication Manager
 */
class AuthManager {
  constructor() {
    this.configPath = AUTH_CONFIG_PATH;
  }

  /**
   * Set NPM authentication token
   * @param {string} token - NPM authentication token
   */
  async setToken(token) {
    if (!token || typeof token !== 'string') {
      throw new Error('Invalid token provided');
    }

    // Validate token format (basic check)
    if (!token.startsWith('npm_')) {
      throw new Error('Invalid NPM token format. Token should start with "npm_"');
    }

    const authConfig = {
      token: token,
      registry: NPM_REGISTRY_URL,
      updatedAt: new Date().toISOString()
    };

    await fs.ensureDir(path.dirname(this.configPath));
    await fs.writeJson(this.configPath, authConfig, { spaces: 2 });

    // Set secure permissions
    await fs.chmod(this.configPath, 0o600);
  }

  /**
   * Get stored authentication token
   * @returns {Promise<string>} Authentication token
   */
  async getToken() {
    try {
      if (!(await fs.pathExists(this.configPath))) {
        throw new Error('No authentication token found. Run: claude-deploy auth');
      }

      const authConfig = await fs.readJson(this.configPath);

      if (!authConfig.token) {
        throw new Error('Invalid authentication configuration');
      }

      return authConfig.token;
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error('No authentication token found. Run: claude-deploy auth');
      }
      throw error;
    }
  }

  /**
   * Verify NPM authentication token
   * @returns {Promise<Object>} Token verification result
   */
  async verifyToken() {
    const token = await this.getToken();

    try {
      // Check NPM whoami endpoint
      const response = await axios.get(`${NPM_REGISTRY_URL}-/whoami`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'User-Agent': 'claude-deploy/1.0.0'
        },
        timeout: 10000
      });

      if (response.status !== 200) {
        throw new Error(`NPM authentication failed: ${response.status}`);
      }

      const username = response.data.username;

      // Verify scope access
      await this.verifyScopeAccess(token);

      return {
        valid: true,
        username: username,
        token: token,
        registry: NPM_REGISTRY_URL,
        verifiedAt: new Date().toISOString()
      };

    } catch (error) {
      if (error.response) {
        if (error.response.status === 401) {
          throw new Error('NPM token is invalid or expired');
        }
        if (error.response.status === 403) {
          throw new Error('NPM token does not have required permissions');
        }
        throw new Error(`NPM authentication error: ${error.response.status} ${error.response.statusText}`);
      }

      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        throw new Error('Cannot connect to NPM registry. Check your internet connection.');
      }

      throw new Error(`Token verification failed: ${error.message}`);
    }
  }

  /**
   * Verify access to @candlefish-ai scope
   * @param {string} token - NPM token
   */
  async verifyScopeAccess(token) {
    try {
      // Check if user has access to @candlefish-ai scope
      const response = await axios.get(`${NPM_REGISTRY_URL}@candlefish-ai%2fclaud-code-deploy`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'User-Agent': 'claude-deploy/1.0.0'
        },
        timeout: 10000
      });

      // If we can access the package, user has scope access
      return true;

    } catch (error) {
      if (error.response && error.response.status === 404) {
        // Package doesn't exist yet, but that's OK
        return true;
      }

      if (error.response && error.response.status === 403) {
        console.warn(chalk.yellow('⚠️  Warning: Limited access to @candlefish-ai scope'));
        return false;
      }

      // For other errors, we'll assume it's OK
      return true;
    }
  }

  /**
   * Remove stored authentication
   */
  async removeToken() {
    if (await fs.pathExists(this.configPath)) {
      await fs.remove(this.configPath);
    }
  }

  /**
   * Get authentication status
   * @returns {Promise<Object>} Authentication status
   */
  async getStatus() {
    try {
      await this.verifyToken();
      return { authenticated: true };
    } catch (error) {
      return {
        authenticated: false,
        error: error.message
      };
    }
  }

  /**
   * Configure NPM registry authentication
   * This updates the user's .npmrc file
   * @param {string} token - NPM token
   */
  async configureNpmrc(token) {
    const npmrcPath = path.join(os.homedir(), '.npmrc');
    let npmrcContent = '';

    // Read existing .npmrc
    if (await fs.pathExists(npmrcPath)) {
      npmrcContent = await fs.readFile(npmrcPath, 'utf8');
    }

    // Remove existing registry config for @candlefish-ai
    const lines = npmrcContent.split('\n');
    const filteredLines = lines.filter(line =>
      !line.includes('@candlefish-ai:registry') &&
      !line.includes('//registry.npmjs.org/:_authToken')
    );

    // Add new configuration
    filteredLines.push(`@candlefish-ai:registry=${NPM_REGISTRY_URL}`);
    filteredLines.push(`//registry.npmjs.org/:_authToken=${token}`);

    // Write back to .npmrc
    const newContent = filteredLines.filter(line => line.trim()).join('\n') + '\n';
    await fs.writeFile(npmrcPath, newContent);

    // Set secure permissions
    await fs.chmod(npmrcPath, 0o600);
  }

  /**
   * Setup authentication interactively
   * @returns {Promise<Object>} Setup result
   */
  async setupInteractive() {
    const inquirer = require('inquirer');

    console.log(chalk.cyan('\n🔑 NPM Authentication Setup'));
    console.log(chalk.gray('You need an NPM token to access @candlefish-ai packages.'));
    console.log(chalk.gray('Get your token from: https://www.npmjs.com/settings/tokens'));

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'token',
        message: 'Enter your NPM authentication token:',
        validate: (input) => {
          if (!input || input.length < 10) {
            return 'Please enter a valid NPM token';
          }
          if (!input.startsWith('npm_')) {
            return 'NPM token should start with "npm_"';
          }
          return true;
        }
      },
      {
        type: 'confirm',
        name: 'configureNpmrc',
        message: 'Configure your .npmrc file automatically?',
        default: true
      }
    ]);

    // Set and verify token
    await this.setToken(answers.token);
    const tokenInfo = await this.verifyToken();

    // Configure .npmrc if requested
    if (answers.configureNpmrc) {
      await this.configureNpmrc(answers.token);
    }

    return {
      success: true,
      username: tokenInfo.username,
      npmrcConfigured: answers.configureNpmrc
    };
  }
}

// Create singleton instance
const authManager = new AuthManager();

module.exports = {
  setToken: (token) => authManager.setToken(token),
  getToken: () => authManager.getToken(),
  verifyToken: () => authManager.verifyToken(),
  removeToken: () => authManager.removeToken(),
  getStatus: () => authManager.getStatus(),
  configureNpmrc: (token) => authManager.configureNpmrc(token),
  setupInteractive: () => authManager.setupInteractive()
};
