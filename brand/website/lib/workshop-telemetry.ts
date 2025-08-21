/**
 * Workshop Telemetry System for Candlefish Atelier
 *
 * Monitors operational health, system performance, and environmental conditions.
 * Provides real-time insights into workshop functionality and craft integrity.
 */

export interface TelemetryEvent {
  timestamp: number;
  category: 'system' | 'environment' | 'collaboration' | 'craft' | 'security';
  type: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  data?: Record<string, any>;
}

export interface SystemHealth {
  overall: 'optimal' | 'degraded' | 'critical';
  components: {
    cognitive_load: ComponentStatus;
    environmental: ComponentStatus;
    collaboration: ComponentStatus;
    infrastructure: ComponentStatus;
    craft_integrity: ComponentStatus;
  };
  lastUpdate: number;
}

export interface ComponentStatus {
  status: 'optimal' | 'warning' | 'critical';
  value: number;
  threshold: { warning: number; critical: number };
  trend: 'stable' | 'improving' | 'degrading';
  lastCheck: number;
}

export interface EnvironmentalMetrics {
  temperature: number; // Celsius
  humidity: number; // Percentage
  ambientLight: number; // Lux
  noiseLevel: number; // dB
  airQuality: number; // 0-1 scale
  electricalStability: number; // Voltage variance
}

export interface CraftMetrics {
  qualityIndex: number; // 0-1 scale
  attentionDepth: number; // Focus measurement
  flowState: number; // Creative flow indicator
  toolPrecision: number; // Instrument accuracy
  outputConsistency: number; // Work quality variance
}

class WorkshopTelemetry {
  private events: TelemetryEvent[] = [];
  private systemHealth: SystemHealth;
  private environmentalMetrics: EnvironmentalMetrics;
  private craftMetrics: CraftMetrics;
  private lastUpdate: number = 0;
  private eventRetention: number = 7 * 24 * 60 * 60 * 1000; // 7 days

  constructor() {
    this.systemHealth = this.initializeSystemHealth();
    this.environmentalMetrics = this.initializeEnvironmentalMetrics();
    this.craftMetrics = this.initializeCraftMetrics();
    this.startPeriodicUpdates();
  }

  private initializeSystemHealth(): SystemHealth {
    return {
      overall: 'optimal',
      components: {
        cognitive_load: {
          status: 'warning',
          value: 0.94,
          threshold: { warning: 0.85, critical: 0.95 },
          trend: 'stable',
          lastCheck: Date.now(),
        },
        environmental: {
          status: 'optimal',
          value: 0.87,
          threshold: { warning: 0.70, critical: 0.50 },
          trend: 'stable',
          lastCheck: Date.now(),
        },
        collaboration: {
          status: 'optimal',
          value: 0.92,
          threshold: { warning: 0.75, critical: 0.60 },
          trend: 'improving',
          lastCheck: Date.now(),
        },
        infrastructure: {
          status: 'optimal',
          value: 0.98,
          threshold: { warning: 0.80, critical: 0.65 },
          trend: 'stable',
          lastCheck: Date.now(),
        },
        craft_integrity: {
          status: 'optimal',
          value: 0.95,
          threshold: { warning: 0.85, critical: 0.75 },
          trend: 'stable',
          lastCheck: Date.now(),
        },
      },
      lastUpdate: Date.now(),
    };
  }

  private initializeEnvironmentalMetrics(): EnvironmentalMetrics {
    return {
      temperature: 21.3,
      humidity: 45.2,
      ambientLight: 750,
      noiseLevel: 35.5,
      airQuality: 0.92,
      electricalStability: 0.99,
    };
  }

  private initializeCraftMetrics(): CraftMetrics {
    return {
      qualityIndex: 0.95,
      attentionDepth: 0.87,
      flowState: 0.78,
      toolPrecision: 0.99,
      outputConsistency: 0.93,
    };
  }

  private startPeriodicUpdates(): void {
    if (typeof window !== 'undefined') {
      setInterval(() => {
        this.updateMetrics();
        this.cleanupOldEvents();
      }, 5000); // Update every 5 seconds
    }
  }

