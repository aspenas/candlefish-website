import { faker } from '@faker-js/faker';
import {
  AnimationConfig,
  AnimationEvent,
  AnimationMetrics,
  FeatureFlag,
  PerformanceMetrics,
  PerformanceAlert
} from '../../types/animation';

export class AnimationConfigFactory {
  static create(overrides: Partial<AnimationConfig> = {}): AnimationConfig {
    return {
      animationId: faker.string.uuid(),
      enabled: faker.datatype.boolean(),
      speed: faker.number.float({ min: 0.1, max: 3.0 }),
      colors: {
        primary: faker.internet.color(),
        background: faker.internet.color(),
        trail: faker.internet.color()
      },
      behavior: {
        curiosityRadius: faker.number.int({ min: 50, max: 300 }),
        dartFrequency: faker.number.float({ min: 0, max: 1 }),
        trailLength: faker.number.int({ min: 5, max: 50 }),
        glowIntensity: faker.number.float({ min: 0, max: 1 })
      },
      performance: {
        maxFPS: faker.number.int({ min: 30, max: 120 }),
        qualityLevel: faker.helpers.arrayElement(['low', 'medium', 'high'] as const),
        enableTrail: faker.datatype.boolean(),
        enableRipples: faker.datatype.boolean(),
        enableBubbles: faker.datatype.boolean()
      },
      responsive: {
        mobileHeight: faker.number.int({ min: 200, max: 600 }),
        desktopHeight: faker.number.int({ min: 400, max: 1200 }),
        disableOnMobile: faker.datatype.boolean()
      },
      createdAt: faker.date.past().toISOString(),
      updatedAt: faker.date.recent().toISOString(),
      ...overrides,
    };
  }

  static createMany(count: number, overrides: Partial<AnimationConfig> = {}): AnimationConfig[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  static createWithPerformanceSettings(quality: 'low' | 'medium' | 'high'): AnimationConfig {
    const qualitySettings = {
      low: {
        maxFPS: 30,
        qualityLevel: 'low' as const,
        enableTrail: false,
        enableRipples: false,
        enableBubbles: false
      },
      medium: {
        maxFPS: 60,
        qualityLevel: 'medium' as const,
        enableTrail: true,
        enableRipples: true,
        enableBubbles: false
      },
      high: {
        maxFPS: 120,
        qualityLevel: 'high' as const,
        enableTrail: true,
        enableRipples: true,
        enableBubbles: true
      }
    };

    return this.create({
      performance: qualitySettings[quality],
    });
  }

  static createMobileOptimized(): AnimationConfig {
    return this.create({
      responsive: {
        mobileHeight: 300,
        desktopHeight: 600,
        disableOnMobile: false
      },
      performance: {
        maxFPS: 30,
        qualityLevel: 'low',
        enableTrail: false,
        enableRipples: false,
        enableBubbles: false
      }
    });
  }

  static createDesktopOptimized(): AnimationConfig {
    return this.create({
      responsive: {
        mobileHeight: 400,
        desktopHeight: 800,
        disableOnMobile: false
      },
      performance: {
        maxFPS: 120,
        qualityLevel: 'high',
        enableTrail: true,
        enableRipples: true,
        enableBubbles: true
      }
    });
  }
}

export class AnimationEventFactory {
  static create(overrides: Partial<AnimationEvent> = {}): AnimationEvent {
    const eventType = faker.helpers.arrayElement(['view', 'interaction', 'error', 'performance'] as const);
    
    const eventDataMap = {
      view: {
        timestamp: Date.now(),
        duration: faker.number.int({ min: 1000, max: 30000 }),
      },
      interaction: {
        timestamp: Date.now(),
        cursorPosition: { 
          x: faker.number.int({ min: 0, max: 1920 }), 
          y: faker.number.int({ min: 0, max: 1080 }) 
        },
        clickPosition: faker.datatype.boolean() ? {
          x: faker.number.int({ min: 0, max: 1920 }), 
          y: faker.number.int({ min: 0, max: 1080 }) 
        } : undefined,
      },
      performance: {
        timestamp: Date.now(),
        fps: faker.number.float({ min: 20, max: 60 }),
        memoryUsage: faker.number.int({ min: 50, max: 500 }),
      },
      error: {
        timestamp: Date.now(),
        errorMessage: faker.helpers.arrayElement([
          'WebGL context lost',
          'Shader compilation failed',
          'Memory limit exceeded',
          'Animation frame timeout',
          'Canvas rendering error'
        ]),
        errorStack: faker.lorem.lines(5),
      },
    };

    return {
      eventId: faker.string.uuid(),
      animationId: faker.string.uuid(),
      userId: faker.datatype.boolean() ? faker.string.uuid() : undefined,
      sessionId: faker.string.uuid(),
      eventType: eventType,
      eventData: eventDataMap[eventType],
      metadata: {
        userAgent: faker.internet.userAgent(),
        viewport: { 
          width: faker.number.int({ min: 800, max: 1920 }), 
          height: faker.number.int({ min: 600, max: 1080 }) 
        },
        devicePixelRatio: faker.helpers.arrayElement([1, 1.5, 2, 3]),
        reducedMotion: faker.datatype.boolean(),
        variant: faker.datatype.boolean() ? faker.helpers.arrayElement(['control', 'variant_a', 'variant_b']) : undefined
      },
      createdAt: faker.date.recent().toISOString(),
      ...overrides,
    };
  }

