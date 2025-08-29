import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apolloService } from './apollo-client';
import { NotificationService } from './notifications';
import { OfflineQueueService } from './offline-queue';

// Types
interface LocationThreat {
  id: string;
  type: 'malware_cluster' | 'phishing_source' | 'ddos_origin' | 'botnet_activity' | 'credential_theft' | 'suspicious_network';
  severity: 'low' | 'medium' | 'high' | 'critical';
  location: {
    latitude: number;
    longitude: number;
    radius: number; // meters
    address?: string;
    city?: string;
    country?: string;
  };
  description: string;
  firstSeen: number;
  lastSeen: number;
  threatActor?: string;
  indicators: ThreatIndicator[];
  riskScore: number; // 0-100
  isActive: boolean;
}

interface ThreatIndicator {
  type: 'ip' | 'domain' | 'hash' | 'email' | 'phone' | 'ssid' | 'bluetooth';
  value: string;
  confidence: number; // 0-1
  source: string;
}

interface LocationAlert {
  id: string;
  threatId: string;
  userLocation: Location.LocationObject;
  distance: number; // meters from threat
  timestamp: number;
  alertType: 'entering' | 'nearby' | 'leaving';
  acknowledged: boolean;
  actionTaken?: string;
}

interface ThreatZone {
  id: string;
  name: string;
  location: {
    latitude: number;
    longitude: number;
    radius: number;
  };
  threatLevel: 'low' | 'medium' | 'high' | 'critical';
  activeThreats: LocationThreat[];
  alertRadius: number; // Alert when within this distance
  monitoringEnabled: boolean;
}

interface LocationThreatSettings {
  enabled: boolean;
  backgroundLocationEnabled: boolean;
  alertRadius: number; // Default alert radius in meters
  threatLevels: {
    low: boolean;
    medium: boolean;
    high: boolean;
    critical: boolean;
  };
  locationAccuracy: 'low' | 'balanced' | 'high';
  updateInterval: number; // seconds
  batteryOptimization: boolean;
}

const LOCATION_TASK_NAME = 'background-location-task';
const THREAT_DATA_KEY = 'location_threats';
const LOCATION_ALERTS_KEY = 'location_alerts';
const THREAT_ZONES_KEY = 'threat_zones';
const SETTINGS_KEY = 'location_threat_settings';

// Background location task
TaskManager.defineTask(LOCATION_TASK_NAME, ({ data, error }) => {
  if (error) {
    console.error('Background location task error:', error);
    return;
  }
  
  if (data) {
    const { locations } = data as any;
    if (locations && locations.length > 0) {
      LocationThreatService.getInstance().processBackgroundLocation(locations[0]);
    }
  }
});

class LocationThreatServiceClass {
  private static instance: LocationThreatServiceClass;
  private locationThreats: LocationThreat[] = [];
  private locationAlerts: LocationAlert[] = [];
  private threatZones: ThreatZone[] = [];
  private currentLocation: Location.LocationObject | null = null;
  private isMonitoring = false;
  private settings: LocationThreatSettings = {
    enabled: true,
    backgroundLocationEnabled: false,
    alertRadius: 1000, // 1km default
    threatLevels: {
      low: false,
      medium: true,
      high: true,
      critical: true
    },
    locationAccuracy: 'balanced',
    updateInterval: 300, // 5 minutes
    batteryOptimization: true
  };

  private listeners: Array<(alerts: LocationAlert[]) => void> = [];
  private threatUpdateInterval: NodeJS.Timeout | null = null;

  public static getInstance(): LocationThreatServiceClass {
    if (!LocationThreatServiceClass.instance) {
      LocationThreatServiceClass.instance = new LocationThreatServiceClass();
    }
    return LocationThreatServiceClass.instance;
  }

  async initialize(): Promise<void> {
    try {
      // Load stored data
      await this.loadStoredData();
      
      // Check and request location permissions
      const hasPermission = await this.checkLocationPermissions();
      if (!hasPermission) {
        console.warn('Location permissions not granted');
        return;
      }

      // Start monitoring if enabled
      if (this.settings.enabled) {
        await this.startLocationMonitoring();
      }

      // Start threat data updates
      this.startThreatDataUpdates();
      
      console.log('📍 Location threat service initialized');
    } catch (error) {
      console.error('Failed to initialize location threat service:', error);
      throw error;
    }
  }

