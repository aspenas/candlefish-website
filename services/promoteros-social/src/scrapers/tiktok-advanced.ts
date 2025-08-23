/**
 * PromoterOS TikTok Advanced Scraper
 *
 * This module provides comprehensive TikTok data extraction and analysis capabilities
 * for artist discovery, viral prediction, and real-time social monitoring.
 *
 * Features:
 * - Multi-threaded scraping with intelligent rate limiting
 * - Viral trajectory prediction using ML models
 * - Sound trend analysis and audio fingerprinting
 * - Engagement quality scoring beyond vanity metrics
 * - Geographic heat mapping for tour planning
 * - Competitor artist monitoring and benchmarking
 * - Real-time WebSocket streaming for live updates
 * - Automatic proxy rotation and captcha solving
 * - Data enrichment with music recognition APIs
 * - Historical trend analysis with time-series forecasting
 *
 * @module TikTokAdvancedScraper
 * @author PromoterOS AI Team
 * @version 3.0.0
 */

import { EventEmitter } from 'events';
import * as tf from '@tensorflow/tfjs-node';
import { Redis } from 'ioredis';
import pLimit from 'p-limit';
import { z } from 'zod';
import winston from 'winston';
import { performance } from 'perf_hooks';
import crypto from 'crypto';
import axios, { AxiosInstance } from 'axios';
import { SocksProxyAgent } from 'socks-proxy-agent';
import puppeteer, { Browser, Page } from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import RecaptchaPlugin from 'puppeteer-extra-plugin-recaptcha';
import { Queue, Worker, QueueScheduler } from 'bullmq';
import { Pool } from 'pg';
import { InfluxDB, Point } from '@influxdata/influxdb-client';
import { Mutex } from 'async-mutex';
import LRU from 'lru-cache';
import { RateLimiter } from 'limiter';
import * as Sentry from '@sentry/node';
import { OpenAI } from 'openai';
import { Anthropic } from '@anthropic-ai/sdk';

// Add stealth and recaptcha plugins
puppeteer.use(StealthPlugin());
puppeteer.use(RecaptchaPlugin({
  provider: {
    id: '2captcha',
    token: process.env.TWO_CAPTCHA_API_KEY!
  },
  visualFeedback: false
}));

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * TikTok User Profile with enriched analytics
 */
export interface TikTokUserProfile {
  id: string;
  uniqueId: string;
  nickname: string;
  avatarUrl: string;
  signature: string;
  verified: boolean;
  followingCount: number;
  followerCount: number;
  heartCount: number;
  videoCount: number;
  diggCount: number;

  // Enriched fields
  engagementRate: number;
  growthRate: number;
  viralityScore: number;
  authenticityScore: number;
  commercialValue: number;
  audienceQuality: number;
  contentConsistency: number;
  brandSafety: number;

  // Audience demographics
  audienceDemographics: {
    ageDistribution: Record<string, number>;
    genderDistribution: Record<string, number>;
    locationDistribution: Record<string, number>;
    interestCategories: string[];
    deviceTypes: Record<string, number>;
    activeHours: number[];
  };

  // Performance metrics
  performanceMetrics: {
    avgViews: number;
    avgLikes: number;
    avgComments: number;
    avgShares: number;
    viralVideoCount: number;
    trendsParticipated: number;
    originalSounds: number;
  };

  // Predictive analytics
  predictions: {
    next30DayFollowers: number;
    viralProbability: number;
    tourDemandScore: number;
    merchandiseAffinity: number;
    collaborationValue: number;
  };

  metadata: {
    scrapedAt: Date;
    dataFreshness: number;
    confidenceScore: number;
  };
}

/**
 * TikTok Video with comprehensive analytics
 */
export interface TikTokVideo {
  id: string;
  description: string;
  createTime: number;
  authorId: string;
  musicId: string;
  covers: string[];
  videoUrl: string;
  shareUrl: string;

  // Basic stats
  stats: {
    playCount: number;
    shareCount: number;
    commentCount: number;
    diggCount: number;
    collectCount: number;
  };

  // Advanced metrics
  analytics: {
    completionRate: number;
    replayRate: number;
    engagementVelocity: number;
    viralityCoefficient: number;
    sentimentScore: number;
    toxicityScore: number;
    authenticEngagement: number;
    botActivityScore: number;
  };

  // Viral indicators
  viralIndicators: {
    isViral: boolean;
    viralRank: number;
    trendParticipation: boolean;
    algorithmBoost: boolean;
    crossPlatformShares: number;
    celebrityEngagement: boolean;
    mediaPickup: boolean;
  };

  // Content analysis
  contentAnalysis: {
    hashtags: string[];
    mentions: string[];
    soundName: string;
    soundAuthor: string;
    soundOriginal: boolean;
    duration: number;
    aspectRatio: string;
    effects: string[];
    language: string;
    captionEntities: Array<{
      type: string;
      text: string;
      offset: number;
    }>;
  };

  // Audience insights
  audienceInsights: {
    viewerDemographics: Record<string, any>;
    shareDestinations: Record<string, number>;
    commentSentiment: Record<string, number>;
    peakViewingHours: number[];
    geoDistribution: Record<string, number>;
  };

  // Temporal patterns
  temporalPatterns: {
    hourlyViews: number[];
    dailyEngagement: number[];
    viralityTimeline: Array<{
      timestamp: number;
      metric: string;
      value: number;
    }>;
    plateauPoint: number | null;
    projectedLifetime: number;
  };
}

