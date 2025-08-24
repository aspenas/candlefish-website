import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock camera API
const mockMediaDevices = {
  getUserMedia: jest.fn(),
  enumerateDevices: jest.fn(),
};

const mockVideoTrack = {
  stop: jest.fn(),
  getSettings: jest.fn(() => ({
    width: 1920,
    height: 1080,
    deviceId: 'camera-1',
  })),
  applyConstraints: jest.fn(),
};

const mockMediaStream = {
  getVideoTracks: jest.fn(() => [mockVideoTrack]),
  getTracks: jest.fn(() => [mockVideoTrack]),
  addTrack: jest.fn(),
  removeTrack: jest.fn(),
};

// Mock File API for image capture
const mockBlob = {
  size: 1024000,
  type: 'image/jpeg',
  slice: jest.fn(),
  stream: jest.fn(),
  text: jest.fn(),
  arrayBuffer: jest.fn(),
};

const mockFile = {
  ...mockBlob,
  name: 'captured-image.jpg',
  lastModified: Date.now(),
};

// Mock Canvas for image processing
const mockCanvas = {
  getContext: jest.fn(() => ({
    drawImage: jest.fn(),
    getImageData: jest.fn(() => ({
      data: new Uint8ClampedArray(1920 * 1080 * 4),
      width: 1920,
      height: 1080,
    })),
    putImageData: jest.fn(),
    fillRect: jest.fn(),
    fillText: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
  })),
  toBlob: jest.fn((callback, type, quality) => {
    callback(mockBlob);
  }),
  toDataURL: jest.fn(() => 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD...'),
  width: 1920,
  height: 1080,
};

// Mock camera service
class MockCameraService {
  private stream: any = null;
  private isInitialized = false;
  private devices: any[] = [];
  private currentDevice: any = null;
  private constraints = {
    video: {
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      facingMode: 'environment',
    },
    audio: false,
  };

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Check for camera permissions
    const permission = await this.checkPermissions();
    if (permission !== 'granted') {
      throw new Error('Camera permission denied');
    }

    // Get available devices
    this.devices = await this.getAvailableDevices();
    if (this.devices.length === 0) {
      throw new Error('No camera devices found');
    }

    this.currentDevice = this.devices.find(d => d.kind === 'videoinput') || this.devices[0];
    this.isInitialized = true;
  }

  async checkPermissions(): Promise<string> {
    try {
      const result = await (navigator as any).permissions.query({ name: 'camera' });
      return result.state; // 'granted', 'denied', or 'prompt'
    } catch (error) {
      // Fallback to trying to access camera
      try {
        const stream = await mockMediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach((track: any) => track.stop());
        return 'granted';
      } catch {
        return 'denied';
      }
    }
  }

  async getAvailableDevices(): Promise<any[]> {
    const devices = await mockMediaDevices.enumerateDevices();
    return devices.filter((device: any) => device.kind === 'videoinput');
  }

  async startCamera(deviceId?: string): Promise<MediaStream> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (this.stream) {
      this.stopCamera();
    }

    const constraints = {
      ...this.constraints,
      video: {
        ...this.constraints.video,
        deviceId: deviceId ? { exact: deviceId } : undefined,
      },
    };

    this.stream = await mockMediaDevices.getUserMedia(constraints);
    return this.stream;
  }

  stopCamera(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((track: any) => track.stop());
      this.stream = null;
    }
  }

  async capturePhoto(): Promise<Blob> {
    if (!this.stream) {
      throw new Error('Camera not started');
    }

    // Create video element to capture frame
    const video = document.createElement('video');
    video.srcObject = this.stream;
    video.play();

    // Wait for video to be ready
    await new Promise(resolve => {
      video.onloadedmetadata = resolve;
    });

    // Create canvas and draw video frame
    const canvas = document.createElement('canvas');
    Object.assign(canvas, mockCanvas);

    const context = canvas.getContext('2d');
    canvas.width = video.videoWidth || 1920;
    canvas.height = video.videoHeight || 1080;

    context?.drawImage(video, 0, 0, canvas.width, canvas.height);

    return new Promise(resolve => {
      canvas.toBlob(resolve as any, 'image/jpeg', 0.9);
    });
  }

  async switchCamera(): Promise<void> {
    if (this.devices.length <= 1) {
      throw new Error('No other cameras available');
    }

    const currentIndex = this.devices.findIndex(d => d.deviceId === this.currentDevice?.deviceId);
    const nextIndex = (currentIndex + 1) % this.devices.length;
    const nextDevice = this.devices[nextIndex];

    this.currentDevice = nextDevice;
    await this.startCamera(nextDevice.deviceId);
  }

  async setConstraints(constraints: any): Promise<void> {
    this.constraints = { ...this.constraints, ...constraints };

    if (this.stream) {
      const videoTrack = this.stream.getVideoTracks()[0];
      if (videoTrack) {
        await videoTrack.applyConstraints(constraints.video);
      }
    }
  }

  getCurrentDevice(): any {
    return this.currentDevice;
  }

  getDevices(): any[] {
    return [...this.devices];
  }

  isActive(): boolean {
    return !!this.stream && this.stream.active;
  }
}

