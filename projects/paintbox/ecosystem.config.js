/**
 * PM2 Ecosystem Configuration for Paintbox Application
 * Comprehensive process management for all services
 */

module.exports = {
  apps: [
    // Main Next.js Application
    {
      name: 'paintbox-app',
      script: 'npm',
      args: 'start',
      cwd: __dirname,
      instances: process.env.NODE_ENV === 'production' ? 'max' : 1,
      exec_mode: process.env.NODE_ENV === 'production' ? 'cluster' : 'fork',
      
      // Environment configuration
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
        DATABASE_URL: process.env.DATABASE_URL || 'postgresql://paintbox:paintbox123@localhost:5432/paintbox',
        REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
        NEXT_TELEMETRY_DISABLED: '1',
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        DATABASE_URL: process.env.DATABASE_URL,
        REDIS_URL: process.env.REDIS_URL,
        NEXT_TELEMETRY_DISABLED: '1',
      },
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 3000,
        DATABASE_URL: process.env.STAGING_DATABASE_URL,
        REDIS_URL: process.env.STAGING_REDIS_URL,
        NEXT_TELEMETRY_DISABLED: '1',
      },

      // Process management
      autorestart: true,
      watch: process.env.NODE_ENV === 'development',
      watch_delay: 1000,
      ignore_watch: [
        'node_modules',
        '.next',
        'logs',
        'coverage',
        'reports',
        '.git',
        'dist',
        'build',
        'public',
        'tmp',
        '*.log'
      ],
      
      // Memory and CPU limits
      max_memory_restart: process.env.NODE_ENV === 'production' ? '2G' : '1G',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,

      // Logging
      log_file: './logs/paintbox-app.log',
      out_file: './logs/paintbox-app-out.log',
      error_file: './logs/paintbox-app-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      combine_logs: true,
      merge_logs: true,

      // Health monitoring
      health_check_url: 'http://localhost:3000/api/health',
      health_check_grace_period: 3000,
    },

    // WebSocket Server
    {
      name: 'paintbox-websocket',
      script: './server/websocket-server.ts',
      interpreter: 'node',
      interpreter_args: '-r ts-node/register -r tsconfig-paths/register',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',

      env: {
        NODE_ENV: 'development',
        WS_PORT: 3001,
        DATABASE_URL: process.env.DATABASE_URL || 'postgresql://paintbox:paintbox123@localhost:5432/paintbox',
        REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
      },
      env_production: {
        NODE_ENV: 'production',
        WS_PORT: 3001,
        DATABASE_URL: process.env.DATABASE_URL,
        REDIS_URL: process.env.REDIS_URL,
      },

      autorestart: true,
      watch: process.env.NODE_ENV === 'development',
      watch_delay: 1000,
      ignore_watch: [
        'node_modules',
        '.next',
        'logs',
        'coverage',
        'reports',
        '.git'
      ],

      max_memory_restart: '512M',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,

      log_file: './logs/websocket-server.log',
      out_file: './logs/websocket-server-out.log',
      error_file: './logs/websocket-server-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },

    // Background Job Processor
    {
      name: 'paintbox-worker',
      script: './lib/workers/calculation-queue.ts',
      interpreter: 'node',
      interpreter_args: '-r ts-node/register -r tsconfig-paths/register',
      cwd: __dirname,
      instances: process.env.NODE_ENV === 'production' ? 2 : 1,
      exec_mode: 'fork',

      env: {
        NODE_ENV: 'development',
        DATABASE_URL: process.env.DATABASE_URL || 'postgresql://paintbox:paintbox123@localhost:5432/paintbox',
        REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
        WORKER_CONCURRENCY: '5',
      },
      env_production: {
        NODE_ENV: 'production',
        DATABASE_URL: process.env.DATABASE_URL,
        REDIS_URL: process.env.REDIS_URL,
        WORKER_CONCURRENCY: '10',
      },

      autorestart: true,
      watch: false, // Workers shouldn't watch files
      max_memory_restart: '1G',
      min_uptime: '10s',
      max_restarts: 5,
      restart_delay: 5000,

      log_file: './logs/worker.log',
      out_file: './logs/worker-out.log',
      error_file: './logs/worker-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },

    // Health Monitor Process
    {
      name: 'paintbox-health-monitor',
      script: './scripts/health-monitor.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',

      env: {
        NODE_ENV: 'development',
        MONITOR_INTERVAL: '30000', // 30 seconds
        HEALTH_CHECK_TIMEOUT: '5000',
        ALERT_WEBHOOK_URL: process.env.SLACK_WEBHOOK_URL,
      },
      env_production: {
        NODE_ENV: 'production',
        MONITOR_INTERVAL: '10000', // 10 seconds
        HEALTH_CHECK_TIMEOUT: '3000',
        ALERT_WEBHOOK_URL: process.env.SLACK_WEBHOOK_URL,
      },

      autorestart: true,
      watch: false,
      max_memory_restart: '256M',
      min_uptime: '10s',
      max_restarts: 3,
      restart_delay: 10000,

      log_file: './logs/health-monitor.log',
      out_file: './logs/health-monitor-out.log',
      error_file: './logs/health-monitor-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },

    // Dependency Health Checker (runs periodically)
    {
      name: 'paintbox-dependency-checker',
      script: './scripts/dependency-health-check.sh',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      cron_restart: '0 6 * * *', // Run daily at 6 AM

      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },

      autorestart: false, // Cron job, shouldn't auto-restart
      watch: false,
      max_memory_restart: '512M',

      log_file: './logs/dependency-checker.log',
      out_file: './logs/dependency-checker-out.log',
      error_file: './logs/dependency-checker-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },

    // Log Rotation Process
    {
      name: 'paintbox-log-rotator',
      script: './scripts/log-rotator.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      cron_restart: '0 0 * * *', // Run daily at midnight

      env: {
        LOG_RETENTION_DAYS: '30',
        LOG_DIRECTORY: './logs',
      },

      autorestart: false,
      watch: false,
      max_memory_restart: '128M',

      log_file: './logs/log-rotator.log',
      out_file: './logs/log-rotator-out.log',
      error_file: './logs/log-rotator-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    }
  ],

  // Deployment configuration
  deploy: {
    production: {
      user: process.env.DEPLOY_USER || 'deploy',
      host: process.env.DEPLOY_HOST || 'production-server',
      ref: 'origin/main',
      repo: process.env.DEPLOY_REPO || 'git@github.com:your-org/paintbox.git',
      path: '/var/www/paintbox',
      'pre-deploy-local': '',
      'post-deploy': 'npm ci && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'sudo apt-get install -y git nodejs npm'
    },
    staging: {
      user: process.env.STAGING_DEPLOY_USER || 'deploy',
      host: process.env.STAGING_DEPLOY_HOST || 'staging-server',
      ref: 'origin/develop',
      repo: process.env.DEPLOY_REPO || 'git@github.com:your-org/paintbox.git',
      path: '/var/www/paintbox-staging',
      'pre-deploy-local': '',
      'post-deploy': 'npm ci && npm run build && pm2 reload ecosystem.config.js --env staging',
      'pre-setup': 'sudo apt-get install -y git nodejs npm'
    }
  }
};