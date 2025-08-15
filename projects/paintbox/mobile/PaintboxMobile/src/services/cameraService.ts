import { 
  Camera, 
  CameraDevice,
  useCameraPermission, 
  PhotoFile,
  TakePhotoOptions,
} from 'react-native-vision-camera';
import { PermissionsAndroid, Platform } from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import { offlineSyncService } from './offlineSync';
import { PhotoCategory, PhotoUploadInput, Coordinates } from '../types/graphql';
import RNFS from 'react-native-fs';

// Types
interface CameraPermissions {
  camera: boolean;
  microphone: boolean;
  location: boolean;
}

interface PhotoMetadata {
  location?: Coordinates;
  timestamp: number;
  category: PhotoCategory;
  tags?: string[];
  description?: string;
  deviceInfo: {
    model: string;
    platform: string;
    appVersion: string;
  };
}

interface CapturePhotoResult {
  uri: string;
  metadata: PhotoMetadata;
  tempPath: string;
}

class CameraService {
  private static instance: CameraService | null = null;
  private currentLocation: Coordinates | null = null;
  private locationWatchId: number | null = null;

  static getInstance(): CameraService {
    if (!CameraService.instance) {
      CameraService.instance = new CameraService();
    }
    return CameraService.instance;
  }

  // Permission handling
  async requestPermissions(): Promise<CameraPermissions> {
    const permissions: CameraPermissions = {
      camera: false,
      microphone: false,
      location: false,
    };

    try {
      if (Platform.OS === 'android') {
        // Android permissions
        const cameraPermission = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'Paintbox needs camera access to take photos of projects',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );

        const locationPermission = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'Paintbox needs location access to tag photos with project locations',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );

        permissions.camera = cameraPermission === PermissionsAndroid.RESULTS.GRANTED;
        permissions.location = locationPermission === PermissionsAndroid.RESULTS.GRANTED;
        permissions.microphone = true; // Not needed for photos
      } else {
        // iOS permissions handled by react-native-vision-camera
        const { hasPermission, requestPermission } = useCameraPermission();
        
        if (!hasPermission) {
          const granted = await requestPermission();
          permissions.camera = granted;
        } else {
          permissions.camera = true;
        }

        // Location permission for iOS
        const locationAuth = await new Promise<string>((resolve) => {
          Geolocation.requestAuthorization(resolve);
        });
        
        permissions.location = locationAuth === 'granted' || locationAuth === 'whenInUse';
        permissions.microphone = true;
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
    }

