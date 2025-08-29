import Geolocation from 'react-native-geolocation-service';
import { Platform, PermissionsAndroid, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocationData, ThreatAssessment } from '../types';
import { SecurityService } from './security';

class LocationThreatService {
  private static instance: LocationThreatService;
  private currentLocation: LocationData | null = null;
  private isMonitoring = false;
  private locationHistory: LocationData[] = [];
  private maxHistoryEntries = 100;
  private watchId: number | null = null;

  // Known threat locations (in a real app, this would come from a threat intelligence API)
  private knownThreatAreas = [
    {
      name: 'High Crime Area Example',
      latitude: 40.7589,
      longitude: -73.9851,
      radius: 1000, // meters
      threat_level: 'HIGH' as const,
    },
  ];

  private constructor() {}

  static getInstance(): LocationThreatService {
    if (!LocationThreatService.instance) {
      LocationThreatService.instance = new LocationThreatService();
    }
    return LocationThreatService.instance;
  }

  async initialize(): Promise<void> {
    try {
      // Load location history
      const storedHistory = await AsyncStorage.getItem('@location_history');
      if (storedHistory) {
        this.locationHistory = JSON.parse(storedHistory);
      }

      // Request location permissions
      const hasPermission = await this.requestLocationPermission();
      if (hasPermission) {
        // Get current location
        await this.getCurrentLocation();
        
        // Start monitoring if enabled
        const monitoringEnabled = await AsyncStorage.getItem('@location_monitoring');
        if (monitoringEnabled === 'true') {
          await this.startMonitoring();
        }
      }

      console.log('Location threat service initialized');
    } catch (error) {
      console.error('Failed to initialize location threat service:', error);
    }
  }

