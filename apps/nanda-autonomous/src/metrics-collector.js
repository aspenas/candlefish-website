export class MetricsCollector {
  constructor() {
    this.metrics = {
      totalCommits: 0,
      successfulCommits: 0,
      failedCommits: 0,
      errors: [],
      lastCommit: null,
      startTime: new Date().toISOString(),
      performance: {
        avgCommitTime: 0,
        totalCommitTime: 0
      }
    };
  }
  
  recordCommit(result) {
    this.metrics.totalCommits++;
    this.metrics.successfulCommits++;
    this.metrics.lastCommit = {
      sha: result.sha,
      branch: result.branch,
      pr: result.pr,
      timestamp: new Date().toISOString()
    };
  }
  
  recordError(error) {
    this.metrics.failedCommits++;
    this.metrics.errors.push({
      message: error.message,
      timestamp: new Date().toISOString(),
      stack: error.stack
    });
    
    // Keep only last 10 errors
    if (this.metrics.errors.length > 10) {
      this.metrics.errors = this.metrics.errors.slice(-10);
    }
  }
  
  recordCommitTime(duration) {
    this.metrics.performance.totalCommitTime += duration;
    this.metrics.performance.avgCommitTime = 
      this.metrics.performance.totalCommitTime / this.metrics.totalCommits;
  }
  
  getTotalCommits() {
    return this.metrics.totalCommits;
  }
  
  getMetrics() {
    return {
      ...this.metrics,
      uptime: Date.now() - new Date(this.metrics.startTime).getTime(),
      successRate: this.metrics.totalCommits > 0 
        ? (this.metrics.successfulCommits / this.metrics.totalCommits * 100).toFixed(2) + '%'
        : '0%'
    };
  }
}