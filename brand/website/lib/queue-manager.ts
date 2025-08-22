/**
 * Queue Management System for Candlefish Atelier
 *
 * Handles workshop access requests, collaboration proposals,
 * and maintains the selective entry process.
 */

export interface QueueEntry {
  id: string;
  type: 'collaboration' | 'consultation' | 'workshop_visit';
  submittedAt: number;
  status: 'waiting' | 'under_review' | 'scheduled' | 'declined';
  priority: 'standard' | 'expedited' | 'deferred';
  estimatedWait: string;
  requester: {
    name?: string;
    organization?: string;
    previousCollaborations: number;
  };
  details: {
    title: string;
    description: string;
    scope: 'small' | 'medium' | 'large';
    urgency: 'low' | 'medium' | 'high';
    complexity: number; // 0-1 scale
  };
  evaluation?: {
    operational_fit: number;
    resource_requirements: number;
    strategic_alignment: number;
    craft_opportunity: number;
    reviewer_notes: string;
  };
}

export interface QueueConfiguration {
  maxCapacity: number;
  reviewCycle: number; // days
  priorityWeights: {
    operational_fit: number;
    resource_requirements: number;
    strategic_alignment: number;
    craft_opportunity: number;
    previous_collaborations: number;
  };
  waitTimeMultipliers: {
    collaboration: number;
    consultation: number;
    workshop_visit: number;
  };
}

class QueueManager {
  private entries: QueueEntry[] = [];
  private config: QueueConfiguration;
  private nextId: number = 1;

  constructor() {
    this.config = {
      maxCapacity: 150,
      reviewCycle: 14, // 2 weeks
      priorityWeights: {
        operational_fit: 0.35,
        resource_requirements: 0.20,
        strategic_alignment: 0.25,
        craft_opportunity: 0.15,
        previous_collaborations: 0.05,
      },
      waitTimeMultipliers: {
        collaboration: 1.2,
        consultation: 0.8,
        workshop_visit: 1.0,
      },
    };

    this.initializeDemoQueue();
  }

  private initializeDemoQueue(): void {
    // Create some demo entries for visualization
    const demoEntries: Partial<QueueEntry>[] = [
      {
        type: 'collaboration',
        submittedAt: Date.now() - 5 * 24 * 60 * 60 * 1000, // 5 days ago
        status: 'under_review',
        details: {
          title: 'Manufacturing Intelligence Integration',
          description: 'Develop selective automation for craft manufacturing process',
          scope: 'large',
          urgency: 'medium',
          complexity: 0.85,
        },
      },
      {
        type: 'workshop_visit',
        submittedAt: Date.now() - 3 * 24 * 60 * 60 * 1000, // 3 days ago
        status: 'waiting',
        details: {
          title: 'Operational Systems Consultation',
          description: 'Review current workflow for optimization opportunities',
          scope: 'medium',
          urgency: 'low',
          complexity: 0.45,
        },
      },
      {
        type: 'consultation',
        submittedAt: Date.now() - 1 * 24 * 60 * 60 * 1000, // 1 day ago
        status: 'waiting',
        details: {
          title: 'Selective Automation Assessment',
          description: 'Evaluate automation potential for boutique operation',
          scope: 'small',
          urgency: 'high',
          complexity: 0.30,
        },
      },
    ];

    demoEntries.forEach((entry, index) => {
      this.entries.push(this.createCompleteEntry(entry, index + 1));
    });
  }

  private createCompleteEntry(partial: Partial<QueueEntry>, position: number): QueueEntry {
    const id = `q-2024-${(158 + position).toString().padStart(3, '0')}`;
    const type = partial.type || 'consultation';

    return {
      id,
      type,
      submittedAt: partial.submittedAt || Date.now(),
      status: partial.status || 'waiting',
      priority: this.calculatePriority(partial),
      estimatedWait: this.calculateWaitTime(type, position),
      requester: partial.requester || {
        previousCollaborations: Math.floor(Math.random() * 3),
      },
      details: partial.details || {
        title: 'Operational Assessment',
        description: 'General operational review and recommendations',
        scope: 'medium',
        urgency: 'medium',
        complexity: 0.5,
      },
      evaluation: partial.evaluation,
    };
  }

  private calculatePriority(entry: Partial<QueueEntry>): 'standard' | 'expedited' | 'deferred' {
    if (!entry.details) return 'standard';

    const urgencyScore = entry.details.urgency === 'high' ? 1 :
                        entry.details.urgency === 'medium' ? 0.5 : 0;
    const complexityScore = (entry.details.complexity || 0.5);
    const scopeScore = entry.details.scope === 'large' ? 1 :
                      entry.details.scope === 'medium' ? 0.6 : 0.3;

    const totalScore = (urgencyScore + complexityScore + scopeScore) / 3;

    if (totalScore > 0.75) return 'expedited';
    if (totalScore < 0.35) return 'deferred';
    return 'standard';
  }

  private calculateWaitTime(type: QueueEntry['type'], position: number): string {
    const baseWeeks = 12; // Base wait time
    const positionMultiplier = position / 40; // Normalize position
    const typeMultiplier = this.config.waitTimeMultipliers[type];

    const estimatedWeeks = Math.ceil(baseWeeks * positionMultiplier * typeMultiplier);
    const minWeeks = estimatedWeeks;
    const maxWeeks = estimatedWeeks + 4;

    return `${minWeeks}-${maxWeeks} weeks`;
  }