    return permissions;
  }

  // Location tracking
  async startLocationTracking(): Promise<void> {
    try {
      const hasLocationPermission = await this.checkLocationPermission();
      
      if (!hasLocationPermission) {
        console.warn('Location permission not granted');
        return;
      }

      this.locationWatchId = Geolocation.watchPosition(
        (position) => {
          this.currentLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
        },
        (error) => {
          console.error('Location error:', error);
        },
        {
          enableHighAccuracy: true,
          distanceFilter: 10, // Update every 10 meters
          interval: 30000, // Update every 30 seconds
          fastestInterval: 10000, // Fastest update every 10 seconds
        }
      );
    } catch (error) {
      console.error('Failed to start location tracking:', error);
    }
  }

  stopLocationTracking(): void {
    if (this.locationWatchId !== null) {
      Geolocation.clearWatch(this.locationWatchId);
      this.locationWatchId = null;
    }
  }

  private async checkLocationPermission(): Promise<boolean> {
    if (Platform.OS === 'android') {
      const permission = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      return permission;
    }
    
    // For iOS, assume permission if we got here
    return true;
  }

  // Photo capture
  async capturePhoto(
    camera: Camera,
    options: {
      category: PhotoCategory;
      tags?: string[];
      description?: string;
      flash?: 'on' | 'off' | 'auto';
      quality?: number;
    }
  ): Promise<CapturePhotoResult | null> {
    try {
      const { category, tags, description, flash = 'auto', quality = 90 } = options;

      const photoOptions: TakePhotoOptions = {
        flash: flash,
        qualityPrioritization: 'quality',
        enableShutterSound: false,
      };

      // Take the photo
      const photo: PhotoFile = await camera.takePhoto(photoOptions);
      
      // Create metadata
      const metadata: PhotoMetadata = {
        location: this.currentLocation || undefined,
        timestamp: Date.now(),
        category,
        tags,
        description,
        deviceInfo: {
          model: Platform.constants.Model || 'Unknown',
          platform: Platform.OS,
          appVersion: '1.0.0', // Could be read from package.json
        },
      };

      return {
        uri: `file://${photo.path}`,
        metadata,
        tempPath: photo.path,
      };
    } catch (error) {
      console.error('Failed to capture photo:', error);
      return null;
    }
  }

  // Photo processing and upload queuing
  async processAndQueuePhoto(
    projectId: string,
    captureResult: CapturePhotoResult
  ): Promise<string | null> {
    try {
      // Create a permanent file path
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `paintbox_${projectId}_${timestamp}.jpg`;
      const permanentPath = `${RNFS.DocumentDirectoryPath}/photos/${fileName}`;
      
      // Ensure photos directory exists
      const photosDir = `${RNFS.DocumentDirectoryPath}/photos`;
      if (!(await RNFS.exists(photosDir))) {
        await RNFS.mkdir(photosDir);
      }

      // Copy from temp to permanent location
      await RNFS.copyFile(captureResult.tempPath, permanentPath);

      // Create upload input
      const uploadInput: PhotoUploadInput = {
        category: captureResult.metadata.category,
        description: captureResult.metadata.description,
        tags: captureResult.metadata.tags || [],
        coordinates: captureResult.metadata.location ? {
          latitude: captureResult.metadata.location.latitude,
          longitude: captureResult.metadata.location.longitude,
        } : undefined,
      };

      // Queue for upload when online
      const queueId = await offlineSyncService.queuePhotoUpload(
        projectId,
        permanentPath,
        {
          ...uploadInput,
          originalMetadata: captureResult.metadata,
        }
      );

      // Clean up temp file
      try {
        await RNFS.unlink(captureResult.tempPath);
      } catch (cleanupError) {
        console.warn('Failed to clean up temp file:', cleanupError);
      }

      return queueId;
    } catch (error) {
      console.error('Failed to process photo:', error);
      return null;
    }
  }

  // Company Cam integration
  async uploadToCompanyCam(
    photoPath: string,
    companyCamId: string,
    tags: string[] = []
  ): Promise<boolean> {
    // This would integrate with Company Cam API
    // For now, we'll simulate the upload
    
    try {
      console.log(`Uploading to Company Cam project ${companyCamId}:`, photoPath);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In real implementation:
      // 1. Create FormData with photo file
      // 2. Add Company Cam metadata
      // 3. POST to Company Cam API
      // 4. Handle response and extract photo ID
      
      console.log('Company Cam upload successful');
      return true;
    } catch (error) {
      console.error('Company Cam upload failed:', error);
      return false;
    }
  }

  // WW Tag management for Company Cam
  getWWTagMappings(): Record<string, string> {
    return {
      'WW1': 'Front Exterior',
      'WW2': 'Back Exterior',
      'WW3': 'Left Side Exterior',
      'WW4': 'Right Side Exterior',
      'WW5': 'Entry Door',
      'WW6': 'Garage Door',
      'WW7': 'Windows - Front',
      'WW8': 'Windows - Back',
      'WW9': 'Windows - Left',
      'WW10': 'Windows - Right',
      'WW11': 'Living Room',
      'WW12': 'Kitchen',
      'WW13': 'Master Bedroom',
      'WW14': 'Bedroom 2',
      'WW15': 'Bedroom 3',
      'WW16': 'Master Bathroom',
      'WW17': 'Bathroom 2',
      'WW18': 'Hallway',
      'WW19': 'Dining Room',
      'WW20': 'Family Room',
      'WW21': 'Office/Study',
      'WW22': 'Laundry Room',
      'WW23': 'Basement',
      'WW24': 'Attic',
      'WW25': 'Garage Interior',
      'WW26': 'Trim - Exterior',
      'WW27': 'Trim - Interior',
      'WW28': 'Cabinets',
      'WW29': 'Ceiling',
      'WW30': 'Other/Misc',
    };
  }

  // Device camera capabilities
  async getCameraCapabilities(device: CameraDevice) {
    return {
      hasFlash: device.hasFlash,
      hasTorch: device.hasTorch,
      supportsFocus: device.supportsFocus,
      supportsZoom: device.supportsZoom,
      minZoom: device.minZoom,
      maxZoom: device.maxZoom,
      formats: device.formats.map(format => ({
        videoWidth: format.videoWidth,
        videoHeight: format.videoHeight,
        maxFps: format.maxFps,
        supportsPhotoHDR: format.supportsPhotoHDR,
      })),
    };
  }

  // Cleanup
  destroy(): void {
    this.stopLocationTracking();
  }

  // Current location getter
  getCurrentLocation(): Coordinates | null {
    return this.currentLocation;
  }

  // Get saved photos for offline viewing
  async getSavedPhotos(): Promise<string[]> {
    try {
      const photosDir = `${RNFS.DocumentDirectoryPath}/photos`;
      
      if (!(await RNFS.exists(photosDir))) {
        return [];
      }

      const files = await RNFS.readDir(photosDir);
      return files
        .filter(file => file.isFile() && file.name.endsWith('.jpg'))
        .map(file => file.path)
        .sort((a, b) => b.localeCompare(a)); // Newest first
    } catch (error) {
      console.error('Failed to get saved photos:', error);
      return [];
    }
  }

  // Delete local photo
  async deletePhoto(photoPath: string): Promise<boolean> {
    try {
      await RNFS.unlink(photoPath);
      return true;
    } catch (error) {
      console.error('Failed to delete photo:', error);
      return false;
    }
  }
}

// Export singleton instance
export const cameraService = CameraService.getInstance();
export default cameraService;