  // Permission Management
  private async checkLocationPermissions(): Promise<boolean> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        return false;
      }

      // Request background permissions if enabled
      if (this.settings.backgroundLocationEnabled) {
        const backgroundStatus = await Location.requestBackgroundPermissionsAsync();
        return backgroundStatus.status === 'granted';
      }

      return true;
    } catch (error) {
      console.error('Location permission check failed:', error);
      return false;
    }
  }

  // Location Monitoring
  async startLocationMonitoring(): Promise<void> {
    if (this.isMonitoring) return;

    try {
      const hasPermission = await this.checkLocationPermissions();
      if (!hasPermission) {
        throw new Error('Location permissions not granted');
      }

      // Get current location
      await this.updateCurrentLocation();

      // Start background location tracking if enabled
      if (this.settings.backgroundLocationEnabled) {
        await this.startBackgroundLocationTracking();
      }

      // Start foreground location updates
      Location.watchPositionAsync(
        {
          accuracy: this.getLocationAccuracy(),
          timeInterval: this.settings.updateInterval * 1000,
          distanceInterval: 100, // Update every 100 meters
        },
        (location) => {
          this.processLocationUpdate(location);
        }
      );

      this.isMonitoring = true;
      console.log('📍 Location monitoring started');
      
    } catch (error) {
      console.error('Failed to start location monitoring:', error);
      throw error;
    }
  }

  async stopLocationMonitoring(): Promise<void> {
    if (!this.isMonitoring) return;

    try {
      // Stop background location tracking
      const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
      if (isRegistered) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      }

      this.isMonitoring = false;
      console.log('📍 Location monitoring stopped');
      
    } catch (error) {
      console.error('Failed to stop location monitoring:', error);
    }
  }

  private async startBackgroundLocationTracking(): Promise<void> {
    try {
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: this.getLocationAccuracy(),
        timeInterval: this.settings.updateInterval * 1000,
        distanceInterval: 100,
        foregroundService: {
          notificationTitle: 'Security Monitor',
          notificationBody: 'Monitoring location for security threats',
          notificationColor: '#ff4444',
        },
      });
      
      console.log('📍 Background location tracking started');
    } catch (error) {
      console.error('Failed to start background location tracking:', error);
    }
  }

  private getLocationAccuracy(): Location.Accuracy {
    switch (this.settings.locationAccuracy) {
      case 'low':
        return Location.Accuracy.Low;
      case 'high':
        return Location.Accuracy.High;
      case 'balanced':
      default:
        return Location.Accuracy.Balanced;
    }
  }

  // Location Processing
  async processLocationUpdate(location: Location.LocationObject): Promise<void> {
    this.currentLocation = location;
    
    // Check for nearby threats
    await this.checkNearbyThreats(location);
    
    // Update threat zones
    await this.updateThreatZoneStatus(location);
    
    // Log location for security audit
    this.logLocationUpdate(location);
  }

  async processBackgroundLocation(location: Location.LocationObject): Promise<void> {
    console.log('📍 Processing background location update');
    await this.processLocationUpdate(location);
  }

  private async checkNearbyThreats(location: Location.LocationObject): Promise<void> {
    const nearbyThreats = this.locationThreats.filter(threat => {
      if (!threat.isActive) return false;
      
      // Check if threat level is monitored
      if (!this.settings.threatLevels[threat.severity]) return false;
      
      const distance = this.calculateDistance(
        location.coords.latitude,
        location.coords.longitude,
        threat.location.latitude,
        threat.location.longitude
      );
      
      return distance <= Math.max(threat.location.radius, this.settings.alertRadius);
    });

    for (const threat of nearbyThreats) {
      await this.handleThreatProximity(location, threat);
    }
  }

  private async handleThreatProximity(
    location: Location.LocationObject, 
    threat: LocationThreat
  ): Promise<void> {
    const distance = this.calculateDistance(
      location.coords.latitude,
      location.coords.longitude,
      threat.location.latitude,
      threat.location.longitude
    );

    // Check if we already have a recent alert for this threat
    const recentAlert = this.locationAlerts.find(alert => 
      alert.threatId === threat.id && 
      (Date.now() - alert.timestamp) < 30 * 60 * 1000 // 30 minutes
    );

    if (recentAlert) return;

    // Create location alert
    const alert: LocationAlert = {
      id: this.generateId(),
      threatId: threat.id,
      userLocation: location,
      distance,
      timestamp: Date.now(),
      alertType: distance <= threat.location.radius ? 'entering' : 'nearby',
      acknowledged: false
    };

    this.locationAlerts.push(alert);
    await this.saveLocationAlerts();
    
    // Send notification
    await this.sendThreatAlert(alert, threat);
    
    // Notify listeners
    this.notifyAlertListeners();
    
    // Log security event
    this.logThreatProximity(alert, threat);
  }

  private async sendThreatAlert(alert: LocationAlert, threat: LocationThreat): Promise<void> {
    const threatTypeNames: Record<LocationThreat['type'], string> = {
      malware_cluster: 'Malware Activity',
      phishing_source: 'Phishing Campaign',
      ddos_origin: 'DDoS Source',
      botnet_activity: 'Botnet Activity',
      credential_theft: 'Credential Theft',
      suspicious_network: 'Suspicious Network'
    };

    const severityEmojis = {
      low: '🟡',
      medium: '🟠', 
      high: '🔴',
      critical: '🚨'
    };

    await NotificationService.showNotification({
      title: `${severityEmojis[threat.severity]} Security Alert`,
      message: `${threatTypeNames[threat.type]} detected ${Math.round(alert.distance)}m away`,
      type: 'alert',
      priority: threat.severity === 'critical' ? 'critical' : 'high',
      data: {
        alertId: alert.id,
        threatId: threat.id,
        threatType: threat.type,
        severity: threat.severity,
        distance: alert.distance,
        actionUrl: `threat-detail/${threat.id}`
      }
    });
  }

  // Threat Data Management
  async updateThreatData(): Promise<void> {
    try {
      if (!this.currentLocation) {
        await this.updateCurrentLocation();
      }

      if (!this.currentLocation) {
        console.warn('Cannot update threat data without location');
        return;
      }

      // Query threats near current location
      const client = apolloService.getClient();
      if (!client) {
        // Queue for offline sync
        await OfflineQueueService.queueOperation(
          'query',
          'GET_LOCATION_THREATS',
          {
            latitude: this.currentLocation.coords.latitude,
            longitude: this.currentLocation.coords.longitude,
            radius: 10000 // 10km
          },
          'normal'
        );
        return;
      }

      // Actual GraphQL query would go here
      console.log('📍 Updating threat data for current location');
      
      // For now, simulate threat data update
      await this.simulateThreatDataUpdate();
      
    } catch (error) {
      console.error('Failed to update threat data:', error);
    }
  }

  private async simulateThreatDataUpdate(): Promise<void> {
    // This would be replaced with actual API call
    const mockThreat: LocationThreat = {
      id: 'threat_' + Date.now(),
      type: 'suspicious_network',
      severity: 'medium',
      location: {
        latitude: this.currentLocation!.coords.latitude + (Math.random() - 0.5) * 0.01,
        longitude: this.currentLocation!.coords.longitude + (Math.random() - 0.5) * 0.01,
        radius: 500,
        address: '123 Security Blvd'
      },
      description: 'Suspicious network activity detected',
      firstSeen: Date.now() - 24 * 60 * 60 * 1000,
      lastSeen: Date.now(),
      indicators: [
        {
          type: 'ip',
          value: '192.168.1.100',
          confidence: 0.8,
          source: 'honeypot'
        }
      ],
      riskScore: 65,
      isActive: true
    };

    this.locationThreats.push(mockThreat);
    await this.saveLocationThreats();
  }

  // Utility Methods
  private async updateCurrentLocation(): Promise<void> {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: this.getLocationAccuracy(),
      });
      this.currentLocation = location;
    } catch (error) {
      console.error('Failed to get current location:', error);
    }
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  private generateId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Threat Zone Management
  async addThreatZone(zone: Omit<ThreatZone, 'id'>): Promise<string> {
    const newZone: ThreatZone = {
      ...zone,
      id: `zone_${Date.now()}`
    };

    this.threatZones.push(newZone);
    await this.saveThreatZones();
    
    return newZone.id;
  }

  async updateThreatZoneStatus(location: Location.LocationObject): Promise<void> {
    for (const zone of this.threatZones) {
      if (!zone.monitoringEnabled) continue;
      
      const distance = this.calculateDistance(
        location.coords.latitude,
        location.coords.longitude,
        zone.location.latitude,
        zone.location.longitude
      );
      
      if (distance <= zone.alertRadius) {
        // User is in threat zone
        await this.handleThreatZoneEntry(location, zone);
      }
    }
  }

  private async handleThreatZoneEntry(location: Location.LocationObject, zone: ThreatZone): Promise<void> {
    // Check for recent zone alerts
    const recentZoneAlert = this.locationAlerts.find(alert =>
      alert.userLocation.coords.latitude === location.coords.latitude &&
      alert.userLocation.coords.longitude === location.coords.longitude &&
      (Date.now() - alert.timestamp) < 60 * 60 * 1000 // 1 hour
    );

    if (recentZoneAlert) return;

    await NotificationService.showNotification({
      title: '⚠️ Threat Zone Entry',
      message: `You have entered ${zone.name} (${zone.threatLevel} threat level)`,
      type: 'warning',
      priority: zone.threatLevel === 'critical' ? 'critical' : 'high',
      data: {
        zoneId: zone.id,
        zoneName: zone.name,
        threatLevel: zone.threatLevel
      }
    });
  }

  // Scheduling
  private startThreatDataUpdates(): void {
    this.stopThreatDataUpdates();
    
    // Update threat data every 15 minutes
    this.threatUpdateInterval = setInterval(async () => {
      await this.updateThreatData();
    }, 15 * 60 * 1000);
  }

  private stopThreatDataUpdates(): void {
    if (this.threatUpdateInterval) {
      clearInterval(this.threatUpdateInterval);
      this.threatUpdateInterval = null;
    }
  }

  // Storage Methods
  private async loadStoredData(): Promise<void> {
    try {
      const [threatsData, alertsData, zonesData, settingsData] = await Promise.all([
        AsyncStorage.getItem(THREAT_DATA_KEY),
        AsyncStorage.getItem(LOCATION_ALERTS_KEY),
        AsyncStorage.getItem(THREAT_ZONES_KEY),
        AsyncStorage.getItem(SETTINGS_KEY)
      ]);

      if (threatsData) {
        this.locationThreats = JSON.parse(threatsData);
      }

      if (alertsData) {
        this.locationAlerts = JSON.parse(alertsData);
      }

      if (zonesData) {
        this.threatZones = JSON.parse(zonesData);
      }

      if (settingsData) {
        this.settings = { ...this.settings, ...JSON.parse(settingsData) };
      }

    } catch (error) {
      console.error('Failed to load location threat data:', error);
    }
  }

  private async saveLocationThreats(): Promise<void> {
    try {
      await AsyncStorage.setItem(THREAT_DATA_KEY, JSON.stringify(this.locationThreats));
    } catch (error) {
      console.error('Failed to save location threats:', error);
    }
  }

  private async saveLocationAlerts(): Promise<void> {
    try {
      await AsyncStorage.setItem(LOCATION_ALERTS_KEY, JSON.stringify(this.locationAlerts));
    } catch (error) {
      console.error('Failed to save location alerts:', error);
    }
  }

  private async saveThreatZones(): Promise<void> {
    try {
      await AsyncStorage.setItem(THREAT_ZONES_KEY, JSON.stringify(this.threatZones));
    } catch (error) {
      console.error('Failed to save threat zones:', error);
    }
  }

  private async saveSettings(): Promise<void> {
    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
    } catch (error) {
      console.error('Failed to save location threat settings:', error);
    }
  }

  // Logging
  private logLocationUpdate(location: Location.LocationObject): void {
    console.log(`📍 Location updated: ${location.coords.latitude}, ${location.coords.longitude}`);
  }

  private logThreatProximity(alert: LocationAlert, threat: LocationThreat): void {
    console.log(`⚠️ Threat proximity alert: ${threat.type} at ${alert.distance}m`);
  }

  // Public API
  async updateSettings(newSettings: Partial<LocationThreatSettings>): Promise<void> {
    const oldSettings = { ...this.settings };
    this.settings = { ...this.settings, ...newSettings };
    await this.saveSettings();

    // Restart monitoring if enabled status changed
    if (oldSettings.enabled !== this.settings.enabled) {
      if (this.settings.enabled) {
        await this.startLocationMonitoring();
      } else {
        await this.stopLocationMonitoring();
      }
    }
  }

  getSettings(): LocationThreatSettings {
    return { ...this.settings };
  }

  getCurrentLocation(): Location.LocationObject | null {
    return this.currentLocation;
  }

  getLocationThreats(activeOnly: boolean = true): LocationThreat[] {
    if (activeOnly) {
      return this.locationThreats.filter(threat => threat.isActive);
    }
    return [...this.locationThreats];
  }

  getLocationAlerts(acknowledgedOnly: boolean = false): LocationAlert[] {
    if (acknowledgedOnly) {
      return this.locationAlerts.filter(alert => !alert.acknowledged);
    }
    return [...this.locationAlerts];
  }

  async acknowledgeAlert(alertId: string, actionTaken?: string): Promise<void> {
    const alert = this.locationAlerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      if (actionTaken) {
        alert.actionTaken = actionTaken;
      }
      await this.saveLocationAlerts();
      this.notifyAlertListeners();
    }
  }

  getThreatZones(): ThreatZone[] {
    return [...this.threatZones];
  }

  // Event Listeners
  addAlertListener(listener: (alerts: LocationAlert[]) => void): void {
    this.listeners.push(listener);
  }

  removeAlertListener(listener: (alerts: LocationAlert[]) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  private notifyAlertListeners(): void {
    const unacknowledgedAlerts = this.getLocationAlerts(true);
    this.listeners.forEach(listener => {
      try {
        listener(unacknowledgedAlerts);
      } catch (error) {
        console.error('Alert listener error:', error);
      }
    });
  }

  // Cleanup
  async cleanup(): Promise<void> {
    await this.stopLocationMonitoring();
    this.stopThreatDataUpdates();
    this.listeners = [];
  }
}

export const LocationThreatService = LocationThreatServiceClass.getInstance();
export default LocationThreatService;
export type { LocationThreat, LocationAlert, ThreatZone, ThreatIndicator, LocationThreatSettings };