  private updateMetrics(): void {
    const now = Date.now();
    if (now - this.lastUpdate < 4000) return; // Throttle updates

    this.updateEnvironmentalMetrics();
    this.updateCraftMetrics();
    this.updateSystemHealth();
    this.generateTelemetryEvents();

    this.lastUpdate = now;
  }

  private updateEnvironmentalMetrics(): void {
    const variance = 0.01;

    this.environmentalMetrics.temperature = this.applyDrift(
      this.environmentalMetrics.temperature, variance * 10, 20.0, 23.0
    );

    this.environmentalMetrics.humidity = this.applyDrift(
      this.environmentalMetrics.humidity, variance * 100, 40, 60
    );

    this.environmentalMetrics.ambientLight = this.applyDrift(
      this.environmentalMetrics.ambientLight, variance * 1000, 600, 900
    );

    this.environmentalMetrics.noiseLevel = this.applyDrift(
      this.environmentalMetrics.noiseLevel, variance * 50, 30, 45
    );

    this.environmentalMetrics.airQuality = this.applyDrift(
      this.environmentalMetrics.airQuality, variance, 0.85, 0.98
    );

    this.environmentalMetrics.electricalStability = this.applyDrift(
      this.environmentalMetrics.electricalStability, variance * 0.1, 0.95, 1.0
    );
  }

  private updateCraftMetrics(): void {
    const variance = 0.005;

    // Quality index should remain high but show some variation
    this.craftMetrics.qualityIndex = this.applyDrift(
      this.craftMetrics.qualityIndex, variance, 0.90, 0.98
    );

    // Attention depth varies based on time of day and workload
    const hour = new Date().getHours();
    const timeOfDayBonus = hour >= 9 && hour <= 17 ? 0.1 : -0.05;
    this.craftMetrics.attentionDepth = this.applyDrift(
      this.craftMetrics.attentionDepth + timeOfDayBonus, variance * 2, 0.70, 0.95
    );

    // Flow state is more volatile
    this.craftMetrics.flowState = this.applyDrift(
      this.craftMetrics.flowState, variance * 3, 0.60, 0.90
    );

    this.craftMetrics.toolPrecision = this.applyDrift(
      this.craftMetrics.toolPrecision, variance * 0.5, 0.95, 1.0
    );

    this.craftMetrics.outputConsistency = this.applyDrift(
      this.craftMetrics.outputConsistency, variance, 0.85, 0.98
    );
  }

  private updateSystemHealth(): void {
    const now = Date.now();

    // Update component statuses based on current metrics
    this.updateComponentStatus('cognitive_load', 0.94, now);

    const envScore = (this.environmentalMetrics.temperature / 25 +
                     this.environmentalMetrics.airQuality +
                     this.environmentalMetrics.electricalStability) / 3;
    this.updateComponentStatus('environmental', envScore, now);

    const craftScore = (this.craftMetrics.qualityIndex +
                       this.craftMetrics.attentionDepth +
                       this.craftMetrics.toolPrecision) / 3;
    this.updateComponentStatus('craft_integrity', craftScore, now);

    // Update overall health
    const components = Object.values(this.systemHealth.components);
    const criticalCount = components.filter(c => c.status === 'critical').length;
    const warningCount = components.filter(c => c.status === 'warning').length;

    this.systemHealth.overall = criticalCount > 0 ? 'critical' :
                               warningCount > 1 ? 'degraded' : 'optimal';
    this.systemHealth.lastUpdate = now;
  }

  private updateComponentStatus(component: keyof SystemHealth['components'], value: number, timestamp: number): void {
    const comp = this.systemHealth.components[component];
    const prevValue = comp.value;

    comp.value = value;
    comp.lastCheck = timestamp;

    // Update status based on thresholds
    if (value < comp.threshold.critical) {
      comp.status = 'critical';
    } else if (value < comp.threshold.warning) {
      comp.status = 'warning';
    } else {
      comp.status = 'optimal';
    }

    // Update trend
    const change = value - prevValue;
    comp.trend = Math.abs(change) < 0.01 ? 'stable' :
                change > 0 ? 'improving' : 'degrading';
  }

