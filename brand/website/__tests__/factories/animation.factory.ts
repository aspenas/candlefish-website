import { faker } from '@faker-js/faker';

export interface AnimationConfig {
  id: string;
  bioluminescentIntensity: number;
  swimmingSpeed: number;
  schoolingBehavior: {
    cohesion: number;
    separation: number;
    alignment: number;
  };
  environmentalFactors: {
    currentStrength: number;
    waterTemperature: number;
    lightLevel: number;
  };
  performanceSettings: {
    maxFishCount: number;
    lodDistance: number;
    renderQuality: 'low' | 'medium' | 'high';
  };
  createdAt: string;
  updatedAt: string;
}

export interface AnalyticsEvent {
  id: string;
  type: 'interaction' | 'performance' | 'config_change' | 'error';
  data: Record<string, any>;
  timestamp: string;
  sessionId: string;
  userId?: string;
}

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  memoryUsage: number;
  fishCount: number;
  renderCalls: number;
  timestamp: string;
}

export interface FeatureFlag {
  id: string;
  name: string;
  enabled: boolean;
  description: string;
  variants?: {
    name: string;
    weight: number;
    config: Record<string, any>;
  }[];
  rolloutPercentage: number;
  createdAt: string;
  updatedAt: string;
}

export class AnimationConfigFactory {
  static create(overrides: Partial<AnimationConfig> = {}): AnimationConfig {
    return {
      id: faker.datatype.uuid(),
      bioluminescentIntensity: faker.datatype.float({ min: 0, max: 1 }),
      swimmingSpeed: faker.datatype.float({ min: 0.1, max: 2.0 }),
      schoolingBehavior: {
        cohesion: faker.datatype.float({ min: 0, max: 1 }),
        separation: faker.datatype.float({ min: 0, max: 1 }),
        alignment: faker.datatype.float({ min: 0, max: 1 }),
      },
      environmentalFactors: {
        currentStrength: faker.datatype.float({ min: 0, max: 1 }),
        waterTemperature: faker.datatype.float({ min: 0, max: 30 }),
        lightLevel: faker.datatype.float({ min: 0, max: 1 }),
      },
      performanceSettings: {
        maxFishCount: faker.datatype.number({ min: 10, max: 200 }),
        lodDistance: faker.datatype.float({ min: 5, max: 50 }),
        renderQuality: faker.helpers.arrayElement(['low', 'medium', 'high'] as const),
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
      low: { maxFishCount: 50, lodDistance: 10, renderQuality: 'low' as const },
      medium: { maxFishCount: 100, lodDistance: 25, renderQuality: 'medium' as const },
      high: { maxFishCount: 200, lodDistance: 50, renderQuality: 'high' as const },
    };

    return this.create({
      performanceSettings: qualitySettings[quality],
    });
  }
}

export class AnalyticsEventFactory {
  static create(overrides: Partial<AnalyticsEvent> = {}): AnalyticsEvent {
    const eventType = faker.helpers.arrayElement(['interaction', 'performance', 'config_change', 'error'] as const);
    
    const eventDataMap = {
      interaction: {
        action: faker.helpers.arrayElement(['click', 'hover', 'drag']),
        element: faker.helpers.arrayElement(['fish', 'controls', 'background']),
        position: { x: faker.datatype.number(1920), y: faker.datatype.number(1080) },
      },
      performance: {
        fps: faker.datatype.float({ min: 20, max: 60 }),
        frameTime: faker.datatype.float({ min: 10, max: 50 }),
        memoryUsage: faker.datatype.number({ min: 50, max: 500 }),
      },
      config_change: {
        property: faker.helpers.arrayElement(['bioluminescentIntensity', 'swimmingSpeed', 'maxFishCount']),
        oldValue: faker.datatype.float({ min: 0, max: 2 }),
        newValue: faker.datatype.float({ min: 0, max: 2 }),
      },
      error: {
        message: faker.helpers.arrayElement(['WebGL context lost', 'Shader compilation failed', 'Memory limit exceeded']),
        stack: faker.lorem.lines(5),
        code: faker.datatype.number({ min: 1000, max: 9999 }),
      },
    };

    return {
      id: faker.datatype.uuid(),
      type: eventType,
      data: eventDataMap[eventType],
      timestamp: faker.date.recent().toISOString(),
      sessionId: faker.datatype.uuid(),
      userId: faker.datatype.boolean() ? faker.datatype.uuid() : undefined,
      ...overrides,
    };
  }

