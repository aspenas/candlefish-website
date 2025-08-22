import express from 'express';
import cron from 'node-cron';
import { Octokit } from '@octokit/rest';
import winston from 'winston';
import { NANDAAutonomousAgent } from './autonomous-agent.js';
import { GitHubCommitter } from './github-committer.js';
import { MetricsCollector } from './metrics-collector.js';

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: '/tmp/nanda-autonomous.log' })
  ]
});

// Express app for health checks and manual triggers
const app = express();
app.use(express.json());

// Initialize components
let agent;
let committer;
let metrics;

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    agent: agent?.getStatus() || 'initializing',
    uptime: process.uptime(),
    lastCommit: agent?.getLastCommitTime(),
    totalCommits: metrics?.getTotalCommits() || 0,
    timestamp: new Date().toISOString()
  });
});

// Manual trigger endpoint
app.post('/trigger', async (req, res) => {
  try {
    logger.info('Manual trigger received');
    const result = await agent.performAutonomousCommit();
    res.json({
      success: true,
      result
    });
  } catch (error) {
    logger.error('Manual trigger failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get agent status
app.get('/status', (req, res) => {
  res.json({
    agent: {
      id: agent?.id,
      personality: agent?.personality,
      state: agent?.state,
      isRunning: agent?.isRunning
    },
    metrics: metrics?.getMetrics(),
    environment: {
      GITHUB_REPO: process.env.GITHUB_REPO,
      FLY_APP_NAME: process.env.FLY_APP_NAME,
      FLY_REGION: process.env.FLY_REGION
    }
  });
});

// WebSocket endpoint for real-time monitoring
app.get('/ws', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  const interval = setInterval(() => {
    res.write(`data: ${JSON.stringify({
      type: 'heartbeat',
      status: agent?.getStatus(),
      timestamp: new Date().toISOString()
    })}\n\n`);
  }, 5000);
  
  req.on('close', () => {
    clearInterval(interval);
  });
});

// Initialize and start
async function initialize() {
  logger.info('🤖 NANDA Autonomous Agent starting...');
  
  // Get configuration from environment
  const config = {
    githubToken: process.env.GITHUB_TOKEN || process.env.GITHUB_PAT,
    githubRepo: process.env.GITHUB_REPO || 'candlefish-ai/candlefish-ai',
    commitInterval: parseInt(process.env.COMMIT_INTERVAL || '300'),
    awsRegion: process.env.AWS_REGION || 'us-east-1',
    dynamoTable: process.env.DYNAMO_TABLE || 'nanda-index-agents'
  };
  
  logger.info('Configuration:', { 
    repo: config.githubRepo,
    interval: config.commitInterval + ' seconds'
  });
  
  // Initialize components
  metrics = new MetricsCollector();
  committer = new GitHubCommitter(config.githubToken, config.githubRepo, logger);
  agent = new NANDAAutonomousAgent(committer, metrics, logger, config);
  
  // Start the agent
  await agent.start();
  
  // Schedule autonomous commits
  const cronSchedule = `*/${Math.floor(config.commitInterval / 60)} * * * *`; // Convert seconds to minutes
  cron.schedule(cronSchedule, async () => {
    logger.info('⏰ Scheduled autonomous commit triggered');
    try {
      await agent.performAutonomousCommit();
    } catch (error) {
      logger.error('Scheduled commit failed:', error);
    }
  });
  
  logger.info(`📅 Scheduled autonomous commits every ${config.commitInterval} seconds`);
  
  // Start Express server
  const PORT = process.env.PORT || 8080;
  app.listen(PORT, () => {
    logger.info(`🚀 NANDA Autonomous Agent listening on port ${PORT}`);
    logger.info(`🌐 Health check: http://localhost:${PORT}/health`);
    logger.info(`🎯 Manual trigger: POST http://localhost:${PORT}/trigger`);
    logger.info(`📊 Status: http://localhost:${PORT}/status`);
  });
}

// Handle shutdown gracefully
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  if (agent) {
    await agent.stop();
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  if (agent) {
    await agent.stop();
  }
  process.exit(0);
});

// Start the application
initialize().catch(error => {
  logger.error('Failed to initialize:', error);
  process.exit(1);
});