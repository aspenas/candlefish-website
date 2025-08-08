/**
 * Bull Queue Configuration for Heavy Calculations
 * Handles background processing with priority and worker pools
 */

import Bull from 'bull';
import { Decimal } from 'decimal.js';
import { getRealTimeCalculator } from '@/lib/services/real-time-calculator';
import { logger } from '@/lib/logging/simple-logger';
import { getRedisPool } from '@/lib/cache/redis-client';

export interface CalculationJob {
  id: string;
  type: 'formula' | 'batch' | 'estimate';
  priority: number; // 1 (highest) to 10 (lowest)
  data: {
    formulaId?: string;
    formula?: string;
    inputs?: Record<string, any>;
    formulas?: Array<{
      formulaId: string;
      formula: string;
      inputs: Record<string, any>;
    }>;
    estimateId?: string;
  };
  userId: string;
  timestamp: number;
}

export interface JobResult {
  success: boolean;
  result?: any;
  error?: string;
  executionTime: number;
  retries?: number;
}

class CalculationQueue {
  private queue: Bull.Queue<CalculationJob>;
  private calculator = getRealTimeCalculator();
  private concurrency = parseInt(process.env.QUEUE_CONCURRENCY || '4', 10);
  private maxJobsPerWorker = 50;
  private isProcessing = false;

  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    // Create Bull queue with Redis connection
    this.queue = new Bull<CalculationJob>('calculations', redisUrl, {
      defaultJobOptions: {
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 50,      // Keep last 50 failed jobs
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    });

    this.setupProcessors();
    this.setupEventHandlers();
  }

  /**
   * Setup job processors
   */
  private setupProcessors(): void {
    // Process calculation jobs with concurrency
    this.queue.process(this.concurrency, async (job) => {
      const startTime = Date.now();

      try {
        logger.info('Processing calculation job', {
          jobId: job.id,
          type: job.data.type,
          priority: job.data.priority,
        });

        let result: any;

        switch (job.data.type) {
          case 'formula':
            result = await this.processFormulaJob(job.data);
            break;

          case 'batch':
            result = await this.processBatchJob(job.data);
            break;

          case 'estimate':
            result = await this.processEstimateJob(job.data);
            break;

          default:
            throw new Error(`Unknown job type: ${job.data.type}`);
        }

        const executionTime = Date.now() - startTime;

        logger.info('Job completed', {
          jobId: job.id,
          executionTime,
        });

        return {
          success: true,
          result,
          executionTime,
        };
      } catch (error) {
        const executionTime = Date.now() - startTime;

        logger.error('Job failed', {
          jobId: job.id,
          error: error instanceof Error ? error.message : String(error),
          executionTime,
          attempt: job.attemptsMade,
        });

        throw error;
      }
    });
  }

  /**
   * Process single formula calculation
   */
  private async processFormulaJob(data: CalculationJob['data']): Promise<any> {
    if (!data.formulaId || !data.formula || !data.inputs) {
      throw new Error('Invalid formula job data');
    }

    const result = await this.calculator.calculate({
      formulaId: data.formulaId,
      formula: data.formula,
      inputs: data.inputs,
    });

    if (result.errors && result.errors.length > 0) {
      throw new Error(result.errors.join(', '));
    }

    return result.result;
  }

  /**
   * Process batch calculation job
   */
  private async processBatchJob(data: CalculationJob['data']): Promise<any[]> {
    if (!data.formulas || data.formulas.length === 0) {
      throw new Error('Invalid batch job data');
    }

    const requests = data.formulas.map(f => ({
      formulaId: f.formulaId,
      formula: f.formula,
      inputs: f.inputs,
    }));

    const results = await this.calculator.batchCalculate(requests);

    // Check for errors
    const errors = results.filter(r => r.errors && r.errors.length > 0);
    if (errors.length > 0) {
      const errorMessages = errors.flatMap(e => e.errors || []);
      throw new Error(`Batch calculation failed: ${errorMessages.join(', ')}`);
    }

    return results.map(r => r.result);
  }

  /**
   * Process full estimate calculation
   */
  private async processEstimateJob(data: CalculationJob['data']): Promise<any> {
    if (!data.estimateId) {
      throw new Error('Invalid estimate job data');
    }

    // This would load all formulas for an estimate and calculate them
    // For now, return mock result
    logger.info('Processing estimate calculation', { estimateId: data.estimateId });

    return {
      estimateId: data.estimateId,
      totalPrice: new Decimal(Math.random() * 10000).toFixed(2),
      calculations: {},
    };
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.queue.on('completed', (job, result) => {
      logger.debug('Job completed', {
        jobId: job.id,
        type: job.data.type,
        success: result.success,
      });
    });

    this.queue.on('failed', (job, error) => {
      logger.error('Job failed', {
        jobId: job.id,
        type: job.data.type,
        error: error.message,
        attempts: job.attemptsMade,
      });
    });

    this.queue.on('stalled', (job) => {
      logger.warn('Job stalled', {
        jobId: job.id,
        type: job.data.type,
      });
    });

    this.queue.on('active', (job) => {
      logger.debug('Job active', {
        jobId: job.id,
        type: job.data.type,
      });
    });

    this.queue.on('waiting', (jobId) => {
      logger.debug('Job waiting', { jobId });
    });

    this.queue.on('error', (error) => {
      logger.error('Queue error', { error: error.message });
    });
  }

