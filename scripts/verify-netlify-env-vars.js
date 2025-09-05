#!/usr/bin/env node

/**
 * Netlify Environment Variable Verification Script
 * 
 * This script verifies that all Netlify functions are properly configured
 * to use environment variables instead of hardcoded API keys.
 * 
 * Usage:
 *   node scripts/verify-netlify-env-vars.js
 * 
 * Exit codes:
 *   0 - All functions properly configured
 *   1 - Issues found requiring attention
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  // Root directory to search for Netlify functions
  searchRoots: [
    'brand/website/netlify/functions',
    'apps/website/netlify/functions', 
    'projects/*/netlify/functions'
  ],
  
  // Known hardcoded API keys that should be replaced
  forbiddenPatterns: [
    {
      pattern: /re_[A-Za-z0-9_]{25,}/g,
      description: 'Hardcoded Resend API key',
      replacement: 'process.env.RESEND_API_KEY'
    },
    {
      pattern: /sk-[A-Za-z0-9_]{40,}/g, 
      description: 'Hardcoded OpenAI API key',
      replacement: 'process.env.OPENAI_API_KEY'
    },
    {
      pattern: /xapp-[A-Za-z0-9_]{20,}/g,
      description: 'Hardcoded API key', 
      replacement: 'process.env.API_KEY'
    }
  ],
  
  // Required environment variable patterns
  requiredEnvPatterns: [
    {
      pattern: /process\.env\.RESEND_API_KEY/,
      description: 'Resend API key from environment'
    },
    {
      pattern: /process\.env\.OPENAI_API_KEY/,
      description: 'OpenAI API key from environment'
    }
  ],
  
  // Functions that should use specific environment variables
  expectedEnvVars: {
    'newsletter.js': ['RESEND_API_KEY'],
    'contact.js': ['RESEND_API_KEY'],
    'consultation.js': ['RESEND_API_KEY'],
    'consideration.js': ['RESEND_API_KEY'],
    'consideration_secure.js': ['RESEND_API_KEY'],
    'nanda.js': ['RESEND_API_KEY'],
    'workshop.js': ['RESEND_API_KEY'],
    'workshop-note-deploy.js': ['RESEND_API_KEY'],
    'deployment-webhook.js': ['RESEND_API_KEY']
  }
};

class NetlifyEnvVerifier {
  constructor() {
    this.issues = [];
    this.checkedFiles = [];
    this.summary = {
      totalFiles: 0,
      issuesFound: 0,
      hardcodedKeys: 0,
      missingEnvVars: 0,
      properlyConfigured: 0
    };
  }

  /**
   * Find all Netlify function files
   */
  findNetlifyFunctions() {
    const functions = [];
    
    for (const searchRoot of CONFIG.searchRoots) {
      const fullPath = path.resolve(searchRoot);
      
      if (fs.existsSync(fullPath)) {
        const files = fs.readdirSync(fullPath)
          .filter(file => file.endsWith('.js'))
          .map(file => path.join(searchRoot, file));
        functions.push(...files);
      }
    }
    
    return [...new Set(functions)]; // Remove duplicates
  }

  /**
   * Check a single file for issues
   */
  checkFile(filePath) {
    const fullPath = path.resolve(filePath);
    const fileName = path.basename(filePath);
    
    if (!fs.existsSync(fullPath)) {
      this.addIssue('error', filePath, 'File not found');
      return false;
    }

    const content = fs.readFileSync(fullPath, 'utf8');
    this.checkedFiles.push(filePath);
    
    let hasIssues = false;
    let hasProperEnvUsage = false;

    // Check for hardcoded API keys
    for (const forbidden of CONFIG.forbiddenPatterns) {
      const matches = content.match(forbidden.pattern);
      if (matches) {
        for (const match of matches) {
          // Skip placeholder keys used in comparisons
          if (match.includes('placeholder') || match.includes('change_this')) {
            continue;
          }
          
          // Skip if it's in a comparison context (apiKey !== 'key')
          const matchIndex = content.indexOf(match);
          const beforeMatch = content.substring(Math.max(0, matchIndex - 50), matchIndex);
          const afterMatch = content.substring(matchIndex + match.length, Math.min(content.length, matchIndex + match.length + 50));
          
          if (beforeMatch.includes('!==') || beforeMatch.includes('!=') || 
              afterMatch.includes('!==') || afterMatch.includes('!=')) {
            continue;
          }
          
          this.addIssue('error', filePath, 
            `Hardcoded API key found: "${match.substring(0, 10)}..." - Replace with ${forbidden.replacement}`);
          this.summary.hardcodedKeys++;
          hasIssues = true;
        }
      }
    }

    // Check for proper environment variable usage
    const expectedVars = CONFIG.expectedEnvVars[fileName] || [];
    for (const envVar of expectedVars) {
      const envPattern = new RegExp(`process\\.env\\.${envVar}`, 'g');
      if (content.match(envPattern)) {
        hasProperEnvUsage = true;
      } else {
        this.addIssue('warning', filePath, 
          `Missing environment variable usage: process.env.${envVar}`);
        this.summary.missingEnvVars++;
        hasIssues = true;
      }
    }

    // Check for proper error handling of missing env vars
    if (hasProperEnvUsage) {
      const hasEnvCheck = content.includes('process.env.') && 
        (content.includes('!apiKey') || content.includes('!process.env') || 
         content.includes('apiKey &&') || content.includes('process.env.') && content.includes('!=='));
      
      if (!hasEnvCheck) {
        this.addIssue('info', filePath, 
          'Consider adding validation for missing environment variables');
      }
    }

    if (!hasIssues) {
      this.summary.properlyConfigured++;
    }

    return !hasIssues;
  }

