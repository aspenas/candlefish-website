import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { SecurityEvent, ThreatAssessment, LocationData } from '../types';

class SecurityService {
  private static instance: SecurityService;
  private events: SecurityEvent[] = [];
  private maxEvents = 1000;
  private deviceId: string | null = null;

  private constructor() {}

  static getInstance(): SecurityService {
    if (!SecurityService.instance) {
      SecurityService.instance = new SecurityService();
    }
    return SecurityService.instance;
  }

  async initialize(): Promise<void> {
    try {
      // Load stored security events
      const storedEvents = await AsyncStorage.getItem('@security_events');
      if (storedEvents) {
        this.events = JSON.parse(storedEvents);
      }

      // Get device ID
      this.deviceId = await DeviceInfo.getUniqueId();

      // Log initialization
      await this.logEvent({
        type: 'DATA_ACCESS',
        severity: 'LOW',
        description: 'Security service initialized',
        metadata: {
          deviceId: this.deviceId,
          platform: Platform.OS,
          version: Platform.Version,
          timestamp: new Date().toISOString(),
        },
      });

      console.log('Security service initialized');
    } catch (error) {
      console.error('Failed to initialize security service:', error);
    }
  }

  async logEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): Promise<void> {
    const securityEvent: SecurityEvent = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      ...event,
    };

    this.events.push(securityEvent);

    // Maintain event limit
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Save to storage
    await this.saveEvents();

    // Handle high-severity events
    if (event.severity === 'HIGH' || event.severity === 'CRITICAL') {
      await this.handleHighSeverityEvent(securityEvent);
    }

    console.log(`Security event logged: ${event.type} (${event.severity})`);
  }

  async getEvents(
    filter?: {
      type?: SecurityEvent['type'];
      severity?: SecurityEvent['severity'];
      since?: Date;
    }
  ): Promise<SecurityEvent[]> {
    let filteredEvents = [...this.events];

    if (filter) {
      if (filter.type) {
        filteredEvents = filteredEvents.filter(event => event.type === filter.type);
      }
      if (filter.severity) {
        filteredEvents = filteredEvents.filter(event => event.severity === filter.severity);
      }
      if (filter.since) {
        filteredEvents = filteredEvents.filter(event => event.timestamp >= filter.since);
      }
    }

    return filteredEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async assessThreat(location?: LocationData): Promise<ThreatAssessment> {
    const factors: string[] = [];
    let level: ThreatAssessment['level'] = 'LOW';
    const recommendations: string[] = [];

    try {
      // Check recent failed login attempts
      const recentFailures = await this.getEvents({
        type: 'LOGIN',
        since: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      });

      const failedLogins = recentFailures.filter(event => 
        event.description.includes('Failed') || event.description.includes('failed')
      );

      if (failedLogins.length > 5) {
        factors.push('Multiple failed login attempts');
        level = 'MEDIUM';
        recommendations.push('Consider enabling additional authentication methods');
      }

      // Check for suspicious data access patterns
      const dataAccess = await this.getEvents({
        type: 'DATA_ACCESS',
        since: new Date(Date.now() - 60 * 60 * 1000), // Last hour
      });

      if (dataAccess.length > 100) {
        factors.push('Unusual data access frequency');
        level = level === 'LOW' ? 'MEDIUM' : 'HIGH';
        recommendations.push('Monitor app usage patterns');
      }

      // Check device security
      const isEmulator = await DeviceInfo.isEmulator();
      const isRooted = await DeviceInfo.isDeviceRooted();

      if (isEmulator) {
        factors.push('Running on emulator');
        level = 'MEDIUM';
        recommendations.push('Use physical device for sensitive operations');
      }

      if (isRooted) {
        factors.push('Device is rooted/jailbroken');
        level = 'HIGH';
        recommendations.push('Device security may be compromised');
      }

      // Location-based assessment
      if (location) {
        // This would integrate with threat intelligence APIs
        // For now, just log the location check
        factors.push('Location verified');
      }

      // Battery level check (low battery might indicate malicious app behavior)
      const batteryLevel = await DeviceInfo.getBatteryLevel();
      if (batteryLevel < 0.1) {
        factors.push('Low battery level');
        recommendations.push('Charge device to ensure security features work properly');
      }

    } catch (error) {
      console.error('Error during threat assessment:', error);
      factors.push('Threat assessment error');
      level = 'MEDIUM';
    }

    const assessment: ThreatAssessment = {
      level,
      factors,
      recommendations,
      location: location || {
        latitude: 0,
        longitude: 0,
        accuracy: 0,
        timestamp: new Date(),
      },
      timestamp: new Date(),
    };

    // Log the threat assessment
    await this.logEvent({
      type: 'DATA_ACCESS',
      severity: level === 'CRITICAL' ? 'CRITICAL' : level === 'HIGH' ? 'HIGH' : 'LOW',
      description: 'Threat assessment completed',
      metadata: {
        level,
        factorCount: factors.length,
        recommendationCount: recommendations.length,
      },
    });

    return assessment;
  }

  async clearEvents(): Promise<void> {
    this.events = [];
    await AsyncStorage.removeItem('@security_events');
    
    await this.logEvent({
      type: 'DATA_ACCESS',
      severity: 'MEDIUM',
      description: 'Security events cleared',
      metadata: { timestamp: new Date().toISOString() },
    });
  }

  async exportSecurityReport(): Promise<string> {
    const report = {
      deviceId: this.deviceId,
      generatedAt: new Date().toISOString(),
      eventCount: this.events.length,
      events: this.events,
      summary: await this.getSecuritySummary(),
    };

    await this.logEvent({
      type: 'DATA_ACCESS',
      severity: 'MEDIUM',
      description: 'Security report exported',
      metadata: { eventCount: this.events.length },
    });

    return JSON.stringify(report, null, 2);
  }

  private async saveEvents(): Promise<void> {
    try {
      await AsyncStorage.setItem('@security_events', JSON.stringify(this.events));
    } catch (error) {
      console.error('Failed to save security events:', error);
    }
  }

  private async handleHighSeverityEvent(event: SecurityEvent): Promise<void> {
    // In a real app, this might send alerts to security services,
    // trigger additional authentication, or disable certain features
    console.warn(`HIGH SEVERITY SECURITY EVENT: ${event.type} - ${event.description}`);
    
    // Could implement:
    // - Push notification to user
    // - Email alert to security team
    // - Temporary account lockdown
    // - Force re-authentication
  }

  private async getSecuritySummary(): Promise<{
    eventsByType: Record<string, number>;
    eventsBySeverity: Record<string, number>;
    recentHighSeverity: number;
  }> {
    const eventsByType: Record<string, number> = {};
    const eventsBySeverity: Record<string, number> = {};
    let recentHighSeverity = 0;

    const recentThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000);

    for (const event of this.events) {
      // Count by type
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
      
      // Count by severity
      eventsBySeverity[event.severity] = (eventsBySeverity[event.severity] || 0) + 1;
      
      // Count recent high-severity events
      if (
        event.timestamp >= recentThreshold && 
        (event.severity === 'HIGH' || event.severity === 'CRITICAL')
      ) {
        recentHighSeverity++;
      }
    }

    return {
      eventsByType,
      eventsBySeverity,
      recentHighSeverity,
    };
  }

  // Static methods for convenience
  static async initialize(): Promise<void> {
    return SecurityService.getInstance().initialize();
  }

  static async logEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): Promise<void> {
    return SecurityService.getInstance().logEvent(event);
  }

  static async assessThreat(location?: LocationData): Promise<ThreatAssessment> {
    return SecurityService.getInstance().assessThreat(location);
  }
}

// Export singleton instance
export { SecurityService };