  /**
   * Add job to queue
   */
  async addJob(
    job: Omit<CalculationJob, 'id' | 'timestamp'>,
    options?: Bull.JobOptions
  ): Promise<Bull.Job<CalculationJob>> {
    const jobData: CalculationJob = {
      ...job,
      id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };

    const bullJob = await this.queue.add(jobData, {
      priority: job.priority,
      delay: options?.delay,
      attempts: options?.attempts || 3,
      ...options,
    });

    logger.info('Job added to queue', {
      jobId: bullJob.id,
      type: job.type,
      priority: job.priority,
    });

    return bullJob;
  }

  /**
   * Add bulk jobs
   */
  async addBulkJobs(
    jobs: Array<Omit<CalculationJob, 'id' | 'timestamp'>>,
    options?: Bull.JobOptions
  ): Promise<Bull.Job<CalculationJob>[]> {
    const bullJobs = await Promise.all(
      jobs.map(job => this.addJob(job, options))
    );

    logger.info('Bulk jobs added', { count: jobs.length });

    return bullJobs;
  }

  /**
   * Get job by ID
   */
  async getJob(jobId: string): Promise<Bull.Job<CalculationJob> | null> {
    return await this.queue.getJob(jobId);
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<{
    state: string;
    progress: number;
    result?: any;
    error?: string;
  } | null> {
    const job = await this.getJob(jobId);

    if (!job) return null;

    const state = await job.getState();
    const progress = job.progress();

    return {
      state,
      progress: typeof progress === 'number' ? progress : 0,
      result: job.returnvalue,
      error: job.failedReason,
    };
  }

  /**
   * Cancel job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    const job = await this.getJob(jobId);

    if (!job) return false;

    await job.remove();

    logger.info('Job cancelled', { jobId });

    return true;
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: boolean;
  }> {
    const [
      waiting,
      active,
      completed,
      failed,
      delayed,
      paused,
    ] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount(),
      this.queue.isPaused(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      paused,
    };
  }

  /**
   * Clear completed jobs
   */
  async clearCompleted(): Promise<void> {
    const jobs = await this.queue.getCompleted();

    await Promise.all(jobs.map(job => job.remove()));

    logger.info('Cleared completed jobs', { count: jobs.length });
  }

  /**
   * Clear failed jobs
   */
  async clearFailed(): Promise<void> {
    const jobs = await this.queue.getFailed();

    await Promise.all(jobs.map(job => job.remove()));

    logger.info('Cleared failed jobs', { count: jobs.length });
  }

  /**
   * Pause queue processing
   */
  async pause(): Promise<void> {
    await this.queue.pause();
    logger.info('Queue paused');
  }

  /**
   * Resume queue processing
   */
  async resume(): Promise<void> {
    await this.queue.resume();
    logger.info('Queue resumed');
  }

  /**
   * Drain queue (process all jobs and stop accepting new ones)
   */
  async drain(): Promise<void> {
    await this.queue.pause(true); // Pause locally only

    // Wait for all active jobs to complete
    while (true) {
      const activeCount = await this.queue.getActiveCount();
      if (activeCount === 0) break;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    logger.info('Queue drained');
  }

  /**
   * Close queue connections
   */
  async close(): Promise<void> {
    await this.queue.close();
    logger.info('Queue closed');
  }

  /**
   * Create a priority job
   */
  async addPriorityJob(
    job: Omit<CalculationJob, 'id' | 'timestamp' | 'priority'>
  ): Promise<Bull.Job<CalculationJob>> {
    return this.addJob(
      { ...job, priority: 1 },
      {
        priority: 1,
        removeOnComplete: false, // Keep for debugging
        removeOnFail: false,
      }
    );
  }

  /**
   * Process job immediately (bypass queue)
   */
  async processImmediate(
    job: Omit<CalculationJob, 'id' | 'timestamp'>
  ): Promise<JobResult> {
    const startTime = Date.now();

    try {
      let result: any;

      switch (job.type) {
        case 'formula':
          result = await this.processFormulaJob(job.data);
          break;

        case 'batch':
          result = await this.processBatchJob(job.data);
          break;

        case 'estimate':
          result = await this.processEstimateJob(job.data);
          break;

        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }

      return {
        success: true,
        result,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - startTime,
      };
    }
  }
}

// Singleton instance
let queueInstance: CalculationQueue | null = null;

export function getCalculationQueue(): CalculationQueue {
  if (!queueInstance) {
    queueInstance = new CalculationQueue();
  }
  return queueInstance;
}

export function createCalculationQueue(): CalculationQueue {
  return new CalculationQueue();
}

export default CalculationQueue;