/**
 * Sound/Music trend analysis
 */
export interface TikTokSoundTrend {
  id: string;
  title: string;
  author: string;
  original: boolean;
  duration: number;
  coverUrl: string;

  // Usage metrics
  usage: {
    videoCount: number;
    creatorCount: number;
    totalViews: number;
    totalEngagement: number;
    dailyGrowth: number;
    weeklyGrowth: number;
  };

  // Trend analysis
  trendAnalysis: {
    trendingRank: number;
    momentum: number;
    peakPrediction: Date;
    lifecycleStage: 'emerging' | 'rising' | 'peak' | 'declining' | 'evergreen';
    viralPotential: number;
    crossoverPotential: number;
  };

  // Geographic spread
  geoSpread: {
    countries: Record<string, number>;
    cities: Record<string, number>;
    spreadVelocity: number;
    saturationLevel: number;
  };

  // Creator insights
  creatorInsights: {
    topCreators: Array<{
      id: string;
      username: string;
      followers: number;
      videoViews: number;
    }>;
    avgCreatorSize: number;
    influencerAdoption: number;
    ugcRatio: number;
  };

  // Music analysis (if applicable)
  musicAnalysis?: {
    genre: string[];
    bpm: number;
    key: string;
    energy: number;
    danceability: number;
    valence: number;
    acousticness: number;
    instrumentalness: number;
    spotifyId?: string;
    appleMusicId?: string;
    chartPositions?: Record<string, number>;
  };
}

/**
 * Hashtag trend and challenge data
 */
export interface TikTokHashtagTrend {
  id: string;
  name: string;
  title: string;
  description: string;
  coverUrl: string;

  // Volume metrics
  metrics: {
    viewCount: number;
    videoCount: number;
    creatorCount: number;
    dailyVideos: number;
    engagementRate: number;
  };

  // Trend status
  trendStatus: {
    isChallenge: boolean;
    isBranded: boolean;
    isOfficial: boolean;
    trendingRank: number;
    momentum: number;
    lifecycleDay: number;
    predictedPeak: Date;
  };

  // Participation analysis
  participation: {
    topVideos: string[];
    topCreators: string[];
    avgParticipantFollowers: number;
    celebrityParticipation: string[];
    brandParticipation: string[];
    crossPlatformMentions: number;
  };

  // Content themes
  contentThemes: {
    primaryThemes: string[];
    emotionalTone: Record<string, number>;
    visualStyles: string[];
    musicGenres: string[];
    targetAudience: string[];
  };
}

/**
 * Competitor tracking data
 */
export interface CompetitorAnalysis {
  competitorId: string;
  competitorName: string;
  trackingSince: Date;

  // Comparative metrics
  comparison: {
    followerGrowth: {
      ours: number;
      theirs: number;
      difference: number;
    };
    engagementRate: {
      ours: number;
      theirs: number;
      difference: number;
    };
    viralFrequency: {
      ours: number;
      theirs: number;
      difference: number;
    };
    audienceOverlap: number;
  };

  // Strategic insights
  insights: {
    contentStrategy: string[];
    postingSchedule: Record<string, number>;
    hashtagStrategy: string[];
    soundStrategy: string[];
    collaborations: string[];
    successfulFormats: string[];
  };

  // Opportunities
  opportunities: {
    untappedHashtags: string[];
    untappedSounds: string[];
    contentGaps: string[];
    timingGaps: number[];
    audienceSegments: string[];
  };

  // Threat assessment
  threats: {
    level: 'low' | 'medium' | 'high' | 'critical';
    growthTrajectory: number;
    marketShareShift: number;
    audienceBleed: number;
    contentInnovation: number;
  };
}

/**
 * Scraper configuration
 */
export interface ScraperConfig {
  // API Configuration
  apiEndpoint: string;
  apiKey: string;
  apiSecret: string;

  // Proxy Configuration
  proxyList: string[];
  proxyRotationInterval: number;
  proxyHealthCheckInterval: number;
  proxyFailureThreshold: number;

  // Rate Limiting
  requestsPerSecond: number;
  requestsPerMinute: number;
  requestsPerHour: number;
  concurrentRequests: number;
  retryAttempts: number;
  retryDelay: number;
  backoffMultiplier: number;

  // Browser Configuration
  headless: boolean;
  browserCount: number;
  pagePoolSize: number;
  userAgents: string[];
  viewportSizes: Array<{ width: number; height: number }>;

  // Caching
  cacheEnabled: boolean;
  cacheTTL: number;
  cacheMaxSize: number;
  cacheEvictionPolicy: 'lru' | 'lfu' | 'fifo';

  // Data Enrichment
  enableAIEnrichment: boolean;
  enableMusicRecognition: boolean;
  enableImageAnalysis: boolean;
  enableSentimentAnalysis: boolean;
  enableTranslation: boolean;

  // Storage
  databaseUrl: string;
  redisUrl: string;
  influxDbUrl: string;
  s3Bucket: string;

  // Monitoring
  sentryDsn: string;
  datadogApiKey: string;
  prometheusPort: number;
  healthCheckPort: number;

  // ML Models
  viralPredictionModel: string;
  audienceQualityModel: string;
  contentClassificationModel: string;
  trendForecastingModel: string;

  // Webhooks
  webhookUrl: string;
  webhookSecret: string;
  webhookEvents: string[];
  webhookRetries: number;
}

// ============================================================================
// MAIN SCRAPER CLASS
// ============================================================================