  static createMany(count: number, overrides: Partial<AnimationEvent> = {}): AnimationEvent[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  static createInteractionEvent(cursorPosition?: { x: number; y: number }): AnimationEvent {
    return this.create({
      eventType: 'interaction',
      eventData: {
        timestamp: Date.now(),
        cursorPosition: cursorPosition || {
          x: faker.number.int({ min: 0, max: 1920 }), 
          y: faker.number.int({ min: 0, max: 1080 }) 
        },
      },
    });
  }

  static createPerformanceEvent(metrics: Partial<PerformanceMetrics>): AnimationEvent {
    return this.create({
      eventType: 'performance',
      eventData: {
        timestamp: Date.now(),
        fps: 60,
        memoryUsage: 128,
        ...metrics,
      },
    });
  }

  static createViewEvent(duration: number): AnimationEvent {
    return this.create({
      eventType: 'view',
      eventData: {
        timestamp: Date.now(),
        duration
      },
    });
  }

  static createErrorEvent(error: Error): AnimationEvent {
    return this.create({
      eventType: 'error',
      eventData: {
        timestamp: Date.now(),
        errorMessage: error.message,
        errorStack: error.stack
      },
    });
  }
}

export class FeatureFlagFactory {
  static create(overrides: Partial<FeatureFlag> = {}): FeatureFlag {
    const hasVariants = faker.datatype.boolean();
    
    return {
      flagId: faker.string.uuid(),
      name: faker.helpers.arrayElement([
        'enhanced-animation',
        'advanced-physics',
        'performance-mode',
        'experimental-shaders',
        'mobile-optimization',
        'a11y-animations'
      ]),
      description: faker.lorem.sentence(),
      enabled: faker.datatype.boolean(),
      variants: hasVariants ? [
        {
          id: 'control',
          name: 'Control',
          weight: 50,
          config: {},
        },
        {
          id: 'variant_a',
          name: 'Variant A',
          weight: 25,
          config: { enhancement: 'subtle' },
        },
        {
          id: 'variant_b',
          name: 'Variant B',
          weight: 25,
          config: { enhancement: 'dramatic' },
        },
      ] : [],
      targeting: {
        userSegments: faker.helpers.arrayElements(['premium', 'beta', 'mobile'], { min: 0, max: 3 }),
        percentage: faker.number.int({ min: 0, max: 100 })
      },
      createdAt: faker.date.past().toISOString(),
      updatedAt: faker.date.recent().toISOString(),
      ...overrides,
    };
  }