  private generateTelemetryEvents(): void {
    // Generate events based on system state
    const now = Date.now();

    // Coffee shortage alert
    if (Math.random() < 0.001) { // Very rare but critical
      this.logEvent({
        timestamp: now,
        category: 'environment',
        type: 'coffee_shortage',
        severity: 'critical',
        message: 'Coffee reserves critically low. Immediate resupply required.',
        data: { reserves: 0.15 },
      });
    }

    // Quality threshold events
    if (this.craftMetrics.qualityIndex < 0.90) {
      this.logEvent({
        timestamp: now,
        category: 'craft',
        type: 'quality_degradation',
        severity: 'warning',
        message: 'Craft quality index below optimal threshold.',
        data: { quality: this.craftMetrics.qualityIndex },
      });
    }

    // Flow state achievements
    if (this.craftMetrics.flowState > 0.85 && Math.random() < 0.01) {
      this.logEvent({
        timestamp: now,
        category: 'craft',
        type: 'flow_state_achieved',
        severity: 'info',
        message: 'Deep flow state detected. Optimal craft conditions.',
        data: { flow_state: this.craftMetrics.flowState },
      });
    }
  }

  private logEvent(event: TelemetryEvent): void {
    this.events.unshift(event);

    // Keep events sorted by timestamp
    this.events.sort((a, b) => b.timestamp - a.timestamp);

    // Limit memory usage
    if (this.events.length > 1000) {
      this.events = this.events.slice(0, 1000);
    }
  }

  private cleanupOldEvents(): void {
    const cutoff = Date.now() - this.eventRetention;
    this.events = this.events.filter(event => event.timestamp > cutoff);
  }

  private applyDrift(current: number, variance: number, min: number, max: number): number {
    const change = (Math.random() - 0.5) * variance;
    return Math.max(min, Math.min(max, current + change));
  }

  /**
   * Get current system health overview
   */
  public getSystemHealth(): SystemHealth {
    return JSON.parse(JSON.stringify(this.systemHealth)); // Deep copy
  }

  /**
   * Get environmental metrics
   */
  public getEnvironmentalMetrics(): EnvironmentalMetrics {
    return { ...this.environmentalMetrics };
  }

  /**
   * Get craft-specific metrics
   */
  public getCraftMetrics(): CraftMetrics {
    return { ...this.craftMetrics };
  }

  /**
   * Get recent telemetry events
   */
  public getRecentEvents(
    limit: number = 20,
    category?: TelemetryEvent['category'],
    severity?: TelemetryEvent['severity']
  ): TelemetryEvent[] {
    let filtered = this.events;

    if (category) {
      filtered = filtered.filter(e => e.category === category);
    }

    if (severity) {
      filtered = filtered.filter(e => e.severity === severity);
    }

    return filtered.slice(0, limit);
  }

  /**
   * Get telemetry statistics
   */
  public getTelemetryStats(): {
    totalEvents: number;
    eventsByCategory: Record<string, number>;
    eventsBySeverity: Record<string, number>;
    avgEventsPerHour: number;
    systemUptimeHours: number;
  } {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    const recentEvents = this.events.filter(e => e.timestamp > oneHourAgo);

    const eventsByCategory = this.events.reduce((acc, event) => {
      acc[event.category] = (acc[event.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const eventsBySeverity = this.events.reduce((acc, event) => {
      acc[event.severity] = (acc[event.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Simulate uptime (would be actual in production)
    const systemUptimeHours = 127.5 + ((now - this.lastUpdate) / (1000 * 60 * 60));

    return {
      totalEvents: this.events.length,
      eventsByCategory,
      eventsBySeverity,
      avgEventsPerHour: recentEvents.length,
      systemUptimeHours,
    };
  }

  /**
   * Force a system health check
   */
  public runHealthCheck(): SystemHealth {
    this.updateMetrics();
    return this.getSystemHealth();
  }
}

// Export singleton instance
export const workshopTelemetry = new WorkshopTelemetry();
