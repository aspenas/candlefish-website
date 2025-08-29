// Demo Mode Service for Mobile Security Dashboard
// Provides sample data and guided tour for new users and demonstrations

import AsyncStorage from '@react-native-async-storage/async-storage';
import { environmentConfig } from '@/config/environment';
import { crashReportingService } from './crashReporting';

// Types
export interface DemoSettings {
  enabled: boolean;
  autoStart: boolean;
  persistData: boolean;
  tourCompleted: boolean;
  showDemoIndicator: boolean;
  resetOnAppStart: boolean;
  demoScenario: 'basic' | 'advanced' | 'enterprise';
}

export interface TourStep {
  id: string;
  title: string;
  description: string;
  screen: string;
  element?: string;
  placement: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: 'tap' | 'swipe' | 'none';
  spotlight?: boolean;
  skippable: boolean;
  nextButtonText?: string;
  previousButtonText?: string;
  customContent?: React.ComponentType<any>;
}

export interface DemoAlert {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  type: 'security' | 'kong' | 'location' | 'system';
  timestamp: string;
  acknowledged: boolean;
  source: string;
  metadata: Record<string, any>;
  actions: Array<{
    id: string;
    label: string;
    type: 'primary' | 'secondary' | 'danger';
  }>;
}

export interface DemoIncident {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  priority: 'critical' | 'high' | 'medium' | 'low';
  assignee: string;
  reportedBy: string;
  reportedAt: string;
  updatedAt: string;
  category: string;
  affectedSystems: string[];
  timeline: Array<{
    timestamp: string;
    action: string;
    user: string;
    details: string;
  }>;
  evidence: Array<{
    id: string;
    type: 'screenshot' | 'log' | 'document';
    filename: string;
    description: string;
    timestamp: string;
  }>;
}

export interface DemoVulnerability {
  id: string;
  cve: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  cvssScore: number;
  affectedSystems: string[];
  discoveredAt: string;
  patchAvailable: boolean;
  patchUrl?: string;
  workaround?: string;
  exploitAvailable: boolean;
  publicExploit: boolean;
  internalNotes: string;
}

export interface DemoData {
  alerts: DemoAlert[];
  incidents: DemoIncident[];
  vulnerabilities: DemoVulnerability[];
  users: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    avatar: string;
  }>;
  metrics: {
    totalAlerts: number;
    criticalAlerts: number;
    openIncidents: number;
    resolvedIncidents: number;
    totalVulnerabilities: number;
    patchedVulnerabilities: number;
    lastScanTime: string;
    systemHealth: number;
  };
}

class DemoModeService {
  private static instance: DemoModeService;
  private isInitialized = false;
  private settings: DemoSettings;
  private demoData: DemoData;
  private tourSteps: TourStep[];
  private currentTourStep = 0;
  private tourActive = false;

  private constructor() {
    this.settings = this.getDefaultSettings();
    this.demoData = this.generateDemoData();
    this.tourSteps = this.createTourSteps();
  }

