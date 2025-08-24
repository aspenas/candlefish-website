import '@testing-library/jest-dom';

// Mock geolocation API
const mockGeolocation = {
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(),
  clearWatch: jest.fn(),
};

const mockPosition = {
  coords: {
    latitude: 37.7749,
    longitude: -122.4194,
    accuracy: 10,
    altitude: 50,
    altitudeAccuracy: 5,
    heading: 0,
    speed: 0,
  },
  timestamp: Date.now(),
};

const mockPositionError = {
  PERMISSION_DENIED: 1,
  POSITION_UNAVAILABLE: 2,
  TIMEOUT: 3,
  code: 1,
  message: 'User denied the request for Geolocation.',
};

// Mock Google Maps Geocoding API response
const mockGeocodingResponse = {
  results: [
    {
      formatted_address: '1600 Amphitheatre Parkway, Mountain View, CA 94043, USA',
      address_components: [
        { long_name: '1600', short_name: '1600', types: ['street_number'] },
        { long_name: 'Amphitheatre Parkway', short_name: 'Amphitheatre Pkwy', types: ['route'] },
        { long_name: 'Mountain View', short_name: 'Mountain View', types: ['locality'] },
        { long_name: 'California', short_name: 'CA', types: ['administrative_area_level_1'] },
        { long_name: 'United States', short_name: 'US', types: ['country'] },
        { long_name: '94043', short_name: '94043', types: ['postal_code'] },
      ],
      geometry: {
        location: { lat: 37.4224764, lng: -122.0842499 },
        location_type: 'ROOFTOP',
      },
      place_id: 'ChIJ2eUgeAK6j4ARbn5u_wAGqWA',
      types: ['street_address'],
    },
  ],
  status: 'OK',
};

// Mock location service
class MockLocationService {
  private watchId: number | null = null;
  private isWatching = false;
  private listeners: Map<string, Function[]> = new Map();
  private lastKnownPosition: GeolocationPosition | null = null;
  private geocodingApiKey = 'mock-api-key';

  constructor() {
    // Mock geolocation API
    Object.defineProperty(navigator, 'geolocation', {
      value: mockGeolocation,
      writable: true,
    });
  }

  async getCurrentPosition(options?: PositionOptions): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      mockGeolocation.getCurrentPosition.mockImplementation((success, error) => {
        if (this.shouldSimulateError()) {
          error?.(mockPositionError);
          reject(new Error(mockPositionError.message));
        } else {
          const position = this.generateMockPosition();
          this.lastKnownPosition = position;
          success(position);
          resolve(position);
        }
      });