  static createMany(count: number, overrides: Partial<FeatureFlag> = {}): FeatureFlag[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  static createEnabled(name: string): FeatureFlag {
    return this.create({
      name,
      enabled: true,
      targeting: {
        userSegments: [],
        percentage: 100
      },
    });
  }

  static createDisabled(name: string): FeatureFlag {
    return this.create({
      name,
      enabled: false,
      targeting: {
        userSegments: [],
        percentage: 0
      },
    });
  }

  static createABTest(name: string, variants: string[]): FeatureFlag {
    const weight = Math.floor(100 / variants.length);
    
    return this.create({
      name,
      enabled: true,
      variants: variants.map((variant, index) => ({
        id: variant,
        name: variant.charAt(0).toUpperCase() + variant.slice(1),
        weight: index === variants.length - 1 ? 100 - (weight * (variants.length - 1)) : weight,
        config: { variant },
      })),
      targeting: {
        userSegments: [],
        percentage: 100
      },
    });
  }
}

export class PerformanceMetricsFactory {
  static create(overrides: Partial<PerformanceMetrics> = {}): PerformanceMetrics {
    return {
      fps: faker.number.float({ min: 30, max: 60 }),
      frameTime: faker.number.float({ min: 10, max: 33 }),
      memoryUsage: faker.number.int({ min: 50, max: 512 }),
      timestamp: Date.now(),
      ...overrides,
    };
  }

  static createMany(count: number, overrides: Partial<PerformanceMetrics> = {}): PerformanceMetrics[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  static createTimeSeriesData(duration: number, intervalMs: number = 1000): PerformanceMetrics[] {
    const count = Math.floor(duration / intervalMs);
    const baseTime = Date.now();
    
    return Array.from({ length: count }, (_, index) => {
      const timestamp = baseTime + (index * intervalMs);
      return this.create({
        timestamp,
        // Simulate performance degradation over time
        fps: faker.number.float({ min: 60 - (index * 0.1), max: 60 }),
        memoryUsage: faker.number.int({ min: 100 + (index * 2), max: 150 + (index * 2) }),
      });
    });
  }

  static createLowPerformance(): PerformanceMetrics {
    return this.create({
      fps: faker.number.float({ min: 15, max: 30 }),
      frameTime: faker.number.float({ min: 33, max: 66 }),
      memoryUsage: faker.number.int({ min: 400, max: 512 }),
    });
  }

  static createHighPerformance(): PerformanceMetrics {
    return this.create({
      fps: faker.number.float({ min: 55, max: 60 }),
      frameTime: faker.number.float({ min: 10, max: 18 }),
      memoryUsage: faker.number.int({ min: 50, max: 150 }),
    });
  }

  static createRealtimeData(sampleCount: number = 60): PerformanceMetrics[] {
    const now = Date.now();
    return Array.from({ length: sampleCount }, (_, index) => {
      const timestamp = now - ((sampleCount - index - 1) * 1000); // 1 second intervals
      
      // Simulate realistic performance patterns
      const timeFactor = index / sampleCount;
      const basePerformance = 60 - (timeFactor * 10); // Gradual degradation
      const noise = (Math.random() - 0.5) * 10; // Random fluctuation
      
      return this.create({
        timestamp,
        fps: Math.max(15, Math.min(60, basePerformance + noise)),
        memoryUsage: faker.number.int({ min: 100 + (timeFactor * 100), max: 200 + (timeFactor * 150) }),
        frameTime: faker.number.float({ min: 10, max: 33 })
      });
    });
  }
}

// Animation Metrics Factory
export class AnimationMetricsFactory {
  static create(overrides: Partial<AnimationMetrics> = {}): AnimationMetrics {
    const startDate = faker.date.past();
    const endDate = faker.date.between({ from: startDate, to: new Date() });
    
    return {
      animationId: faker.string.uuid(),
      timeRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      views: {
        total: faker.number.int({ min: 100, max: 10000 }),
        unique: faker.number.int({ min: 50, max: 5000 }),
        averageDuration: faker.number.int({ min: 5000, max: 30000 })
      },
      interactions: {
        clicks: faker.number.int({ min: 10, max: 1000 }),
        hovers: faker.number.int({ min: 50, max: 2000 }),
        ripples: faker.number.int({ min: 20, max: 500 })
      },
      performance: {
        averageFPS: faker.number.float({ min: 30, max: 60 }),
        memoryUsage: {
          average: faker.number.int({ min: 100, max: 300 }),
          peak: faker.number.int({ min: 200, max: 500 })
        },
        errorRate: faker.number.float({ min: 0, max: 0.05 }),
        loadTime: {
          average: faker.number.int({ min: 500, max: 2000 }),
          p95: faker.number.int({ min: 1000, max: 5000 })
        }
      },
      variants: {
        control: {
          views: faker.number.int({ min: 50, max: 5000 }),
          interactions: faker.number.int({ min: 10, max: 500 }),
          conversionRate: faker.number.float({ min: 0.01, max: 0.1 })
        },
        variant_a: {
          views: faker.number.int({ min: 50, max: 5000 }),
          interactions: faker.number.int({ min: 10, max: 500 }),
          conversionRate: faker.number.float({ min: 0.01, max: 0.1 })
        }
      },
      ...overrides
    };
  }
  
