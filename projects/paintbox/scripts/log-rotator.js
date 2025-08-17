#!/usr/bin/env node

/**
 * Log Rotation Script for Paintbox Application
 * Manages log file rotation, compression, and cleanup
 */

const fs = require('fs').promises;
const path = require('path');
const zlib = require('zlib');
const { promisify } = require('util');

const gzip = promisify(zlib.gzip);

// Configuration
const config = {
  logDirectory: process.env.LOG_DIRECTORY || './logs',
  retentionDays: parseInt(process.env.LOG_RETENTION_DAYS) || 30,
  maxLogSize: parseInt(process.env.MAX_LOG_SIZE) || 100 * 1024 * 1024, // 100MB
  compressAfterDays: parseInt(process.env.COMPRESS_AFTER_DAYS) || 1,

  // File patterns to rotate
  patterns: [
    '*.log',
    '*-out.log',
    '*-error.log',
    'application*.log',
    'deployment*.log',
    'health-monitor*.log',
    'dependency-checker*.log',
  ],

  // Files to exclude from rotation
  excludePatterns: [
    '*.gz',
    '*.zip',
    '*.tmp',
    'log-rotator.log', // Don't rotate our own log
  ],
};

class LogRotator {
  constructor() {
    this.logFile = path.join(config.logDirectory, 'log-rotator.log');
  }