  /**
   * Get current queue status
   */
  public getQueueStatus(): {
    totalEntries: number;
    waitingEntries: number;
    underReview: number;
    averageWaitTime: string;
    capacityUtilization: number;
    isAcceptingSubmissions: boolean;
  } {
    const totalEntries = this.entries.length;
    const waitingEntries = this.entries.filter(e => e.status === 'waiting').length;
    const underReview = this.entries.filter(e => e.status === 'under_review').length;
    const capacityUtilization = totalEntries / this.config.maxCapacity;

    return {
      totalEntries,
      waitingEntries,
      underReview,
      averageWaitTime: this.calculateAverageWaitTime(),
      capacityUtilization,
      isAcceptingSubmissions: capacityUtilization < 0.85, // Stop accepting at 85% capacity
    };
  }

  /**
   * Get entries by status with pagination
   */
  public getEntriesByStatus(
    status?: QueueEntry['status'],
    limit: number = 10,
    offset: number = 0
  ): {
    entries: QueueEntry[];
    total: number;
    hasMore: boolean;
  } {
    let filtered = status ?
      this.entries.filter(e => e.status === status) :
      this.entries;

    // Sort by submission date (newest first) and priority
    filtered = filtered.sort((a, b) => {
      if (a.priority !== b.priority) {
        const priorityOrder = { expedited: 0, standard: 1, deferred: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return b.submittedAt - a.submittedAt;
    });

    const paginatedEntries = filtered.slice(offset, offset + limit);

    return {
      entries: paginatedEntries,
      total: filtered.length,
      hasMore: offset + limit < filtered.length,
    };
  }

  /**
   * Get queue position for a specific entry
   */
  public getQueuePosition(entryId: string): number | null {
    const entry = this.entries.find(e => e.id === entryId);
    if (!entry || entry.status !== 'waiting') return null;

    const waitingEntries = this.entries
      .filter(e => e.status === 'waiting')
      .sort((a, b) => {
        // Sort by priority first, then submission date
        if (a.priority !== b.priority) {
          const priorityOrder = { expedited: 0, standard: 1, deferred: 2 };
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return a.submittedAt - b.submittedAt;
      });

    return waitingEntries.findIndex(e => e.id === entryId) + 1;
  }

  /**
   * Submit a new queue entry (simulation)
   */
  public submitEntry(
    type: QueueEntry['type'],
    details: QueueEntry['details'],
    requester?: QueueEntry['requester']
  ): { success: boolean; entryId?: string; position?: number; message: string } {
    const status = this.getQueueStatus();

    if (!status.isAcceptingSubmissions) {
      return {
        success: false,
        message: 'Queue at capacity. New submissions temporarily suspended.',
      };
    }

    const entry = this.createCompleteEntry({
      type,
      details,
      requester,
      submittedAt: Date.now(),
    }, status.totalEntries + 1);

    this.entries.push(entry);
    const position = this.getQueuePosition(entry.id);

    return {
      success: true,
      entryId: entry.id,
      position: position ?? undefined,
      message: `Submission successful. Queue position: #${position}`,
    };
  }

  /**
   * Evaluate an entry (internal process simulation)
   */
  public evaluateEntry(
    entryId: string,
    evaluation: QueueEntry['evaluation']
  ): boolean {
    const entry = this.entries.find(e => e.id === entryId);
    if (!entry) return false;

    entry.evaluation = evaluation;

    if (!evaluation) {
      return false;
    }

    // Calculate overall score
    const weights = this.config.priorityWeights;
    const score = (
      evaluation.operational_fit * weights.operational_fit +
      evaluation.resource_requirements * weights.resource_requirements +
      evaluation.strategic_alignment * weights.strategic_alignment +
      evaluation.craft_opportunity * weights.craft_opportunity
    );

    // Update status based on score
    if (score > 0.75) {
      entry.status = 'scheduled';
      entry.priority = 'expedited';
    } else if (score > 0.5) {
      entry.status = 'under_review';
    } else {
      entry.status = 'declined';
    }

    return true;
  }

  private calculateAverageWaitTime(): string {
    const waitingEntries = this.entries.filter(e => e.status === 'waiting');
    if (waitingEntries.length === 0) return "12-16 weeks";

    // Simulate average based on queue length and type distribution
    const avgPosition = waitingEntries.length / 2;
    const estimatedWeeks = Math.ceil(12 + (avgPosition / 10) * 4);

    return `${estimatedWeeks}-${estimatedWeeks + 4} weeks`;
  }

  /**
   * Get queue analytics for dashboard
   */
  public getQueueAnalytics(): {
    typeDistribution: Record<QueueEntry['type'], number>;
    statusDistribution: Record<QueueEntry['status'], number>;
    priorityDistribution: Record<QueueEntry['priority'], number>;
    averageComplexity: number;
    conversionRate: number; // waiting -> scheduled
  } {
    const typeDistribution = this.entries.reduce((acc, entry) => {
      acc[entry.type] = (acc[entry.type] || 0) + 1;
      return acc;
    }, {} as Record<QueueEntry['type'], number>);

    const statusDistribution = this.entries.reduce((acc, entry) => {
      acc[entry.status] = (acc[entry.status] || 0) + 1;
      return acc;
    }, {} as Record<QueueEntry['status'], number>);

    const priorityDistribution = this.entries.reduce((acc, entry) => {
      acc[entry.priority] = (acc[entry.priority] || 0) + 1;
      return acc;
    }, {} as Record<QueueEntry['priority'], number>);

    const averageComplexity = this.entries.reduce((sum, entry) =>
      sum + entry.details.complexity, 0) / this.entries.length;

    const scheduledCount = statusDistribution.scheduled || 0;
    const totalProcessed = (statusDistribution.scheduled || 0) + (statusDistribution.declined || 0);
    const conversionRate = totalProcessed > 0 ? scheduledCount / totalProcessed : 0;

    return {
      typeDistribution,
      statusDistribution,
      priorityDistribution,
      averageComplexity,
      conversionRate,
    };
  }
}

// Export singleton instance
export const queueManager = new QueueManager();