  static getInstance(): DemoModeService {
    if (!DemoModeService.instance) {
      DemoModeService.instance = new DemoModeService();
    }
    return DemoModeService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Load saved settings
      await this.loadSettings();

      // Check if demo mode should be enabled based on environment
      if (!environmentConfig.isFeatureEnabled('demoMode')) {
        this.settings.enabled = false;
      }

      // Generate fresh demo data if needed
      if (this.settings.resetOnAppStart || this.shouldRegenerateData()) {
        this.demoData = this.generateDemoData();
        await this.saveDemoData();
      } else {
        await this.loadDemoData();
      }

      // Auto-start tour if enabled and not completed
      if (this.settings.enabled && this.settings.autoStart && !this.settings.tourCompleted) {
        // Tour will be started by the UI component
      }

      this.isInitialized = true;
      console.log('Demo mode service initialized');
      crashReportingService.addBreadcrumb('Demo mode initialized', 'demo', 'info', {
        enabled: this.settings.enabled,
        scenario: this.settings.demoScenario,
      });

    } catch (error) {
      console.error('Failed to initialize demo mode service:', error);
      crashReportingService.reportError(error as Error, {
        component: 'DemoModeService',
        action: 'initialize',
      });
    }
  }

  private getDefaultSettings(): DemoSettings {
    return {
      enabled: false,
      autoStart: false,
      persistData: true,
      tourCompleted: false,
      showDemoIndicator: true,
      resetOnAppStart: false,
      demoScenario: 'basic',
    };
  }

  private async loadSettings(): Promise<void> {
    try {
      const settingsJson = await AsyncStorage.getItem('demo_mode_settings');
      if (settingsJson) {
        this.settings = { ...this.settings, ...JSON.parse(settingsJson) };
      }
    } catch (error) {
      console.error('Error loading demo settings:', error);
    }
  }

  private async saveSettings(): Promise<void> {
    try {
      await AsyncStorage.setItem('demo_mode_settings', JSON.stringify(this.settings));
    } catch (error) {
      console.error('Error saving demo settings:', error);
    }
  }

  private async loadDemoData(): Promise<void> {
    try {
      const demoDataJson = await AsyncStorage.getItem('demo_data');
      if (demoDataJson) {
        this.demoData = JSON.parse(demoDataJson);
      }
    } catch (error) {
      console.error('Error loading demo data:', error);
    }
  }

  private async saveDemoData(): Promise<void> {
    try {
      if (this.settings.persistData) {
        await AsyncStorage.setItem('demo_data', JSON.stringify(this.demoData));
      }
    } catch (error) {
      console.error('Error saving demo data:', error);
    }
  }

  private shouldRegenerateData(): boolean {
    // Regenerate data if it's more than 7 days old
    const lastGeneration = this.demoData.metrics.lastScanTime;
    if (!lastGeneration) return true;

    const daysSinceGeneration = (Date.now() - new Date(lastGeneration).getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceGeneration > 7;
  }

  private generateDemoData(): DemoData {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const alerts: DemoAlert[] = [
      {
        id: 'alert-001',
        title: 'Kong Admin API Exposed',
        description: 'Kong Admin API is accessible from the internet without authentication',
        severity: 'critical',
        type: 'kong',
        timestamp: oneHourAgo.toISOString(),
        acknowledged: false,
        source: 'Kong Gateway Monitor',
        metadata: {
          adminApiUrl: 'https://api.example.com:8001',
          exposedEndpoints: ['/consumers', '/services', '/routes'],
          riskScore: 95,
        },
        actions: [
          { id: 'secure-now', label: 'Secure Now', type: 'danger' },
          { id: 'view-guide', label: 'View Security Guide', type: 'secondary' },
          { id: 'acknowledge', label: 'Acknowledge', type: 'secondary' },
        ],
      },
      {
        id: 'alert-002',
        title: 'Suspicious Login Activity',
        description: 'Multiple failed login attempts from unknown IP address',
        severity: 'high',
        type: 'security',
        timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
        acknowledged: false,
        source: 'Authentication Monitor',
        metadata: {
          sourceIp: '192.168.1.100',
          attemptCount: 15,
          targetUsers: ['admin', 'root', 'security'],
          location: 'Unknown',
        },
        actions: [
          { id: 'block-ip', label: 'Block IP', type: 'danger' },
          { id: 'investigate', label: 'Investigate', type: 'primary' },
          { id: 'acknowledge', label: 'Acknowledge', type: 'secondary' },
        ],
      },
      {
        id: 'alert-003',
        title: 'Geofence Breach',
        description: 'Security device detected outside authorized area',
        severity: 'medium',
        type: 'location',
        timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
        acknowledged: true,
        source: 'Location Security Monitor',
        metadata: {
          deviceId: 'SEC-DEVICE-001',
          currentLocation: 'Downtown Office',
          authorizedZones: ['Corporate HQ', 'Data Center'],
          distanceFromZone: 2.5,
        },
        actions: [
          { id: 'view-location', label: 'View Location', type: 'primary' },
          { id: 'contact-user', label: 'Contact User', type: 'secondary' },
          { id: 'acknowledge', label: 'Acknowledge', type: 'secondary' },
        ],
      },
      {
        id: 'alert-004',
        title: 'Certificate Expiring Soon',
        description: 'SSL certificate for api.example.com expires in 7 days',
        severity: 'medium',
        type: 'system',
        timestamp: oneDayAgo.toISOString(),
        acknowledged: false,
        source: 'Certificate Monitor',
        metadata: {
          domain: 'api.example.com',
          expirationDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          issuer: 'Let\'s Encrypt',
          serialNumber: 'ABC123DEF456',
        },
        actions: [
          { id: 'renew-cert', label: 'Renew Certificate', type: 'primary' },
          { id: 'schedule-renewal', label: 'Schedule Renewal', type: 'secondary' },
          { id: 'acknowledge', label: 'Acknowledge', type: 'secondary' },
        ],
      },
      {
        id: 'alert-005',
        title: 'System Update Available',
        description: 'Security updates available for Kong Gateway',
        severity: 'low',
        type: 'system',
        timestamp: oneWeekAgo.toISOString(),
        acknowledged: true,
        source: 'Update Monitor',
        metadata: {
          currentVersion: '2.8.1',
          availableVersion: '2.8.3',
          securityFixes: 3,
          updateSize: '15.2 MB',
        },
        actions: [
          { id: 'update-now', label: 'Update Now', type: 'primary' },
          { id: 'schedule-update', label: 'Schedule Update', type: 'secondary' },
          { id: 'view-changelog', label: 'View Changelog', type: 'secondary' },
        ],
      },
    ];

    const incidents: DemoIncident[] = [
      {
        id: 'incident-001',
        title: 'Data Breach Investigation',
        description: 'Potential unauthorized access to customer data detected',
        status: 'investigating',
        priority: 'critical',
        assignee: 'Sarah Chen',
        reportedBy: 'Security Alert System',
        reportedAt: oneHourAgo.toISOString(),
        updatedAt: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
        category: 'Data Security',
        affectedSystems: ['Customer Database', 'API Gateway', 'Web Application'],
        timeline: [
          {
            timestamp: oneHourAgo.toISOString(),
            action: 'Incident Created',
            user: 'Security Alert System',
            details: 'Automated detection of suspicious database queries',
          },
          {
            timestamp: new Date(now.getTime() - 50 * 60 * 1000).toISOString(),
            action: 'Assigned to Investigator',
            user: 'Security Manager',
            details: 'Assigned to Sarah Chen for immediate investigation',
          },
          {
            timestamp: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
            action: 'Initial Assessment',
            user: 'Sarah Chen',
            details: 'Confirmed unauthorized API access. Implementing containment measures.',
          },
        ],
        evidence: [
          {
            id: 'evidence-001',
            type: 'log',
            filename: 'api_access_logs.txt',
            description: 'Suspicious API access patterns from unauthorized IP',
            timestamp: oneHourAgo.toISOString(),
          },
          {
            id: 'evidence-002',
            type: 'screenshot',
            filename: 'database_activity.png',
            description: 'Database query monitoring dashboard showing anomalous activity',
            timestamp: new Date(now.getTime() - 45 * 60 * 1000).toISOString(),
          },
        ],
      },
      {
        id: 'incident-002',
        title: 'Kong Gateway Performance Degradation',
        description: 'Significant increase in API response times and error rates',
        status: 'resolved',
        priority: 'high',
        assignee: 'Mike Rodriguez',
        reportedBy: 'Monitoring System',
        reportedAt: oneDayAgo.toISOString(),
        updatedAt: new Date(oneDayAgo.getTime() + 6 * 60 * 60 * 1000).toISOString(),
        category: 'Performance',
        affectedSystems: ['Kong Gateway', 'Load Balancer', 'Backend Services'],
        timeline: [
          {
            timestamp: oneDayAgo.toISOString(),
            action: 'Incident Created',
            user: 'Monitoring System',
            details: 'API response times exceeded 5s threshold',
          },
          {
            timestamp: new Date(oneDayAgo.getTime() + 30 * 60 * 1000).toISOString(),
            action: 'Investigation Started',
            user: 'Mike Rodriguez',
            details: 'Analyzing Kong Gateway logs and metrics',
          },
          {
            timestamp: new Date(oneDayAgo.getTime() + 4 * 60 * 60 * 1000).toISOString(),
            action: 'Root Cause Identified',
            user: 'Mike Rodriguez',
            details: 'Memory leak in custom plugin causing performance issues',
          },
          {
            timestamp: new Date(oneDayAgo.getTime() + 6 * 60 * 60 * 1000).toISOString(),
            action: 'Incident Resolved',
            user: 'Mike Rodriguez',
            details: 'Plugin updated and Kong Gateway restarted. Performance restored.',
          },
        ],
        evidence: [
          {
            id: 'evidence-003',
            type: 'screenshot',
            filename: 'performance_metrics.png',
            description: 'Performance dashboard showing degraded response times',
            timestamp: oneDayAgo.toISOString(),
          },
        ],
      },
    ];

    const vulnerabilities: DemoVulnerability[] = [
      {
        id: 'vuln-001',
        cve: 'CVE-2024-1234',
        title: 'Kong Gateway Remote Code Execution',
        description: 'A remote code execution vulnerability exists in Kong Gateway versions prior to 2.8.3',
        severity: 'critical',
        cvssScore: 9.8,
        affectedSystems: ['Kong Gateway v2.8.1', 'Kong Gateway v2.8.2'],
        discoveredAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        patchAvailable: true,
        patchUrl: 'https://github.com/Kong/kong/releases/tag/2.8.3',
        exploitAvailable: false,
        publicExploit: false,
        internalNotes: 'High priority for patching. Affects admin API authentication bypass.',
      },
      {
        id: 'vuln-002',
        cve: 'CVE-2024-5678',
        title: 'OpenSSL Vulnerability in TLS Implementation',
        description: 'Buffer overflow vulnerability in OpenSSL TLS handshake processing',
        severity: 'high',
        cvssScore: 8.1,
        affectedSystems: ['All TLS-enabled services', 'Load Balancers', 'API Gateways'],
        discoveredAt: oneWeekAgo.toISOString(),
        patchAvailable: true,
        patchUrl: 'https://www.openssl.org/news/secadv/20240101.txt',
        workaround: 'Disable TLS 1.0 and 1.1 protocols as temporary mitigation',
        exploitAvailable: true,
        publicExploit: false,
        internalNotes: 'Patch scheduled for next maintenance window.',
      },
    ];

    const users = [
      {
        id: 'user-001',
        name: 'Sarah Chen',
        email: 'sarah.chen@candlefish.ai',
        role: 'Security Analyst',
        avatar: 'https://i.pravatar.cc/100?img=1',
      },
      {
        id: 'user-002',
        name: 'Mike Rodriguez',
        email: 'mike.rodriguez@candlefish.ai',
        role: 'DevOps Engineer',
        avatar: 'https://i.pravatar.cc/100?img=2',
      },
      {
        id: 'user-003',
        name: 'Emma Johnson',
        email: 'emma.johnson@candlefish.ai',
        role: 'Security Manager',
        avatar: 'https://i.pravatar.cc/100?img=3',
      },
    ];

    const metrics = {
      totalAlerts: alerts.length,
      criticalAlerts: alerts.filter(a => a.severity === 'critical').length,
      openIncidents: incidents.filter(i => i.status === 'open' || i.status === 'investigating').length,
      resolvedIncidents: incidents.filter(i => i.status === 'resolved' || i.status === 'closed').length,
      totalVulnerabilities: vulnerabilities.length,
      patchedVulnerabilities: vulnerabilities.filter(v => v.patchAvailable).length,
      lastScanTime: now.toISOString(),
      systemHealth: 87, // Percentage
    };

    return {
      alerts,
      incidents,
      vulnerabilities,
      users,
      metrics,
    };
  }

  private createTourSteps(): TourStep[] {
    return [
      {
        id: 'welcome',
        title: 'Welcome to Security Dashboard',
        description: 'This guided tour will help you explore the key features of the Candlefish Security Dashboard mobile app.',
        screen: 'Dashboard',
        placement: 'center',
        action: 'none',
        spotlight: false,
        skippable: true,
        nextButtonText: 'Start Tour',
      },
      {
        id: 'dashboard-overview',
        title: 'Security Overview',
        description: 'Your main dashboard shows critical security metrics, recent alerts, and system health at a glance.',
        screen: 'Dashboard',
        element: 'dashboard-overview-card',
        placement: 'bottom',
        action: 'none',
        spotlight: true,
        skippable: true,
      },
      {
        id: 'critical-alerts',
        title: 'Critical Alerts',
        description: 'Critical security alerts require immediate attention. Tap here to view all critical alerts.',
        screen: 'Dashboard',
        element: 'critical-alerts-section',
        placement: 'bottom',
        action: 'tap',
        spotlight: true,
        skippable: true,
      },
      {
        id: 'alert-details',
        title: 'Alert Details',
        description: 'Each alert shows severity, source, and available actions. You can acknowledge, investigate, or escalate directly from here.',
        screen: 'AlertDetails',
        element: 'alert-actions-section',
        placement: 'top',
        action: 'none',
        spotlight: true,
        skippable: true,
      },
      {
        id: 'quick-actions',
        title: 'Quick Actions',
        description: 'Use quick actions to acknowledge alerts, assign incidents, or trigger security responses without leaving the alert view.',
        screen: 'AlertDetails',
        element: 'quick-actions-buttons',
        placement: 'top',
        action: 'none',
        spotlight: true,
        skippable: true,
      },
      {
        id: 'kong-security',
        title: 'Kong Gateway Security',
        description: 'Special alerts for Kong API Gateway vulnerabilities help you secure your API infrastructure quickly.',
        screen: 'KongVulnerabilities',
        element: 'kong-vulnerability-list',
        placement: 'top',
        action: 'none',
        spotlight: true,
        skippable: true,
      },
      {
        id: 'incident-management',
        title: 'Incident Management',
        description: 'Track and collaborate on security incidents with your team. View timeline, evidence, and assign investigators.',
        screen: 'IncidentDetails',
        element: 'incident-timeline',
        placement: 'bottom',
        action: 'none',
        spotlight: true,
        skippable: true,
      },
      {
        id: 'location-security',
        title: 'Location-Based Security',
        description: 'Monitor device locations and geofence violations to detect unauthorized access or device theft.',
        screen: 'LocationThreats',
        element: 'location-map',
        placement: 'bottom',
        action: 'none',
        spotlight: true,
        skippable: true,
      },
      {
        id: 'offline-mode',
        title: 'Offline Capabilities',
        description: 'The app works offline! Actions are queued and synchronized when connectivity returns.',
        screen: 'Settings',
        element: 'offline-sync-section',
        placement: 'top',
        action: 'none',
        spotlight: true,
        skippable: true,
      },
      {
        id: 'notifications',
        title: 'Smart Notifications',
        description: 'Configure notification channels by severity to ensure critical alerts reach you immediately.',
        screen: 'NotificationSettings',
        element: 'notification-channels',
        placement: 'top',
        action: 'none',
        spotlight: true,
        skippable: true,
      },
      {
        id: 'biometric-security',
        title: 'Biometric Security',
        description: 'Secure your security data with Face ID, Touch ID, or fingerprint authentication.',
        screen: 'SecuritySettings',
        element: 'biometric-auth-section',
        placement: 'top',
        action: 'none',
        spotlight: true,
        skippable: true,
      },
      {
        id: 'tour-complete',
        title: 'Tour Complete!',
        description: 'You\'re ready to use the Security Dashboard. Explore the demo data or connect to your live security infrastructure.',
        screen: 'Dashboard',
        placement: 'center',
        action: 'none',
        spotlight: false,
        skippable: false,
        nextButtonText: 'Finish Tour',
      },
    ];
  }

  // Public methods

  // Enable/disable demo mode
  async setDemoModeEnabled(enabled: boolean): Promise<void> {
    this.settings.enabled = enabled;
    await this.saveSettings();
    
    if (enabled) {
      crashReportingService.addBreadcrumb('Demo mode enabled', 'demo', 'info');
    } else {
      crashReportingService.addBreadcrumb('Demo mode disabled', 'demo', 'info');
    }
  }

  // Start guided tour
  async startTour(): Promise<void> {
    if (!this.settings.enabled) {
      throw new Error('Demo mode must be enabled to start tour');
    }

    this.currentTourStep = 0;
    this.tourActive = true;
    this.settings.tourCompleted = false;
    await this.saveSettings();

    crashReportingService.addBreadcrumb('Demo tour started', 'demo', 'info');
  }

  // Next tour step
  async nextTourStep(): Promise<TourStep | null> {
    if (!this.tourActive || this.currentTourStep >= this.tourSteps.length - 1) {
      return null;
    }

    this.currentTourStep++;
    return this.tourSteps[this.currentTourStep];
  }

  // Previous tour step
  async previousTourStep(): Promise<TourStep | null> {
    if (!this.tourActive || this.currentTourStep <= 0) {
      return null;
    }

    this.currentTourStep--;
    return this.tourSteps[this.currentTourStep];
  }

  // Complete tour
  async completeTour(): Promise<void> {
    this.tourActive = false;
    this.settings.tourCompleted = true;
    await this.saveSettings();

    crashReportingService.addBreadcrumb('Demo tour completed', 'demo', 'info');
  }

  // Skip tour
  async skipTour(): Promise<void> {
    this.tourActive = false;
    this.settings.tourCompleted = true;
    await this.saveSettings();

    crashReportingService.addBreadcrumb('Demo tour skipped', 'demo', 'info');
  }

  // Reset demo data
  async resetDemoData(): Promise<void> {
    this.demoData = this.generateDemoData();
    await this.saveDemoData();
    
    crashReportingService.addBreadcrumb('Demo data reset', 'demo', 'info');
  }

  // Update demo settings
  async updateSettings(newSettings: Partial<DemoSettings>): Promise<void> {
    this.settings = { ...this.settings, ...newSettings };
    await this.saveSettings();
  }

  // Simulate alert action
  async simulateAlertAction(alertId: string, action: string): Promise<void> {
    const alert = this.demoData.alerts.find(a => a.id === alertId);
    if (!alert) return;

    switch (action) {
      case 'acknowledge':
        alert.acknowledged = true;
        break;
      case 'escalate':
        // Create a new incident
        const incident: DemoIncident = {
          id: `incident-${Date.now()}`,
          title: `Escalated: ${alert.title}`,
          description: alert.description,
          status: 'open',
          priority: alert.severity === 'critical' ? 'critical' : alert.severity as any,
          assignee: 'Security Team',
          reportedBy: 'Demo User',
          reportedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          category: 'Escalated Alert',
          affectedSystems: [alert.source],
          timeline: [
            {
              timestamp: new Date().toISOString(),
              action: 'Incident Created',
              user: 'Demo User',
              details: `Escalated from alert: ${alert.id}`,
            },
          ],
          evidence: [],
        };
        this.demoData.incidents.unshift(incident);
        break;
    }

    await this.saveDemoData();
    crashReportingService.addBreadcrumb(`Demo alert action: ${action}`, 'demo', 'info', {
      alertId,
      action,
    });
  }

  // Add demo notification
  async addDemoNotification(type: 'critical' | 'high' | 'medium' | 'low'): Promise<void> {
    const demoNotifications = {
      critical: {
        title: 'Critical Security Breach',
        description: 'Unauthorized root access detected on production server',
        severity: 'critical' as const,
      },
      high: {
        title: 'Suspicious Network Activity',
        description: 'Unusual outbound traffic patterns detected',
        severity: 'high' as const,
      },
      medium: {
        title: 'Security Update Available',
        description: 'Important security patches available for Kong Gateway',
        severity: 'medium' as const,
      },
      low: {
        title: 'Routine Security Scan Complete',
        description: 'Weekly vulnerability scan completed successfully',
        severity: 'low' as const,
      },
    };

    const notification = demoNotifications[type];
    const newAlert: DemoAlert = {
      id: `demo-alert-${Date.now()}`,
      title: notification.title,
      description: notification.description,
      severity: notification.severity,
      type: 'security',
      timestamp: new Date().toISOString(),
      acknowledged: false,
      source: 'Demo Mode',
      metadata: {
        isDemoData: true,
        generatedAt: new Date().toISOString(),
      },
      actions: [
        { id: 'acknowledge', label: 'Acknowledge', type: 'secondary' },
        { id: 'investigate', label: 'Investigate', type: 'primary' },
      ],
    };

    this.demoData.alerts.unshift(newAlert);
    this.demoData.metrics.totalAlerts++;
    
    if (notification.severity === 'critical') {
      this.demoData.metrics.criticalAlerts++;
    }

    await this.saveDemoData();
  }

  // Getters
  isDemoModeEnabled(): boolean {
    return this.settings.enabled;
  }

  getDemoSettings(): DemoSettings {
    return { ...this.settings };
  }

  getDemoData(): DemoData {
    return { ...this.demoData };
  }

  getCurrentTourStep(): TourStep | null {
    if (!this.tourActive || this.currentTourStep >= this.tourSteps.length) {
      return null;
    }
    return this.tourSteps[this.currentTourStep];
  }

  getTourSteps(): TourStep[] {
    return [...this.tourSteps];
  }

  isTourActive(): boolean {
    return this.tourActive;
  }

  isTourCompleted(): boolean {
    return this.settings.tourCompleted;
  }

  shouldShowDemoIndicator(): boolean {
    return this.settings.enabled && this.settings.showDemoIndicator;
  }

  // Demo scenario management
  async setDemoScenario(scenario: DemoSettings['demoScenario']): Promise<void> {
    this.settings.demoScenario = scenario;
    
    // Regenerate data based on scenario
    switch (scenario) {
      case 'basic':
        // Keep current simple demo data
        break;
      case 'advanced':
        // Add more complex scenarios
        await this.addAdvancedScenarioData();
        break;
      case 'enterprise':
        // Add enterprise-level scenarios
        await this.addEnterpriseScenarioData();
        break;
    }
    
    await this.saveSettings();
    await this.saveDemoData();
  }

  private async addAdvancedScenarioData(): Promise<void> {
    // Add more complex alerts and incidents for advanced scenario
    const advancedAlert: DemoAlert = {
      id: 'advanced-alert-001',
      title: 'Multi-Stage Attack Detected',
      description: 'Coordinated attack involving SQL injection, privilege escalation, and data exfiltration',
      severity: 'critical',
      type: 'security',
      timestamp: new Date().toISOString(),
      acknowledged: false,
      source: 'Advanced Threat Detection',
      metadata: {
        attackStages: ['reconnaissance', 'initial-access', 'privilege-escalation', 'data-exfiltration'],
        confidenceScore: 95,
        affectedAssets: 15,
      },
      actions: [
        { id: 'incident-response', label: 'Activate IR Team', type: 'danger' },
        { id: 'isolate-systems', label: 'Isolate Systems', type: 'danger' },
        { id: 'analyze-threat', label: 'Analyze Threat', type: 'primary' },
      ],
    };

    this.demoData.alerts.unshift(advancedAlert);
  }

  private async addEnterpriseScenarioData(): Promise<void> {
    // Add enterprise-level security scenarios
    const enterpriseIncident: DemoIncident = {
      id: 'enterprise-incident-001',
      title: 'Supply Chain Attack Investigation',
      description: 'Potential compromise through third-party dependency affecting multiple services',
      status: 'investigating',
      priority: 'critical',
      assignee: 'Enterprise Security Team',
      reportedBy: 'Threat Intelligence',
      reportedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      category: 'Supply Chain Security',
      affectedSystems: ['Authentication Service', 'API Gateway', 'Customer Portal', 'Admin Dashboard'],
      timeline: [
        {
          timestamp: new Date().toISOString(),
          action: 'Threat Intelligence Alert',
          user: 'TI System',
          details: 'Suspicious activity in npm package affecting 1000+ organizations',
        },
      ],
      evidence: [
        {
          id: 'enterprise-evidence-001',
          type: 'document',
          filename: 'threat-intelligence-report.pdf',
          description: 'Comprehensive threat intelligence report on supply chain attack',
          timestamp: new Date().toISOString(),
        },
      ],
    };

    this.demoData.incidents.unshift(enterpriseIncident);
  }

  isInitialized(): boolean {
    return this.isInitialized;
  }
}

// Export singleton instance
export const demoModeService = DemoModeService.getInstance();

export default demoModeService;