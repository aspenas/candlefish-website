#!/usr/bin/env node
/**
 * Generate build information at build time
 * This script captures build metadata for telemetry purposes
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function getGitCommitSha() {
  try {
    // Try to get git commit SHA
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch (error) {
    console.warn('Failed to get git commit SHA:', error.message);
    return process.env.VERCEL_GIT_COMMIT_SHA ||
           process.env.GIT_COMMIT_SHA ||
           'unknown';
  }
}

function getGitBranch() {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
  } catch (error) {
    console.warn('Failed to get git branch:', error.message);
    return process.env.VERCEL_GIT_COMMIT_REF ||
           process.env.GIT_BRANCH ||
           'unknown';
  }
}

function generateBuildInfo() {
  const buildInfo = {
    buildTime: new Date().toISOString(),
    commitSha: getGitCommitSha(),
    branch: getGitBranch(),
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || 'development',
    vercelEnv: process.env.VERCEL_ENV || null,
    deploymentUrl: process.env.VERCEL_URL || null,
    buildId: process.env.BUILD_ID || Date.now().toString(),
  };

  // Ensure .next directory exists
  const nextDir = path.join(process.cwd(), '.next');
  if (!fs.existsSync(nextDir)) {
    fs.mkdirSync(nextDir, { recursive: true });
  }

  // Write build info to .next directory
  const buildInfoPath = path.join(nextDir, 'BUILD_INFO.json');
  fs.writeFileSync(buildInfoPath, JSON.stringify(buildInfo, null, 2));

  console.log('Build info generated:');
  console.log(JSON.stringify(buildInfo, null, 2));

  // Also set as environment variable for runtime access
  process.env.BUILD_TIME = buildInfo.buildTime;
  process.env.BUILD_COMMIT_SHA = buildInfo.commitSha;

  return buildInfo;
}

// Run if called directly
if (require.main === module) {
  generateBuildInfo();
}

module.exports = { generateBuildInfo };