  async requestLocationPermission(): Promise<boolean> {
    try {
      if (Platform.OS === 'ios') {
        const result = await Geolocation.requestAuthorization('whenInUse');
        return result === 'granted';
      } else {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'This app needs access to location for security features.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return false;
    }
  }

  async getCurrentLocation(): Promise<LocationData | null> {
    return new Promise((resolve) => {
      Geolocation.getCurrentPosition(
        (position) => {
          const location: LocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date(),
          };

          this.currentLocation = location;
          this.addToHistory(location);
          resolve(location);
        },
        (error) => {
          console.error('Error getting current location:', error);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000,
        }
      );
    });
  }

  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) return;

    const hasPermission = await this.requestLocationPermission();
    if (!hasPermission) {
      Alert.alert(
        'Location Permission Required',
        'Location monitoring requires location permission for security features.'
      );
      return;
    }

    this.watchId = Geolocation.watchPosition(
      (position) => {
        const location: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date(),
        };

        this.currentLocation = location;
        this.addToHistory(location);
        this.assessCurrentLocationThreat(location);
      },
      (error) => {
        console.error('Error watching location:', error);
      },
      {
        enableHighAccuracy: true,
        distanceFilter: 100, // Update every 100 meters
        interval: 300000, // Update every 5 minutes
        fastestInterval: 60000, // At most every minute
      }
    );

    this.isMonitoring = true;
    await AsyncStorage.setItem('@location_monitoring', 'true');
    
    await SecurityService.logEvent({
      type: 'LOCATION_THREAT',
      severity: 'LOW',
      description: 'Location monitoring started',
      metadata: { timestamp: new Date().toISOString() },
    });

    console.log('Location monitoring started');
  }

  async stopMonitoring(): Promise<void> {
    if (this.watchId !== null) {
      Geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    this.isMonitoring = false;
    await AsyncStorage.setItem('@location_monitoring', 'false');
    
    await SecurityService.logEvent({
      type: 'LOCATION_THREAT',
      severity: 'LOW',
      description: 'Location monitoring stopped',
      metadata: { timestamp: new Date().toISOString() },
    });

    console.log('Location monitoring stopped');
  }

  async assessCurrentLocationThreat(location?: LocationData): Promise<ThreatAssessment> {
    const currentLoc = location || this.currentLocation;
    
    if (!currentLoc) {
      return {
        level: 'MEDIUM',
        factors: ['Location unavailable'],
        recommendations: ['Enable location services for better security'],
        location: {
          latitude: 0,
          longitude: 0,
          accuracy: 0,
          timestamp: new Date(),
        },
        timestamp: new Date(),
      };
    }

    const factors: string[] = [];
    let level: ThreatAssessment['level'] = 'LOW';
    const recommendations: string[] = [];

    // Check against known threat areas
    for (const threatArea of this.knownThreatAreas) {
      const distance = this.calculateDistance(
        currentLoc.latitude,
        currentLoc.longitude,
        threatArea.latitude,
        threatArea.longitude
      );

      if (distance <= threatArea.radius) {
        factors.push(`Location near ${threatArea.name}`);
        if (threatArea.threat_level === 'HIGH') {
          level = 'HIGH';
          recommendations.push('Exercise caution in this area');
        } else if (threatArea.threat_level === 'MEDIUM' && level === 'LOW') {
          level = 'MEDIUM';
          recommendations.push('Stay alert in this area');
        }
      }
    }

    // Check for unusual location patterns
    const recentLocations = this.locationHistory.slice(-10);
    if (recentLocations.length >= 5) {
      const distances = recentLocations.slice(1).map((loc, index) => 
        this.calculateDistance(
          recentLocations[index].latitude,
          recentLocations[index].longitude,
          loc.latitude,
          loc.longitude
        )
      );

      const averageDistance = distances.reduce((sum, dist) => sum + dist, 0) / distances.length;
      
      if (averageDistance > 50000) { // >50km average movement
        factors.push('Unusual location movement pattern');
        if (level === 'LOW') level = 'MEDIUM';
        recommendations.push('Verify your location changes are intentional');
      }
    }

    // Check location accuracy
    if (currentLoc.accuracy > 1000) {
      factors.push('Low location accuracy');
      recommendations.push('Move to an area with better GPS signal for more accurate location');
    }

    // Check for rapid location changes (possible spoofing)
    if (this.locationHistory.length >= 2) {
      const lastLocation = this.locationHistory[this.locationHistory.length - 2];
      const timeDiff = currentLoc.timestamp.getTime() - lastLocation.timestamp.getTime();
      const distance = this.calculateDistance(
        lastLocation.latitude,
        lastLocation.longitude,
        currentLoc.latitude,
        currentLoc.longitude
      );

      const speed = distance / (timeDiff / 1000 / 3600); // km/h
      
      if (speed > 1000) { // >1000 km/h (impossible speed)
        factors.push('Suspicious location change speed');
        level = 'HIGH';
        recommendations.push('Location may be spoofed - verify app security');
      }
    }

    const assessment: ThreatAssessment = {
      level,
      factors,
      recommendations,
      location: currentLoc,
      timestamp: new Date(),
    };

    // Log threat assessment
    await SecurityService.logEvent({
      type: 'LOCATION_THREAT',
      severity: level === 'HIGH' ? 'HIGH' : level === 'MEDIUM' ? 'MEDIUM' : 'LOW',
      description: `Location threat assessment: ${level}`,
      metadata: {
        latitude: currentLoc.latitude,
        longitude: currentLoc.longitude,
        factors: factors.length,
        recommendations: recommendations.length,
      },
    });

    return assessment;
  }

  private addToHistory(location: LocationData): void {
    this.locationHistory.push(location);
    
    // Maintain history limit
    if (this.locationHistory.length > this.maxHistoryEntries) {
      this.locationHistory = this.locationHistory.slice(-this.maxHistoryEntries);
    }

    // Save to storage periodically
    if (this.locationHistory.length % 5 === 0) {
      this.saveLocationHistory();
    }
  }

  private async saveLocationHistory(): Promise<void> {
    try {
      await AsyncStorage.setItem('@location_history', JSON.stringify(this.locationHistory));
    } catch (error) {
      console.error('Failed to save location history:', error);
    }
  }

  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  // Public methods
  getCurrentLocationData(): LocationData | null {
    return this.currentLocation;
  }

  getLocationHistory(): LocationData[] {
    return [...this.locationHistory];
  }

  isLocationMonitoring(): boolean {
    return this.isMonitoring;
  }

  async clearLocationHistory(): Promise<void> {
    this.locationHistory = [];
    await AsyncStorage.removeItem('@location_history');
    
    await SecurityService.logEvent({
      type: 'LOCATION_THREAT',
      severity: 'MEDIUM',
      description: 'Location history cleared',
      metadata: { timestamp: new Date().toISOString() },
    });
  }

  // Static methods for convenience
  static async initialize(): Promise<void> {
    return LocationThreatService.getInstance().initialize();
  }

  static async getCurrentLocation(): Promise<LocationData | null> {
    return LocationThreatService.getInstance().getCurrentLocation();
  }

  static async assessCurrentLocationThreat(location?: LocationData): Promise<ThreatAssessment> {
    return LocationThreatService.getInstance().assessCurrentLocationThreat(location);
  }

  static async startMonitoring(): Promise<void> {
    return LocationThreatService.getInstance().startMonitoring();
  }

  static async stopMonitoring(): Promise<void> {
    return LocationThreatService.getInstance().stopMonitoring();
  }
}

// Export singleton instance
export { LocationThreatService };