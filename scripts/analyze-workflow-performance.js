#!/usr/bin/env node

/**
 * GitHub Actions Workflow Performance Analyzer
 * Analyzes workflow performance characteristics and generates optimization recommendations
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

class WorkflowPerformanceAnalyzer {
  constructor(workflowDir) {
    this.workflowDir = workflowDir;
    this.workflows = [];
    this.metrics = {
      totalWorkflows: 0,
      totalJobs: 0,
      totalSteps: 0,
      cacheUsage: 0,
      concurrencyControls: 0,
      matrixJobs: 0,
      parallelJobs: 0,
      estimatedMinutes: 0,
      inefficiencies: [],
      optimizations: []
    };
  }

  // Load and parse all workflow files
  loadWorkflows() {
    const files = fs.readdirSync(this.workflowDir)
      .filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));

    files.forEach(file => {
      try {
        const content = fs.readFileSync(path.join(this.workflowDir, file), 'utf8');
        const workflow = yaml.load(content);
        if (workflow && workflow.jobs) {
          this.workflows.push({
            name: file,
            config: workflow
          });
        }
      } catch (e) {
        console.error(`Error parsing ${file}:`, e.message);
      }
    });

    this.metrics.totalWorkflows = this.workflows.length;
  }

  // Analyze workflow execution patterns
  analyzeExecutionPatterns() {
    this.workflows.forEach(workflow => {
      const { config, name } = workflow;

      // Count jobs and steps
      const jobCount = Object.keys(config.jobs || {}).length;
      this.metrics.totalJobs += jobCount;

      Object.values(config.jobs || {}).forEach(job => {
        this.metrics.totalSteps += (job.steps || []).length;

        // Check for matrix strategy
        if (job.strategy?.matrix) {
          this.metrics.matrixJobs++;
          const matrixSize = this.calculateMatrixSize(job.strategy.matrix);
          this.metrics.estimatedMinutes += matrixSize * this.estimateJobDuration(job);
        } else {
          this.metrics.estimatedMinutes += this.estimateJobDuration(job);
        }

        // Check for parallel execution
        if (job.needs && Array.isArray(job.needs) && job.needs.length === 0) {
          this.metrics.parallelJobs++;
        }
      });

      // Check for concurrency control
      if (config.concurrency) {
        this.metrics.concurrencyControls++;
      }
    });
  }

  // Calculate matrix strategy size
  calculateMatrixSize(matrix) {
    if (matrix.include) {
      return matrix.include.length;
    }

    let size = 1;
    Object.values(matrix).forEach(value => {
      if (Array.isArray(value)) {
        size *= value.length;
      }
    });

    if (matrix.exclude) {
      size -= matrix.exclude.length;
    }

    return size;
  }

  // Estimate job duration based on steps
  estimateJobDuration(job) {
    let minutes = 1; // Base setup time

    (job.steps || []).forEach(step => {
      // Estimate based on common actions
      if (step.uses) {
        if (step.uses.includes('checkout')) minutes += 0.5;
        else if (step.uses.includes('setup-node')) minutes += 1;
        else if (step.uses.includes('setup-python')) minutes += 1;
        else if (step.uses.includes('cache')) minutes += 0.5;
        else if (step.uses.includes('upload-artifact')) minutes += 1;
        else if (step.uses.includes('download-artifact')) minutes += 1;
        else minutes += 0.5;
      } else if (step.run) {
        // Estimate based on common commands
        if (step.run.includes('npm install') || step.run.includes('pnpm install')) minutes += 2;
        else if (step.run.includes('npm test') || step.run.includes('pytest')) minutes += 5;
        else if (step.run.includes('npm build') || step.run.includes('pnpm build')) minutes += 3;
        else if (step.run.includes('docker build')) minutes += 5;
        else minutes += 1;
      }
    });

    return minutes;
  }

  // Analyze cache effectiveness
  analyzeCacheEffectiveness() {
    this.workflows.forEach(workflow => {
      const { config, name } = workflow;

      Object.values(config.jobs || {}).forEach(job => {
        let hasCache = false;
        let hasSetupWithCache = false;

        (job.steps || []).forEach(step => {
          if (step.uses?.includes('actions/cache')) {
            hasCache = true;
            this.metrics.cacheUsage++;

            // Check cache key strategy
            if (step.with?.key && !step.with.key.includes('hashFiles')) {
              this.metrics.inefficiencies.push({
                workflow: name,
                issue: 'Cache key without hashFiles',
                impact: 'Low cache hit rate',
                fix: 'Use hashFiles() in cache key'
              });
            }
          }

          // Check for setup actions with built-in cache
          if (step.uses?.includes('setup-') && step.with?.cache) {
            hasSetupWithCache = true;
          }
        });

        // Check for missing cache opportunities
        if (!hasCache && !hasSetupWithCache && job.steps?.length > 3) {
          this.metrics.inefficiencies.push({
            workflow: name,
            issue: 'No caching strategy',
            impact: 'Increased build time',
            fix: 'Add dependency caching'
          });
        }
      });
    });
  }

  // Identify bottlenecks
  identifyBottlenecks() {
    this.workflows.forEach(workflow => {
      const { config, name } = workflow;

      // Check for sequential jobs that could be parallel
      const jobs = Object.entries(config.jobs || {});
      jobs.forEach(([jobName, job]) => {
        if (job.needs && typeof job.needs === 'string') {
          // Single dependency - check if it could be optimized
          const dependentJobs = jobs.filter(([_, j]) =>
            j.needs === jobName || (Array.isArray(j.needs) && j.needs.includes(jobName))
          );

          if (dependentJobs.length > 1) {
            this.metrics.inefficiencies.push({
              workflow: name,
              issue: `Sequential bottleneck at job '${jobName}'`,
              impact: 'Increased total runtime',
              fix: 'Consider splitting job or running dependents in parallel'
            });
          }
        }
      });

      // Check for large matrix strategies
      jobs.forEach(([jobName, job]) => {
        if (job.strategy?.matrix) {
          const size = this.calculateMatrixSize(job.strategy.matrix);
          if (size > 10) {
            this.metrics.inefficiencies.push({
              workflow: name,
              issue: `Large matrix (${size} jobs) in '${jobName}'`,
              impact: `${size * this.estimateJobDuration(job)} minutes runtime`,
              fix: 'Consider sharding or reducing matrix dimensions'
            });
          }
        }
      });

      // Check for missing fail-fast
      jobs.forEach(([jobName, job]) => {
        if (job.strategy?.matrix && job.strategy['fail-fast'] === false) {
          this.metrics.inefficiencies.push({
            workflow: name,
            issue: `fail-fast disabled in matrix job '${jobName}'`,
            impact: 'Wasted compute on failing builds',
            fix: 'Enable fail-fast or add continue-on-error selectively'
          });
        }
      });
    });
  }

  // Generate optimization recommendations
  generateOptimizations() {
    // Parallel execution opportunities
    const sequentialWorkflows = this.workflows.filter(w => {
      const jobs = Object.values(w.config.jobs || {});
      return jobs.length > 2 && jobs.every(j => j.needs);
    });

    if (sequentialWorkflows.length > 0) {
      this.metrics.optimizations.push({
        category: 'Parallelization',
        recommendation: 'Identify independent jobs and run in parallel',
        impact: 'Reduce workflow time by 30-50%',
        workflows: sequentialWorkflows.map(w => w.name)
      });
    }

    // Caching improvements
    if (this.metrics.cacheUsage < this.metrics.totalJobs * 0.5) {
      this.metrics.optimizations.push({
        category: 'Caching',
        recommendation: 'Implement comprehensive caching strategy',
        impact: 'Reduce dependency installation time by 60-80%',
        implementation: [
          'Use actions/cache for node_modules, pip cache',
          'Enable built-in cache in setup-* actions',
          'Cache build outputs between jobs'
        ]
      });
    }

    // Concurrency controls
    if (this.metrics.concurrencyControls < this.metrics.totalWorkflows * 0.3) {
      this.metrics.optimizations.push({
        category: 'Concurrency',
        recommendation: 'Add concurrency groups to prevent duplicate runs',
        impact: 'Save 20-30% on Actions minutes',
        implementation: [
          'Add concurrency group with cancel-in-progress for PRs',
          'Use unique groups for different workflow types'
        ]
      });
    }

    // Job consolidation
    const smallJobs = this.workflows.reduce((count, w) => {
      return count + Object.values(w.config.jobs || {}).filter(j =>
        (j.steps || []).length <= 3
      ).length;
    }, 0);

    if (smallJobs > 5) {
      this.metrics.optimizations.push({
        category: 'Job Consolidation',
        recommendation: 'Combine small jobs to reduce overhead',
        impact: 'Save 1-2 minutes per consolidated job',
        details: `Found ${smallJobs} jobs with ≤3 steps`
      });
    }

    // Runner optimization
    this.metrics.optimizations.push({
      category: 'Runner Optimization',
      recommendation: 'Use appropriate runner sizes',
      impact: 'Optimize cost vs performance',
      implementation: [
        'Use ubuntu-latest for most jobs (2 vCPU, 7GB RAM)',
        'Use larger runners for heavy builds (4-8 vCPU)',
        'Use self-hosted runners for consistent workloads'
      ]
    });

    // Artifact management
    this.metrics.optimizations.push({
      category: 'Artifact Management',
      recommendation: 'Optimize artifact usage',
      impact: 'Reduce storage costs and transfer time',
      implementation: [
        'Set appropriate retention periods (7 days for builds)',
        'Compress artifacts before upload',
        'Use artifact filtering to exclude unnecessary files'
      ]
    });
  }

  // Calculate cost implications
  calculateCosts() {
    const costPerMinute = {
      'ubuntu-latest': 0.008,
      'windows-latest': 0.016,
      'macos-latest': 0.08
    };

    let estimatedMonthlyCost = 0;
    let minutesByRunner = {
      'ubuntu-latest': 0,
      'windows-latest': 0,
      'macos-latest': 0
    };

    this.workflows.forEach(workflow => {
      const { config } = workflow;

      // Estimate trigger frequency
      let runsPerMonth = 100; // Default assumption
      if (config.on?.schedule) {
        runsPerMonth = 30; // Daily
      } else if (config.on?.push) {
        runsPerMonth = 200; // Frequent pushes
      }

      Object.values(config.jobs || {}).forEach(job => {
        const runner = job['runs-on'] || 'ubuntu-latest';
        const duration = this.estimateJobDuration(job);
        const runs = job.strategy?.matrix ?
          this.calculateMatrixSize(job.strategy.matrix) : 1;

        const totalMinutes = duration * runs * runsPerMonth;

        if (minutesByRunner[runner] !== undefined) {
          minutesByRunner[runner] += totalMinutes;
        } else {
          minutesByRunner['ubuntu-latest'] += totalMinutes;
        }
      });
    });

    // Calculate costs
    Object.entries(minutesByRunner).forEach(([runner, minutes]) => {
      estimatedMonthlyCost += minutes * costPerMinute[runner];
    });

    return {
      estimatedMonthlyCost: Math.round(estimatedMonthlyCost),
      minutesByRunner,
      freeMinutes: 2000, // GitHub free tier
      paidMinutes: Math.max(0, minutesByRunner['ubuntu-latest'] - 2000)
    };
  }

  // Generate comprehensive report
  generateReport() {
    const costs = this.calculateCosts();

    const report = {
      summary: {
        totalWorkflows: this.metrics.totalWorkflows,
        totalJobs: this.metrics.totalJobs,
        totalSteps: this.metrics.totalSteps,
        estimatedMonthlyMinutes: this.metrics.estimatedMinutes * 100,
        estimatedMonthlyCost: `$${costs.estimatedMonthlyCost}`
      },
      performance: {
        averageJobsPerWorkflow: (this.metrics.totalJobs / this.metrics.totalWorkflows).toFixed(1),
        averageStepsPerJob: (this.metrics.totalSteps / this.metrics.totalJobs).toFixed(1),
        cacheAdoption: `${((this.metrics.cacheUsage / this.metrics.totalJobs) * 100).toFixed(0)}%`,
        concurrencyAdoption: `${((this.metrics.concurrencyControls / this.metrics.totalWorkflows) * 100).toFixed(0)}%`,
        matrixUsage: `${((this.metrics.matrixJobs / this.metrics.totalJobs) * 100).toFixed(0)}%`
      },
      bottlenecks: this.metrics.inefficiencies.slice(0, 10),
      optimizations: this.metrics.optimizations,
      costAnalysis: costs,
      recommendations: {
        immediate: [
          'Enable caching for all dependency installation steps',
          'Add concurrency controls to prevent duplicate runs',
          'Implement fail-fast for matrix strategies'
        ],
        shortTerm: [
          'Consolidate small jobs to reduce overhead',
          'Parallelize independent test suites',
          'Optimize artifact retention policies'
        ],
        longTerm: [
          'Implement incremental builds with Turborepo',
          'Set up self-hosted runners for heavy workloads',
          'Implement intelligent test selection based on changes'
        ]
      }
    };

    return report;
  }

  // Run analysis
  analyze() {
    console.log('Loading workflows...');
    this.loadWorkflows();

    console.log('Analyzing execution patterns...');
    this.analyzeExecutionPatterns();

    console.log('Analyzing cache effectiveness...');
    this.analyzeCacheEffectiveness();

    console.log('Identifying bottlenecks...');
    this.identifyBottlenecks();

    console.log('Generating optimizations...');
    this.generateOptimizations();

    console.log('Generating report...');
    return this.generateReport();
  }
}

// Run analyzer
const workflowDir = path.join(__dirname, '..', '.github', 'workflows');
const analyzer = new WorkflowPerformanceAnalyzer(workflowDir);
const report = analyzer.analyze();

// Output report
console.log('\n' + '='.repeat(80));
console.log('GITHUB ACTIONS PERFORMANCE ANALYSIS REPORT');
console.log('='.repeat(80));

console.log('\n## SUMMARY');
console.log(JSON.stringify(report.summary, null, 2));

console.log('\n## PERFORMANCE METRICS');
console.log(JSON.stringify(report.performance, null, 2));

console.log('\n## TOP BOTTLENECKS');
report.bottlenecks.forEach((b, i) => {
  console.log(`\n${i + 1}. ${b.workflow}`);
  console.log(`   Issue: ${b.issue}`);
  console.log(`   Impact: ${b.impact}`);
  console.log(`   Fix: ${b.fix}`);
});

console.log('\n## OPTIMIZATION OPPORTUNITIES');
report.optimizations.forEach(opt => {
  console.log(`\n### ${opt.category}`);
  console.log(`Recommendation: ${opt.recommendation}`);
  console.log(`Expected Impact: ${opt.impact}`);
  if (opt.implementation) {
    console.log('Implementation:');
    opt.implementation.forEach(step => console.log(`  - ${step}`));
  }
});

console.log('\n## COST ANALYSIS');
console.log(`Estimated Monthly Cost: ${report.costAnalysis.estimatedMonthlyCost}`);
console.log(`Free Tier Minutes: ${report.costAnalysis.freeMinutes}`);
console.log(`Paid Minutes: ${report.costAnalysis.paidMinutes}`);
console.log('\nMinutes by Runner:');
Object.entries(report.costAnalysis.minutesByRunner).forEach(([runner, minutes]) => {
  console.log(`  ${runner}: ${Math.round(minutes)} minutes/month`);
});

console.log('\n## RECOMMENDATIONS');
console.log('\n### Immediate Actions:');
report.recommendations.immediate.forEach(r => console.log(`  ✓ ${r}`));

console.log('\n### Short-term Improvements:');
report.recommendations.shortTerm.forEach(r => console.log(`  ✓ ${r}`));

console.log('\n### Long-term Strategy:');
report.recommendations.longTerm.forEach(r => console.log(`  ✓ ${r}`));

console.log('\n' + '='.repeat(80));

// Save detailed report
const reportPath = path.join(__dirname, '..', 'workflow-performance-report.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`\nDetailed report saved to: ${reportPath}`);
