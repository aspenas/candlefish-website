// Location-Based Security Service for Mobile Security Dashboard
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { environmentConfig } from '@/config/environment';
import { notificationService } from './notifications';
import { crashReportingService } from './crashReporting';
import { offlineSyncService } from './offlineSync';

// Types
export interface GeofenceZone {
  id: string;
  name: string;
  description: string;
  center: {
    latitude: number;
    longitude: number;
  };
  radius: number; // meters
  type: 'secure' | 'restricted' | 'alert' | 'monitoring';
  alertOnEnter: boolean;
  alertOnExit: boolean;
  threatLevel: 'low' | 'medium' | 'high' | 'critical';
  metadata?: {
    facilityType?: string;
    securityRating?: number;
    accessRequirements?: string[];
    contactInfo?: string;
  };
}

export interface LocationThreat {
  id: string;
  timestamp: string;
  location: {
    latitude: number;
    longitude: number;
    accuracy: number;
    address?: string;
  };
  threatType: 'geofence_breach' | 'suspicious_location' | 'rapid_movement' | 'location_spoofing' | 'unsafe_network';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  zoneId?: string;
  zoneName?: string;
  metadata: {
    speed?: number;
    bearing?: number;
    networkInfo?: {
      ssid?: string;
      bssid?: string;
      isSecure?: boolean;
    };
    deviceInfo?: {
      batteryLevel?: number;
      isCharging?: boolean;
      screenOn?: boolean;
    };
  };
  acknowledged: boolean;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
}

export interface LocationSettings {
  enabled: boolean;
  backgroundLocationEnabled: boolean;
  geofencingEnabled: boolean;
  threatDetectionEnabled: boolean;
  accuracyThreshold: 'high' | 'balanced' | 'low';
  updateInterval: number; // milliseconds
  alertRadius: number; // meters
  speedThreshold: number; // m/s for suspicious movement detection
  networkMonitoring: boolean;
  historicalTracking: boolean;
  maxHistoryDays: number;
}

export interface LocationSecurity {
  currentLocation?: Location.LocationObject;
  activeZones: GeofenceZone[];
  recentThreats: LocationThreat[];
  settings: LocationSettings;
  isMonitoring: boolean;
  lastUpdate: string | null;
}

// Background location task
const LOCATION_TASK_NAME = 'SECURITY_LOCATION_MONITORING';

class LocationSecurityService {
  private static instance: LocationSecurityService;
  private isInitialized = false;
  private isMonitoring = false;
  private locationSubscription: any = null;
  private geofenceZones: GeofenceZone[] = [];
  private recentThreats: LocationThreat[] = [];
  private settings: LocationSettings;
  private lastKnownLocation: Location.LocationObject | null = null;
  private locationHistory: Array<{ location: Location.LocationObject; timestamp: string }> = [];

  private constructor() {
    this.settings = this.getDefaultSettings();
  }