/**
 * Advanced TikTok Scraper with ML-powered analytics
 */
export class TikTokAdvancedScraper extends EventEmitter {
  private config: ScraperConfig;
  private logger: winston.Logger;
  private redis: Redis;
  private db: Pool;
  private influx: InfluxDB;
  private browserPool: Browser[] = [];
  private pagePool: Page[] = [];
  private proxyAgents: Map<string, SocksProxyAgent> = new Map();
  private rateLimiter: RateLimiter;
  private cache: LRU<string, any>;
  private mutex: Mutex;
  private queue: Queue;
  private worker: Worker;
  private scheduler: QueueScheduler;
  private httpClient: AxiosInstance;
  private openai: OpenAI;
  private anthropic: Anthropic;

  // ML Models
  private viralPredictionModel?: tf.LayersModel;
  private audienceQualityModel?: tf.LayersModel;
  private contentClassificationModel?: tf.LayersModel;
  private trendForecastingModel?: tf.LayersModel;

  // Metrics
  private metrics = {
    requestsTotal: 0,
    requestsSuccess: 0,
    requestsFailed: 0,
    avgResponseTime: 0,
    cacheHits: 0,
    cacheMisses: 0,
    proxyRotations: 0,
    captchasSolved: 0,
    dataPointsCollected: 0,
    predictionsGenerated: 0
  };

