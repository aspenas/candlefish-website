#!/usr/bin/env node

import { MeetingOrchestrator } from './meeting-orchestrator.js';
import { MEETING_CONFIG } from './config.js';
import dotenv from 'dotenv';
import winston from 'winston';

// Load environment variables
dotenv.config();

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.colorize(),
    winston.format.simple()
  ),
  transports: [new winston.transports.Console()]
});

async function main() {
  console.log('\n🚀 Candlefish Meeting Automation System');
  console.log('=' .repeat(60));
  console.log('Using patrick@candlefish.ai and Candlefish Zoom account\n');
  
  try {
    // Create orchestrator
    const orchestrator = new MeetingOrchestrator();
    
    // Execute workflow with configuration
    const result = await orchestrator.execute(MEETING_CONFIG);
    
    process.exit(0);
  } catch (error) {
    logger.error('Fatal error in meeting automation', { 
      error: error.message,
      stack: error.stack 
    });
    
    console.error('\n❌ Meeting automation failed:');
    console.error(error.message);
    
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error });
  process.exit(1);
});

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { MeetingOrchestrator, MEETING_CONFIG };