  /**
   * Add an issue to the results
   */
  addIssue(severity, file, message) {
    this.issues.push({
      severity,
      file,
      message,
      timestamp: new Date().toISOString()
    });
    
    if (severity === 'error' || severity === 'warning') {
      this.summary.issuesFound++;
    }
  }

  /**
   * Generate recommendations based on findings
   */
  generateRecommendations() {
    const recommendations = [];

    if (this.summary.hardcodedKeys > 0) {
      recommendations.push({
        priority: 'HIGH',
        action: 'Replace all hardcoded API keys with environment variables',
        details: `Found ${this.summary.hardcodedKeys} hardcoded API keys that must be replaced`
      });
    }

    if (this.summary.missingEnvVars > 0) {
      recommendations.push({
        priority: 'MEDIUM', 
        action: 'Add missing environment variable references',
        details: `${this.summary.missingEnvVars} functions need proper environment variable usage`
      });
    }

    recommendations.push({
      priority: 'LOW',
      action: 'Set up Netlify environment variables',
      details: 'Ensure all required environment variables are configured in Netlify dashboard'
    });

    return recommendations;
  }

  /**
   * Run the complete verification process
   */
  async run() {
    console.log('🔍 Netlify Environment Variable Verification\n');
    console.log('Searching for Netlify functions...');

    const functions = this.findNetlifyFunctions();
    this.summary.totalFiles = functions.length;

    console.log(`Found ${functions.length} Netlify functions to check\n`);

    // Check each function file
    for (const functionFile of functions) {
      console.log(`Checking: ${functionFile}`);
      this.checkFile(functionFile);
    }

    // Generate report
    this.generateReport();
    
    // Return exit code
    return this.summary.issuesFound > 0 ? 1 : 0;
  }

  /**
   * Generate and display the final report
   */
  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 VERIFICATION RESULTS');
    console.log('='.repeat(60));
    
    // Summary
    console.log(`\nSummary:`);
    console.log(`  Total files checked: ${this.summary.totalFiles}`);
    console.log(`  Properly configured: ${this.summary.properlyConfigured}`);
    console.log(`  Issues found: ${this.summary.issuesFound}`);
    console.log(`    - Hardcoded keys: ${this.summary.hardcodedKeys}`);
    console.log(`    - Missing env vars: ${this.summary.missingEnvVars}`);

    // Issues by severity
    if (this.issues.length > 0) {
      console.log('\nIssues Found:');
      
      const errorIssues = this.issues.filter(i => i.severity === 'error');
      const warningIssues = this.issues.filter(i => i.severity === 'warning');
      const infoIssues = this.issues.filter(i => i.severity === 'info');

      if (errorIssues.length > 0) {
        console.log('\n🚨 ERRORS (must fix before deployment):');
        errorIssues.forEach(issue => {
          console.log(`  ❌ ${issue.file}`);
          console.log(`     ${issue.message}`);
        });
      }

      if (warningIssues.length > 0) {
        console.log('\n⚠️  WARNINGS:');
        warningIssues.forEach(issue => {
          console.log(`  ⚠️  ${issue.file}`);
          console.log(`     ${issue.message}`);
        });
      }

      if (infoIssues.length > 0) {
        console.log('\nℹ️  RECOMMENDATIONS:');
        infoIssues.forEach(issue => {
          console.log(`  ℹ️  ${issue.file}`);
          console.log(`     ${issue.message}`);
        });
      }
    }

    // Recommendations
    const recommendations = this.generateRecommendations();
    if (recommendations.length > 0) {
      console.log('\n📋 RECOMMENDED ACTIONS:');
      recommendations.forEach((rec, index) => {
        console.log(`\n${index + 1}. [${rec.priority}] ${rec.action}`);
        console.log(`   ${rec.details}`);
      });
    }

    // Next steps
    console.log('\n🚀 NEXT STEPS:');
    if (this.summary.issuesFound === 0) {
      console.log('✅ All Netlify functions are properly configured!');
      console.log('✅ Ready for deployment');
    } else {
      console.log('1. Fix all ERROR-level issues before deployment');
      console.log('2. Update Netlify environment variables');
      console.log('3. Run this script again to verify fixes');
      console.log('4. Deploy when all issues are resolved');
    }

    console.log('\n' + '='.repeat(60));
  }
}

// Main execution
async function main() {
  const verifier = new NetlifyEnvVerifier();
  const exitCode = await verifier.run();
  process.exit(exitCode);
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Verification failed:', error);
    process.exit(1);
  });
}

module.exports = { NetlifyEnvVerifier };