  constructor(config: ScraperConfig) {
    super();
    this.config = config;
    this.mutex = new Mutex();

    // Initialize logger
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'tiktok-scraper' },
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        }),
        new winston.transports.File({
          filename: 'logs/tiktok-scraper-error.log',
          level: 'error'
        }),
        new winston.transports.File({
          filename: 'logs/tiktok-scraper.log'
        })
      ]
    });

    // Initialize Redis
    this.redis = new Redis(config.redisUrl, {
      retryStrategy: (times) => Math.min(times * 50, 2000),
      reconnectOnError: (err) => {
        const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT'];
        return targetErrors.some(e => err.message.includes(e));
      }
    });

    // Initialize PostgreSQL
    this.db = new Pool({
      connectionString: config.databaseUrl,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Initialize InfluxDB for time-series data
    this.influx = new InfluxDB({
      url: config.influxDbUrl,
      token: process.env.INFLUX_TOKEN!,
      org: process.env.INFLUX_ORG!,
      bucket: 'tiktok-metrics'
    });

    // Initialize rate limiter
    this.rateLimiter = new RateLimiter({
      tokensPerInterval: config.requestsPerSecond,
      interval: 'second',
      fireImmediately: true
    });

    // Initialize cache
    this.cache = new LRU({
      max: config.cacheMaxSize,
      ttl: config.cacheTTL * 1000,
      allowStale: true,
      updateAgeOnGet: true,
      updateAgeOnHas: true
    });

    // Initialize HTTP client with retry logic
    this.httpClient = axios.create({
      timeout: 30000,
      headers: {
        'User-Agent': this.getRandomUserAgent(),
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    });

    // Add request/response interceptors
    this.setupHttpInterceptors();

    // Initialize AI clients
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!
    });

    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!
    });

    // Initialize BullMQ for job processing
    const connection = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    };

    this.queue = new Queue('tiktok-scraping', { connection });
    this.scheduler = new QueueScheduler('tiktok-scraping', { connection });

    this.worker = new Worker(
      'tiktok-scraping',
      async (job) => this.processScrapingJob(job),
      {
        connection,
        concurrency: config.concurrentRequests,
        limiter: {
          max: config.requestsPerMinute,
          duration: 60000
        }
      }
    );

    // Initialize Sentry for error tracking
    if (config.sentryDsn) {
      Sentry.init({
        dsn: config.sentryDsn,
        tracesSampleRate: 0.1,
        environment: process.env.NODE_ENV || 'development'
      });
    }

    // Set up event handlers
    this.setupEventHandlers();
  }

  // ============================================================================
  // INITIALIZATION METHODS
  // ============================================================================

  /**
   * Initialize the scraper and all its components
   */
  async initialize(): Promise<void> {
    const startTime = performance.now();
    this.logger.info('Initializing TikTok Advanced Scraper...');

    try {
      // Load ML models
      await this.loadMLModels();

      // Initialize browser pool
      await this.initializeBrowserPool();

      // Initialize proxy pool
      await this.initializeProxyPool();

      // Verify database connections
      await this.verifyConnections();

      // Warm up cache
      await this.warmUpCache();

      // Start health check intervals
      this.startHealthChecks();

      // Start metrics collection
      this.startMetricsCollection();

      const duration = performance.now() - startTime;
      this.logger.info(`Scraper initialized successfully in ${duration.toFixed(2)}ms`);
      this.emit('initialized', { duration });

    } catch (error) {
      this.logger.error('Failed to initialize scraper:', error);
      throw error;
    }
  }

  /**
   * Load TensorFlow models for predictions
   */
  private async loadMLModels(): Promise<void> {
    this.logger.info('Loading ML models...');

    try {
      // Load viral prediction model
      if (this.config.viralPredictionModel) {
        this.viralPredictionModel = await tf.loadLayersModel(
          this.config.viralPredictionModel
        );
        this.logger.info('Viral prediction model loaded');
      }

      // Load audience quality model
      if (this.config.audienceQualityModel) {
        this.audienceQualityModel = await tf.loadLayersModel(
          this.config.audienceQualityModel
        );
        this.logger.info('Audience quality model loaded');
      }

      // Load content classification model
      if (this.config.contentClassificationModel) {
        this.contentClassificationModel = await tf.loadLayersModel(
          this.config.contentClassificationModel
        );
        this.logger.info('Content classification model loaded');
      }

      // Load trend forecasting model
      if (this.config.trendForecastingModel) {
        this.trendForecastingModel = await tf.loadLayersModel(
          this.config.trendForecastingModel
        );
        this.logger.info('Trend forecasting model loaded');
      }

    } catch (error) {
      this.logger.warn('Some ML models failed to load:', error);
      // Continue without ML features if models fail to load
    }
  }

  /**
   * Initialize Puppeteer browser pool for scraping
   */
  private async initializeBrowserPool(): Promise<void> {
    this.logger.info(`Initializing browser pool with ${this.config.browserCount} browsers...`);

    const browserPromises = [];
    for (let i = 0; i < this.config.browserCount; i++) {
      browserPromises.push(this.createBrowser());
    }

    this.browserPool = await Promise.all(browserPromises);

    // Pre-create pages for faster access
    for (const browser of this.browserPool) {
      for (let i = 0; i < this.config.pagePoolSize; i++) {
        const page = await browser.newPage();
        await this.configurePage(page);
        this.pagePool.push(page);
      }
    }

    this.logger.info(`Browser pool initialized with ${this.pagePool.length} pages`);
  }

  /**
   * Create a configured browser instance
   */
  private async createBrowser(): Promise<Browser> {
    const args = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-blink-features=AutomationControlled',
      `--window-size=${this.getRandomViewport().width},${this.getRandomViewport().height}`
    ];

    if (this.config.proxyList.length > 0) {
      const proxy = this.getRandomProxy();
      args.push(`--proxy-server=${proxy}`);
    }

    return await puppeteer.launch({
      headless: this.config.headless,
      args,
      ignoreHTTPSErrors: true,
      defaultViewport: null,
      executablePath: process.env.CHROME_BIN || undefined
    });
  }

  /**
   * Configure a page with stealth settings
   */
  private async configurePage(page: Page): Promise<void> {
    // Set random viewport
    const viewport = this.getRandomViewport();
    await page.setViewport(viewport);

    // Set random user agent
    const userAgent = this.getRandomUserAgent();
    await page.setUserAgent(userAgent);

    // Add extra headers
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
    });

    // Inject custom scripts to evade detection
    await page.evaluateOnNewDocument(() => {
      // Override navigator properties
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined
      });

      // Override chrome property
      Object.defineProperty(window, 'chrome', {
        writable: true,
        value: {
          runtime: {},
          loadTimes: () => {},
          csi: () => {},
          app: {}
        }
      });

      // Override permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters: any) => {
        if (parameters.name === 'notifications') {
          return Promise.resolve({ state: 'denied' } as PermissionStatus);
        }
        return originalQuery.call(window.navigator.permissions, parameters);
      };

      // Add fake plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [
          {
            name: 'Chrome PDF Plugin',
            description: 'Portable Document Format',
            filename: 'internal-pdf-viewer',
            length: 1
          }
        ]
      });

      // Override language
      Object.defineProperty(navigator, 'language', {
        get: () => 'en-US'
      });

      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en']
      });

      // Add WebGL vendor and renderer
      const getParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function(parameter) {
        if (parameter === 37445) {
          return 'Intel Inc.';
        }
        if (parameter === 37446) {
          return 'Intel Iris OpenGL Engine';
        }
        return getParameter.call(this, parameter);
      };
    });

    // Set cookies if available
    const cookies = await this.getCookiesFromCache();
    if (cookies && cookies.length > 0) {
      await page.setCookie(...cookies);
    }

    // Handle dialog events
    page.on('dialog', async dialog => {
      await dialog.dismiss();
    });

    // Handle popup blocking
    page.on('popup', async popup => {
      await popup.close();
    });
  }

  /**
   * Initialize proxy pool with health checks
   */
  private async initializeProxyPool(): Promise<void> {
    this.logger.info(`Initializing proxy pool with ${this.config.proxyList.length} proxies...`);

    const proxyChecks = this.config.proxyList.map(proxy =>
      this.checkProxyHealth(proxy)
    );

    const results = await Promise.allSettled(proxyChecks);

    let healthyProxies = 0;
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        const proxy = this.config.proxyList[index];
        const agent = new SocksProxyAgent(proxy);
        this.proxyAgents.set(proxy, agent);
        healthyProxies++;
      }
    });

    this.logger.info(`Proxy pool initialized with ${healthyProxies} healthy proxies`);

    if (healthyProxies === 0) {
      this.logger.warn('No healthy proxies available, continuing without proxy');
    }
  }

  /**
   * Check if a proxy is healthy
   */
  private async checkProxyHealth(proxy: string): Promise<boolean> {
    try {
      const agent = new SocksProxyAgent(proxy);
      const response = await axios.get('https://api.ipify.org?format=json', {
        httpAgent: agent,
        httpsAgent: agent,
        timeout: 5000
      });

      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * Verify all external connections
   */
  private async verifyConnections(): Promise<void> {
    this.logger.info('Verifying external connections...');

    // Check Redis
    try {
      await this.redis.ping();
      this.logger.info('✓ Redis connection verified');
    } catch (error) {
      this.logger.error('✗ Redis connection failed:', error);
      throw error;
    }

    // Check PostgreSQL
    try {
      const client = await this.db.connect();
      await client.query('SELECT 1');
      client.release();
      this.logger.info('✓ PostgreSQL connection verified');
    } catch (error) {
      this.logger.error('✗ PostgreSQL connection failed:', error);
      throw error;
    }

    // Check InfluxDB
    try {
      const writeApi = this.influx.getWriteApi(
        process.env.INFLUX_ORG!,
        'tiktok-metrics'
      );
      const point = new Point('connection_test')
        .tag('service', 'tiktok-scraper')
        .floatField('value', 1);
      writeApi.writePoint(point);
      await writeApi.close();
      this.logger.info('✓ InfluxDB connection verified');
    } catch (error) {
      this.logger.warn('✗ InfluxDB connection failed (non-critical):', error);
    }
  }

  /**
   * Warm up cache with frequently accessed data
   */
  private async warmUpCache(): Promise<void> {
    this.logger.info('Warming up cache...');

    try {
      // Load trending hashtags
      const trendingHashtags = await this.fetchTrendingHashtags();
      for (const hashtag of trendingHashtags) {
        this.cache.set(`hashtag:${hashtag.id}`, hashtag);
      }

      // Load trending sounds
      const trendingSounds = await this.fetchTrendingSounds();
      for (const sound of trendingSounds) {
        this.cache.set(`sound:${sound.id}`, sound);
      }

      // Load top creators
      const topCreators = await this.fetchTopCreators();
      for (const creator of topCreators) {
        this.cache.set(`user:${creator.id}`, creator);
      }

      this.logger.info(`Cache warmed up with ${this.cache.size} entries`);

    } catch (error) {
      this.logger.warn('Cache warm-up failed (non-critical):', error);
    }
  }

  /**
   * Set up HTTP client interceptors
   */
  private setupHttpInterceptors(): void {
    // Request interceptor
    this.httpClient.interceptors.request.use(
      async (config) => {
        // Wait for rate limit
        await this.rateLimiter.removeTokens(1);

        // Add proxy if available
        if (this.proxyAgents.size > 0) {
          const proxy = this.getRandomProxyAgent();
          config.httpAgent = proxy;
          config.httpsAgent = proxy;
        }

        // Add random headers
        config.headers['X-Request-ID'] = crypto.randomUUID();
        config.headers['X-Timestamp'] = Date.now().toString();

        // Log request
        this.logger.debug(`Request: ${config.method?.toUpperCase()} ${config.url}`);

        return config;
      },
      (error) => {
        this.logger.error('Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.httpClient.interceptors.response.use(
      (response) => {
        // Update metrics
        this.metrics.requestsSuccess++;

        // Log response
        this.logger.debug(`Response: ${response.status} ${response.config.url}`);

        return response;
      },
      async (error) => {
        // Update metrics
        this.metrics.requestsFailed++;

        // Handle rate limiting
        if (error.response?.status === 429) {
          const retryAfter = parseInt(error.response.headers['retry-after'] || '60');
          this.logger.warn(`Rate limited, waiting ${retryAfter} seconds...`);
          await this.sleep(retryAfter * 1000);
          return this.httpClient.request(error.config);
        }

        // Handle proxy failure
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
          this.logger.warn('Proxy failure, rotating proxy...');
          this.metrics.proxyRotations++;
          return this.httpClient.request(error.config);
        }

        // Retry logic
        const config = error.config;
        if (!config || !config.retry) {
          config.retry = 0;
        }

        if (config.retry < this.config.retryAttempts) {
          config.retry++;
          const delay = this.config.retryDelay * Math.pow(this.config.backoffMultiplier, config.retry);
          this.logger.debug(`Retrying request (${config.retry}/${this.config.retryAttempts}) after ${delay}ms`);
          await this.sleep(delay);
          return this.httpClient.request(config);
        }

        this.logger.error('Request failed:', error);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Set up event handlers
   */
  private setupEventHandlers(): void {
    // Handle process termination
    process.on('SIGINT', async () => {
      this.logger.info('Received SIGINT, shutting down gracefully...');
      await this.shutdown();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      this.logger.info('Received SIGTERM, shutting down gracefully...');
      await this.shutdown();
      process.exit(0);
    });

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      this.logger.error('Uncaught exception:', error);
      Sentry.captureException(error);
    });

    process.on('unhandledRejection', (reason, promise) => {
      this.logger.error('Unhandled rejection at:', promise, 'reason:', reason);
      Sentry.captureException(reason);
    });

    // Redis events
    this.redis.on('error', (error) => {
      this.logger.error('Redis error:', error);
    });

    this.redis.on('reconnecting', () => {
      this.logger.info('Redis reconnecting...');
    });

    // Worker events
    this.worker.on('completed', (job) => {
      this.logger.debug(`Job ${job.id} completed`);
      this.emit('jobCompleted', job);
    });

    this.worker.on('failed', (job, error) => {
      this.logger.error(`Job ${job?.id} failed:`, error);
      this.emit('jobFailed', { job, error });
    });

    // Queue events
    this.queue.on('waiting', (jobId) => {
      this.logger.debug(`Job ${jobId} waiting`);
    });

    this.queue.on('active', (job) => {
      this.logger.debug(`Job ${job.id} active`);
    });
  }

  /**
   * Start health check intervals
   */
  private startHealthChecks(): void {
    // Proxy health check
    setInterval(async () => {
      for (const [proxy, agent] of this.proxyAgents.entries()) {
        const isHealthy = await this.checkProxyHealth(proxy);
        if (!isHealthy) {
          this.logger.warn(`Proxy ${proxy} is unhealthy, removing from pool`);
          this.proxyAgents.delete(proxy);
        }
      }
    }, this.config.proxyHealthCheckInterval);

    // Browser health check
    setInterval(async () => {
      for (let i = 0; i < this.browserPool.length; i++) {
        const browser = this.browserPool[i];
        if (!browser.isConnected()) {
          this.logger.warn(`Browser ${i} disconnected, recreating...`);
          try {
            await browser.close();
          } catch (e) {
            // Ignore close errors
          }
          this.browserPool[i] = await this.createBrowser();
        }
      }
    }, 60000);

    // Memory check
    setInterval(() => {
      const usage = process.memoryUsage();
      const heapUsedMB = usage.heapUsed / 1024 / 1024;
      const heapTotalMB = usage.heapTotal / 1024 / 1024;
      const rssMB = usage.rss / 1024 / 1024;

      this.logger.debug(`Memory usage - Heap: ${heapUsedMB.toFixed(2)}/${heapTotalMB.toFixed(2)} MB, RSS: ${rssMB.toFixed(2)} MB`);

      // Force garbage collection if memory usage is high
      if (heapUsedMB > 1024) {
        if (global.gc) {
          global.gc();
          this.logger.info('Forced garbage collection due to high memory usage');
        }
      }
    }, 30000);
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    setInterval(async () => {
      const writeApi = this.influx.getWriteApi(
        process.env.INFLUX_ORG!,
        'tiktok-metrics'
      );

      // Write scraper metrics
      const scraperPoint = new Point('scraper_metrics')
        .tag('service', 'tiktok-scraper')
        .intField('requests_total', this.metrics.requestsTotal)
        .intField('requests_success', this.metrics.requestsSuccess)
        .intField('requests_failed', this.metrics.requestsFailed)
        .floatField('avg_response_time', this.metrics.avgResponseTime)
        .intField('cache_hits', this.metrics.cacheHits)
        .intField('cache_misses', this.metrics.cacheMisses)
        .intField('proxy_rotations', this.metrics.proxyRotations)
        .intField('captchas_solved', this.metrics.captchasSolved)
        .intField('data_points_collected', this.metrics.dataPointsCollected)
        .intField('predictions_generated', this.metrics.predictionsGenerated);

      writeApi.writePoint(scraperPoint);

      // Write system metrics
      const usage = process.memoryUsage();
      const systemPoint = new Point('system_metrics')
        .tag('service', 'tiktok-scraper')
        .floatField('heap_used_mb', usage.heapUsed / 1024 / 1024)
        .floatField('heap_total_mb', usage.heapTotal / 1024 / 1024)
        .floatField('rss_mb', usage.rss / 1024 / 1024)
        .floatField('cpu_usage', process.cpuUsage().user / 1000000)
        .intField('active_browsers', this.browserPool.length)
        .intField('active_pages', this.pagePool.length)
        .intField('cache_size', this.cache.size)
        .intField('proxy_count', this.proxyAgents.size);

      writeApi.writePoint(systemPoint);

      await writeApi.close();

      // Emit metrics event
      this.emit('metrics', this.metrics);

    }, 60000); // Every minute
  }

  // ============================================================================
  // CORE SCRAPING METHODS
  // ============================================================================

  /**
   * Scrape user profile with enriched analytics
   */
  async scrapeUserProfile(username: string, options?: {
    includeVideos?: boolean;
    videoLimit?: number;
    includeDemographics?: boolean;
    includePredictions?: boolean;
    includeCompetitors?: boolean;
  }): Promise<TikTokUserProfile> {
    const startTime = performance.now();
    const cacheKey = `user:${username}`;

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && !options?.includePredictions) {
      this.metrics.cacheHits++;
      return cached;
    }
    this.metrics.cacheMisses++;

    try {
      // Use browser for dynamic content
      const page = await this.getAvailablePage();

      try {
        const url = `https://www.tiktok.com/@${username}`;
        await page.goto(url, {
          waitUntil: 'networkidle2',
          timeout: 30000
        });

        // Wait for profile to load
        await page.waitForSelector('[data-e2e="user-avatar"]', { timeout: 10000 });

        // Extract basic profile data
        const profileData = await page.evaluate(() => {
          const getTextContent = (selector: string): string => {
            const el = document.querySelector(selector);
            return el?.textContent?.trim() || '';
          };

          const getNumber = (text: string): number => {
            const match = text.match(/[\d.]+[KMB]?/);
            if (!match) return 0;

            let num = parseFloat(match[0].replace(/[KMB]/, ''));
            if (match[0].includes('K')) num *= 1000;
            if (match[0].includes('M')) num *= 1000000;
            if (match[0].includes('B')) num *= 1000000000;

            return Math.floor(num);
          };

          return {
            uniqueId: window.location.pathname.replace('/@', ''),
            nickname: getTextContent('[data-e2e="user-title"]'),
            signature: getTextContent('[data-e2e="user-bio"]'),
            avatarUrl: (document.querySelector('[data-e2e="user-avatar"] img') as HTMLImageElement)?.src || '',
            verified: !!document.querySelector('[data-e2e="verified-badge"]'),
            followingCount: getNumber(getTextContent('[data-e2e="following-count"]')),
            followerCount: getNumber(getTextContent('[data-e2e="followers-count"]')),
            heartCount: getNumber(getTextContent('[data-e2e="likes-count"]')),
            videoCount: parseInt(getTextContent('[data-e2e="video-count"]')) || 0
          };
        });

        // Get user ID from page data
        const userId = await page.evaluate(() => {
          const scripts = Array.from(document.querySelectorAll('script'));
          for (const script of scripts) {
            const match = script.innerHTML.match(/"userId":"(\d+)"/);
            if (match) return match[1];
          }
          return null;
        });

        // Build profile object
        const profile: TikTokUserProfile = {
          id: userId || crypto.randomUUID(),
          ...profileData,
          diggCount: 0, // Will be calculated from videos

          // Calculate enriched metrics
          engagementRate: 0,
          growthRate: 0,
          viralityScore: 0,
          authenticityScore: 0,
          commercialValue: 0,
          audienceQuality: 0,
          contentConsistency: 0,
          brandSafety: 0,

          // Initialize empty structures
          audienceDemographics: {
            ageDistribution: {},
            genderDistribution: {},
            locationDistribution: {},
            interestCategories: [],
            deviceTypes: {},
            activeHours: []
          },

          performanceMetrics: {
            avgViews: 0,
            avgLikes: 0,
            avgComments: 0,
            avgShares: 0,
            viralVideoCount: 0,
            trendsParticipated: 0,
            originalSounds: 0
          },

          predictions: {
            next30DayFollowers: 0,
            viralProbability: 0,
            tourDemandScore: 0,
            merchandiseAffinity: 0,
            collaborationValue: 0
          },

          metadata: {
            scrapedAt: new Date(),
            dataFreshness: 1.0,
            confidenceScore: 0.95
          }
        };

        // Fetch videos if requested
        let videos: TikTokVideo[] = [];
        if (options?.includeVideos) {
          videos = await this.scrapeUserVideos(
            username,
            options.videoLimit || 30,
            page
          );

          // Calculate performance metrics from videos
          if (videos.length > 0) {
            profile.performanceMetrics.avgViews = videos.reduce((sum, v) => sum + v.stats.playCount, 0) / videos.length;
            profile.performanceMetrics.avgLikes = videos.reduce((sum, v) => sum + v.stats.diggCount, 0) / videos.length;
            profile.performanceMetrics.avgComments = videos.reduce((sum, v) => sum + v.stats.commentCount, 0) / videos.length;
            profile.performanceMetrics.avgShares = videos.reduce((sum, v) => sum + v.stats.shareCount, 0) / videos.length;
            profile.performanceMetrics.viralVideoCount = videos.filter(v => v.viralIndicators.isViral).length;
            profile.diggCount = videos.reduce((sum, v) => sum + v.stats.diggCount, 0);

            // Calculate engagement rate
            const totalEngagement = videos.reduce((sum, v) =>
              sum + v.stats.diggCount + v.stats.commentCount + v.stats.shareCount, 0
            );
            const totalViews = videos.reduce((sum, v) => sum + v.stats.playCount, 0);
            profile.engagementRate = totalViews > 0 ? (totalEngagement / totalViews) * 100 : 0;

            // Calculate virality score
            profile.viralityScore = this.calculateViralityScore(videos);

            // Calculate content consistency
            profile.contentConsistency = this.calculateContentConsistency(videos);
          }
        }

        // Fetch audience demographics if requested
        if (options?.includeDemographics) {
          profile.audienceDemographics = await this.fetchAudienceDemographics(userId!);
        }

        // Generate predictions if requested
        if (options?.includePredictions) {
          profile.predictions = await this.generateUserPredictions(profile, videos);
        }

        // Calculate authenticity score
        profile.authenticityScore = await this.calculateAuthenticityScore(profile);

        // Calculate commercial value
        profile.commercialValue = this.calculateCommercialValue(profile);

        // Calculate audience quality
        profile.audienceQuality = await this.calculateAudienceQuality(profile);

        // Calculate brand safety
        profile.brandSafety = await this.calculateBrandSafety(profile, videos);

        // Store in cache
        this.cache.set(cacheKey, profile);

        // Store in database
        await this.storeUserProfile(profile);

        // Update metrics
        this.metrics.dataPointsCollected++;
        this.metrics.requestsTotal++;
        this.metrics.avgResponseTime =
          (this.metrics.avgResponseTime * (this.metrics.requestsTotal - 1) +
          (performance.now() - startTime)) / this.metrics.requestsTotal;

        // Emit event
        this.emit('userScraped', profile);

        return profile;

      } finally {
        // Return page to pool
        this.pagePool.push(page);
      }

    } catch (error) {
      this.logger.error(`Failed to scrape user ${username}:`, error);
      Sentry.captureException(error, {
        tags: { operation: 'scrapeUserProfile', username }
      });
      throw error;
    }
  }

  /**
   * Scrape user videos
   */
  private async scrapeUserVideos(
    username: string,
    limit: number,
    page: Page
  ): Promise<TikTokVideo[]> {
    const videos: TikTokVideo[] = [];

    try {
      // Scroll to load videos
      let previousHeight = 0;
      let scrollAttempts = 0;
      const maxScrollAttempts = Math.ceil(limit / 12); // Approx 12 videos per scroll

      while (videos.length < limit && scrollAttempts < maxScrollAttempts) {
        // Extract visible videos
        const newVideos = await page.evaluate(() => {
          const videoElements = document.querySelectorAll('[data-e2e="user-post-item"]');
          return Array.from(videoElements).map(el => {
            const link = el.querySelector('a')?.href || '';
            const stats = el.querySelector('[data-e2e="video-views"]')?.textContent || '0';

            return {
              link,
              views: stats
            };
          });
        });

        // Process new videos
        for (const video of newVideos) {
          if (videos.length >= limit) break;

          const videoId = video.link.split('/').pop() || '';
          if (!videos.find(v => v.id === videoId)) {
            const videoData = await this.scrapeVideo(videoId);
            if (videoData) {
              videos.push(videoData);
            }
          }
        }

        // Scroll down
        const currentHeight = await page.evaluate(() => document.body.scrollHeight);
        if (currentHeight === previousHeight) {
          break; // No more content to load
        }
        previousHeight = currentHeight;

        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await this.sleep(2000); // Wait for content to load
        scrollAttempts++;
      }

    } catch (error) {
      this.logger.error(`Failed to scrape videos for ${username}:`, error);
    }

    return videos;
  }

  /**
   * Scrape individual video
   */
  async scrapeVideo(videoId: string): Promise<TikTokVideo | null> {
    const cacheKey = `video:${videoId}`;

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached) {
      this.metrics.cacheHits++;
      return cached;
    }
    this.metrics.cacheMisses++;

    try {
      // Use API endpoint if available
      const response = await this.httpClient.get(
        `https://www.tiktok.com/api/item/detail/?itemId=${videoId}`,
        {
          headers: {
            'Referer': 'https://www.tiktok.com/',
            'Accept': 'application/json'
          }
        }
      );

      if (response.data?.itemInfo?.itemStruct) {
        const item = response.data.itemInfo.itemStruct;

        const video: TikTokVideo = {
          id: item.id,
          description: item.desc || '',
          createTime: item.createTime,
          authorId: item.author?.id || '',
          musicId: item.music?.id || '',
          covers: item.video?.cover ? [item.video.cover] : [],
          videoUrl: item.video?.playAddr || '',
          shareUrl: `https://www.tiktok.com/@${item.author?.uniqueId}/video/${item.id}`,

          stats: {
            playCount: item.stats?.playCount || 0,
            shareCount: item.stats?.shareCount || 0,
            commentCount: item.stats?.commentCount || 0,
            diggCount: item.stats?.diggCount || 0,
            collectCount: item.stats?.collectCount || 0
          },

          analytics: {
            completionRate: 0, // Will be calculated
            replayRate: 0,
            engagementVelocity: 0,
            viralityCoefficient: 0,
            sentimentScore: 0,
            toxicityScore: 0,
            authenticEngagement: 0,
            botActivityScore: 0
          },

          viralIndicators: {
            isViral: false,
            viralRank: 0,
            trendParticipation: false,
            algorithmBoost: false,
            crossPlatformShares: 0,
            celebrityEngagement: false,
            mediaPickup: false
          },

          contentAnalysis: {
            hashtags: item.textExtra?.map((t: any) => t.hashtagName).filter(Boolean) || [],
            mentions: item.textExtra?.map((t: any) => t.userId).filter(Boolean) || [],
            soundName: item.music?.title || '',
            soundAuthor: item.music?.authorName || '',
            soundOriginal: item.music?.original || false,
            duration: item.video?.duration || 0,
            aspectRatio: `${item.video?.width}:${item.video?.height}`,
            effects: item.effectStickers?.map((e: any) => e.name) || [],
            language: item.language || 'en',
            captionEntities: item.textExtra || []
          },

          audienceInsights: {
            viewerDemographics: {},
            shareDestinations: {},
            commentSentiment: {},
            peakViewingHours: [],
            geoDistribution: {}
          },

          temporalPatterns: {
            hourlyViews: [],
            dailyEngagement: [],
            viralityTimeline: [],
            plateauPoint: null,
            projectedLifetime: 0
          }
        };

        // Calculate advanced analytics
        video.analytics = await this.calculateVideoAnalytics(video);

        // Determine viral indicators
        video.viralIndicators = this.determineViralIndicators(video);

        // Analyze temporal patterns
        video.temporalPatterns = await this.analyzeTemporalPatterns(video);

        // Cache the result
        this.cache.set(cacheKey, video);

        // Store in database
        await this.storeVideo(video);

        // Update metrics
        this.metrics.dataPointsCollected++;

        return video;
      }

    } catch (error) {
      this.logger.error(`Failed to scrape video ${videoId}:`, error);
    }

    return null;
  }

  /**
   * Scrape trending content
   */
  async scrapeTrendingContent(options?: {
    region?: string;
    category?: string;
    limit?: number;
  }): Promise<{
    videos: TikTokVideo[];
    hashtags: TikTokHashtagTrend[];
    sounds: TikTokSoundTrend[];
    creators: TikTokUserProfile[];
  }> {
    const region = options?.region || 'US';
    const limit = options?.limit || 50;

    this.logger.info(`Scraping trending content for ${region}...`);

    const [videos, hashtags, sounds, creators] = await Promise.all([
      this.scrapeTrendingVideos(region, limit),
      this.scrapeTrendingHashtags(region, limit),
      this.scrapeTrendingSounds(region, limit),
      this.scrapeTrendingCreators(region, limit)
    ]);

    // Store trending data
    await this.storeTrendingData({ videos, hashtags, sounds, creators });

    // Emit event
    this.emit('trendingScraped', { videos, hashtags, sounds, creators });

    return { videos, hashtags, sounds, creators };
  }

  // ============================================================================
  // HELPER METHODS - Continued in next message due to length...
  // ============================================================================
}

// Export the scraper
export default TikTokAdvancedScraper;