  static createMany(count: number, overrides: Partial<AnalyticsEvent> = {}): AnalyticsEvent[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  static createInteractionEvent(action: string, element: string): AnalyticsEvent {
    return this.create({
      type: 'interaction',
      data: {
        action,
        element,
        position: { x: faker.datatype.number(1920), y: faker.datatype.number(1080) },
      },
    });
  }

  static createPerformanceEvent(metrics: Partial<PerformanceMetrics>): AnalyticsEvent {
    return this.create({
      type: 'performance',
      data: {
        fps: 60,
        frameTime: 16.67,
        memoryUsage: 128,
        fishCount: 100,
        renderCalls: 50,
        ...metrics,
      },
    });
  }
}

export class FeatureFlagFactory {
  static create(overrides: Partial<FeatureFlag> = {}): FeatureFlag {
    const hasVariants = faker.datatype.boolean();
    
    return {
      id: faker.datatype.uuid(),
      name: faker.helpers.arrayElement([
        'enhanced-bioluminescence',
        'advanced-physics',
        'performance-mode',
        'experimental-shaders',
        'mobile-optimization',
      ]),
      enabled: faker.datatype.boolean(),
      description: faker.lorem.sentence(),
      variants: hasVariants ? [
        {
          name: 'control',
          weight: 50,
          config: {},
        },
        {
          name: 'variant_a',
          weight: 25,
          config: { enhancement: 'subtle' },
        },
        {
          name: 'variant_b',
          weight: 25,
          config: { enhancement: 'dramatic' },
        },
      ] : undefined,
      rolloutPercentage: faker.datatype.number({ min: 0, max: 100 }),
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
      rolloutPercentage: 100,
    });
  }

  static createDisabled(name: string): FeatureFlag {
    return this.create({
      name,
      enabled: false,
      rolloutPercentage: 0,
    });
  }

  static createABTest(name: string, variants: string[]): FeatureFlag {
    const weight = Math.floor(100 / variants.length);
    
    return this.create({
      name,
      enabled: true,
      variants: variants.map((variant, index) => ({
        name: variant,
        weight: index === variants.length - 1 ? 100 - (weight * (variants.length - 1)) : weight,
        config: { variant },
      })),
      rolloutPercentage: 100,
    });
  }
}

export class PerformanceMetricsFactory {
  static create(overrides: Partial<PerformanceMetrics> = {}): PerformanceMetrics {
    return {
      fps: faker.datatype.float({ min: 30, max: 60 }),
      frameTime: faker.datatype.float({ min: 10, max: 33 }),
      memoryUsage: faker.datatype.number({ min: 50, max: 512 }),
      fishCount: faker.datatype.number({ min: 10, max: 200 }),
      renderCalls: faker.datatype.number({ min: 10, max: 100 }),
      timestamp: faker.date.recent().toISOString(),
      ...overrides,
    };
  }

  static createMany(count: number, overrides: Partial<PerformanceMetrics> = {}): PerformanceMetrics[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  static createTimeSeriesData(duration: number, intervalMs: number = 1000): PerformanceMetrics[] {
    const count = Math.floor(duration / intervalMs);
    const baseTime = new Date();
    
    return Array.from({ length: count }, (_, index) => {
      const timestamp = new Date(baseTime.getTime() + (index * intervalMs));
      return this.create({
        timestamp: timestamp.toISOString(),
        // Simulate performance degradation over time
        fps: faker.datatype.float({ min: 60 - (index * 0.1), max: 60 }),
        memoryUsage: faker.datatype.number({ min: 100 + (index * 2), max: 150 + (index * 2) }),
      });
    });
  }

  static createLowPerformance(): PerformanceMetrics {
    return this.create({
      fps: faker.datatype.float({ min: 15, max: 30 }),
      frameTime: faker.datatype.float({ min: 33, max: 66 }),
      memoryUsage: faker.datatype.number({ min: 400, max: 512 }),
    });
  }

  static createHighPerformance(): PerformanceMetrics {
    return this.create({
      fps: faker.datatype.float({ min: 55, max: 60 }),
      frameTime: faker.datatype.float({ min: 10, max: 18 }),
      memoryUsage: faker.datatype.number({ min: 50, max: 150 }),
    });
  }
}