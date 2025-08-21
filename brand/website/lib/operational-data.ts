/**
 * Operational Data Infrastructure for Candlefish Atelier
 *
 * Simulates live workshop metrics, queue management, and system telemetry.
 * In a real implementation, this would connect to actual monitoring systems.
 */

export interface OperationalMetrics {
  timestamp: number;
  cognitiveLoad: number;
  workshopTemperature: number;
  activeSessions: number;
  systemUptime: number;
  coffeeReserves: number;
  networkLatency: number;
  craftIntensity: number;
  collaborationHealth: number;
}

export interface WorkshopTelemetry {
  cpuUsage: number;
  memoryUsage: number;
  diskSpace: number;
  activeProcesses: number;
  networkActivity: number;
  errorRate: number;
}

export interface QueueStatus {
  totalEntries: number;
  currentPosition: number;
  averageWaitTime: string;
  processingRate: number;
  recentActivity: QueueActivity[];
}

export interface QueueActivity {
  timestamp: number;
  action: 'submitted' | 'reviewed' | 'accepted' | 'declined' | 'completed';
  entryId: string;
  type: 'collaboration' | 'consultation' | 'workshop_visit';
}

export interface CollaborationStatus {
  id: string;
  title: string;
  partner: string;
  phase: string;
  startDate: string;
  intensity: number;
  lastActivity: string;
  status: 'planning' | 'active' | 'synthesis' | 'completion' | 'archived';
}

class OperationalDataService {
  private metrics: OperationalMetrics;
  private telemetry: WorkshopTelemetry;
  private queueStatus: QueueStatus;
  private collaborations: CollaborationStatus[];
  private lastUpdate: number = 0;

  constructor() {
    this.metrics = this.initializeMetrics();
    this.telemetry = this.initializeTelemetry();
    this.queueStatus = this.initializeQueue();
    this.collaborations = this.initializeCollaborations();
  }

  private initializeMetrics(): OperationalMetrics {
    return {
      timestamp: Date.now(),
      cognitiveLoad: 0.94,
      workshopTemperature: 21.3,
      activeSessions: 3,
      systemUptime: 127.5,
      coffeeReserves: 0.23,
      networkLatency: 12,
      craftIntensity: 0.87,
      collaborationHealth: 0.92,
    };
  }

  private initializeTelemetry(): WorkshopTelemetry {
    return {
      cpuUsage: 0.34,
      memoryUsage: 0.67,
      diskSpace: 0.82,
      activeProcesses: 47,
      networkActivity: 0.15,
      errorRate: 0.002,
    };
  }

  private initializeQueue(): QueueStatus {
    return {
      totalEntries: 127,
      currentPosition: 47,
      averageWaitTime: "12-18 weeks",
      processingRate: 0.8, // entries per week
      recentActivity: this.generateQueueActivity(),
    };
  }

  private generateQueueActivity(): QueueActivity[] {
    const activities: QueueActivity[] = [];
    const types: ('collaboration' | 'consultation' | 'workshop_visit')[] =
      ['collaboration', 'consultation', 'workshop_visit'];
    const actions: ('submitted' | 'reviewed' | 'accepted' | 'declined' | 'completed')[] =
      ['submitted', 'reviewed', 'accepted', 'declined', 'completed'];

    for (let i = 0; i < 10; i++) {
      activities.push({
        timestamp: Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000, // Last week
        action: actions[Math.floor(Math.random() * actions.length)],
        entryId: `q-2024-${(150 + i).toString().padStart(3, '0')}`,
        type: types[Math.floor(Math.random() * types.length)],
      });
    }

    return activities.sort((a, b) => b.timestamp - a.timestamp);
  }

  private initializeCollaborations(): CollaborationStatus[] {
    return [
      {
        id: 'collab-001',
        title: 'Operational Systems Architecture',
        partner: 'Industrial Partner Alpha',
        phase: 'Deep Synthesis',
        startDate: '2024-10-15',
        intensity: 0.95,
        lastActivity: '2024-12-21T14:30:00Z',
        status: 'active',
      },
      {
        id: 'collab-002',
        title: 'Craft-Scale Manufacturing Intelligence',
        partner: 'Artisan Collective Beta',
        phase: 'Instrument Calibration',
        startDate: '2024-11-28',
        intensity: 0.78,
        lastActivity: '2024-12-20T09:15:00Z',
        status: 'active',
      },
      {
        id: 'collab-003',
        title: 'Selective Automation Framework',
        partner: 'Workshop Gamma',
        phase: 'Proof of Concept',
        startDate: '2024-09-22',
        intensity: 0.62,
        lastActivity: '2024-12-19T16:45:00Z',
        status: 'synthesis',
      },
    ];
  }

