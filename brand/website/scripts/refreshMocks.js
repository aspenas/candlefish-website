#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

// Configuration
const API_BASE = process.env.CANDLEFISH_API_BASE || 'https://api.candlefish.ai';
const MOCK_DIR = path.join(__dirname, '..', 'mock');
const TIMEOUT_MS = 5000;

// Ensure mock directory exists
if (!fs.existsSync(MOCK_DIR)) {
  fs.mkdirSync(MOCK_DIR, { recursive: true });
  console.log(`Created mock directory: ${MOCK_DIR}`);
}

// Endpoints to refresh
const endpoints = [
  {
    name: 'workshop',
    url: '/api/workshop/active',
    file: 'workshop.json'
  },
  {
    name: 'systemActivity',
    url: '/api/system/activity',
    file: 'systemActivity.json'
  },
  {
    name: 'franchises',
    url: '/api/system/franchises',
    file: 'franchises.json'
  }
];

// Fetch with timeout
async function fetchWithTimeout(url, timeout) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Candlefish-Mock-Refresh/1.0'
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeout}ms`);
    }
    throw error;
  }
}

// Refresh a single mock file
async function refreshMock(endpoint) {
  const url = `${API_BASE}${endpoint.url}`;
  const filePath = path.join(MOCK_DIR, endpoint.file);

  console.log(`Refreshing ${endpoint.name} from ${url}...`);

  try {
    const data = await fetchWithTimeout(url, TIMEOUT_MS);

    // Write pretty-printed JSON
    const jsonContent = JSON.stringify(data, null, 2);
    fs.writeFileSync(filePath, jsonContent);

    console.log(`✓ Successfully refreshed ${endpoint.name} (${endpoint.file})`);
    return true;
  } catch (error) {
    console.warn(`✗ Failed to refresh ${endpoint.name}: ${error.message}`);

    // Check if file exists, if not create with minimal data
    if (!fs.existsSync(filePath)) {
      console.log(`  Creating default mock for ${endpoint.name}...`);

      let defaultData = {};

      switch (endpoint.name) {
        case 'workshop':
          defaultData = {
            projects: [
              { id: 'default-1', title: 'Sample Project 1' },
              { id: 'default-2', title: 'Sample Project 2' }
            ]
          };
          break;
        case 'systemActivity':
          defaultData = {
            capacity: 0.85,
            activity: [0.3, 0.5, 0.4, 0.6, 0.35, 0.55, 0.45, 0.4]
          };
          break;
        case 'franchises':
          defaultData = {
            franchises: [
              { id: 'node-1', name: 'Primary Node', streams: 1000, latency: '100ms' },
              { id: 'node-2', name: 'Secondary Node', streams: 500, latency: '150ms' }
            ],
            links: [{ source: 'node-1', target: 'node-2' }],
            status: 'ACTIVE'
          };
          break;
      }

      fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
      console.log(`  Created default mock for ${endpoint.name}`);
    } else {
      console.log(`  Keeping existing mock for ${endpoint.name}`);
    }

    return false;
  }
}

// Main execution
async function main() {
  console.log('=== Candlefish Mock Data Refresh ===');
  console.log(`API Base: ${API_BASE}`);
  console.log(`Mock Directory: ${MOCK_DIR}`);
  console.log('');

  const results = await Promise.all(endpoints.map(refreshMock));

  const successCount = results.filter(r => r).length;
  const failCount = results.filter(r => !r).length;

  console.log('');
  console.log(`=== Summary: ${successCount} succeeded, ${failCount} failed ===`);

  // Exit with error code if any failed
  if (failCount > 0) {
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { refreshMock, main };