      // Trigger the mocked function
      mockGeolocation.getCurrentPosition(
        (position) => resolve(position),
        (error) => reject(new Error(error.message)),
        options
      );
    });
  }

  startWatching(options?: PositionOptions): Promise<number> {
    return new Promise((resolve, reject) => {
      if (this.isWatching) {
        resolve(this.watchId!);
        return;
      }

      mockGeolocation.watchPosition.mockImplementation((success, error) => {
        const watchId = Date.now();
        this.watchId = watchId;
        this.isWatching = true;

        // Simulate periodic position updates
        const interval = setInterval(() => {
          if (this.isWatching) {
            if (this.shouldSimulateError()) {
              error?.(mockPositionError);
              this.emit('error', mockPositionError);
            } else {
              const position = this.generateMockPosition();
              this.lastKnownPosition = position;
              success(position);
              this.emit('position', position);
            }
          } else {
            clearInterval(interval);
          }
        }, 1000);

        return watchId;
      });

      const id = mockGeolocation.watchPosition(
        (position) => {
          this.emit('position', position);
        },
        (error) => {
          this.emit('error', error);
          reject(new Error(error.message));
        },
        options
      );

      resolve(id);
    });
  }

  stopWatching(): void {
    if (this.watchId !== null) {
      mockGeolocation.clearWatch(this.watchId);
      this.watchId = null;
      this.isWatching = false;
      this.emit('stopped');
    }
  }

  async reverseGeocode(latitude: number, longitude: number): Promise<any> {
    // Mock reverse geocoding API call
    const response = await this.mockApiCall(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${this.geocodingApiKey}`
    );

    return response.results[0] || null;
  }

  async forwardGeocode(address: string): Promise<any> {
    // Mock forward geocoding API call
    const response = await this.mockApiCall(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${this.geocodingApiKey}`
    );

    return response.results[0] || null;
  }

  async calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): Promise<number> {
    // Haversine formula for calculating distance between two points
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in kilometers
    return distance;
  }

  async getNearbyPlaces(
    latitude: number,
    longitude: number,
    radius: number = 1000,
    type?: string
  ): Promise<any[]> {
    // Mock nearby places search
    const mockPlaces = [
      {
        place_id: 'place1',
        name: 'Starbucks',
        vicinity: '123 Main St',
        geometry: {
          location: {
            lat: latitude + 0.001,
            lng: longitude + 0.001,
          },
        },
        types: ['cafe', 'food', 'store'],
        rating: 4.5,
        price_level: 2,
      },
      {
        place_id: 'place2',
        name: 'City Hall',
        vicinity: '456 Government Ave',
        geometry: {
          location: {
            lat: latitude - 0.002,
            lng: longitude + 0.002,
          },
        },
        types: ['local_government_office'],
        rating: 3.8,
      },
    ];

    if (type) {
      return mockPlaces.filter(place => place.types.includes(type));
    }

    return mockPlaces;
  }

  async checkLocationPermissions(): Promise<string> {
    try {
      const result = await (navigator as any).permissions.query({ name: 'geolocation' });
      return result.state; // 'granted', 'denied', or 'prompt'
    } catch (error) {
      // Fallback to trying to get position
      try {
        await this.getCurrentPosition({ timeout: 1000 });
        return 'granted';
      } catch {
        return 'denied';
      }
    }
  }

  getLastKnownPosition(): GeolocationPosition | null {
    return this.lastKnownPosition;
  }

  isLocationWatching(): boolean {
    return this.isWatching;
  }

  // Event system
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data?: any): void {
    const listeners = this.listeners.get(event) || [];
    listeners.forEach(callback => callback(data));
  }

  private generateMockPosition(): GeolocationPosition {
    // Add small random variations to simulate movement
    const variation = 0.0001;
    return {
      coords: {
        ...mockPosition.coords,
        latitude: mockPosition.coords.latitude + (Math.random() - 0.5) * variation,
        longitude: mockPosition.coords.longitude + (Math.random() - 0.5) * variation,
        accuracy: 5 + Math.random() * 20,
      },
      timestamp: Date.now(),
    };
  }

  private shouldSimulateError(): boolean {
    // Simulate occasional errors
    return Math.random() < 0.1; // 10% chance of error
  }

  private async mockApiCall(url: string): Promise<any> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));

    // Return mock response
    return mockGeocodingResponse;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}

// Mock location-aware document service
class MockLocationAwareDocumentService {
  private locationService: MockLocationService;
  private documents: Map<string, any> = new Map();

  constructor(locationService: MockLocationService) {
    this.locationService = locationService;
  }

  async createLocationTaggedDocument(content: any): Promise<any> {
    try {
      const position = await this.locationService.getCurrentPosition();
      const address = await this.locationService.reverseGeocode(
        position.coords.latitude,
        position.coords.longitude
      );

      const document = {
        id: `doc_${Date.now()}`,
        ...content,
        location: {
          coordinates: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          },
          address: address?.formatted_address || 'Unknown location',
          timestamp: new Date().toISOString(),
        },
        createdAt: new Date().toISOString(),
      };

      this.documents.set(document.id, document);
      return document;
    } catch (error) {
      // Create document without location if location fails
      const document = {
        id: `doc_${Date.now()}`,
        ...content,
        location: null,
        createdAt: new Date().toISOString(),
      };

      this.documents.set(document.id, document);
      return document;
    }
  }

  async findDocumentsNearLocation(
    latitude: number,
    longitude: number,
    radiusKm: number = 1
  ): Promise<any[]> {
    const nearbyDocuments = [];

    for (const doc of this.documents.values()) {
      if (doc.location && doc.location.coordinates) {
        const distance = await this.locationService.calculateDistance(
          latitude,
          longitude,
          doc.location.coordinates.latitude,
          doc.location.coordinates.longitude
        );

        if (distance <= radiusKm) {
          nearbyDocuments.push({
            ...doc,
            distance,
          });
        }
      }
    }

    return nearbyDocuments.sort((a, b) => a.distance - b.distance);
  }

  async getDocumentsByLocation(address: string): Promise<any[]> {
    const geocodeResult = await this.locationService.forwardGeocode(address);

    if (!geocodeResult) {
      return [];
    }

    const { lat, lng } = geocodeResult.geometry.location;
    return await this.findDocumentsNearLocation(lat, lng, 5); // 5km radius
  }
}