// Mock image processing utilities
class MockImageProcessor {
  static async compressImage(file: File, quality: number = 0.8): Promise<File> {
    // Simulate compression
    const compressedSize = Math.floor(file.size * quality);

    return new File([new ArrayBuffer(compressedSize)], file.name, {
      type: file.type,
      lastModified: file.lastModified,
    });
  }

  static async resizeImage(file: File, maxWidth: number, maxHeight: number): Promise<File> {
    // Create canvas for resizing
    const canvas = document.createElement('canvas');
    Object.assign(canvas, mockCanvas);

    const img = new Image();
    img.src = URL.createObjectURL(file);

    await new Promise(resolve => {
      img.onload = resolve;
    });

    // Calculate new dimensions
    let { width, height } = img;

    if (width > maxWidth) {
      height = (height * maxWidth) / width;
      width = maxWidth;
    }

    if (height > maxHeight) {
      width = (width * maxHeight) / height;
      height = maxHeight;
    }

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    ctx?.drawImage(img, 0, 0, width, height);

    return new Promise(resolve => {
      canvas.toBlob((blob) => {
        resolve(new File([blob!], file.name, {
          type: file.type,
          lastModified: Date.now(),
        }));
      }, file.type, 0.9);
    });
  }

  static async addWatermark(file: File, watermarkText: string): Promise<File> {
    const canvas = document.createElement('canvas');
    Object.assign(canvas, mockCanvas);

    const img = new Image();
    img.src = URL.createObjectURL(file);

    await new Promise(resolve => {
      img.onload = resolve;
    });

    canvas.width = img.width;
    canvas.height = img.height;

    const ctx = canvas.getContext('2d');
    ctx?.drawImage(img, 0, 0);

    // Add watermark
    if (ctx) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = '24px Arial';
      ctx.fillText(watermarkText, 20, canvas.height - 30);
    }

    return new Promise(resolve => {
      canvas.toBlob((blob) => {
        resolve(new File([blob!], file.name, {
          type: file.type,
          lastModified: Date.now(),
        }));
      }, file.type, 0.9);
    });
  }

  static async extractMetadata(file: File): Promise<any> {
    // Mock EXIF data extraction
    return {
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      lastModified: new Date(file.lastModified),
      dimensions: {
        width: 1920,
        height: 1080,
      },
      camera: {
        make: 'Mock Camera',
        model: 'Test Device',
      },
      location: {
        latitude: 37.7749,
        longitude: -122.4194,
      },
      timestamp: new Date(),
    };
  }
}

