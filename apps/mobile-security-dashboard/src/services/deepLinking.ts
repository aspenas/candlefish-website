// Deep Linking Service for Mobile Security Dashboard
// Handles universal links, custom schemes, and notification-based navigation

import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { environmentConfig } from '@/config/environment';
import { crashReportingService } from './crashReporting';

// Types
export interface DeepLinkRoute {
  path: string;
  screen: string;
  params?: Record<string, any>;
  requiredAuth?: boolean;
  requiredPermissions?: string[];
  action?: string;
}

export interface PendingDeepLink {
  url: string;
  timestamp: string;
  source: 'notification' | 'universal_link' | 'custom_scheme' | 'manual';
  processed: boolean;
  metadata?: Record<string, any>;
}

export interface DeepLinkConfig {
  scheme: string;
  host: string;
  universalLinkDomain: string;
  routes: Record<string, DeepLinkRoute>;
  fallbackRoute: DeepLinkRoute;
}

class DeepLinkingService {
  private static instance: DeepLinkingService;
  private isInitialized = false;
  private config: DeepLinkConfig;
  private navigationRef: any = null;
  private pendingDeepLinks: PendingDeepLink[] = [];
  private routeHandlers: Record<string, (params: any) => Promise<void>> = {};

  private constructor() {
    this.config = this.getDefaultConfig();
    this.setupRouteHandlers();
  }

  static getInstance(): DeepLinkingService {
    if (!DeepLinkingService.instance) {
      DeepLinkingService.instance = new DeepLinkingService();
    }
    return DeepLinkingService.instance;
  }

  async initialize(navigationRef?: any): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Store navigation reference for programmatic navigation
      this.navigationRef = navigationRef;

      // Configure linking
      await this.setupLinkingConfiguration();

      // Set up universal links
      await this.setupUniversalLinks();

      // Set up notification-based deep links
      await this.setupNotificationDeepLinks();

      // Process any pending deep links
      await this.processPendingDeepLinks();

      // Set up initial URL handling
      await this.handleInitialURL();

