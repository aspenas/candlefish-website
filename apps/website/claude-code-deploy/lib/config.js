const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const yaml = require('yaml');

/**
 * Configuration Management for Claude Code Deploy
 * Handles persistent configuration storage and retrieval
 */
class ConfigManager {
  constructor() {
    this.configDir = path.join(os.homedir(), '.claude-deploy');
    this.configFile = path.join(this.configDir, 'config.json');
    this.yamlConfigFile = path.join(this.configDir, 'config.yaml');
    this.cacheDir = path.join(this.configDir, 'cache');
    this.templatesDir = path.join(this.configDir, 'templates');
  }

  /**
   * Initialize configuration directories
   * @returns {Promise<void>}
   */
  async initialize() {
    await fs.ensureDir(this.configDir);
    await fs.ensureDir(this.cacheDir);
    await fs.ensureDir(this.templatesDir);

    // Set secure permissions
    await fs.chmod(this.configDir, 0o755);
  }

  /**
   * Check if configuration exists
   * @param {string} configPath - Optional custom config path
   * @returns {Promise<boolean>} Configuration exists
   */
  async exists(configPath = null) {
    const targetPath = configPath || this.configFile;
    return await fs.pathExists(targetPath);
  }

  /**
   * Load configuration from file
   * @param {string} configPath - Optional custom config path
   * @returns {Promise<Object>} Configuration object
   */
  async load(configPath = null) {
    const targetPath = configPath || this.configFile;

    if (!(await this.exists(targetPath))) {
      return this.getDefaultConfig();
    }

    try {
      // Try JSON first
      if (targetPath.endsWith('.json') || targetPath === this.configFile) {
        return await fs.readJson(targetPath);
      }

      // Try YAML
      if (targetPath.endsWith('.yaml') || targetPath.endsWith('.yml')) {
        const yamlContent = await fs.readFile(targetPath, 'utf8');
        return yaml.parse(yamlContent);
      }

      // Default to JSON
      return await fs.readJson(targetPath);
    } catch (error) {
      throw new Error(`Failed to load configuration: ${error.message}`);
    }
  }

  /**
   * Save configuration to file
   * @param {Object} config - Configuration object
   * @param {string} configPath - Optional custom config path
   * @param {string} format - Format: 'json' or 'yaml'
   * @returns {Promise<void>}
   */
  async save(config, configPath = null, format = 'json') {
    await this.initialize();

    const targetPath = configPath || (format === 'yaml' ? this.yamlConfigFile : this.configFile);

    try {
      if (format === 'yaml' || targetPath.endsWith('.yaml') || targetPath.endsWith('.yml')) {
        const yamlContent = yaml.stringify(config, { indent: 2 });
        await fs.writeFile(targetPath, yamlContent);
      } else {
        await fs.writeJson(targetPath, config, { spaces: 2 });
      }

      // Set secure permissions
      await fs.chmod(targetPath, 0o644);
    } catch (error) {
      throw new Error(`Failed to save configuration: ${error.message}`);
    }
  }

  /**
   * Get default configuration
   * @returns {Object} Default configuration
   */
  getDefaultConfig() {
    return {
      version: '1.0.0',
      initialized: false,
      npmRegistry: 'https://registry.npmjs.org/',
      claudePath: null,

      // Agent deployment settings
      agents: {
        defaultCategory: 'backend',
        defaultPath: process.cwd(),
        autoInstallDependencies: true,
        autoInitializeClaude: true,
        confirmDeployment: true
      },

      // Template settings
      templates: {
        cacheEnabled: true,
        cacheExpiry: 86400000, // 24 hours in milliseconds
        autoUpdate: true,
        customTemplatesPath: null
      },

      // Authentication settings
      auth: {
        npmTokenConfigured: false,
        lastTokenCheck: null,
        tokenCheckInterval: 3600000 // 1 hour in milliseconds
      },

      // Claude Code integration
      claude: {
        integrationEnabled: true,
        autoSetupProjects: true,
        mcpServersEnabled: true,
        customPrompts: true
      },

      // Deployment preferences
      deployment: {
        createGitRepo: true,
        initialCommit: true,
        setupRemote: false,
        branchStrategy: 'main',
        gitignoreTemplate: true
      },

      // Development settings
      development: {
        verbose: false,
        debug: false,
        logLevel: 'info',
        editorCommand: null // e.g., 'code', 'vim', 'nano'
      }
    };
  }