  static getInstance(): LocationSecurityService {
    if (!LocationSecurityService.instance) {
      LocationSecurityService.instance = new LocationSecurityService();
    }
    return LocationSecurityService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Check if location services are enabled in config
      if (!environmentConfig.isFeatureEnabled('locationServices')) {
        console.log('Location services disabled in configuration');
        return;
      }

      // Load saved settings and data
      await this.loadStoredData();

      // Request location permissions
      const permissionGranted = await this.requestLocationPermissions();
      if (!permissionGranted) {
        console.warn('Location permissions not granted');
        return;
      }

      // Set up background location task
      await this.setupBackgroundLocationTask();

      // Load default geofence zones
      await this.loadDefaultGeofenceZones();

      // Start monitoring if enabled
      if (this.settings.enabled) {
        await this.startLocationMonitoring();
      }

      this.isInitialized = true;
      console.log('Location security service initialized');
      crashReportingService.addBreadcrumb('Location security initialized', 'location', 'info');

    } catch (error) {
      console.error('Failed to initialize location security service:', error);
      crashReportingService.reportError(error as Error, {
        component: 'LocationSecurityService',
        action: 'initialize',
      });
    }
  }

  private getDefaultSettings(): LocationSettings {
    const config = environmentConfig.getConfig();
    
    return {
      enabled: false, // User must explicitly enable
      backgroundLocationEnabled: config.location.backgroundLocation,
      geofencingEnabled: true,
      threatDetectionEnabled: true,
      accuracyThreshold: config.location.accuracy as 'high' | 'balanced' | 'low',
      updateInterval: 60000, // 1 minute
      alertRadius: config.location.geofenceRadius,
      speedThreshold: 30, // ~67 mph, suspicious for typical business travel
      networkMonitoring: true,
      historicalTracking: true,
      maxHistoryDays: 30,
    };
  }

  private async loadStoredData(): Promise<void> {
    try {
      // Load settings
      const settingsJson = await AsyncStorage.getItem('location_security_settings');
      if (settingsJson) {
        this.settings = { ...this.settings, ...JSON.parse(settingsJson) };
      }

      // Load geofence zones
      const zonesJson = await AsyncStorage.getItem('geofence_zones');
      if (zonesJson) {
        this.geofenceZones = JSON.parse(zonesJson);
      }

      // Load recent threats
      const threatsJson = await AsyncStorage.getItem('location_threats');
      if (threatsJson) {
        this.recentThreats = JSON.parse(threatsJson);
      }

      // Load location history
      const historyJson = await AsyncStorage.getItem('location_history');
      if (historyJson) {
        this.locationHistory = JSON.parse(historyJson);
      }

    } catch (error) {
      console.error('Error loading stored location data:', error);
    }
  }

  private async saveStoredData(): Promise<void> {
    try {
      await AsyncStorage.setItem('location_security_settings', JSON.stringify(this.settings));
      await AsyncStorage.setItem('geofence_zones', JSON.stringify(this.geofenceZones));
      await AsyncStorage.setItem('location_threats', JSON.stringify(this.recentThreats));
      await AsyncStorage.setItem('location_history', JSON.stringify(this.locationHistory));
    } catch (error) {
      console.error('Error saving location data:', error);
    }
  }

  private async requestLocationPermissions(): Promise<boolean> {
    try {
      // Request foreground location permission
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      
      if (foregroundStatus !== 'granted') {
        console.warn('Foreground location permission not granted');
        return false;
      }

      // Request background location permission if needed
      if (this.settings.backgroundLocationEnabled) {
        const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
        
        if (backgroundStatus !== 'granted') {
          console.warn('Background location permission not granted');
          this.settings.backgroundLocationEnabled = false;
        }
      }

      return true;

    } catch (error) {
      console.error('Error requesting location permissions:', error);
      return false;
    }
  }

  private async setupBackgroundLocationTask(): Promise<void> {
    // Define background location task
    TaskManager.defineTask(LOCATION_TASK_NAME, ({ data, error }) => {
      if (error) {
        console.error('Background location error:', error);
        crashReportingService.reportError(error, {
          component: 'LocationSecurityService',
          action: 'backgroundLocationTask',
        });
        return;
      }

      if (data) {
        const { locations } = data as any;
        if (locations && locations.length > 0) {
          const location = locations[0] as Location.LocationObject;
          this.processLocationUpdate(location, true);
        }
      }
    });
  }

  private async loadDefaultGeofenceZones(): Promise<void> {
    // Load default zones from configuration or API
    const defaultZones: GeofenceZone[] = [
      {
        id: 'corporate_hq',
        name: 'Corporate Headquarters',
        description: 'Main office building with secure access required',
        center: { latitude: 37.7749, longitude: -122.4194 }, // Example: San Francisco
        radius: 100,
        type: 'secure',
        alertOnEnter: false,
        alertOnExit: true,
        threatLevel: 'low',
        metadata: {
          facilityType: 'corporate_office',
          securityRating: 9,
          accessRequirements: ['badge_access', 'biometric_auth'],
          contactInfo: 'security@candlefish.ai',
        },
      },
      {
        id: 'data_center',
        name: 'Primary Data Center',
        description: 'Critical infrastructure facility',
        center: { latitude: 37.4419, longitude: -122.1430 }, // Example: Palo Alto
        radius: 200,
        type: 'restricted',
        alertOnEnter: true,
        alertOnExit: true,
        threatLevel: 'critical',
        metadata: {
          facilityType: 'data_center',
          securityRating: 10,
          accessRequirements: ['high_security_clearance', 'escort_required'],
          contactInfo: 'datacenter-security@candlefish.ai',
        },
      },
    ];

    // Merge with existing zones (don't overwrite user-defined zones)
    for (const defaultZone of defaultZones) {
      const existingZone = this.geofenceZones.find(z => z.id === defaultZone.id);
      if (!existingZone) {
        this.geofenceZones.push(defaultZone);
      }
    }

    await this.saveStoredData();
  }

  async startLocationMonitoring(): Promise<void> {
    if (this.isMonitoring) return;

    try {
      // Start foreground location tracking
      this.locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: this.getLocationAccuracy(),
          timeInterval: this.settings.updateInterval,
          distanceInterval: 10, // meters
        },
        (location) => {
          this.processLocationUpdate(location, false);
        }
      );

      // Start background location tracking if enabled
      if (this.settings.backgroundLocationEnabled) {
        await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
          accuracy: this.getLocationAccuracy(),
          timeInterval: this.settings.updateInterval,
          distanceInterval: 50, // larger distance for background updates
          showsBackgroundLocationIndicator: Platform.OS === 'ios',
          foregroundService: {
            notificationTitle: 'Security Dashboard Location Monitoring',
            notificationBody: 'Monitoring location for security threats',
            notificationColor: '#1976d2',
          },
        });
      }

      this.isMonitoring = true;
      console.log('Location monitoring started');
      crashReportingService.addBreadcrumb('Location monitoring started', 'location', 'info');

    } catch (error) {
      console.error('Error starting location monitoring:', error);
      crashReportingService.reportError(error as Error, {
        component: 'LocationSecurityService',
        action: 'startLocationMonitoring',
      });
    }
  }

  async stopLocationMonitoring(): Promise<void> {
    try {
      // Stop foreground location tracking
      if (this.locationSubscription) {
        this.locationSubscription.remove();
        this.locationSubscription = null;
      }

      // Stop background location tracking
      if (await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME)) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      }

      this.isMonitoring = false;
      console.log('Location monitoring stopped');
      crashReportingService.addBreadcrumb('Location monitoring stopped', 'location', 'info');

    } catch (error) {
      console.error('Error stopping location monitoring:', error);
    }
  }

  private getLocationAccuracy(): Location.Accuracy {
    switch (this.settings.accuracyThreshold) {
      case 'high':
        return Location.Accuracy.Highest;
      case 'balanced':
        return Location.Accuracy.Balanced;
      case 'low':
        return Location.Accuracy.Low;
      default:
        return Location.Accuracy.Balanced;
    }
  }

  private async processLocationUpdate(location: Location.LocationObject, isBackground: boolean): Promise<void> {
    try {
      this.lastKnownLocation = location;

      // Add to location history
      this.locationHistory.push({
        location,
        timestamp: new Date().toISOString(),
      });

      // Clean up old history
      if (this.settings.historicalTracking) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - this.settings.maxHistoryDays);
        
        this.locationHistory = this.locationHistory.filter(
          entry => new Date(entry.timestamp) > cutoffDate
        );
      }

      // Check for geofence violations
      if (this.settings.geofencingEnabled) {
        await this.checkGeofenceViolations(location);
      }

      // Check for threat patterns
      if (this.settings.threatDetectionEnabled) {
        await this.detectLocationThreats(location);
      }

      // Save updated data
      await this.saveStoredData();

      crashReportingService.addBreadcrumb(
        `Location updated: ${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)}`,
        'location',
        'debug',
        {
          accuracy: location.coords.accuracy,
          isBackground,
          speed: location.coords.speed,
        }
      );

    } catch (error) {
      console.error('Error processing location update:', error);
      crashReportingService.reportError(error as Error, {
        component: 'LocationSecurityService',
        action: 'processLocationUpdate',
      });
    }
  }

  private async checkGeofenceViolations(location: Location.LocationObject): Promise<void> {
    for (const zone of this.geofenceZones) {
      const distance = this.calculateDistance(
        location.coords.latitude,
        location.coords.longitude,
        zone.center.latitude,
        zone.center.longitude
      );

      const isInside = distance <= zone.radius;
      const wasInside = await this.wasInZone(zone.id);

      // Check for zone entry
      if (isInside && !wasInside && zone.alertOnEnter) {
        await this.handleGeofenceEvent('enter', zone, location);
      }

      // Check for zone exit
      if (!isInside && wasInside && zone.alertOnExit) {
        await this.handleGeofenceEvent('exit', zone, location);
      }

      // Update zone status
      await AsyncStorage.setItem(`zone_status_${zone.id}`, isInside.toString());
    }
  }

  private async wasInZone(zoneId: string): Promise<boolean> {
    try {
      const status = await AsyncStorage.getItem(`zone_status_${zoneId}`);
      return status === 'true';
    } catch {
      return false;
    }
  }

  private async handleGeofenceEvent(
    event: 'enter' | 'exit',
    zone: GeofenceZone,
    location: Location.LocationObject
  ): Promise<void> {
    const threat: LocationThreat = {
      id: `geofence_${zone.id}_${event}_${Date.now()}`,
      timestamp: new Date().toISOString(),
      location: {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy || 0,
      },
      threatType: 'geofence_breach',
      severity: zone.threatLevel,
      description: `${event === 'enter' ? 'Entered' : 'Exited'} ${zone.type} zone: ${zone.name}`,
      zoneId: zone.id,
      zoneName: zone.name,
      metadata: {
        speed: location.coords.speed || undefined,
        bearing: location.coords.heading || undefined,
      },
      acknowledged: false,
    };

    await this.recordLocationThreat(threat);

    // Send notification
    await notificationService.sendLocalNotification({
      title: `Security Zone ${event === 'enter' ? 'Entry' : 'Exit'}`,
      body: threat.description,
      data: {
        type: 'location_threat',
        threatId: threat.id,
        zoneId: zone.id,
        severity: zone.threatLevel,
      },
    });

    // Queue for backend sync
    await offlineSyncService.queueAction({
      type: 'create',
      targetType: 'alert',
      targetId: threat.id,
      payload: {
        type: 'location_threat',
        threat,
        location: location.coords,
      },
      userId: 'current_user',
    });
  }

  private async detectLocationThreats(location: Location.LocationObject): Promise<void> {
    // Detect rapid movement (potential device theft or unauthorized access)
    if (location.coords.speed && location.coords.speed > this.settings.speedThreshold) {
      const threat: LocationThreat = {
        id: `rapid_movement_${Date.now()}`,
        timestamp: new Date().toISOString(),
        location: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy || 0,
        },
        threatType: 'rapid_movement',
        severity: 'medium',
        description: `Suspicious rapid movement detected (${Math.round((location.coords.speed || 0) * 3.6)} km/h)`,
        metadata: {
          speed: location.coords.speed,
          bearing: location.coords.heading || undefined,
        },
        acknowledged: false,
      };

      await this.recordLocationThreat(threat);
    }

    // Detect potential location spoofing (unrealistic accuracy or impossible movement)
    if (this.locationHistory.length > 1) {
      const previousLocation = this.locationHistory[this.locationHistory.length - 2];
      const timeDiff = new Date().getTime() - new Date(previousLocation.timestamp).getTime();
      const distance = this.calculateDistance(
        location.coords.latitude,
        location.coords.longitude,
        previousLocation.location.coords.latitude,
        previousLocation.location.coords.longitude
      );

      // Check for impossible movement (>200 km/h sustained)
      const speedKmh = (distance / 1000) / (timeDiff / 1000 / 3600);
      if (speedKmh > 200 && timeDiff > 300000) { // 5 minutes minimum
        const threat: LocationThreat = {
          id: `location_spoofing_${Date.now()}`,
          timestamp: new Date().toISOString(),
          location: {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy || 0,
          },
          threatType: 'location_spoofing',
          severity: 'high',
          description: `Potential location spoofing detected (impossible movement: ${Math.round(speedKmh)} km/h)`,
          metadata: {
            speed: speedKmh / 3.6, // Convert back to m/s
            distance,
            timeDiff,
          },
          acknowledged: false,
        };

        await this.recordLocationThreat(threat);
      }
    }
  }

  private async recordLocationThreat(threat: LocationThreat): Promise<void> {
    this.recentThreats.unshift(threat);

    // Keep only recent threats (last 100)
    if (this.recentThreats.length > 100) {
      this.recentThreats = this.recentThreats.slice(0, 100);
    }

    await this.saveStoredData();

    console.log('Location threat recorded:', threat.threatType, threat.severity);
    crashReportingService.addBreadcrumb(
      `Location threat: ${threat.threatType}`,
      'location',
      threat.severity === 'critical' || threat.severity === 'high' ? 'error' : 'warning',
      {
        threatId: threat.id,
        severity: threat.severity,
      }
    );
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // Public methods
  async getCurrentLocation(): Promise<Location.LocationObject | null> {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: this.getLocationAccuracy(),
      });
      
      this.lastKnownLocation = location;
      return location;
    } catch (error) {
      console.error('Error getting current location:', error);
      return this.lastKnownLocation;
    }
  }

  getLocationSecurity(): LocationSecurity {
    return {
      currentLocation: this.lastKnownLocation || undefined,
      activeZones: this.geofenceZones,
      recentThreats: this.recentThreats.slice(0, 20), // Last 20 threats
      settings: { ...this.settings },
      isMonitoring: this.isMonitoring,
      lastUpdate: this.lastKnownLocation ? new Date(this.lastKnownLocation.timestamp).toISOString() : null,
    };
  }

  async updateSettings(newSettings: Partial<LocationSettings>): Promise<void> {
    const wasMonitoring = this.isMonitoring;
    
    // Stop monitoring if it was running
    if (wasMonitoring) {
      await this.stopLocationMonitoring();
    }

    // Update settings
    this.settings = { ...this.settings, ...newSettings };

    // Request new permissions if needed
    if (newSettings.backgroundLocationEnabled && !this.settings.backgroundLocationEnabled) {
      await this.requestLocationPermissions();
    }

    // Restart monitoring if it was running and still enabled
    if (wasMonitoring && this.settings.enabled) {
      await this.startLocationMonitoring();
    }

    await this.saveStoredData();
  }

  async addGeofenceZone(zone: Omit<GeofenceZone, 'id'>): Promise<string> {
    const geofenceZone: GeofenceZone = {
      ...zone,
      id: `zone_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    this.geofenceZones.push(geofenceZone);
    await this.saveStoredData();

    return geofenceZone.id;
  }

  async removeGeofenceZone(zoneId: string): Promise<void> {
    this.geofenceZones = this.geofenceZones.filter(zone => zone.id !== zoneId);
    await AsyncStorage.removeItem(`zone_status_${zoneId}`);
    await this.saveStoredData();
  }

  async acknowledgeLocationThreat(threatId: string, userId: string): Promise<void> {
    const threat = this.recentThreats.find(t => t.id === threatId);
    if (threat) {
      threat.acknowledged = true;
      threat.acknowledgedAt = new Date().toISOString();
      threat.acknowledgedBy = userId;
      
      await this.saveStoredData();

      // Queue acknowledgment for backend sync
      await offlineSyncService.queueAction({
        type: 'acknowledge',
        targetType: 'alert',
        targetId: threatId,
        payload: { note: 'Location threat acknowledged' },
        userId,
      });
    }
  }

  getLocationHistory(hours = 24): Array<{ location: Location.LocationObject; timestamp: string }> {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - hours);

    return this.locationHistory.filter(
      entry => new Date(entry.timestamp) > cutoffTime
    );
  }

  async clearLocationHistory(): Promise<void> {
    this.locationHistory = [];
    await this.saveStoredData();
  }

  isLocationSecurityEnabled(): boolean {
    return this.settings.enabled && this.isInitialized;
  }

  getGeofenceZones(): GeofenceZone[] {
    return [...this.geofenceZones];
  }

  getRecentThreats(limit = 50): LocationThreat[] {
    return this.recentThreats.slice(0, limit);
  }
}

// Export singleton instance
export const locationSecurityService = LocationSecurityService.getInstance();

export default locationSecurityService;