      this.isInitialized = true;
      console.log('Deep linking service initialized');
      crashReportingService.addBreadcrumb('Deep linking initialized', 'navigation', 'info');

    } catch (error) {
      console.error('Failed to initialize deep linking service:', error);
      crashReportingService.reportError(error as Error, {
        component: 'DeepLinkingService',
        action: 'initialize',
      });
    }
  }

  private getDefaultConfig(): DeepLinkConfig {
    const config = environmentConfig.getConfig();
    const platformConfig = environmentConfig.getPlatformConfig();

    return {
      scheme: platformConfig.scheme,
      host: 'security.candlefish.ai',
      universalLinkDomain: config.deepLinking.universalLinksDomain,
      routes: {
        // Dashboard routes
        '/dashboard': {
          path: '/dashboard',
          screen: 'Dashboard',
          requiredAuth: true,
        },
        '/dashboard/overview': {
          path: '/dashboard/overview',
          screen: 'DashboardOverview',
          requiredAuth: true,
        },

        // Alert routes
        '/alerts': {
          path: '/alerts',
          screen: 'AlertsList',
          requiredAuth: true,
        },
        '/alerts/:alertId': {
          path: '/alerts/:alertId',
          screen: 'AlertDetails',
          requiredAuth: true,
          params: { alertId: undefined },
        },
        '/alerts/:alertId/acknowledge': {
          path: '/alerts/:alertId/acknowledge',
          screen: 'AlertDetails',
          requiredAuth: true,
          action: 'acknowledge',
          params: { alertId: undefined },
        },

        // Incident routes
        '/incidents': {
          path: '/incidents',
          screen: 'IncidentsList',
          requiredAuth: true,
        },
        '/incidents/:incidentId': {
          path: '/incidents/:incidentId',
          screen: 'IncidentDetails',
          requiredAuth: true,
          params: { incidentId: undefined },
        },
        '/incidents/:incidentId/investigate': {
          path: '/incidents/:incidentId/investigate',
          screen: 'IncidentInvestigation',
          requiredAuth: true,
          requiredPermissions: ['incident:investigate'],
          params: { incidentId: undefined },
        },
        '/incidents/:incidentId/respond': {
          path: '/incidents/:incidentId/respond',
          screen: 'IncidentResponse',
          requiredAuth: true,
          requiredPermissions: ['incident:respond'],
          params: { incidentId: undefined },
        },

        // Vulnerability routes
        '/vulnerabilities': {
          path: '/vulnerabilities',
          screen: 'VulnerabilitiesList',
          requiredAuth: true,
        },
        '/vulnerabilities/:vulnId': {
          path: '/vulnerabilities/:vulnId',
          screen: 'VulnerabilityDetails',
          requiredAuth: true,
          params: { vulnId: undefined },
        },
        '/vulnerabilities/:vulnId/fix': {
          path: '/vulnerabilities/:vulnId/fix',
          screen: 'VulnerabilityFix',
          requiredAuth: true,
          requiredPermissions: ['vulnerability:fix'],
          action: 'fix',
          params: { vulnId: undefined },
        },

        // Kong-specific routes
        '/kong/vulnerabilities': {
          path: '/kong/vulnerabilities',
          screen: 'KongVulnerabilities',
          requiredAuth: true,
        },
        '/kong/vulnerabilities/:vulnId': {
          path: '/kong/vulnerabilities/:vulnId',
          screen: 'KongVulnerabilityDetails',
          requiredAuth: true,
          params: { vulnId: undefined },
        },
        '/kong/admin-api/secure': {
          path: '/kong/admin-api/secure',
          screen: 'KongAdminAPISecure',
          requiredAuth: true,
          requiredPermissions: ['kong:admin'],
          action: 'secure_admin_api',
        },

        // Location security routes
        '/location/threats': {
          path: '/location/threats',
          screen: 'LocationThreats',
          requiredAuth: true,
        },
        '/location/threats/:threatId': {
          path: '/location/threats/:threatId',
          screen: 'LocationThreatDetails',
          requiredAuth: true,
          params: { threatId: undefined },
        },
        '/location/geofences': {
          path: '/location/geofences',
          screen: 'GeofenceManagement',
          requiredAuth: true,
          requiredPermissions: ['location:manage'],
        },

        // Team collaboration routes
        '/team/incidents/:incidentId': {
          path: '/team/incidents/:incidentId',
          screen: 'TeamIncidentCollaboration',
          requiredAuth: true,
          params: { incidentId: undefined },
        },

        // Settings routes
        '/settings': {
          path: '/settings',
          screen: 'Settings',
          requiredAuth: true,
        },
        '/settings/notifications': {
          path: '/settings/notifications',
          screen: 'NotificationSettings',
          requiredAuth: true,
        },
        '/settings/security': {
          path: '/settings/security',
          screen: 'SecuritySettings',
          requiredAuth: true,
        },
        '/settings/location': {
          path: '/settings/location',
          screen: 'LocationSettings',
          requiredAuth: true,
        },

        // Authentication routes
        '/auth/login': {
          path: '/auth/login',
          screen: 'Login',
          requiredAuth: false,
        },
        '/auth/biometric': {
          path: '/auth/biometric',
          screen: 'BiometricAuth',
          requiredAuth: false,
        },

        // Demo mode routes
        '/demo': {
          path: '/demo',
          screen: 'DemoMode',
          requiredAuth: false,
        },
        '/demo/tour': {
          path: '/demo/tour',
          screen: 'DemoTour',
          requiredAuth: false,
        },
      },
      fallbackRoute: {
        path: '/dashboard',
        screen: 'Dashboard',
        requiredAuth: true,
      },
    };
  }

  private setupRouteHandlers(): void {
    // Acknowledge alert handler
    this.routeHandlers['/alerts/:alertId/acknowledge'] = async (params) => {
      const { alertId } = params;
      try {
        // Import service dynamically to avoid circular dependencies
        const { offlineSyncService } = await import('./offlineSync');
        
        await offlineSyncService.queueAction({
          type: 'acknowledge',
          targetType: 'alert',
          targetId: alertId,
          payload: { note: 'Acknowledged via deep link' },
          userId: 'current_user',
        });

        crashReportingService.addBreadcrumb(
          `Alert acknowledged via deep link: ${alertId}`,
          'navigation',
          'info'
        );
      } catch (error) {
        console.error('Error acknowledging alert via deep link:', error);
      }
    };

    // Fix vulnerability handler
    this.routeHandlers['/vulnerabilities/:vulnId/fix'] = async (params) => {
      const { vulnId } = params;
      try {
        // Navigate to fix screen and trigger fix workflow
        crashReportingService.addBreadcrumb(
          `Vulnerability fix triggered via deep link: ${vulnId}`,
          'navigation',
          'info'
        );
        // Fix workflow would be handled by the target screen
      } catch (error) {
        console.error('Error handling vulnerability fix via deep link:', error);
      }
    };

    // Secure Kong Admin API handler
    this.routeHandlers['/kong/admin-api/secure'] = async (params) => {
      try {
        // Trigger Kong Admin API security workflow
        crashReportingService.addBreadcrumb(
          'Kong Admin API security triggered via deep link',
          'navigation',
          'warning'
        );
        // Security workflow would be handled by the target screen
      } catch (error) {
        console.error('Error handling Kong Admin API security via deep link:', error);
      }
    };
  }

  private async setupLinkingConfiguration(): Promise<void> {
    // Configure Expo Linking
    const linkingConfig = {
      prefixes: [
        this.config.scheme + '://',
        `https://${this.config.universalLinkDomain}`,
      ],
      config: {
        screens: this.generateScreenConfig(),
      },
    };

    Linking.addEventListener('url', this.handleIncomingURL.bind(this));
    
    console.log('Linking configuration set up with prefixes:', linkingConfig.prefixes);
  }

  private generateScreenConfig(): Record<string, any> {
    const screenConfig: Record<string, any> = {};
    
    for (const [routePath, route] of Object.entries(this.config.routes)) {
      // Convert path parameters to React Navigation format
      const screenPath = route.path.replace(/:([^/]+)/g, ':$1');
      screenConfig[route.screen] = screenPath;
    }
    
    return screenConfig;
  }

  private async setupUniversalLinks(): Promise<void> {
    // Universal links are handled by the same URL handler
    console.log(`Universal links configured for domain: ${this.config.universalLinkDomain}`);
  }

  private async setupNotificationDeepLinks(): Promise<void> {
    // Handle notification taps that should open specific screens
    Notifications.addNotificationResponseReceivedListener(async (response) => {
      const { notification } = response;
      const { data } = notification.request.content;

      if (data && data.deepLink) {
        await this.handleDeepLink(data.deepLink, 'notification', {
          notificationId: notification.request.identifier,
          actionId: response.actionIdentifier,
          notificationData: data,
        });
      }
    });
  }

  private async handleInitialURL(): Promise<void> {
    try {
      const initialURL = await Linking.getInitialURL();
      if (initialURL) {
        console.log('Handling initial URL:', initialURL);
        await this.handleDeepLink(initialURL, 'universal_link');
      }
    } catch (error) {
      console.error('Error handling initial URL:', error);
    }
  }

  private async handleIncomingURL(event: { url: string }): Promise<void> {
    console.log('Incoming URL:', event.url);
    await this.handleDeepLink(event.url, 'universal_link');
  }

  // Main deep link handler
  async handleDeepLink(
    url: string,
    source: PendingDeepLink['source'],
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      console.log(`Handling deep link from ${source}:`, url);
      
      // Parse URL
      const parsedURL = Linking.parse(url);
      const { hostname, path, queryParams } = parsedURL;

      // Find matching route
      const route = this.findMatchingRoute(path || '/');
      if (!route) {
        console.warn('No matching route found for path:', path);
        await this.navigateToFallback();
        return;
      }

      // Extract path parameters
      const pathParams = this.extractPathParams(route.path, path || '/');
      const allParams = { ...pathParams, ...queryParams };

      // Check authentication requirements
      if (route.requiredAuth && !(await this.checkAuthentication())) {
        await this.queuePendingDeepLink(url, source, metadata);
        await this.navigateToAuth();
        return;
      }

      // Check permission requirements
      if (route.requiredPermissions && !(await this.checkPermissions(route.requiredPermissions))) {
        console.warn('Insufficient permissions for route:', route.path);
        await this.navigateToFallback();
        return;
      }

      // Execute route handler if exists
      if (route.action && this.routeHandlers[route.path]) {
        await this.routeHandlers[route.path](allParams);
      }

      // Navigate to screen
      await this.navigateToScreen(route.screen, allParams, route.action);

      // Log successful navigation
      crashReportingService.addBreadcrumb(
        `Deep link navigation: ${route.screen}`,
        'navigation',
        'info',
        {
          source,
          path: route.path,
          screen: route.screen,
          hasParams: Object.keys(allParams).length > 0,
        }
      );

    } catch (error) {
      console.error('Error handling deep link:', error);
      crashReportingService.reportError(error as Error, {
        component: 'DeepLinkingService',
        action: 'handleDeepLink',
        extra: { url, source },
      });
      
      await this.navigateToFallback();
    }
  }

  private findMatchingRoute(path: string): DeepLinkRoute | null {
    // Direct match first
    if (this.config.routes[path]) {
      return this.config.routes[path];
    }

    // Pattern matching for parameterized routes
    for (const [routePath, route] of Object.entries(this.config.routes)) {
      if (this.matchesPattern(routePath, path)) {
        return route;
      }
    }

    return null;
  }

  private matchesPattern(pattern: string, path: string): boolean {
    // Convert pattern to regex
    const regexPattern = pattern.replace(/:([^/]+)/g, '([^/]+)');
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(path);
  }

  private extractPathParams(pattern: string, path: string): Record<string, string> {
    const params: Record<string, string> = {};
    
    // Extract parameter names from pattern
    const paramNames = (pattern.match(/:([^/]+)/g) || []).map(p => p.substring(1));
    
    if (paramNames.length === 0) {
      return params;
    }

    // Create regex to extract values
    const regexPattern = pattern.replace(/:([^/]+)/g, '([^/]+)');
    const regex = new RegExp(`^${regexPattern}$`);
    const matches = path.match(regex);

    if (matches) {
      paramNames.forEach((paramName, index) => {
        params[paramName] = matches[index + 1];
      });
    }

    return params;
  }

  private async checkAuthentication(): Promise<boolean> {
    try {
      // Check if user is authenticated
      const authToken = await AsyncStorage.getItem('auth_token');
      return !!authToken;
    } catch (error) {
      console.error('Error checking authentication:', error);
      return false;
    }
  }

  private async checkPermissions(requiredPermissions: string[]): Promise<boolean> {
    try {
      // Check if user has required permissions
      const userPermissionsJson = await AsyncStorage.getItem('user_permissions');
      if (!userPermissionsJson) return false;

      const userPermissions = JSON.parse(userPermissionsJson);
      return requiredPermissions.every(permission => 
        userPermissions.includes(permission)
      );
    } catch (error) {
      console.error('Error checking permissions:', error);
      return false;
    }
  }

  private async queuePendingDeepLink(
    url: string,
    source: PendingDeepLink['source'],
    metadata?: Record<string, any>
  ): Promise<void> {
    const pendingLink: PendingDeepLink = {
      url,
      source,
      timestamp: new Date().toISOString(),
      processed: false,
      metadata,
    };

    this.pendingDeepLinks.push(pendingLink);

    // Store in AsyncStorage for persistence
    try {
      await AsyncStorage.setItem('pending_deep_links', JSON.stringify(this.pendingDeepLinks));
    } catch (error) {
      console.error('Error storing pending deep link:', error);
    }
  }

  private async processPendingDeepLinks(): Promise<void> {
    try {
      // Load pending deep links from storage
      const pendingLinksJson = await AsyncStorage.getItem('pending_deep_links');
      if (pendingLinksJson) {
        this.pendingDeepLinks = JSON.parse(pendingLinksJson);
      }

      // Process unprocessed links
      const unprocessedLinks = this.pendingDeepLinks.filter(link => !link.processed);
      
      for (const link of unprocessedLinks) {
        try {
          await this.handleDeepLink(link.url, link.source, link.metadata);
          link.processed = true;
        } catch (error) {
          console.error('Error processing pending deep link:', error);
        }
      }

      // Clean up old processed links (older than 24 hours)
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - 24);
      
      this.pendingDeepLinks = this.pendingDeepLinks.filter(link => 
        !link.processed || new Date(link.timestamp) > cutoffTime
      );

      // Save updated list
      await AsyncStorage.setItem('pending_deep_links', JSON.stringify(this.pendingDeepLinks));

    } catch (error) {
      console.error('Error processing pending deep links:', error);
    }
  }

  private async navigateToScreen(screen: string, params?: any, action?: string): Promise<void> {
    if (!this.navigationRef?.current) {
      console.warn('Navigation ref not available');
      return;
    }

    try {
      // Navigate using React Navigation
      this.navigationRef.current.navigate(screen, { 
        ...params,
        deepLinkAction: action,
        deepLinkTimestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error navigating to screen:', error);
    }
  }

  private async navigateToAuth(): Promise<void> {
    await this.navigateToScreen('Login');
  }

  private async navigateToFallback(): Promise<void> {
    const fallbackRoute = this.config.fallbackRoute;
    await this.navigateToScreen(fallbackRoute.screen);
  }

  // Public methods

  // Generate deep link for sharing
  generateDeepLink(path: string, params?: Record<string, any>): string {
    let url = `https://${this.config.universalLinkDomain}${path}`;
    
    if (params && Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams(params).toString();
      url += `?${searchParams}`;
    }
    
    return url;
  }

  // Generate custom scheme link
  generateCustomSchemeLink(path: string, params?: Record<string, any>): string {
    let url = `${this.config.scheme}://${path}`;
    
    if (params && Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams(params).toString();
      url += `?${searchParams}`;
    }
    
    return url;
  }

  // Share incident link
  generateIncidentLink(incidentId: string, action?: string): string {
    const path = action ? `/incidents/${incidentId}/${action}` : `/incidents/${incidentId}`;
    return this.generateDeepLink(path);
  }

  // Share alert link
  generateAlertLink(alertId: string, action?: string): string {
    const path = action ? `/alerts/${alertId}/${action}` : `/alerts/${alertId}`;
    return this.generateDeepLink(path);
  }

  // Share vulnerability link
  generateVulnerabilityLink(vulnId: string, action?: string): string {
    const path = action ? `/vulnerabilities/${vulnId}/${action}` : `/vulnerabilities/${vulnId}`;
    return this.generateDeepLink(path);
  }

  // Test if a URL can be handled
  canHandleURL(url: string): boolean {
    try {
      const parsedURL = Linking.parse(url);
      const { path } = parsedURL;
      
      const route = this.findMatchingRoute(path || '/');
      return !!route;
    } catch (error) {
      return false;
    }
  }

  // Get current configuration
  getConfiguration(): DeepLinkConfig {
    return { ...this.config };
  }

  // Get pending deep links
  getPendingDeepLinks(): PendingDeepLink[] {
    return [...this.pendingDeepLinks];
  }

  // Clear pending deep links
  async clearPendingDeepLinks(): Promise<void> {
    this.pendingDeepLinks = [];
    await AsyncStorage.removeItem('pending_deep_links');
  }

  // Manual deep link trigger (for testing)
  async triggerDeepLink(url: string): Promise<void> {
    await this.handleDeepLink(url, 'manual');
  }

  isInitialized(): boolean {
    return this.isInitialized;
  }

  // Set navigation reference (called from App.tsx)
  setNavigationRef(navigationRef: any): void {
    this.navigationRef = navigationRef;
  }
}

// Export singleton instance
export const deepLinkingService = DeepLinkingService.getInstance();

export default deepLinkingService;