  async run() {
    await this.log('Starting log rotation process...');

    try {
      // Ensure log directory exists
      await fs.mkdir(config.logDirectory, { recursive: true });

      // Get all log files
      const logFiles = await this.findLogFiles();
      await this.log(`Found ${logFiles.length} log files to process`);

      // Process each log file
      let rotatedCount = 0;
      let compressedCount = 0;
      let deletedCount = 0;

      for (const file of logFiles) {
        try {
          const stats = await fs.stat(file);
          const ageInDays = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);

          // Delete old files
          if (ageInDays > config.retentionDays) {
            await fs.unlink(file);
            await this.log(`Deleted old log file: ${path.basename(file)} (${ageInDays.toFixed(1)} days old)`);
            deletedCount++;
            continue;
          }

          // Compress old uncompressed files
          if (ageInDays > config.compressAfterDays && !file.endsWith('.gz')) {
            await this.compressFile(file);
            compressedCount++;
            continue;
          }

          // Rotate large files
          if (stats.size > config.maxLogSize) {
            await this.rotateFile(file);
            rotatedCount++;
          }

        } catch (error) {
          await this.log(`Error processing ${file}: ${error.message}`);
        }
      }

      // Clean up empty directories
      await this.cleanupEmptyDirectories();

      // Generate summary
      await this.log(`Log rotation completed:`);
      await this.log(`  - Files rotated: ${rotatedCount}`);
      await this.log(`  - Files compressed: ${compressedCount}`);
      await this.log(`  - Files deleted: ${deletedCount}`);

      // Update disk usage stats
      await this.updateDiskUsageStats();

    } catch (error) {
      await this.log(`Log rotation failed: ${error.message}`);
      throw error;
    }
  }

  async findLogFiles() {
    const files = [];

    try {
      const entries = await fs.readdir(config.logDirectory, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isFile()) {
          const fileName = entry.name;
          const filePath = path.join(config.logDirectory, fileName);

          // Check if file matches inclusion patterns
          const shouldInclude = config.patterns.some(pattern =>
            this.matchPattern(fileName, pattern)
          );

          // Check if file matches exclusion patterns
          const shouldExclude = config.excludePatterns.some(pattern =>
            this.matchPattern(fileName, pattern)
          );

          if (shouldInclude && !shouldExclude) {
            files.push(filePath);
          }
        }
      }
    } catch (error) {
      await this.log(`Error reading log directory: ${error.message}`);
    }

    return files;
  }

  matchPattern(fileName, pattern) {
    // Simple glob pattern matching
    const regex = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');

    return new RegExp(`^${regex}$`).test(fileName);
  }

  async rotateFile(filePath) {
    const dir = path.dirname(filePath);
    const fileName = path.basename(filePath);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    // Create rotated file name
    const rotatedFileName = `${fileName}.${timestamp}`;
    const rotatedFilePath = path.join(dir, rotatedFileName);

    try {
      // Move current file to rotated name
      await fs.rename(filePath, rotatedFilePath);

      // Create new empty file with original name
      await fs.writeFile(filePath, '');

      await this.log(`Rotated large log file: ${fileName} -> ${rotatedFileName}`);

      // Compress the rotated file immediately
      await this.compressFile(rotatedFilePath);

    } catch (error) {
      await this.log(`Failed to rotate ${fileName}: ${error.message}`);
    }
  }

  async compressFile(filePath) {
    const compressedPath = `${filePath}.gz`;

    try {
      // Read the original file
      const data = await fs.readFile(filePath);

      // Compress the data
      const compressed = await gzip(data);

      // Write compressed file
      await fs.writeFile(compressedPath, compressed);

      // Remove original file
      await fs.unlink(filePath);

      const originalSize = data.length;
      const compressedSize = compressed.length;
      const compressionRatio = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);

      await this.log(`Compressed ${path.basename(filePath)}: ${this.formatBytes(originalSize)} -> ${this.formatBytes(compressedSize)} (${compressionRatio}% reduction)`);

    } catch (error) {
      await this.log(`Failed to compress ${path.basename(filePath)}: ${error.message}`);
    }
  }

  async cleanupEmptyDirectories() {
    try {
      const entries = await fs.readdir(config.logDirectory, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const dirPath = path.join(config.logDirectory, entry.name);

          try {
            const subEntries = await fs.readdir(dirPath);
            if (subEntries.length === 0) {
              await fs.rmdir(dirPath);
              await this.log(`Removed empty directory: ${entry.name}`);
            }
          } catch (error) {
            // Directory not empty or other error, ignore
          }
        }
      }
    } catch (error) {
      await this.log(`Error cleaning up directories: ${error.message}`);
    }
  }

  async updateDiskUsageStats() {
    try {
      const stats = await this.calculateDiskUsage();
      const statsFile = path.join(config.logDirectory, 'disk-usage-stats.json');

      const statsData = {
        timestamp: new Date().toISOString(),
        totalFiles: stats.fileCount,
        totalSize: stats.totalSize,
        totalSizeFormatted: this.formatBytes(stats.totalSize),
        compressedFiles: stats.compressedCount,
        compressedSize: stats.compressedSize,
        compressionSavings: stats.compressionSavings,
        oldestFile: stats.oldestFile,
        newestFile: stats.newestFile,
      };

      await fs.writeFile(statsFile, JSON.stringify(statsData, null, 2));
      await this.log(`Updated disk usage stats: ${stats.fileCount} files, ${this.formatBytes(stats.totalSize)} total`);

    } catch (error) {
      await this.log(`Error updating disk usage stats: ${error.message}`);
    }
  }

  async calculateDiskUsage() {
    const stats = {
      fileCount: 0,
      totalSize: 0,
      compressedCount: 0,
      compressedSize: 0,
      compressionSavings: 0,
      oldestFile: null,
      newestFile: null,
    };

    try {
      const entries = await fs.readdir(config.logDirectory, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isFile()) {
          const filePath = path.join(config.logDirectory, entry.name);
          const fileStat = await fs.stat(filePath);

          stats.fileCount++;
          stats.totalSize += fileStat.size;

          // Track oldest and newest files
          if (!stats.oldestFile || fileStat.mtime < stats.oldestFile.mtime) {
            stats.oldestFile = { name: entry.name, mtime: fileStat.mtime };
          }
          if (!stats.newestFile || fileStat.mtime > stats.newestFile.mtime) {
            stats.newestFile = { name: entry.name, mtime: fileStat.mtime };
          }

          // Track compressed files
          if (entry.name.endsWith('.gz')) {
            stats.compressedCount++;
            stats.compressedSize += fileStat.size;
          }
        }
      }

      // Calculate compression savings (rough estimate)
      if (stats.compressedCount > 0) {
        // Assume 60% compression ratio on average
        const estimatedUncompressedSize = stats.compressedSize / 0.4;
        stats.compressionSavings = estimatedUncompressedSize - stats.compressedSize;
      }

    } catch (error) {
      await this.log(`Error calculating disk usage: ${error.message}`);
    }

    return stats;
  }

  formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  async log(message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}\n`;

    try {
      await fs.appendFile(this.logFile, logEntry);
      console.log(logEntry.trim());
    } catch (error) {
      console.error(`Failed to write to log file: ${error.message}`);
      console.log(logEntry.trim());
    }
  }
}

// CLI interface
async function main() {
  const command = process.argv[2];

  switch (command) {
    case 'run':
    case undefined:
      const rotator = new LogRotator();
      await rotator.run();
      break;

    case 'stats':
      const statsRotator = new LogRotator();
      await statsRotator.updateDiskUsageStats();

      // Display stats
      const statsFile = path.join(config.logDirectory, 'disk-usage-stats.json');
      try {
        const statsData = JSON.parse(await fs.readFile(statsFile, 'utf8'));
        console.log('\n=== Log Directory Statistics ===');
        console.log(`Total Files: ${statsData.totalFiles}`);
        console.log(`Total Size: ${statsData.totalSizeFormatted}`);
        console.log(`Compressed Files: ${statsData.compressedFiles}`);
        console.log(`Oldest File: ${statsData.oldestFile?.name || 'N/A'}`);
        console.log(`Newest File: ${statsData.newestFile?.name || 'N/A'}`);
        console.log(`Last Updated: ${statsData.timestamp}`);
      } catch (error) {
        console.error('Error reading stats:', error.message);
      }
      break;

    case 'help':
      console.log('Log Rotator Commands:');
      console.log('  run (default) - Run log rotation process');
      console.log('  stats         - Display disk usage statistics');
      console.log('  help          - Show this help message');
      break;

    default:
      console.error(`Unknown command: ${command}`);
      console.error('Use "help" to see available commands');
      process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = LogRotator;