  static createMany(count: number, overrides: Partial<AnimationMetrics> = {}): AnimationMetrics[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  static createForTimeRange(startDate: Date, endDate: Date): AnimationMetrics {
    return this.create({
      timeRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      }
    });
  }

  static createHighPerformanceMetrics(): AnimationMetrics {
    return this.create({
      performance: {
        averageFPS: faker.number.float({ min: 55, max: 60 }),
        memoryUsage: {
          average: faker.number.int({ min: 80, max: 150 }),
          peak: faker.number.int({ min: 120, max: 200 })
        },
        errorRate: faker.number.float({ min: 0, max: 0.01 }),
        loadTime: {
          average: faker.number.int({ min: 300, max: 800 }),
          p95: faker.number.int({ min: 500, max: 1200 })
        }
      }
    });
  }

  static createLowPerformanceMetrics(): AnimationMetrics {
    return this.create({
      performance: {
        averageFPS: faker.number.float({ min: 20, max: 35 }),
        memoryUsage: {
          average: faker.number.int({ min: 300, max: 450 }),
          peak: faker.number.int({ min: 400, max: 600 })
        },
        errorRate: faker.number.float({ min: 0.02, max: 0.08 }),
        loadTime: {
          average: faker.number.int({ min: 2000, max: 4000 }),
          p95: faker.number.int({ min: 3000, max: 8000 })
        }
      }
    });
  }
}

// Performance Alert Factory
export class PerformanceAlertFactory {
  static create(overrides: Partial<PerformanceAlert> = {}): PerformanceAlert {
    const alertType = faker.helpers.arrayElement(['fps_drop', 'memory_leak', 'render_error'] as const);
    
    const alertMessages = {
      fps_drop: 'Animation FPS dropped below threshold',
      memory_leak: 'Memory usage continuously increasing',
      render_error: 'Rendering errors detected'
    };
    
    return {
      type: alertType,
      message: alertMessages[alertType],
      severity: faker.helpers.arrayElement(['low', 'medium', 'high'] as const),
      timestamp: Date.now(),
      metrics: PerformanceMetricsFactory.create(),
      ...overrides
    };
  }
  
  static createMany(count: number, overrides: Partial<PerformanceAlert> = {}): PerformanceAlert[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }
  
  static createCritical(): PerformanceAlert {
    return this.create({
      severity: 'high',
      type: 'render_error',
      message: 'Critical rendering failure detected',
      metrics: PerformanceMetricsFactory.createLowPerformance()
    });
  }

  static createFPSAlert(currentFPS: number): PerformanceAlert {
    return this.create({
      type: 'fps_drop',
      severity: currentFPS < 20 ? 'high' : currentFPS < 40 ? 'medium' : 'low',
      message: `Animation FPS dropped to ${currentFPS}`,
      metrics: PerformanceMetricsFactory.create({ fps: currentFPS })
    });
  }

  static createMemoryAlert(memoryUsage: number): PerformanceAlert {
    return this.create({
      type: 'memory_leak',
      severity: memoryUsage > 400 ? 'high' : memoryUsage > 250 ? 'medium' : 'low',
      message: `Memory usage reached ${memoryUsage}MB`,
      metrics: PerformanceMetricsFactory.create({ memoryUsage })
    });
  }
}