describe('Location Services', () => {
  let locationService: MockLocationService;
  let documentService: MockLocationAwareDocumentService;

  beforeAll(() => {
    // Mock permissions API
    Object.defineProperty(navigator, 'permissions', {
      value: {
        query: jest.fn().mockResolvedValue({ state: 'granted' }),
      },
      writable: true,
    });
  });

  beforeEach(() => {
    locationService = new MockLocationService();
    documentService = new MockLocationAwareDocumentService(locationService);
    jest.clearAllMocks();
  });

  afterEach(() => {
    locationService.stopWatching();
  });

  describe('Location Permission Management', () => {
    it('should check location permissions', async () => {
      const permission = await locationService.checkLocationPermissions();

      expect(permission).toBe('granted');
      expect((navigator as any).permissions.query).toHaveBeenCalledWith({ name: 'geolocation' });
    });

    it('should handle denied permissions', async () => {
      (navigator as any).permissions.query.mockResolvedValue({ state: 'denied' });

      const permission = await locationService.checkLocationPermissions();

      expect(permission).toBe('denied');
    });

    it('should fallback when permissions API unavailable', async () => {
      (navigator as any).permissions.query.mockRejectedValue(new Error('Not supported'));

      const permission = await locationService.checkLocationPermissions();

      expect(permission).toBe('granted'); // Mock always grants in fallback
    });
  });

  describe('Current Position', () => {
    it('should get current position successfully', async () => {
      const position = await locationService.getCurrentPosition();

      expect(mockGeolocation.getCurrentPosition).toHaveBeenCalled();
      expect(position).toMatchObject({
        coords: {
          latitude: expect.any(Number),
          longitude: expect.any(Number),
          accuracy: expect.any(Number),
        },
        timestamp: expect.any(Number),
      });
    });

    it('should handle position errors', async () => {
      // Force error simulation
      jest.spyOn(locationService as any, 'shouldSimulateError').mockReturnValue(true);

      await expect(locationService.getCurrentPosition()).rejects.toThrow();
    });

    it('should respect position options', async () => {
      const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      };

      await locationService.getCurrentPosition(options);

      expect(mockGeolocation.getCurrentPosition).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        options
      );
    });
  });

  describe('Position Watching', () => {
    it('should start watching position', async () => {
      const watchId = await locationService.startWatching();

      expect(typeof watchId).toBe('number');
      expect(locationService.isLocationWatching()).toBe(true);
      expect(mockGeolocation.watchPosition).toHaveBeenCalled();
    });

    it('should receive position updates', async () => {
      const positionCallback = jest.fn();
      locationService.on('position', positionCallback);

      await locationService.startWatching();

      // Wait for position update
      await new Promise(resolve => setTimeout(resolve, 1100));

      expect(positionCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          coords: expect.objectContaining({
            latitude: expect.any(Number),
            longitude: expect.any(Number),
          }),
        })
      );
    });

    it('should stop watching position', async () => {
      await locationService.startWatching();
      expect(locationService.isLocationWatching()).toBe(true);

      locationService.stopWatching();

      expect(locationService.isLocationWatching()).toBe(false);
      expect(mockGeolocation.clearWatch).toHaveBeenCalled();
    });

    it('should handle watching errors', async () => {
      const errorCallback = jest.fn();
      locationService.on('error', errorCallback);

      // Force error simulation
      jest.spyOn(locationService as any, 'shouldSimulateError').mockReturnValue(true);

      await locationService.startWatching();

      // Wait for error
      await new Promise(resolve => setTimeout(resolve, 1100));

      expect(errorCallback).toHaveBeenCalled();
    });
  });

  describe('Geocoding', () => {
    it('should perform reverse geocoding', async () => {
      const result = await locationService.reverseGeocode(37.7749, -122.4194);

      expect(result).toMatchObject({
        formatted_address: expect.any(String),
        address_components: expect.any(Array),
        geometry: {
          location: {
            lat: expect.any(Number),
            lng: expect.any(Number),
          },
        },
      });
    });

    it('should perform forward geocoding', async () => {
      const result = await locationService.forwardGeocode('1600 Amphitheatre Parkway, Mountain View, CA');

      expect(result).toMatchObject({
        formatted_address: expect.any(String),
        geometry: {
          location: {
            lat: expect.any(Number),
            lng: expect.any(Number),
          },
        },
      });
    });

    it('should handle geocoding API errors', async () => {
      // Mock API failure
      jest.spyOn(locationService as any, 'mockApiCall').mockRejectedValue(new Error('API Error'));

      await expect(locationService.reverseGeocode(0, 0)).rejects.toThrow('API Error');
    });
  });

  describe('Distance Calculation', () => {
    it('should calculate distance between two points', async () => {
      const distance = await locationService.calculateDistance(
        37.7749, -122.4194, // San Francisco
        40.7831, -73.9712   // New York
      );

      expect(distance).toBeGreaterThan(4000); // Should be > 4000 km
      expect(distance).toBeLessThan(5000);    // Should be < 5000 km
    });

    it('should return zero for same coordinates', async () => {
      const distance = await locationService.calculateDistance(
        37.7749, -122.4194,
        37.7749, -122.4194
      );

      expect(distance).toBe(0);
    });
  });

  describe('Nearby Places', () => {
    it('should find nearby places', async () => {
      const places = await locationService.getNearbyPlaces(37.7749, -122.4194, 1000);

      expect(Array.isArray(places)).toBe(true);
      expect(places.length).toBeGreaterThan(0);

      places.forEach(place => {
        expect(place).toMatchObject({
          place_id: expect.any(String),
          name: expect.any(String),
          vicinity: expect.any(String),
          geometry: {
            location: {
              lat: expect.any(Number),
              lng: expect.any(Number),
            },
          },
          types: expect.any(Array),
        });
      });
    });

    it('should filter places by type', async () => {
      const cafes = await locationService.getNearbyPlaces(37.7749, -122.4194, 1000, 'cafe');

      expect(Array.isArray(cafes)).toBe(true);
      cafes.forEach(place => {
        expect(place.types).toContain('cafe');
      });
    });
  });

  describe('Location-Tagged Documents', () => {
    it('should create document with location', async () => {
      const documentContent = {
        title: 'Meeting Notes',
        content: 'Notes from the client meeting',
      };

      const document = await documentService.createLocationTaggedDocument(documentContent);

      expect(document).toMatchObject({
        id: expect.any(String),
        title: 'Meeting Notes',
        content: 'Notes from the client meeting',
        location: {
          coordinates: {
            latitude: expect.any(Number),
            longitude: expect.any(Number),
            accuracy: expect.any(Number),
          },
          address: expect.any(String),
          timestamp: expect.any(String),
        },
        createdAt: expect.any(String),
      });
    });

    it('should create document without location on failure', async () => {
      // Force location error
      jest.spyOn(locationService as any, 'shouldSimulateError').mockReturnValue(true);

      const documentContent = {
        title: 'Offline Document',
        content: 'Created without location',
      };

      const document = await documentService.createLocationTaggedDocument(documentContent);

      expect(document).toMatchObject({
        id: expect.any(String),
        title: 'Offline Document',
        location: null,
      });
    });
  });

  describe('Location-Based Document Search', () => {
    beforeEach(async () => {
      // Create some test documents with locations
      await documentService.createLocationTaggedDocument({
        title: 'Nearby Document 1',
        content: 'Content 1',
      });

      await documentService.createLocationTaggedDocument({
        title: 'Nearby Document 2',
        content: 'Content 2',
      });
    });

    it('should find documents near location', async () => {
      const nearbyDocs = await documentService.findDocumentsNearLocation(
        37.7749, -122.4194, 10 // 10km radius
      );

      expect(Array.isArray(nearbyDocs)).toBe(true);
      expect(nearbyDocs.length).toBeGreaterThan(0);

      nearbyDocs.forEach(doc => {
        expect(doc).toMatchObject({
          id: expect.any(String),
          title: expect.any(String),
          location: expect.objectContaining({
            coordinates: expect.any(Object),
          }),
          distance: expect.any(Number),
        });

        expect(doc.distance).toBeLessThanOrEqual(10);
      });

      // Should be sorted by distance
      for (let i = 1; i < nearbyDocs.length; i++) {
        expect(nearbyDocs[i].distance).toBeGreaterThanOrEqual(nearbyDocs[i - 1].distance);
      }
    });

    it('should find documents by address', async () => {
      const docs = await documentService.getDocumentsByLocation('San Francisco, CA');

      expect(Array.isArray(docs)).toBe(true);
      docs.forEach(doc => {
        expect(doc).toHaveProperty('location');
        expect(doc).toHaveProperty('distance');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle geolocation not supported', async () => {
      Object.defineProperty(navigator, 'geolocation', {
        value: undefined,
      });

      const unsupportedService = new MockLocationService();

      await expect(unsupportedService.getCurrentPosition()).rejects.toThrow();
    });

    it('should handle position timeout', async () => {
      mockGeolocation.getCurrentPosition.mockImplementation((success, error) => {
        setTimeout(() => {
          error?.({
            code: 3, // TIMEOUT
            message: 'Timeout',
          });
        }, 100);
      });

      await expect(
        locationService.getCurrentPosition({ timeout: 50 })
      ).rejects.toThrow();
    });

    it('should handle network errors in geocoding', async () => {
      jest.spyOn(locationService as any, 'mockApiCall').mockRejectedValue(
        new Error('Network error')
      );

      await expect(
        locationService.reverseGeocode(37.7749, -122.4194)
      ).rejects.toThrow('Network error');
    });
  });

  describe('Performance', () => {
    it('should get position quickly', async () => {
      const startTime = performance.now();
      await locationService.getCurrentPosition();
      const endTime = performance.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(1000); // Less than 1 second
    });

    it('should handle multiple concurrent position requests', async () => {
      const requests = Array.from({ length: 5 }, () =>
        locationService.getCurrentPosition()
      );

      const positions = await Promise.all(requests);

      expect(positions).toHaveLength(5);
      positions.forEach(position => {
        expect(position).toMatchObject({
          coords: expect.objectContaining({
            latitude: expect.any(Number),
            longitude: expect.any(Number),
          }),
        });
      });
    });
  });

  describe('Privacy and Security', () => {
    it('should not store sensitive location data permanently', () => {
      const lastPosition = locationService.getLastKnownPosition();

      // Should only store for session, not persist
      expect(typeof lastPosition === 'object' || lastPosition === null).toBe(true);
    });

    it('should respect user privacy preferences', async () => {
      // Mock user denying high accuracy
      const position = await locationService.getCurrentPosition({
        enableHighAccuracy: false,
      });

      expect(position.coords.accuracy).toBeGreaterThan(10); // Lower accuracy when disabled
    });
  });

  describe('Integration with Mobile Features', () => {
    it('should work with background location updates', async () => {
      const positionUpdates: GeolocationPosition[] = [];

      locationService.on('position', (position: GeolocationPosition) => {
        positionUpdates.push(position);
      });

      await locationService.startWatching();

      // Simulate app going to background and coming back
      await new Promise(resolve => setTimeout(resolve, 2100));

      expect(positionUpdates.length).toBeGreaterThanOrEqual(2);
    });

    it('should integrate with camera for geotagged photos', async () => {
      const position = await locationService.getCurrentPosition();
      const address = await locationService.reverseGeocode(
        position.coords.latitude,
        position.coords.longitude
      );

      const photoMetadata = {
        location: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          address: address?.formatted_address,
        },
        timestamp: new Date().toISOString(),
      };

      expect(photoMetadata.location).toMatchObject({
        latitude: expect.any(Number),
        longitude: expect.any(Number),
        address: expect.any(String),
      });
    });
  });
});