  /**
   * Get current operational metrics with live updates
   */
  public getMetrics(): OperationalMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }

  /**
   * Get workshop system telemetry
   */
  public getTelemetry(): WorkshopTelemetry {
    this.updateTelemetry();
    return { ...this.telemetry };
  }

  /**
   * Get current queue status
   */
  public getQueueStatus(): QueueStatus {
    this.updateQueue();
    return { ...this.queueStatus };
  }

  /**
   * Get active collaborations
   */
  public getCollaborations(): CollaborationStatus[] {
    return [...this.collaborations];
  }

  /**
   * Calculate workshop capacity utilization
   */
  public getCapacityUtilization(): number {
    const baseCapacity = 1.0;
    const cognitiveLoad = this.metrics.cognitiveLoad;
    const activeCollabs = this.collaborations.filter(c => c.status === 'active').length;
    const maxCollabs = 4; // Workshop capacity limit

    return Math.min(1.0, (cognitiveLoad + (activeCollabs / maxCollabs)) / 2);
  }

  /**
   * Get system health overview
   */
  public getSystemHealth(): {
    overall: 'optimal' | 'warning' | 'critical';
    details: { component: string; status: string; value?: number }[];
  } {
    const health = [];
    let criticalCount = 0;
    let warningCount = 0;

    // Check cognitive load
    if (this.metrics.cognitiveLoad > 0.95) {
      health.push({ component: 'Cognitive Load', status: 'critical', value: this.metrics.cognitiveLoad });
      criticalCount++;
    } else if (this.metrics.cognitiveLoad > 0.90) {
      health.push({ component: 'Cognitive Load', status: 'warning', value: this.metrics.cognitiveLoad });
      warningCount++;
    } else {
      health.push({ component: 'Cognitive Load', status: 'optimal', value: this.metrics.cognitiveLoad });
    }

    // Check coffee reserves (critical for operation)
    if (this.metrics.coffeeReserves < 0.2) {
      health.push({ component: 'Coffee Reserves', status: 'critical', value: this.metrics.coffeeReserves });
      criticalCount++;
    } else if (this.metrics.coffeeReserves < 0.5) {
      health.push({ component: 'Coffee Reserves', status: 'warning', value: this.metrics.coffeeReserves });
      warningCount++;
    } else {
      health.push({ component: 'Coffee Reserves', status: 'optimal', value: this.metrics.coffeeReserves });
    }

    // Check system telemetry
    if (this.telemetry.errorRate > 0.01) {
      health.push({ component: 'Error Rate', status: 'warning', value: this.telemetry.errorRate });
      warningCount++;
    } else {
      health.push({ component: 'Error Rate', status: 'optimal', value: this.telemetry.errorRate });
    }

    const overall = criticalCount > 0 ? 'critical' :
                   warningCount > 0 ? 'warning' : 'optimal';

    return { overall, details: health };
  }

  private updateMetrics(): void {
    const now = Date.now();
    if (now - this.lastUpdate < 2000) return; // Update every 2 seconds

    const variance = 0.02;

    // Update metrics with realistic drift
    this.metrics.cognitiveLoad = this.constrainValue(
      this.metrics.cognitiveLoad + (Math.random() - 0.5) * variance,
      0.80, 1.0
    );

    this.metrics.workshopTemperature = this.constrainValue(
      this.metrics.workshopTemperature + (Math.random() - 0.5) * 0.1,
      20.0, 23.0
    );

    this.metrics.coffeeReserves = Math.max(0.1,
      this.metrics.coffeeReserves - Math.random() * 0.001 // Slow depletion
    );

    this.metrics.networkLatency = this.constrainValue(
      this.metrics.networkLatency + (Math.random() - 0.5) * 2,
      8, 25
    );

    this.metrics.systemUptime += (now - this.metrics.timestamp) / (1000 * 60 * 60); // Hours
    this.metrics.timestamp = now;
    this.lastUpdate = now;
  }

  private updateTelemetry(): void {
    const variance = 0.01;

    this.telemetry.cpuUsage = this.constrainValue(
      this.telemetry.cpuUsage + (Math.random() - 0.5) * variance,
      0.2, 0.8
    );

    this.telemetry.memoryUsage = this.constrainValue(
      this.telemetry.memoryUsage + (Math.random() - 0.5) * variance,
      0.5, 0.9
    );

    this.telemetry.networkActivity = this.constrainValue(
      this.telemetry.networkActivity + (Math.random() - 0.5) * variance,
      0.05, 0.3
    );
  }

  private updateQueue(): void {
    // Simulate occasional queue changes
    if (Math.random() < 0.05) { // 5% chance
      this.queueStatus.totalEntries += Math.floor(Math.random() * 3 - 1); // -1, 0, 1
      this.queueStatus.currentPosition = Math.max(40,
        this.queueStatus.currentPosition + Math.floor(Math.random() * 3 - 1)
      );

      // Add new activity
      if (Math.random() < 0.3) {
        const types: ('collaboration' | 'consultation' | 'workshop_visit')[] =
          ['collaboration', 'consultation', 'workshop_visit'];
        const actions: ('submitted' | 'reviewed' | 'accepted' | 'declined')[] =
          ['submitted', 'reviewed', 'accepted', 'declined'];

        this.queueStatus.recentActivity.unshift({
          timestamp: Date.now(),
          action: actions[Math.floor(Math.random() * actions.length)],
          entryId: `q-2024-${Math.floor(Math.random() * 999).toString().padStart(3, '0')}`,
          type: types[Math.floor(Math.random() * types.length)],
        });

        // Keep only last 20 activities
        this.queueStatus.recentActivity = this.queueStatus.recentActivity.slice(0, 20);
      }
    }
  }

  private constrainValue(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}

// Export singleton instance
export const operationalData = new OperationalDataService();