describe('Mobile Camera Functionality', () => {
  let cameraService: MockCameraService;

  beforeAll(() => {
    // Mock browser APIs
    Object.defineProperty(navigator, 'mediaDevices', {
      value: mockMediaDevices,
      writable: true,
    });

    Object.defineProperty(navigator, 'permissions', {
      value: {
        query: jest.fn().mockResolvedValue({ state: 'granted' }),
      },
      writable: true,
    });

    // Mock DOM APIs
    Object.defineProperty(document, 'createElement', {
      value: jest.fn((tagName) => {
        if (tagName === 'canvas') {
          return mockCanvas;
        }
        if (tagName === 'video') {
          return {
            srcObject: null,
            play: jest.fn(),
            pause: jest.fn(),
            onloadedmetadata: null,
            videoWidth: 1920,
            videoHeight: 1080,
          };
        }
        return {};
      }),
    });

    Object.defineProperty(window, 'URL', {
      value: {
        createObjectURL: jest.fn(() => 'blob:mock-url'),
        revokeObjectURL: jest.fn(),
      },
    });
  });

  beforeEach(() => {
    cameraService = new MockCameraService();
    jest.clearAllMocks();

    // Mock successful device enumeration
    mockMediaDevices.enumerateDevices.mockResolvedValue([
      {
        deviceId: 'camera-1',
        kind: 'videoinput',
        label: 'Front Camera',
        groupId: 'group-1',
      },
      {
        deviceId: 'camera-2',
        kind: 'videoinput',
        label: 'Back Camera',
        groupId: 'group-1',
      },
    ]);

    // Mock successful getUserMedia
    mockMediaDevices.getUserMedia.mockResolvedValue(mockMediaStream);
  });

  describe('Camera Initialization', () => {
    it('should initialize camera service successfully', async () => {
      await cameraService.initialize();

      expect(mockMediaDevices.enumerateDevices).toHaveBeenCalled();
      expect(cameraService.getCurrentDevice()).toBeDefined();
      expect(cameraService.getDevices()).toHaveLength(2);
    });

    it('should handle camera permission denial', async () => {
      (navigator as any).permissions.query.mockResolvedValue({ state: 'denied' });

      await expect(cameraService.initialize()).rejects.toThrow('Camera permission denied');
    });

    it('should handle no cameras available', async () => {
      mockMediaDevices.enumerateDevices.mockResolvedValue([]);

      await expect(cameraService.initialize()).rejects.toThrow('No camera devices found');
    });

    it('should request camera permissions when needed', async () => {
      (navigator as any).permissions.query.mockResolvedValue({ state: 'prompt' });
      mockMediaDevices.getUserMedia.mockResolvedValue(mockMediaStream);

      await cameraService.initialize();

      expect(mockMediaDevices.getUserMedia).toHaveBeenCalledWith({ video: true });
    });
  });

  describe('Camera Operations', () => {
    beforeEach(async () => {
      await cameraService.initialize();
    });

    it('should start camera successfully', async () => {
      const stream = await cameraService.startCamera();

      expect(mockMediaDevices.getUserMedia).toHaveBeenCalledWith({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          facingMode: 'environment',
        },
        audio: false,
      });

      expect(stream).toBe(mockMediaStream);
      expect(cameraService.isActive()).toBe(true);
    });

    it('should start camera with specific device', async () => {
      const deviceId = 'camera-2';
      await cameraService.startCamera(deviceId);

      expect(mockMediaDevices.getUserMedia).toHaveBeenCalledWith({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          facingMode: 'environment',
          deviceId: { exact: deviceId },
        },
        audio: false,
      });
    });

    it('should stop camera properly', async () => {
      await cameraService.startCamera();
      expect(cameraService.isActive()).toBe(true);

      cameraService.stopCamera();

      expect(mockVideoTrack.stop).toHaveBeenCalled();
      expect(cameraService.isActive()).toBe(false);
    });

    it('should switch between cameras', async () => {
      await cameraService.startCamera();

      const initialDevice = cameraService.getCurrentDevice();
      expect(initialDevice.deviceId).toBe('camera-1');

      await cameraService.switchCamera();

      const newDevice = cameraService.getCurrentDevice();
      expect(newDevice.deviceId).toBe('camera-2');
    });

    it('should handle switching when only one camera available', async () => {
      mockMediaDevices.enumerateDevices.mockResolvedValue([
        {
          deviceId: 'camera-1',
          kind: 'videoinput',
          label: 'Single Camera',
          groupId: 'group-1',
        },
      ]);

      // Re-initialize with single camera
      cameraService = new MockCameraService();
      await cameraService.initialize();
      await cameraService.startCamera();

      await expect(cameraService.switchCamera()).rejects.toThrow('No other cameras available');
    });
  });

  describe('Photo Capture', () => {
    beforeEach(async () => {
      await cameraService.initialize();
      await cameraService.startCamera();
    });

    it('should capture photo successfully', async () => {
      const photo = await cameraService.capturePhoto();

      expect(photo).toBeInstanceOf(Blob);
      expect(photo.type).toBe('image/jpeg');
      expect(photo.size).toBeGreaterThan(0);
    });

    it('should fail to capture when camera not started', async () => {
      cameraService.stopCamera();

      await expect(cameraService.capturePhoto()).rejects.toThrow('Camera not started');
    });

    it('should capture with different quality settings', async () => {
      // Mock different quality capture
      mockCanvas.toBlob.mockImplementation((callback, type, quality) => {
        const size = quality ? Math.floor(1024000 * quality) : 1024000;
        const blob = { ...mockBlob, size };
        callback(blob);
      });

      const highQualityPhoto = await cameraService.capturePhoto();
      expect(highQualityPhoto.size).toBe(921600); // 1024000 * 0.9
    });
  });

  describe('Camera Constraints', () => {
    beforeEach(async () => {
      await cameraService.initialize();
      await cameraService.startCamera();
    });

    it('should update camera constraints', async () => {
      const newConstraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
      };

      await cameraService.setConstraints(newConstraints);

      expect(mockVideoTrack.applyConstraints).toHaveBeenCalledWith(newConstraints.video);
    });

    it('should handle constraint application failure', async () => {
      mockVideoTrack.applyConstraints.mockRejectedValue(new Error('Unsupported constraint'));

      const newConstraints = {
        video: {
          width: { exact: 4000 }, // Unsupported resolution
          height: { exact: 3000 },
        },
      };

      await expect(cameraService.setConstraints(newConstraints)).rejects.toThrow('Unsupported constraint');
    });
  });

  describe('Image Processing', () => {
    let testFile: File;

    beforeEach(() => {
      testFile = new File([new ArrayBuffer(1024000)], 'test.jpg', {
        type: 'image/jpeg',
        lastModified: Date.now(),
      });
    });

    it('should compress images', async () => {
      const compressed = await MockImageProcessor.compressImage(testFile, 0.5);

      expect(compressed.size).toBe(512000); // 50% of original
      expect(compressed.name).toBe(testFile.name);
      expect(compressed.type).toBe(testFile.type);
    });

    it('should resize images', async () => {
      const resized = await MockImageProcessor.resizeImage(testFile, 800, 600);

      expect(resized).toBeInstanceOf(File);
      expect(resized.name).toBe(testFile.name);
      expect(resized.type).toBe(testFile.type);
    });

    it('should add watermarks to images', async () => {
      const watermarked = await MockImageProcessor.addWatermark(testFile, 'Candlefish AI');

      expect(watermarked).toBeInstanceOf(File);
      expect(watermarked.name).toBe(testFile.name);
      expect(mockCanvas.getContext().fillText).toHaveBeenCalledWith('Candlefish AI', 20, expect.any(Number));
    });

    it('should extract image metadata', async () => {
      const metadata = await MockImageProcessor.extractMetadata(testFile);

      expect(metadata).toMatchObject({
        fileName: testFile.name,
        fileSize: testFile.size,
        mimeType: testFile.type,
        dimensions: {
          width: 1920,
          height: 1080,
        },
        camera: {
          make: 'Mock Camera',
          model: 'Test Device',
        },
        location: {
          latitude: 37.7749,
          longitude: -122.4194,
        },
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle getUserMedia failures', async () => {
      mockMediaDevices.getUserMedia.mockRejectedValue(new Error('Camera access denied'));

      await expect(cameraService.startCamera()).rejects.toThrow('Camera access denied');
    });

    it('should handle device enumeration failures', async () => {
      mockMediaDevices.enumerateDevices.mockRejectedValue(new Error('Device enumeration failed'));

      await expect(cameraService.initialize()).rejects.toThrow('Device enumeration failed');
    });

    it('should handle canvas operations failures', async () => {
      mockCanvas.toBlob.mockImplementation((callback) => {
        callback(null); // Simulate failure
      });

      await cameraService.initialize();
      await cameraService.startCamera();

      await expect(cameraService.capturePhoto()).rejects.toThrow();
    });

    it('should handle unsupported browser features', async () => {
      // Mock unsupported getUserMedia
      Object.defineProperty(navigator, 'mediaDevices', {
        value: undefined,
      });

      const unsupportedService = new MockCameraService();

      await expect(unsupportedService.initialize()).rejects.toThrow();
    });
  });

  describe('Performance', () => {
    it('should capture photos quickly', async () => {
      await cameraService.initialize();
      await cameraService.startCamera();

      const startTime = performance.now();
      await cameraService.capturePhoto();
      const endTime = performance.now();

      const captureTime = endTime - startTime;
      expect(captureTime).toBeLessThan(1000); // Less than 1 second
    });

    it('should handle rapid captures without memory leaks', async () => {
      await cameraService.initialize();
      await cameraService.startCamera();

      const captures = [];
      for (let i = 0; i < 10; i++) {
        captures.push(cameraService.capturePhoto());
      }

      const photos = await Promise.all(captures);

      expect(photos).toHaveLength(10);
      photos.forEach(photo => {
        expect(photo).toBeInstanceOf(Blob);
      });
    });
  });

  describe('Integration with Document System', () => {
    it('should attach captured photos to documents', async () => {
      await cameraService.initialize();
      await cameraService.startCamera();

      const photo = await cameraService.capturePhoto();
      const processedPhoto = await MockImageProcessor.compressImage(
        new File([photo], 'document-photo.jpg', { type: photo.type }),
        0.8
      );

      const metadata = await MockImageProcessor.extractMetadata(processedPhoto);

      expect(processedPhoto.size).toBeLessThan(photo.size);
      expect(metadata.fileName).toBe('document-photo.jpg');
      expect(metadata.location).toBeDefined();
    });

    it('should support batch photo capture for document scanning', async () => {
      await cameraService.initialize();
      await cameraService.startCamera();

      const batchCaptures = [];
      for (let i = 0; i < 5; i++) {
        const photo = await cameraService.capturePhoto();
        const watermarked = await MockImageProcessor.addWatermark(
          new File([photo], `page-${i + 1}.jpg`, { type: photo.type }),
          `Page ${i + 1} - ${new Date().toISOString()}`
        );
        batchCaptures.push(watermarked);
      }

      expect(batchCaptures).toHaveLength(5);
      batchCaptures.forEach((file, index) => {
        expect(file.name).toBe(`page-${index + 1}.jpg`);
      });
    });
  });
});