  /**
   * Update specific configuration section
   * @param {string} section - Configuration section to update
   * @param {Object} updates - Updates to apply
   * @returns {Promise<void>}
   */
  async updateSection(section, updates) {
    const config = await this.load();

    if (!config[section]) {
      config[section] = {};
    }

    config[section] = {
      ...config[section],
      ...updates
    };

    config.lastUpdated = new Date().toISOString();
    await this.save(config);
  }

  /**
   * Get specific configuration value
   * @param {string} keyPath - Dot-separated key path (e.g., 'agents.defaultPath')
   * @param {*} defaultValue - Default value if key not found
   * @returns {Promise<*>} Configuration value
   */
  async get(keyPath, defaultValue = null) {
    const config = await this.load();

    const keys = keyPath.split('.');
    let value = config;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return defaultValue;
      }
    }

    return value;
  }

  /**
   * Set specific configuration value
   * @param {string} keyPath - Dot-separated key path
   * @param {*} value - Value to set
   * @returns {Promise<void>}
   */
  async set(keyPath, value) {
    const config = await this.load();

    const keys = keyPath.split('.');
    const lastKey = keys.pop();

    let current = config;
    for (const key of keys) {
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }

    current[lastKey] = value;
    config.lastUpdated = new Date().toISOString();

    await this.save(config);
  }

  /**
   * Remove configuration key
   * @param {string} keyPath - Dot-separated key path
   * @returns {Promise<void>}
   */
  async remove(keyPath) {
    const config = await this.load();

    const keys = keyPath.split('.');
    const lastKey = keys.pop();

    let current = config;
    for (const key of keys) {
      if (!current[key] || typeof current[key] !== 'object') {
        return; // Key doesn't exist
      }
      current = current[key];
    }

    delete current[lastKey];
    config.lastUpdated = new Date().toISOString();

    await this.save(config);
  }

  /**
   * Reset configuration to defaults
   * @returns {Promise<void>}
   */
  async reset() {
    const defaultConfig = this.getDefaultConfig();
    defaultConfig.resetAt = new Date().toISOString();
    await this.save(defaultConfig);
  }

  /**
   * Export configuration
   * @param {string} exportPath - Export file path
   * @param {string} format - Export format: 'json' or 'yaml'
   * @returns {Promise<void>}
   */
  async export(exportPath, format = 'json') {
    const config = await this.load();

    // Remove sensitive information
    const exportConfig = { ...config };
    if (exportConfig.auth) {
      delete exportConfig.auth.npmTokenConfigured;
      delete exportConfig.auth.lastTokenCheck;
    }

    await this.save(exportConfig, exportPath, format);
  }

  /**
   * Import configuration
   * @param {string} importPath - Import file path
   * @param {boolean} merge - Merge with existing config or replace
   * @returns {Promise<void>}
   */
  async import(importPath, merge = true) {
    if (!(await fs.pathExists(importPath))) {
      throw new Error(`Import file not found: ${importPath}`);
    }

    let importConfig;
    try {
      if (importPath.endsWith('.yaml') || importPath.endsWith('.yml')) {
        const yamlContent = await fs.readFile(importPath, 'utf8');
        importConfig = yaml.parse(yamlContent);
      } else {
        importConfig = await fs.readJson(importPath);
      }
    } catch (error) {
      throw new Error(`Failed to parse import file: ${error.message}`);
    }

    if (merge) {
      const currentConfig = await this.load();
      const mergedConfig = {
        ...currentConfig,
        ...importConfig,
        importedAt: new Date().toISOString()
      };
      await this.save(mergedConfig);
    } else {
      importConfig.importedAt = new Date().toISOString();
      await this.save(importConfig);
    }
  }

  /**
   * Validate configuration
   * @param {Object} config - Configuration to validate
   * @returns {Object} Validation result
   */
  validateConfig(config) {
    const errors = [];
    const warnings = [];

    // Required fields
    if (!config.version) {
      errors.push('Configuration version is required');
    }

    // Validate npm registry URL
    if (config.npmRegistry && !config.npmRegistry.startsWith('http')) {
      errors.push('Invalid npm registry URL');
    }

    // Validate paths
    if (config.agents?.defaultPath && !path.isAbsolute(config.agents.defaultPath)) {
      warnings.push('Default agent path should be absolute');
    }

    if (config.templates?.customTemplatesPath) {
      if (!path.isAbsolute(config.templates.customTemplatesPath)) {
        errors.push('Custom templates path must be absolute');
      }
    }

    // Validate cache expiry
    if (config.templates?.cacheExpiry && typeof config.templates.cacheExpiry !== 'number') {
      errors.push('Cache expiry must be a number (milliseconds)');
    }

    // Validate log level
    const validLogLevels = ['error', 'warn', 'info', 'debug'];
    if (config.development?.logLevel && !validLogLevels.includes(config.development.logLevel)) {
      warnings.push(`Invalid log level. Valid levels: ${validLogLevels.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get configuration summary
   * @returns {Promise<Object>} Configuration summary
   */
  async getSummary() {
    const config = await this.load();

    return {
      initialized: config.initialized || false,
      version: config.version,
      lastUpdated: config.lastUpdated,
      claudeIntegration: config.claude?.integrationEnabled || false,
      npmAuthentication: config.auth?.npmTokenConfigured || false,
      defaultAgentPath: config.agents?.defaultPath || 'Not set',
      templatesCache: config.templates?.cacheEnabled || false,
      configPath: this.configFile,
      size: (await fs.stat(this.configFile).catch(() => ({ size: 0 }))).size
    };
  }

  /**
   * Clean up old cache files
   * @param {number} maxAge - Maximum age in milliseconds
   * @returns {Promise<number>} Number of files cleaned
   */
  async cleanCache(maxAge = 86400000) { // 24 hours default
    let cleanedCount = 0;

    try {
      const cacheFiles = await fs.readdir(this.cacheDir);
      const now = Date.now();

      for (const file of cacheFiles) {
        const filePath = path.join(this.cacheDir, file);
        const stats = await fs.stat(filePath);

        if (now - stats.mtime.getTime() > maxAge) {
          await fs.remove(filePath);
          cleanedCount++;
        }
      }
    } catch (error) {
      // Cache directory might not exist yet
    }

    return cleanedCount;
  }

  /**
   * Backup configuration
   * @param {string} backupPath - Optional backup path
   * @returns {Promise<string>} Backup file path
   */
  async backup(backupPath = null) {
    if (!backupPath) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      backupPath = path.join(this.configDir, `config-backup-${timestamp}.json`);
    }

    const config = await this.load();
    await fs.writeJson(backupPath, config, { spaces: 2 });

    return backupPath;
  }

  /**
   * List available backups
   * @returns {Promise<Array>} List of backup files
   */
  async listBackups() {
    try {
      const files = await fs.readdir(this.configDir);
      const backups = files
        .filter(file => file.startsWith('config-backup-') && file.endsWith('.json'))
        .map(file => {
          const filePath = path.join(this.configDir, file);
          return {
            name: file,
            path: filePath,
            created: fs.statSync(filePath).mtime
          };
        })
        .sort((a, b) => b.created - a.created);

      return backups;
    } catch (error) {
      return [];
    }
  }
}

// Create singleton instance
const configManager = new ConfigManager();

module.exports = {
  load: (configPath) => configManager.load(configPath),
  save: (config, configPath, format) => configManager.save(config, configPath, format),
  exists: (configPath) => configManager.exists(configPath),
  get: (keyPath, defaultValue) => configManager.get(keyPath, defaultValue),
  set: (keyPath, value) => configManager.set(keyPath, value),
  remove: (keyPath) => configManager.remove(keyPath),
  updateSection: (section, updates) => configManager.updateSection(section, updates),
  reset: () => configManager.reset(),
  export: (exportPath, format) => configManager.export(exportPath, format),
  import: (importPath, merge) => configManager.import(importPath, merge),
  validateConfig: (config) => configManager.validateConfig(config),
  getSummary: () => configManager.getSummary(),
  cleanCache: (maxAge) => configManager.cleanCache(maxAge),
  backup: (backupPath) => configManager.backup(backupPath),
  listBackups: () => configManager.listBackups(),
  getDefaultConfig: () => configManager.getDefaultConfig()
};
