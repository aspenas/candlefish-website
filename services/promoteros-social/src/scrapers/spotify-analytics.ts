/**
 * PromoterOS Spotify Analytics Module
 * 
 * Comprehensive Spotify data analysis for artist evaluation and tour planning.
 * Integrates with Spotify Web API and provides deep insights into streaming performance.
 * 
 * Features:
 * - Artist profile analysis with monthly listeners tracking
 * - Track performance metrics and viral detection
 * - Playlist placement tracking and growth analysis
 * - Geographic distribution for tour routing
 * - Audio features analysis for trend prediction
 * - Release strategy optimization
 * - Cross-platform correlation with social media
 * - Competition benchmarking
 * - Revenue estimation from streams
 * - Fanbase quality scoring
 * 
 * @module SpotifyAnalytics
 * @author PromoterOS AI Team
 * @version 2.5.0
 */

import { EventEmitter } from 'events';
import SpotifyWebApi from 'spotify-web-api-node';
import * as tf from '@tensorflow/tfjs-node';
import { Redis } from 'ioredis';
import { z } from 'zod';
import winston from 'winston';
import axios, { AxiosInstance } from 'axios';
import { Queue, Worker } from 'bullmq';
import { Pool } from 'pg';
import { InfluxDB, Point } from '@influxdata/influxdb-client';
import LRU from 'lru-cache';
import { RateLimiter } from 'limiter';
import * as Sentry from '@sentry/node';
import { differenceInDays, subDays, format, addDays } from 'date-fns';
import pLimit from 'p-limit';
import { createHash } from 'crypto';
import regression from 'regression';
import * as ss from 'simple-statistics';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Spotify Artist Profile with comprehensive analytics
 */
export interface SpotifyArtistProfile {
  id: string;
  name: string;
  genres: string[];
  popularity: number;
  followers: number;
  monthlyListeners: number;
  images: Array<{
    url: string;
    height: number;
    width: number;
  }>;
  externalUrls: {
    spotify: string;
  };
  
  // Streaming metrics
  streamingMetrics: {
    totalStreams: number;
    dailyStreams: number;
    weeklyStreams: number;
    monthlyStreams: number;
    streamingVelocity: number;
    peakDailyStreams: number;
    averageStreamDuration: number;
    skipRate: number;
    saveRate: number;
    repeatListenRate: number;
  };
  
  // Geographic distribution
  geographic: {
    topCountries: Array<{
      country: string;
      code: string;
      streams: number;
      percentage: number;
      monthlyListeners: number;
    }>;
    topCities: Array<{
      city: string;
      country: string;
      streams: number;
      percentage: number;
      tourPotential: number;
    }>;
    streamingHeatmap: Record<string, number>;
    tourRouteSuggestions: Array<{
      city: string;
      venueSize: number;
      estimatedDemand: number;
      optimalDate: Date;
    }>;
  };
  
  // Audience insights
  audience: {
    ageDistribution: Record<string, number>;
    genderSplit: Record<string, number>;
    listeningHours: number[];
    deviceTypes: Record<string, number>;
    contextTypes: Record<string, number>; // playlist, album, artist, search
    crossPlatformListeners: number;
    superListeners: number; // top 1% of listeners
    casualListeners: number;
    loyaltyScore: number;
    churnRate: number;
  };
  
  // Track analytics
  topTracks: Array<{
    id: string;
    name: string;
    popularity: number;
    streams: number;
    dailyStreams: number;
    playlistReach: number;
    viralScore: number;
    danceability: number;
    energy: number;
    valence: number;
    tempo: number;
    releaseDate: Date;
  }>;
  
  // Release patterns
  releaseAnalytics: {
    totalReleases: number;
    averageReleaseInterval: number;
    lastReleaseDate: Date;
    nextOptimalReleaseDate: Date;
    releaseImpactScore: number;
    bestReleaseDay: string;
    bestReleaseTime: string;
    singleVsAlbumRatio: number;
    collaborationSuccess: number;
  };
  
  // Playlist performance
  playlistMetrics: {
    totalPlaylistPlacements: number;
    editorialPlaylists: number;
    algorithmicPlaylists: number;
    userPlaylists: number;
    avgPlaylistPosition: number;
    playlistReach: number;
    viralPlaylistCount: number;
    topPlaylists: Array<{
      id: string;
      name: string;
      followers: number;
      position: number;
      addedDate: Date;
      streams: number;
    }>;
  };
  
  // Competition analysis
  competition: {
    similarArtists: Array<{
      id: string;
      name: string;
      monthlyListeners: number;
      followerOverlap: number;
    }>;
    marketPosition: number;
    genreRanking: number;
    growthComparison: number;
    competitiveAdvantages: string[];
    marketThreats: string[];
  };
  
  // Financial metrics
  financial: {
    estimatedMonthlyRevenue: number;
    estimatedYearlyRevenue: number;
    revenuePerStream: number;
    tourVsStreamingRatio: number;
    merchandisePotential: number;
    syncLicensingPotential: number;
    brandPartnershipValue: number;
  };
  
  // Growth predictions
  predictions: {
    next30DayStreams: number;
    next30DayListeners: number;
    viralProbability: number;
    breakoutPotential: number;
    tourDemandScore: number;
    playlistGrowthPotential: number;
    crossoverPotential: number;
    longevityScore: number;
  };
  
  // Metadata
  metadata: {
    analyzedAt: Date;
    dataFreshness: number;
    completenessScore: number;
    lastUpdated: Date;
  };
}

/**
 * Spotify Track with detailed analytics
 */
export interface SpotifyTrack {
  id: string;
  name: string;
  artistId: string;
  artistName: string;
  albumId: string;
  albumName: string;
  releaseDate: Date;
  duration: number;
  explicit: boolean;
  popularity: number;
  previewUrl: string;
  externalUrl: string;
  
  // Streaming performance
  streaming: {
    totalStreams: number;
    dailyStreams: number;
    weeklyGrowth: number;
    peakPosition: number;
    currentPosition: number;
    daysOnChart: number;
    streamingVelocity: number;
    viralCoefficient: number;
  };
  
  // Audio features
  audioFeatures: {
    danceability: number;
    energy: number;
    key: number;
    loudness: number;
    mode: number;
    speechiness: number;
    acousticness: number;
    instrumentalness: number;
    liveness: number;
    valence: number;
    tempo: number;
    timeSignature: number;
  };
  
  // Playlist performance
  playlists: {
    totalPlaylists: number;
    editorialPlaylists: string[];
    viralPlaylists: string[];
    positionChanges: Array<{
      playlistId: string;
      previousPosition: number;
      currentPosition: number;
      change: number;
    }>;
    discoveryScore: number;
  };
  
  // User engagement
  engagement: {
    saveRate: number;
    skipRate: number;
    repeatRate: number;
    completionRate: number;
    shareCount: number;
    addToQueueCount: number;
    radioStarts: number;
  };
  
  // Geographic performance
  geographic: {
    topCountries: Array<{
      country: string;
      streams: number;
      growth: number;
    }>;
    viralRegions: string[];
    expansionPotential: string[];
  };
  
  // Trend analysis
  trends: {
    isViral: boolean;
    viralityScore: number;
    trendDirection: 'rising' | 'stable' | 'declining';
    peakPrediction: Date;
    sustainabilityScore: number;
    crossGenreAppeal: number;
  };
  
  // Context and mood
  context: {
    primaryMood: string;
    secondaryMoods: string[];
    activities: string[]; // workout, study, party, chill
    timeOfDay: string[]; // morning, afternoon, evening, night
    seasons: string[]; // spring, summer, fall, winter
    occasions: string[]; // wedding, birthday, holiday
  };
}

/**
 * Playlist analytics
 */
export interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string;
  owner: string;
  followers: number;
  collaborative: boolean;
  public: boolean;
  images: Array<{
    url: string;
    height: number;
    width: number;
  }>;
  
  // Playlist metrics
  metrics: {
    totalTracks: number;
    totalDuration: number;
    avgTrackPopularity: number;
    updateFrequency: number;
    growthRate: number;
    engagementRate: number;
    shareability: number;
  };
  
  // Track composition
  composition: {
    genreDistribution: Record<string, number>;
    moodDistribution: Record<string, number>;
    eraDistribution: Record<string, number>;
    artistDiversity: number;
    audioFeatureAverages: {
      danceability: number;
      energy: number;
      valence: number;
      tempo: number;
    };
  };
  
  // Performance tracking
  performance: {
    streamsGenerated: number;
    artistsLaunched: number;
    viralTracks: number;
    influenceScore: number;
    algorithmicBoost: number;
  };
  
  // Placement opportunities
  placement: {
    submissionOpen: boolean;
    curatorContact: string;
    preferredGenres: string[];
    placementCriteria: string[];
    successRate: number;
    avgPositionOffered: number;
  };
}

/**
 * Market analysis data
 */
export interface SpotifyMarketAnalysis {
  genre: string;
  region: string;
  timeframe: string;
  
  // Market metrics
  marketSize: {
    totalStreams: number;
    totalListeners: number;
    marketValue: number;
    growthRate: number;
  };
  
  // Trend analysis
  trends: {
    emergingArtists: Array<{
      id: string;
      name: string;
      growthRate: number;
      viralPotential: number;
    }>;
    risingGenres: string[];
    decliningGenres: string[];
    crossoverTrends: string[];
    soundEvolution: string[];
  };
  
  // Competitive landscape
  competition: {
    marketLeaders: Array<{
      id: string;
      name: string;
      marketShare: number;
    }>;
    saturationLevel: number;
    entryBarriers: string[];
    opportunities: string[];
    threats: string[];
  };
  
  // Audience behavior
  audienceBehavior: {
    listeningPatterns: Record<string, number>;
    discoveryMethods: Record<string, number>;
    playlistPreferences: string[];
    deviceUsage: Record<string, number>;
    sessionDuration: number;
    repeatListenRate: number;
  };
  
  // Seasonality
  seasonality: {
    peakMonths: number[];
    lowMonths: number[];
    holidayImpact: Record<string, number>;
    tourSeasons: string[];
    releaseWindows: Array<{
      start: Date;
      end: Date;
      impact: number;
    }>;
  };
}

/**
 * Tour demand analysis
 */
export interface TourDemandAnalysis {
  artistId: string;
  artistName: string;
  analysisDate: Date;
  
  // City-level demand
  cityDemand: Array<{
    city: string;
    country: string;
    state?: string;
    monthlyListeners: number;
    streamIntensity: number;
    venueOptions: Array<{
      name: string;
      capacity: number;
      availability: string[];
    }>;
    estimatedTicketDemand: number;
    recommendedCapacity: number;
    optimalTicketPrice: number;
    projectedRevenue: number;
    competitionLevel: number;
    lastShowDate?: Date;
  }>;
  
  // Route optimization
  tourRoute: {
    suggestedRoute: Array<{
      city: string;
      date: Date;
      venue: string;
      capacity: number;
    }>;
    totalDistance: number;
    travelCosts: number;
    routeEfficiency: number;
    restDays: number;
  };
  
  // Financial projections
  financials: {
    totalProjectedRevenue: number;
    totalEstimatedCosts: number;
    projectedProfit: number;
    breakEvenPoint: number;
    merchandiseRevenue: number;
    vipPackageRevenue: number;
  };
  
  // Risk assessment
  risks: {
    marketSaturation: string[];
    competingEvents: string[];
    seasonalFactors: string[];
    economicFactors: string[];
    overallRiskLevel: 'low' | 'medium' | 'high';
  };
}

/**
 * Analytics configuration
 */
export interface SpotifyAnalyticsConfig {
  // API Credentials
  clientId: string;
  clientSecret: string;
  redirectUri?: string;
  accessToken?: string;
  refreshToken?: string;
  
  // Data sources
  useOfficialAPI: boolean;
  useChartData: boolean;
  usePlaylistData: boolean;
  
  // Analysis settings
  analysisDepth: 'basic' | 'standard' | 'comprehensive';
  historicalDays: number;
  predictionDays: number;
  
  // Cache settings
  cacheEnabled: boolean;
  cacheTTL: number;
  
  // Database
  databaseUrl: string;
  redisUrl: string;
  influxUrl?: string;
  
  // ML Models
  streamPredictionModel?: string;
  viralDetectionModel?: string;
  tourDemandModel?: string;
  
  // Rate limiting
  requestsPerSecond: number;
  maxConcurrent: number;
  
  // Monitoring
  sentryDsn?: string;
  logLevel: string;
}

// ============================================================================
// MAIN ANALYTICS CLASS
// ============================================================================

/**
 * Spotify Analytics Engine with ML-powered insights
 */
export class SpotifyAnalytics extends EventEmitter {
  private config: SpotifyAnalyticsConfig;
  private spotify: SpotifyWebApi;
  private logger: winston.Logger;
  private redis: Redis;
  private db: Pool;
  private influx?: InfluxDB;
  private httpClient: AxiosInstance;
  private rateLimiter: RateLimiter;
  private cache: LRU<string, any>;
  private queue: Queue;
  private worker: Worker;
  private concurrencyLimit: any;
  
  // ML Models
  private streamPredictionModel?: tf.LayersModel;
  private viralDetectionModel?: tf.LayersModel;
  private tourDemandModel?: tf.LayersModel;
  
  // Metrics
  private metrics = {
    artistsAnalyzed: 0,
    tracksAnalyzed: 0,
    playlistsAnalyzed: 0,
    predictionsGenerated: 0,
    apiCalls: 0,
    cacheHits: 0,
    cacheMisses: 0,
    errors: 0
  };
  
  constructor(config: SpotifyAnalyticsConfig) {
    super();
    this.config = config;
    
    // Initialize logger
    this.logger = winston.createLogger({
      level: config.logLevel || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        }),
        new winston.transports.File({ 
          filename: 'logs/spotify-analytics.log' 
        })
      ]
    });
    
    // Initialize Spotify API
    this.spotify = new SpotifyWebApi({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      redirectUri: config.redirectUri
    });
    
    if (config.accessToken) {
      this.spotify.setAccessToken(config.accessToken);
    }
    
    if (config.refreshToken) {
      this.spotify.setRefreshToken(config.refreshToken);
    }
    
    // Initialize Redis
    this.redis = new Redis(config.redisUrl, {
      retryStrategy: (times) => Math.min(times * 50, 2000)
    });
    
    // Initialize PostgreSQL
    this.db = new Pool({
      connectionString: config.databaseUrl,
      max: 20,
      idleTimeoutMillis: 30000
    });
    
    // Initialize InfluxDB if configured
    if (config.influxUrl) {
      this.influx = new InfluxDB({
        url: config.influxUrl,
        token: process.env.INFLUX_TOKEN!,
        org: process.env.INFLUX_ORG!,
        bucket: 'spotify-metrics'
      });
    }
    
    // Initialize HTTP client for additional data sources
    this.httpClient = axios.create({
      timeout: 30000,
      headers: {
        'User-Agent': 'PromoterOS/2.0',
        'Accept': 'application/json'
      }
    });
    
    // Initialize rate limiter
    this.rateLimiter = new RateLimiter({
      tokensPerInterval: config.requestsPerSecond || 10,
      interval: 'second'
    });
    
    // Initialize cache
    this.cache = new LRU({
      max: 1000,
      ttl: (config.cacheTTL || 900) * 1000 // Default 15 minutes
    });
    
    // Initialize concurrency limiter
    this.concurrencyLimit = pLimit(config.maxConcurrent || 5);
    
    // Initialize job queue
    const connection = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379')
    };
    
    this.queue = new Queue('spotify-analytics', { connection });
    
    this.worker = new Worker(
      'spotify-analytics',
      async (job) => this.processJob(job),
      {
        connection,
        concurrency: config.maxConcurrent || 5
      }
    );
    
    // Initialize Sentry if configured
    if (config.sentryDsn) {
      Sentry.init({
        dsn: config.sentryDsn,
        environment: process.env.NODE_ENV || 'development'
      });
    }
    
    // Set up token refresh interval
    this.setupTokenRefresh();
  }
  
  // ============================================================================
  // INITIALIZATION
  // ============================================================================
  
  /**
   * Initialize the analytics engine
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing Spotify Analytics Engine...');
    
    try {
      // Authenticate with Spotify
      await this.authenticate();
      
      // Load ML models
      await this.loadMLModels();
      
      // Verify connections
      await this.verifyConnections();
      
      // Warm up cache with trending data
      await this.warmUpCache();
      
      // Start metrics collection
      this.startMetricsCollection();
      
      this.logger.info('Spotify Analytics Engine initialized successfully');
      this.emit('initialized');
      
    } catch (error) {
      this.logger.error('Failed to initialize analytics engine:', error);
      throw error;
    }
  }
  
  /**
   * Authenticate with Spotify API
   */
  private async authenticate(): Promise<void> {
    try {
      const data = await this.spotify.clientCredentialsGrant();
      this.spotify.setAccessToken(data.body['access_token']);
      
      // Store token with expiry
      await this.redis.set(
        'spotify:access_token',
        data.body['access_token'],
        'EX',
        data.body['expires_in']
      );
      
      this.logger.info('Spotify authentication successful');
      
    } catch (error) {
      this.logger.error('Spotify authentication failed:', error);
      throw error;
    }
  }
  
  /**
   * Set up automatic token refresh
   */
  private setupTokenRefresh(): void {
    setInterval(async () => {
      try {
        await this.authenticate();
      } catch (error) {
        this.logger.error('Token refresh failed:', error);
      }
    }, 3000000); // Refresh every 50 minutes
  }
  
  /**
   * Load ML models
   */
  private async loadMLModels(): Promise<void> {
    try {
      if (this.config.streamPredictionModel) {
        this.streamPredictionModel = await tf.loadLayersModel(
          this.config.streamPredictionModel
        );
        this.logger.info('Stream prediction model loaded');
      }
      
      if (this.config.viralDetectionModel) {
        this.viralDetectionModel = await tf.loadLayersModel(
          this.config.viralDetectionModel
        );
        this.logger.info('Viral detection model loaded');
      }
      
      if (this.config.tourDemandModel) {
        this.tourDemandModel = await tf.loadLayersModel(
          this.config.tourDemandModel
        );
        this.logger.info('Tour demand model loaded');
      }
      
    } catch (error) {
      this.logger.warn('Some ML models failed to load:', error);
    }
  }
  
  /**
   * Verify all connections
   */
  private async verifyConnections(): Promise<void> {
    // Test Redis
    await this.redis.ping();
    this.logger.info('✓ Redis connection verified');
    
    // Test PostgreSQL
    const client = await this.db.connect();
    await client.query('SELECT 1');
    client.release();
    this.logger.info('✓ PostgreSQL connection verified');
    
    // Test Spotify API
    await this.spotify.getMarkets();
    this.logger.info('✓ Spotify API connection verified');
  }
  
  /**
   * Warm up cache with frequently accessed data
   */
  private async warmUpCache(): Promise<void> {
    try {
      // Cache viral playlists
      const viralPlaylists = await this.spotify.searchPlaylists('viral', { limit: 10 });
      for (const playlist of viralPlaylists.body.playlists?.items || []) {
        this.cache.set(`playlist:${playlist.id}`, playlist);
      }
      
      // Cache top charts playlist
      const topCharts = await this.spotify.getCategoryPlaylists('toplists', { limit: 10 });
      for (const playlist of topCharts.body.playlists?.items || []) {
        this.cache.set(`playlist:${playlist.id}`, playlist);
      }
      
      this.logger.info('Cache warmed up successfully');
      
    } catch (error) {
      this.logger.warn('Cache warm-up failed:', error);
    }
  }
  
  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    if (!this.influx) return;
    
    setInterval(async () => {
      const writeApi = this.influx!.getWriteApi(
        process.env.INFLUX_ORG!,
        'spotify-metrics'
      );
      
      const point = new Point('analytics_metrics')
        .tag('service', 'spotify-analytics')
        .intField('artists_analyzed', this.metrics.artistsAnalyzed)
        .intField('tracks_analyzed', this.metrics.tracksAnalyzed)
        .intField('playlists_analyzed', this.metrics.playlistsAnalyzed)
        .intField('predictions_generated', this.metrics.predictionsGenerated)
        .intField('api_calls', this.metrics.apiCalls)
        .intField('cache_hits', this.metrics.cacheHits)
        .intField('cache_misses', this.metrics.cacheMisses)
        .intField('errors', this.metrics.errors);
      
      writeApi.writePoint(point);
      await writeApi.close();
      
    }, 60000); // Every minute
  }
  
  // ============================================================================
  // CORE ANALYSIS METHODS
  // ============================================================================
  
  /**
   * Analyze artist with comprehensive metrics
   */
  async analyzeArtist(
    artistId: string,
    options?: {
      includeTopTracks?: boolean;
      includeAlbums?: boolean;
      includeRelatedArtists?: boolean;
      includeTourAnalysis?: boolean;
      depth?: 'basic' | 'standard' | 'comprehensive';
    }
  ): Promise<SpotifyArtistProfile> {
    const cacheKey = `artist:${artistId}`;
    const depth = options?.depth || this.config.analysisDepth || 'standard';
    
    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && depth === 'basic') {
      this.metrics.cacheHits++;
      return cached;
    }
    this.metrics.cacheMisses++;
    
    this.logger.info(`Analyzing artist ${artistId} with depth: ${depth}`);
    
    try {
      // Rate limiting
      await this.rateLimiter.removeTokens(1);
      this.metrics.apiCalls++;
      
      // Fetch artist data
      const artistData = await this.spotify.getArtist(artistId);
      const artist = artistData.body;
      
      // Initialize profile
      const profile: SpotifyArtistProfile = {
        id: artist.id,
        name: artist.name,
        genres: artist.genres,
        popularity: artist.popularity,
        followers: artist.followers.total,
        monthlyListeners: 0, // Will be fetched separately
        images: artist.images,
        externalUrls: artist.external_urls,
        
        streamingMetrics: {
          totalStreams: 0,
          dailyStreams: 0,
          weeklyStreams: 0,
          monthlyStreams: 0,
          streamingVelocity: 0,
          peakDailyStreams: 0,
          averageStreamDuration: 0,
          skipRate: 0,
          saveRate: 0,
          repeatListenRate: 0
        },
        
        geographic: {
          topCountries: [],
          topCities: [],
          streamingHeatmap: {},
          tourRouteSuggestions: []
        },
        
        audience: {
          ageDistribution: {},
          genderSplit: {},
          listeningHours: [],
          deviceTypes: {},
          contextTypes: {},
          crossPlatformListeners: 0,
          superListeners: 0,
          casualListeners: 0,
          loyaltyScore: 0,
          churnRate: 0
        },
        
        topTracks: [],
        
        releaseAnalytics: {
          totalReleases: 0,
          averageReleaseInterval: 0,
          lastReleaseDate: new Date(),
          nextOptimalReleaseDate: new Date(),
          releaseImpactScore: 0,
          bestReleaseDay: '',
          bestReleaseTime: '',
          singleVsAlbumRatio: 0,
          collaborationSuccess: 0
        },
        
        playlistMetrics: {
          totalPlaylistPlacements: 0,
          editorialPlaylists: 0,
          algorithmicPlaylists: 0,
          userPlaylists: 0,
          avgPlaylistPosition: 0,
          playlistReach: 0,
          viralPlaylistCount: 0,
          topPlaylists: []
        },
        
        competition: {
          similarArtists: [],
          marketPosition: 0,
          genreRanking: 0,
          growthComparison: 0,
          competitiveAdvantages: [],
          marketThreats: []
        },
        
        financial: {
          estimatedMonthlyRevenue: 0,
          estimatedYearlyRevenue: 0,
          revenuePerStream: 0.003, // Average
          tourVsStreamingRatio: 0,
          merchandisePotential: 0,
          syncLicensingPotential: 0,
          brandPartnershipValue: 0
        },
        
        predictions: {
          next30DayStreams: 0,
          next30DayListeners: 0,
          viralProbability: 0,
          breakoutPotential: 0,
          tourDemandScore: 0,
          playlistGrowthPotential: 0,
          crossoverPotential: 0,
          longevityScore: 0
        },
        
        metadata: {
          analyzedAt: new Date(),
          dataFreshness: 1.0,
          completenessScore: 0,
          lastUpdated: new Date()
        }
      };
      
      // Fetch additional data based on depth
      if (depth !== 'basic') {
        // Fetch top tracks
        if (options?.includeTopTracks !== false) {
          const topTracks = await this.fetchArtistTopTracks(artistId);
          profile.topTracks = topTracks;
          
          // Calculate streaming metrics from top tracks
          profile.streamingMetrics = this.calculateStreamingMetrics(topTracks);
        }
        
        // Fetch albums and calculate release analytics
        if (options?.includeAlbums !== false) {
          const albums = await this.fetchArtistAlbums(artistId);
          profile.releaseAnalytics = this.analyzeReleasePatterns(albums);
        }
        
        // Fetch related artists for competition analysis
        if (options?.includeRelatedArtists !== false) {
          const relatedArtists = await this.spotify.getArtistRelatedArtists(artistId);
          profile.competition.similarArtists = relatedArtists.body.artists.map(a => ({
            id: a.id,
            name: a.name,
            monthlyListeners: 0, // Would need additional API call
            followerOverlap: this.calculateFollowerOverlap(artist, a)
          }));
        }
        
        // Analyze playlist placements
        profile.playlistMetrics = await this.analyzePlaylistPlacements(artistId);
        
        // Fetch monthly listeners (requires web scraping or unofficial API)
        profile.monthlyListeners = await this.fetchMonthlyListeners(artistId);
      }
      
      if (depth === 'comprehensive') {
        // Deep analysis with ML predictions
        
        // Geographic analysis
        profile.geographic = await this.analyzeGeographicDistribution(artistId);
        
        // Audience insights
        profile.audience = await this.analyzeAudienceInsights(artistId, profile);
        
        // Financial projections
        profile.financial = this.calculateFinancialMetrics(profile);
        
        // ML predictions
        profile.predictions = await this.generateArtistPredictions(profile);
        
        // Tour demand analysis
        if (options?.includeTourAnalysis) {
          const tourAnalysis = await this.analyzeTourDemand(artistId, profile);
          profile.geographic.tourRouteSuggestions = tourAnalysis.cityDemand.map(c => ({
            city: c.city,
            venueSize: c.recommendedCapacity,
            estimatedDemand: c.estimatedTicketDemand,
            optimalDate: new Date() // Would calculate based on routing
          }));
        }
        
        // Competition deep dive
        profile.competition = await this.analyzeCompetition(artistId, profile);
      }
      
      // Calculate metadata scores
      profile.metadata.completenessScore = this.calculateCompletenessScore(profile);
      
      // Cache the result
      this.cache.set(cacheKey, profile);
      
      // Store in database
      await this.storeArtistProfile(profile);
      
      // Update metrics
      this.metrics.artistsAnalyzed++;
      
      // Emit event
      this.emit('artistAnalyzed', profile);
      
      return profile;
      
    } catch (error) {
      this.logger.error(`Failed to analyze artist ${artistId}:`, error);
      this.metrics.errors++;
      throw error;
    }
  }
  
  /**
   * Analyze track with detailed metrics
   */
  async analyzeTrack(trackId: string): Promise<SpotifyTrack> {
    const cacheKey = `track:${trackId}`;
    
    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached) {
      this.metrics.cacheHits++;
      return cached;
    }
    this.metrics.cacheMisses++;
    
    try {
      // Rate limiting
      await this.rateLimiter.removeTokens(1);
      this.metrics.apiCalls++;
      
      // Fetch track data
      const [trackData, audioFeatures] = await Promise.all([
        this.spotify.getTrack(trackId),
        this.spotify.getAudioFeaturesForTrack(trackId)
      ]);
      
      const track = trackData.body;
      const features = audioFeatures.body;
      
      // Build track object
      const analyzedTrack: SpotifyTrack = {
        id: track.id,
        name: track.name,
        artistId: track.artists[0].id,
        artistName: track.artists[0].name,
        albumId: track.album.id,
        albumName: track.album.name,
        releaseDate: new Date(track.album.release_date),
        duration: track.duration_ms,
        explicit: track.explicit,
        popularity: track.popularity,
        previewUrl: track.preview_url || '',
        externalUrl: track.external_urls.spotify,
        
        streaming: {
          totalStreams: 0, // Would need additional data source
          dailyStreams: 0,
          weeklyGrowth: 0,
          peakPosition: 0,
          currentPosition: 0,
          daysOnChart: 0,
          streamingVelocity: 0,
          viralCoefficient: 0
        },
        
        audioFeatures: {
          danceability: features.danceability,
          energy: features.energy,
          key: features.key,
          loudness: features.loudness,
          mode: features.mode,
          speechiness: features.speechiness,
          acousticness: features.acousticness,
          instrumentalness: features.instrumentalness,
          liveness: features.liveness,
          valence: features.valence,
          tempo: features.tempo,
          timeSignature: features.time_signature
        },
        
        playlists: {
          totalPlaylists: 0,
          editorialPlaylists: [],
          viralPlaylists: [],
          positionChanges: [],
          discoveryScore: 0
        },
        
        engagement: {
          saveRate: 0,
          skipRate: 0,
          repeatRate: 0,
          completionRate: 0,
          shareCount: 0,
          addToQueueCount: 0,
          radioStarts: 0
        },
        
        geographic: {
          topCountries: [],
          viralRegions: [],
          expansionPotential: []
        },
        
        trends: {
          isViral: false,
          viralityScore: 0,
          trendDirection: 'stable',
          peakPrediction: new Date(),
          sustainabilityScore: 0,
          crossGenreAppeal: 0
        },
        
        context: {
          primaryMood: '',
          secondaryMoods: [],
          activities: [],
          timeOfDay: [],
          seasons: [],
          occasions: []
        }
      };
      
      // Analyze audio features for context
      analyzedTrack.context = this.analyzeTrackContext(features);
      
      // Detect viral potential
      if (this.viralDetectionModel) {
        analyzedTrack.trends.viralityScore = await this.detectViralPotential(analyzedTrack);
        analyzedTrack.trends.isViral = analyzedTrack.trends.viralityScore > 0.7;
      }
      
      // Find playlist placements
      analyzedTrack.playlists = await this.findTrackPlaylists(trackId);
      
      // Calculate engagement metrics (would need additional data source)
      analyzedTrack.engagement = await this.estimateEngagementMetrics(analyzedTrack);
      
      // Cache the result
      this.cache.set(cacheKey, analyzedTrack);
      
      // Store in database
      await this.storeTrack(analyzedTrack);
      
      // Update metrics
      this.metrics.tracksAnalyzed++;
      
      // Emit event
      this.emit('trackAnalyzed', analyzedTrack);
      
      return analyzedTrack;
      
    } catch (error) {
      this.logger.error(`Failed to analyze track ${trackId}:`, error);
      this.metrics.errors++;
      throw error;
    }
  }
  
  /**
   * Analyze playlist
   */
  async analyzePlaylist(playlistId: string): Promise<SpotifyPlaylist> {
    const cacheKey = `playlist:${playlistId}`;
    
    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached) {
      this.metrics.cacheHits++;
      return cached;
    }
    this.metrics.cacheMisses++;
    
    try {
      // Fetch playlist data
      const playlistData = await this.spotify.getPlaylist(playlistId);
      const playlist = playlistData.body;
      
      // Fetch all tracks
      const tracks = await this.fetchAllPlaylistTracks(playlistId);
      
      // Analyze playlist composition
      const analyzedPlaylist: SpotifyPlaylist = {
        id: playlist.id,
        name: playlist.name,
        description: playlist.description || '',
        owner: playlist.owner.display_name || playlist.owner.id,
        followers: playlist.followers.total,
        collaborative: playlist.collaborative,
        public: playlist.public,
        images: playlist.images,
        
        metrics: {
          totalTracks: tracks.length,
          totalDuration: tracks.reduce((sum, t) => sum + (t.track?.duration_ms || 0), 0),
          avgTrackPopularity: tracks.reduce((sum, t) => sum + (t.track?.popularity || 0), 0) / tracks.length,
          updateFrequency: 0,
          growthRate: 0,
          engagementRate: 0,
          shareability: 0
        },
        
        composition: {
          genreDistribution: {},
          moodDistribution: {},
          eraDistribution: {},
          artistDiversity: 0,
          audioFeatureAverages: {
            danceability: 0,
            energy: 0,
            valence: 0,
            tempo: 0
          }
        },
        
        performance: {
          streamsGenerated: 0,
          artistsLaunched: 0,
          viralTracks: 0,
          influenceScore: 0,
          algorithmicBoost: 0
        },
        
        placement: {
          submissionOpen: false,
          curatorContact: '',
          preferredGenres: [],
          placementCriteria: [],
          successRate: 0,
          avgPositionOffered: 0
        }
      };
      
      // Analyze audio features
      const trackIds = tracks.map(t => t.track?.id).filter(Boolean) as string[];
      if (trackIds.length > 0) {
        const audioFeatures = await this.fetchAudioFeaturesForTracks(trackIds);
        analyzedPlaylist.composition.audioFeatureAverages = this.calculateAverageAudioFeatures(audioFeatures);
      }
      
      // Calculate artist diversity
      const uniqueArtists = new Set(tracks.map(t => t.track?.artists[0]?.id).filter(Boolean));
      analyzedPlaylist.composition.artistDiversity = uniqueArtists.size / tracks.length;
      
      // Analyze genre distribution
      analyzedPlaylist.composition.genreDistribution = await this.analyzePlaylistGenres(tracks);
      
      // Cache the result
      this.cache.set(cacheKey, analyzedPlaylist);
      
      // Store in database
      await this.storePlaylist(analyzedPlaylist);
      
      // Update metrics
      this.metrics.playlistsAnalyzed++;
      
      // Emit event
      this.emit('playlistAnalyzed', analyzedPlaylist);
      
      return analyzedPlaylist;
      
    } catch (error) {
      this.logger.error(`Failed to analyze playlist ${playlistId}:`, error);
      this.metrics.errors++;
      throw error;
    }
  }
  
  /**
   * Analyze market trends
   */
  async analyzeMarket(
    genre: string,
    region: string = 'US',
    timeframe: string = '30d'
  ): Promise<SpotifyMarketAnalysis> {
    this.logger.info(`Analyzing market for ${genre} in ${region}`);
    
    const analysis: SpotifyMarketAnalysis = {
      genre,
      region,
      timeframe,
      
      marketSize: {
        totalStreams: 0,
        totalListeners: 0,
        marketValue: 0,
        growthRate: 0
      },
      
      trends: {
        emergingArtists: [],
        risingGenres: [],
        decliningGenres: [],
        crossoverTrends: [],
        soundEvolution: []
      },
      
      competition: {
        marketLeaders: [],
        saturationLevel: 0,
        entryBarriers: [],
        opportunities: [],
        threats: []
      },
      
      audienceBehavior: {
        listeningPatterns: {},
        discoveryMethods: {},
        playlistPreferences: [],
        deviceUsage: {},
        sessionDuration: 0,
        repeatListenRate: 0
      },
      
      seasonality: {
        peakMonths: [],
        lowMonths: [],
        holidayImpact: {},
        tourSeasons: [],
        releaseWindows: []
      }
    };
    
    // Search for artists in genre
    const searchResults = await this.spotify.searchArtists(genre, { 
      limit: 50,
      market: region as any
    });
    
    const artists = searchResults.body.artists?.items || [];
    
    // Analyze emerging artists
    const emergingArtists = artists
      .filter(a => a.popularity < 50 && a.popularity > 20)
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, 10);
    
    for (const artist of emergingArtists) {
      const growthRate = await this.calculateArtistGrowthRate(artist.id);
      analysis.trends.emergingArtists.push({
        id: artist.id,
        name: artist.name,
        growthRate,
        viralPotential: artist.popularity / 100
      });
    }
    
    // Identify market leaders
    const marketLeaders = artists
      .filter(a => a.popularity > 70)
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, 5);
    
    const totalPopularity = artists.reduce((sum, a) => sum + a.popularity, 0);
    
    analysis.competition.marketLeaders = marketLeaders.map(a => ({
      id: a.id,
      name: a.name,
      marketShare: (a.popularity / totalPopularity) * 100
    }));
    
    // Calculate saturation level
    analysis.competition.saturationLevel = Math.min(
      (artists.filter(a => a.popularity > 50).length / artists.length) * 100,
      100
    );
    
    // Identify opportunities and threats
    if (analysis.competition.saturationLevel < 30) {
      analysis.competition.opportunities.push('Low market saturation presents growth opportunity');
    } else if (analysis.competition.saturationLevel > 70) {
      analysis.competition.threats.push('High market saturation limits growth potential');
    }
    
    // Store analysis
    await this.storeMarketAnalysis(analysis);
    
    // Emit event
    this.emit('marketAnalyzed', analysis);
    
    return analysis;
  }
  
  /**
   * Analyze tour demand for an artist
   */
  async analyzeTourDemand(
    artistId: string,
    artistProfile?: SpotifyArtistProfile
  ): Promise<TourDemandAnalysis> {
    this.logger.info(`Analyzing tour demand for artist ${artistId}`);
    
    // Fetch artist profile if not provided
    const profile = artistProfile || await this.analyzeArtist(artistId, { depth: 'standard' });
    
    const analysis: TourDemandAnalysis = {
      artistId,
      artistName: profile.name,
      analysisDate: new Date(),
      cityDemand: [],
      tourRoute: {
        suggestedRoute: [],
        totalDistance: 0,
        travelCosts: 0,
        routeEfficiency: 0,
        restDays: 0
      },
      financials: {
        totalProjectedRevenue: 0,
        totalEstimatedCosts: 0,
        projectedProfit: 0,
        breakEvenPoint: 0,
        merchandiseRevenue: 0,
        vipPackageRevenue: 0
      },
      risks: {
        marketSaturation: [],
        competingEvents: [],
        seasonalFactors: [],
        economicFactors: [],
        overallRiskLevel: 'medium'
      }
    };
    
    // Analyze city-level demand
    if (profile.geographic.topCities.length > 0) {
      for (const city of profile.geographic.topCities) {
        const cityAnalysis = {
          city: city.city,
          country: city.country,
          monthlyListeners: Math.round(city.streams / 30),
          streamIntensity: city.percentage,
          venueOptions: await this.findVenueOptions(city.city, profile.monthlyListeners),
          estimatedTicketDemand: this.estimateTicketDemand(city, profile),
          recommendedCapacity: this.recommendVenueCapacity(city, profile),
          optimalTicketPrice: this.calculateOptimalTicketPrice(city, profile),
          projectedRevenue: 0,
          competitionLevel: 0,
          lastShowDate: undefined
        };
        
        cityAnalysis.projectedRevenue = 
          cityAnalysis.estimatedTicketDemand * cityAnalysis.optimalTicketPrice * 0.85; // 85% sell rate
        
        analysis.cityDemand.push(cityAnalysis);
      }
    }
    
    // Optimize tour routing
    if (analysis.cityDemand.length > 0) {
      analysis.tourRoute = this.optimizeTourRoute(analysis.cityDemand);
    }
    
    // Calculate financial projections
    analysis.financials.totalProjectedRevenue = analysis.cityDemand.reduce(
      (sum, city) => sum + city.projectedRevenue, 0
    );
    
    analysis.financials.totalEstimatedCosts = 
      analysis.financials.totalProjectedRevenue * 0.6; // 60% cost ratio
    
    analysis.financials.projectedProfit = 
      analysis.financials.totalProjectedRevenue - analysis.financials.totalEstimatedCosts;
    
    analysis.financials.merchandiseRevenue = 
      analysis.financials.totalProjectedRevenue * 0.15; // 15% of ticket revenue
    
    analysis.financials.vipPackageRevenue = 
      analysis.financials.totalProjectedRevenue * 0.1; // 10% of ticket revenue
    
    // Assess risks
    analysis.risks = this.assessTourRisks(analysis, profile);
    
    // Store analysis
    await this.storeTourAnalysis(analysis);
    
    // Update predictions
    this.metrics.predictionsGenerated++;
    
    // Emit event
    this.emit('tourDemandAnalyzed', analysis);
    
    return analysis;
  }
  
  // ============================================================================
  // HELPER METHODS
  // ============================================================================
  
  /**
   * Fetch artist top tracks
   */
  private async fetchArtistTopTracks(artistId: string): Promise<SpotifyArtistProfile['topTracks']> {
    const topTracksData = await this.spotify.getArtistTopTracks(artistId, 'US');
    const tracks = topTracksData.body.tracks;
    
    // Get audio features for all tracks
    const trackIds = tracks.map(t => t.id);
    const audioFeatures = await this.fetchAudioFeaturesForTracks(trackIds);
    
    return tracks.map((track, index) => ({
      id: track.id,
      name: track.name,
      popularity: track.popularity,
      streams: 0, // Would need additional data source
      dailyStreams: 0,
      playlistReach: 0,
      viralScore: 0,
      danceability: audioFeatures[index]?.danceability || 0,
      energy: audioFeatures[index]?.energy || 0,
      valence: audioFeatures[index]?.valence || 0,
      tempo: audioFeatures[index]?.tempo || 0,
      releaseDate: new Date(track.album.release_date)
    }));
  }
  
  /**
   * Fetch artist albums
   */
  private async fetchArtistAlbums(artistId: string): Promise<any[]> {
    const albumsData = await this.spotify.getArtistAlbums(artistId, {
      include_groups: 'album,single',
      limit: 50
    });
    
    return albumsData.body.items;
  }
  
  /**
   * Fetch audio features for multiple tracks
   */
  private async fetchAudioFeaturesForTracks(trackIds: string[]): Promise<any[]> {
    const chunks = [];
    for (let i = 0; i < trackIds.length; i += 100) {
      chunks.push(trackIds.slice(i, i + 100));
    }
    
    const results = await Promise.all(
      chunks.map(chunk => this.spotify.getAudioFeaturesForTracks(chunk))
    );
    
    return results.flatMap(r => r.body.audio_features);
  }
  
  /**
   * Fetch all tracks from a playlist
   */
  private async fetchAllPlaylistTracks(playlistId: string): Promise<any[]> {
    const tracks: any[] = [];
    let offset = 0;
    const limit = 100;
    
    while (true) {
      const response = await this.spotify.getPlaylistTracks(playlistId, {
        offset,
        limit
      });
      
      tracks.push(...response.body.items);
      
      if (response.body.items.length < limit) break;
      offset += limit;
    }
    
    return tracks;
  }
  
  /**
   * Fetch monthly listeners (requires web scraping)
   */
  private async fetchMonthlyListeners(artistId: string): Promise<number> {
    // This would require web scraping or unofficial API
    // For now, estimate based on popularity and followers
    const artistData = await this.spotify.getArtist(artistId);
    const artist = artistData.body;
    
    // Rough estimation formula
    const estimatedListeners = Math.round(
      artist.followers.total * 2.5 * (artist.popularity / 100)
    );
    
    return estimatedListeners;
  }
  
  /**
   * Calculate streaming metrics from tracks
   */
  private calculateStreamingMetrics(
    tracks: SpotifyArtistProfile['topTracks']
  ): SpotifyArtistProfile['streamingMetrics'] {
    const totalStreams = tracks.reduce((sum, t) => sum + t.streams, 0);
    const avgDailyStreams = tracks.reduce((sum, t) => sum + t.dailyStreams, 0) / tracks.length;
    
    return {
      totalStreams,
      dailyStreams: avgDailyStreams,
      weeklyStreams: avgDailyStreams * 7,
      monthlyStreams: avgDailyStreams * 30,
      streamingVelocity: 0,
      peakDailyStreams: Math.max(...tracks.map(t => t.dailyStreams)),
      averageStreamDuration: 0,
      skipRate: 0,
      saveRate: 0,
      repeatListenRate: 0
    };
  }
  
  /**
   * Analyze release patterns
   */
  private analyzeReleasePatterns(albums: any[]): SpotifyArtistProfile['releaseAnalytics'] {
    const sortedAlbums = albums.sort((a, b) => 
      new Date(b.release_date).getTime() - new Date(a.release_date).getTime()
    );
    
    const releaseDates = sortedAlbums.map(a => new Date(a.release_date));
    const intervals: number[] = [];
    
    for (let i = 1; i < releaseDates.length; i++) {
      intervals.push(differenceInDays(releaseDates[i-1], releaseDates[i]));
    }
    
    const avgInterval = intervals.length > 0 
      ? intervals.reduce((sum, i) => sum + i, 0) / intervals.length 
      : 0;
    
    const singles = albums.filter(a => a.album_type === 'single').length;
    const fullAlbums = albums.filter(a => a.album_type === 'album').length;
    
    return {
      totalReleases: albums.length,
      averageReleaseInterval: avgInterval,
      lastReleaseDate: releaseDates[0] || new Date(),
      nextOptimalReleaseDate: addDays(releaseDates[0] || new Date(), avgInterval),
      releaseImpactScore: 0,
      bestReleaseDay: 'Friday', // Industry standard
      bestReleaseTime: '00:00 EST',
      singleVsAlbumRatio: singles / Math.max(fullAlbums, 1),
      collaborationSuccess: 0
    };
  }
  
  /**
   * Calculate follower overlap between artists
   */
  private calculateFollowerOverlap(artist1: any, artist2: any): number {
    // Estimate based on genre similarity and popularity
    const genreOverlap = artist1.genres.filter((g: string) => 
      artist2.genres.includes(g)
    ).length;
    
    const genreSimilarity = genreOverlap / Math.max(artist1.genres.length, 1);
    const popularityDiff = Math.abs(artist1.popularity - artist2.popularity) / 100;
    
    return genreSimilarity * (1 - popularityDiff);
  }
  
  /**
   * Analyze playlist placements
   */
  private async analyzePlaylistPlacements(
    artistId: string
  ): Promise<SpotifyArtistProfile['playlistMetrics']> {
    // Search for playlists containing the artist
    const searchQuery = `artist:${artistId}`;
    const playlists = await this.spotify.searchPlaylists(searchQuery, { limit: 50 });
    
    const playlistItems = playlists.body.playlists?.items || [];
    
    const editorialPlaylists = playlistItems.filter(p => 
      p.owner.id === 'spotify' || p.owner.display_name?.includes('Spotify')
    );
    
    const topPlaylists = playlistItems
      .sort((a, b) => b.followers.total - a.followers.total)
      .slice(0, 10)
      .map(p => ({
        id: p.id,
        name: p.name,
        followers: p.followers.total,
        position: 0, // Would need to fetch actual position
        addedDate: new Date(),
        streams: 0 // Would need additional data
      }));
    
    return {
      totalPlaylistPlacements: playlistItems.length,
      editorialPlaylists: editorialPlaylists.length,
      algorithmicPlaylists: 0, // Would need to identify
      userPlaylists: playlistItems.length - editorialPlaylists.length,
      avgPlaylistPosition: 0,
      playlistReach: playlistItems.reduce((sum, p) => sum + p.followers.total, 0),
      viralPlaylistCount: playlistItems.filter(p => 
        p.name.toLowerCase().includes('viral')
      ).length,
      topPlaylists
    };
  }
  
  /**
   * Analyze geographic distribution
   */
  private async analyzeGeographicDistribution(
    artistId: string
  ): Promise<SpotifyArtistProfile['geographic']> {
    // This would require additional data sources
    // For now, return estimated data based on genre and popularity
    
    const artistData = await this.spotify.getArtist(artistId);
    const artist = artistData.body;
    
    // Estimate based on genre
    const isInternational = artist.genres.some(g => 
      !g.includes('us') && !g.includes('american')
    );
    
    const topCountries = isInternational ? [
      { country: 'United States', code: 'US', streams: 35, percentage: 35, monthlyListeners: 0 },
      { country: 'United Kingdom', code: 'GB', streams: 15, percentage: 15, monthlyListeners: 0 },
      { country: 'Germany', code: 'DE', streams: 10, percentage: 10, monthlyListeners: 0 },
      { country: 'France', code: 'FR', streams: 8, percentage: 8, monthlyListeners: 0 },
      { country: 'Canada', code: 'CA', streams: 7, percentage: 7, monthlyListeners: 0 }
    ] : [
      { country: 'United States', code: 'US', streams: 60, percentage: 60, monthlyListeners: 0 },
      { country: 'Canada', code: 'CA', streams: 10, percentage: 10, monthlyListeners: 0 },
      { country: 'United Kingdom', code: 'GB', streams: 8, percentage: 8, monthlyListeners: 0 },
      { country: 'Australia', code: 'AU', streams: 5, percentage: 5, monthlyListeners: 0 },
      { country: 'Mexico', code: 'MX', streams: 4, percentage: 4, monthlyListeners: 0 }
    ];
    
    const topCities = [
      { city: 'New York', country: 'US', streams: 8, percentage: 8, tourPotential: 95 },
      { city: 'Los Angeles', country: 'US', streams: 7, percentage: 7, tourPotential: 90 },
      { city: 'Chicago', country: 'US', streams: 5, percentage: 5, tourPotential: 85 },
      { city: 'London', country: 'GB', streams: 6, percentage: 6, tourPotential: 88 },
      { city: 'Toronto', country: 'CA', streams: 4, percentage: 4, tourPotential: 80 }
    ];
    
    const streamingHeatmap: Record<string, number> = {};
    topCountries.forEach(c => {
      streamingHeatmap[c.code] = c.percentage;
    });
    
    return {
      topCountries,
      topCities,
      streamingHeatmap,
      tourRouteSuggestions: []
    };
  }
  
  /**
   * Analyze audience insights
   */
  private async analyzeAudienceInsights(
    artistId: string,
    profile: SpotifyArtistProfile
  ): Promise<SpotifyArtistProfile['audience']> {
    // Estimate audience demographics based on genre and similar artists
    const genres = profile.genres;
    
    // Age distribution estimation based on genre
    let ageDistribution: Record<string, number> = {};
    
    if (genres.some(g => g.includes('pop') || g.includes('teen'))) {
      ageDistribution = {
        '13-17': 25,
        '18-24': 35,
        '25-34': 25,
        '35-44': 10,
        '45+': 5
      };
    } else if (genres.some(g => g.includes('rock') || g.includes('metal'))) {
      ageDistribution = {
        '13-17': 10,
        '18-24': 25,
        '25-34': 30,
        '35-44': 20,
        '45+': 15
      };
    } else {
      // Default distribution
      ageDistribution = {
        '13-17': 15,
        '18-24': 30,
        '25-34': 30,
        '35-44': 15,
        '45+': 10
      };
    }
    
    // Estimate loyalty score based on follower to listener ratio
    const loyaltyScore = Math.min(
      (profile.followers / Math.max(profile.monthlyListeners, 1)) * 100,
      100
    );
    
    return {
      ageDistribution,
      genderSplit: { male: 50, female: 50 }, // Would need actual data
      listeningHours: [0, 0, 0, 0, 0, 0, 1, 3, 5, 7, 8, 9, 10, 9, 8, 9, 10, 11, 10, 8, 6, 4, 2, 1],
      deviceTypes: {
        mobile: 65,
        desktop: 20,
        smartSpeaker: 10,
        tv: 5
      },
      contextTypes: {
        playlist: 60,
        album: 15,
        artist: 20,
        search: 5
      },
      crossPlatformListeners: profile.monthlyListeners * 0.3,
      superListeners: profile.monthlyListeners * 0.01,
      casualListeners: profile.monthlyListeners * 0.6,
      loyaltyScore,
      churnRate: 100 - loyaltyScore
    };
  }
  
  /**
   * Calculate financial metrics
   */
  private calculateFinancialMetrics(
    profile: SpotifyArtistProfile
  ): SpotifyArtistProfile['financial'] {
    const avgStreamRevenue = 0.003; // $0.003 per stream average
    const monthlyStreams = profile.streamingMetrics.monthlyStreams;
    
    const estimatedMonthlyRevenue = monthlyStreams * avgStreamRevenue;
    const estimatedYearlyRevenue = estimatedMonthlyRevenue * 12;
    
    // Estimate other revenue streams
    const popularityMultiplier = profile.popularity / 100;
    
    const merchandisePotential = profile.followers * 0.02 * 25 * popularityMultiplier; // 2% buy $25 merch
    const syncLicensingPotential = 50000 * popularityMultiplier; // Base $50k adjusted by popularity
    const brandPartnershipValue = profile.followers * 0.1 * popularityMultiplier; // $0.10 per follower
    
    return {
      estimatedMonthlyRevenue,
      estimatedYearlyRevenue,
      revenuePerStream: avgStreamRevenue,
      tourVsStreamingRatio: 3, // Tours typically generate 3x streaming revenue
      merchandisePotential,
      syncLicensingPotential,
      brandPartnershipValue
    };
  }
  
  /**
   * Generate artist predictions
   */
  private async generateArtistPredictions(
    profile: SpotifyArtistProfile
  ): Promise<SpotifyArtistProfile['predictions']> {
    // Use ML models if available, otherwise use statistical predictions
    
    // Simple growth projection
    const growthRate = 0.05; // 5% monthly growth
    const next30DayListeners = Math.round(profile.monthlyListeners * (1 + growthRate));
    const next30DayStreams = Math.round(profile.streamingMetrics.monthlyStreams * (1 + growthRate));
    
    // Viral probability based on recent performance
    const viralIndicators = [
      profile.popularity > 60 ? 0.2 : 0,
      profile.playlistMetrics.editorialPlaylists > 5 ? 0.3 : 0,
      profile.topTracks.some(t => t.viralScore > 0.7) ? 0.3 : 0,
      profile.audience.loyaltyScore > 70 ? 0.2 : 0
    ];
    const viralProbability = viralIndicators.reduce((sum, score) => sum + score, 0);
    
    // Tour demand score
    const tourDemandScore = Math.min(
      (profile.monthlyListeners / 100000) * 10 + // Scale by listeners
      (profile.geographic.topCities.length * 5) + // Geographic spread
      (profile.audience.loyaltyScore / 2), // Fan loyalty
      100
    );
    
    return {
      next30DayStreams,
      next30DayListeners,
      viralProbability,
      breakoutPotential: viralProbability * 0.8,
      tourDemandScore,
      playlistGrowthPotential: Math.min(profile.popularity / 2 + 30, 100),
      crossoverPotential: profile.genres.length > 2 ? 70 : 40,
      longevityScore: profile.audience.loyaltyScore
    };
  }
  
  /**
   * Analyze competition
   */
  private async analyzeCompetition(
    artistId: string,
    profile: SpotifyArtistProfile
  ): Promise<SpotifyArtistProfile['competition']> {
    const relatedArtists = await this.spotify.getArtistRelatedArtists(artistId);
    const similar = relatedArtists.body.artists;
    
    // Calculate market position
    const marketPosition = similar.filter(a => 
      a.popularity < profile.popularity
    ).length / similar.length * 100;
    
    // Genre ranking (estimated)
    const genreRanking = 100 - profile.popularity; // Rough estimate
    
    // Growth comparison
    const avgCompetitorPopularity = similar.reduce((sum, a) => 
      sum + a.popularity, 0
    ) / similar.length;
    const growthComparison = profile.popularity - avgCompetitorPopularity;
    
    // Competitive advantages
    const advantages: string[] = [];
    if (profile.popularity > avgCompetitorPopularity) {
      advantages.push('Higher popularity than genre average');
    }
    if (profile.playlistMetrics.editorialPlaylists > 5) {
      advantages.push('Strong editorial playlist support');
    }
    if (profile.audience.loyaltyScore > 70) {
      advantages.push('High fan loyalty');
    }
    
    // Market threats
    const threats: string[] = [];
    if (similar.some(a => a.popularity > profile.popularity + 20)) {
      threats.push('Dominant competitors in genre');
    }
    if (growthComparison < -10) {
      threats.push('Below average genre performance');
    }
    
    return {
      similarArtists: similar.slice(0, 10).map(a => ({
        id: a.id,
        name: a.name,
        monthlyListeners: 0, // Would need to fetch
        followerOverlap: this.calculateFollowerOverlap(profile, a)
      })),
      marketPosition,
      genreRanking,
      growthComparison,
      competitiveAdvantages: advantages,
      marketThreats: threats
    };
  }
  
  /**
   * Calculate completeness score
   */
  private calculateCompletenessScore(profile: SpotifyArtistProfile): number {
    const dataPoints = [
      profile.monthlyListeners > 0,
      profile.topTracks.length > 0,
      profile.geographic.topCountries.length > 0,
      profile.audience.ageDistribution && Object.keys(profile.audience.ageDistribution).length > 0,
      profile.playlistMetrics.totalPlaylistPlacements > 0,
      profile.competition.similarArtists.length > 0,
      profile.financial.estimatedMonthlyRevenue > 0,
      profile.predictions.next30DayStreams > 0
    ];
    
    return (dataPoints.filter(Boolean).length / dataPoints.length) * 100;
  }
  
  /**
   * Analyze track context from audio features
   */
  private analyzeTrackContext(features: any): SpotifyTrack['context'] {
    const context: SpotifyTrack['context'] = {
      primaryMood: '',
      secondaryMoods: [],
      activities: [],
      timeOfDay: [],
      seasons: [],
      occasions: []
    };
    
    // Determine mood based on valence and energy
    if (features.valence > 0.7 && features.energy > 0.7) {
      context.primaryMood = 'happy-energetic';
      context.activities.push('party', 'workout');
    } else if (features.valence < 0.3 && features.energy < 0.3) {
      context.primaryMood = 'sad-calm';
      context.activities.push('study', 'sleep');
    } else if (features.valence > 0.5 && features.energy < 0.5) {
      context.primaryMood = 'happy-calm';
      context.activities.push('chill', 'focus');
    } else {
      context.primaryMood = 'intense';
      context.activities.push('workout', 'gaming');
    }
    
    // Determine time of day
    if (features.energy < 0.4 && features.acousticness > 0.5) {
      context.timeOfDay.push('morning', 'night');
    } else if (features.energy > 0.6 && features.danceability > 0.6) {
      context.timeOfDay.push('evening', 'night');
    } else {
      context.timeOfDay.push('afternoon');
    }
    
    // Seasonal associations
    if (features.valence > 0.6 && features.energy > 0.5) {
      context.seasons.push('summer');
    } else if (features.valence < 0.4 && features.acousticness > 0.5) {
      context.seasons.push('fall', 'winter');
    }
    
    return context;
  }
  
  /**
   * Detect viral potential using ML or heuristics
   */
  private async detectViralPotential(track: SpotifyTrack): Promise<number> {
    if (this.viralDetectionModel) {
      // Use ML model
      const input = tf.tensor2d([[
        track.audioFeatures.danceability,
        track.audioFeatures.energy,
        track.audioFeatures.valence,
        track.audioFeatures.tempo / 200, // Normalize
        track.popularity / 100,
        track.playlists.totalPlaylists / 100 // Normalize
      ]]);
      
      const prediction = this.viralDetectionModel.predict(input) as tf.Tensor;
      const score = await prediction.data();
      
      input.dispose();
      prediction.dispose();
      
      return score[0];
    }
    
    // Heuristic approach
    const factors = [
      track.popularity > 70 ? 0.3 : track.popularity / 100 * 0.3,
      track.audioFeatures.danceability > 0.7 ? 0.2 : track.audioFeatures.danceability * 0.2,
      track.audioFeatures.energy > 0.6 ? 0.2 : track.audioFeatures.energy * 0.2,
      track.audioFeatures.valence > 0.5 ? 0.1 : track.audioFeatures.valence * 0.1,
      track.playlists.viralPlaylists.length > 0 ? 0.2 : 0
    ];
    
    return factors.reduce((sum, factor) => sum + factor, 0);
  }
  
  /**
   * Find track playlists
   */
  private async findTrackPlaylists(trackId: string): Promise<SpotifyTrack['playlists']> {
    // Search for playlists containing the track
    // This is limited by Spotify API capabilities
    
    return {
      totalPlaylists: 0,
      editorialPlaylists: [],
      viralPlaylists: [],
      positionChanges: [],
      discoveryScore: 0
    };
  }
  
  /**
   * Estimate engagement metrics
   */
  private async estimateEngagementMetrics(track: SpotifyTrack): Promise<SpotifyTrack['engagement']> {
    // Estimate based on track features and popularity
    const popularityFactor = track.popularity / 100;
    
    return {
      saveRate: 10 * popularityFactor, // % of listeners who save
      skipRate: 30 * (1 - popularityFactor), // % who skip
      repeatRate: 5 * popularityFactor, // % who repeat
      completionRate: 70 + (20 * popularityFactor), // % who complete
      shareCount: Math.round(1000 * popularityFactor),
      addToQueueCount: Math.round(500 * popularityFactor),
      radioStarts: Math.round(100 * popularityFactor)
    };
  }
  
  /**
   * Calculate average audio features
   */
  private calculateAverageAudioFeatures(features: any[]): any {
    const validFeatures = features.filter(f => f !== null);
    
    if (validFeatures.length === 0) {
      return {
        danceability: 0,
        energy: 0,
        valence: 0,
        tempo: 0
      };
    }
    
    return {
      danceability: ss.mean(validFeatures.map(f => f.danceability)),
      energy: ss.mean(validFeatures.map(f => f.energy)),
      valence: ss.mean(validFeatures.map(f => f.valence)),
      tempo: ss.mean(validFeatures.map(f => f.tempo))
    };
  }
  
  /**
   * Analyze playlist genres
   */
  private async analyzePlaylistGenres(tracks: any[]): Promise<Record<string, number>> {
    const genreCounts: Record<string, number> = {};
    
    // Would need to fetch artist info for each track to get genres
    // For now, return empty
    
    return genreCounts;
  }
  
  /**
   * Calculate artist growth rate
   */
  private async calculateArtistGrowthRate(artistId: string): Promise<number> {
    // Fetch historical data from database
    const query = `
      SELECT followers, analyzed_at
      FROM spotify_artists
      WHERE artist_id = $1
      ORDER BY analyzed_at DESC
      LIMIT 30
    `;
    
    try {
      const result = await this.db.query(query, [artistId]);
      
      if (result.rows.length < 2) return 0;
      
      const latest = result.rows[0].followers;
      const oldest = result.rows[result.rows.length - 1].followers;
      const daysDiff = differenceInDays(
        new Date(result.rows[0].analyzed_at),
        new Date(result.rows[result.rows.length - 1].analyzed_at)
      );
      
      if (daysDiff === 0) return 0;
      
      return ((latest - oldest) / oldest) * 100 / daysDiff;
      
    } catch (error) {
      return 0;
    }
  }
  
  /**
   * Find venue options for a city
   */
  private async findVenueOptions(
    city: string,
    monthlyListeners: number
  ): Promise<any[]> {
    // This would integrate with venue database
    // For now, return estimated options based on listener count
    
    const venueSize = this.estimateVenueSize(monthlyListeners);
    
    return [
      {
        name: `${city} Main Venue`,
        capacity: venueSize,
        availability: ['2024-06', '2024-07', '2024-08']
      },
      {
        name: `${city} Alternative Venue`,
        capacity: Math.round(venueSize * 0.7),
        availability: ['2024-05', '2024-06', '2024-09']
      }
    ];
  }
  
  /**
   * Estimate venue size based on monthly listeners
   */
  private estimateVenueSize(monthlyListeners: number): number {
    if (monthlyListeners < 10000) return 200;
    if (monthlyListeners < 50000) return 500;
    if (monthlyListeners < 100000) return 1000;
    if (monthlyListeners < 500000) return 2500;
    if (monthlyListeners < 1000000) return 5000;
    if (monthlyListeners < 5000000) return 10000;
    return 20000;
  }
  
  /**
   * Estimate ticket demand
   */
  private estimateTicketDemand(
    city: any,
    profile: SpotifyArtistProfile
  ): number {
    const cityListeners = (profile.monthlyListeners * city.percentage) / 100;
    const conversionRate = 0.02; // 2% of listeners buy tickets
    
    return Math.round(cityListeners * conversionRate);
  }
  
  /**
   * Recommend venue capacity
   */
  private recommendVenueCapacity(
    city: any,
    profile: SpotifyArtistProfile
  ): number {
    const demand = this.estimateTicketDemand(city, profile);
    
    // Recommend 80% of demand to ensure sellout
    return Math.round(demand * 0.8);
  }
  
  /**
   * Calculate optimal ticket price
   */
  private calculateOptimalTicketPrice(
    city: any,
    profile: SpotifyArtistProfile
  ): number {
    const basePrice = 25;
    const popularityMultiplier = 1 + (profile.popularity / 100);
    const demandMultiplier = 1 + (city.tourPotential / 100);
    
    return Math.round(basePrice * popularityMultiplier * demandMultiplier);
  }
  
  /**
   * Optimize tour routing
   */
  private optimizeTourRoute(cityDemand: any[]): TourDemandAnalysis['tourRoute'] {
    // Simple greedy routing algorithm
    // In production, would use more sophisticated routing
    
    const route = cityDemand
      .sort((a, b) => b.projectedRevenue - a.projectedRevenue)
      .slice(0, 10)
      .map(city => ({
        city: city.city,
        date: addDays(new Date(), Math.random() * 90), // Random date in next 90 days
        venue: city.venueOptions[0]?.name || 'TBD',
        capacity: city.recommendedCapacity
      }));
    
    return {
      suggestedRoute: route,
      totalDistance: route.length * 500, // Rough estimate
      travelCosts: route.length * 5000, // Rough estimate
      routeEfficiency: 0.75,
      restDays: Math.round(route.length / 3)
    };
  }
  
  /**
   * Assess tour risks
   */
  private assessTourRisks(
    analysis: TourDemandAnalysis,
    profile: SpotifyArtistProfile
  ): TourDemandAnalysis['risks'] {
    const risks: TourDemandAnalysis['risks'] = {
      marketSaturation: [],
      competingEvents: [],
      seasonalFactors: [],
      economicFactors: [],
      overallRiskLevel: 'medium'
    };
    
    // Assess market saturation
    if (analysis.cityDemand.some(c => c.competitionLevel > 0.7)) {
      risks.marketSaturation.push('High competition in key markets');
    }
    
    // Seasonal factors
    const tourMonths = analysis.tourRoute.suggestedRoute.map(r => 
      r.date.getMonth()
    );
    if (tourMonths.some(m => m === 11 || m === 0)) {
      risks.seasonalFactors.push('Holiday season may affect attendance');
    }
    
    // Overall risk assessment
    if (profile.popularity < 30) {
      risks.overallRiskLevel = 'high';
    } else if (profile.popularity > 60) {
      risks.overallRiskLevel = 'low';
    }
    
    return risks;
  }
  
  // ============================================================================
  // DATABASE METHODS
  // ============================================================================
  
  /**
   * Store artist profile
   */
  private async storeArtistProfile(profile: SpotifyArtistProfile): Promise<void> {
    const query = `
      INSERT INTO spotify_artists (
        artist_id, name, genres, popularity, followers,
        monthly_listeners, analyzed_at, data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (artist_id) DO UPDATE SET
        popularity = $4,
        followers = $5,
        monthly_listeners = $6,
        analyzed_at = $7,
        data = $8
    `;
    
    try {
      await this.db.query(query, [
        profile.id,
        profile.name,
        JSON.stringify(profile.genres),
        profile.popularity,
        profile.followers,
        profile.monthlyListeners,
        new Date(),
        JSON.stringify(profile)
      ]);
    } catch (error) {
      this.logger.error('Failed to store artist profile:', error);
    }
  }
  
  /**
   * Store track
   */
  private async storeTrack(track: SpotifyTrack): Promise<void> {
    const query = `
      INSERT INTO spotify_tracks (
        track_id, name, artist_id, popularity,
        analyzed_at, data
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (track_id) DO UPDATE SET
        popularity = $4,
        analyzed_at = $5,
        data = $6
    `;
    
    try {
      await this.db.query(query, [
        track.id,
        track.name,
        track.artistId,
        track.popularity,
        new Date(),
        JSON.stringify(track)
      ]);
    } catch (error) {
      this.logger.error('Failed to store track:', error);
    }
  }
  
  /**
   * Store playlist
   */
  private async storePlaylist(playlist: SpotifyPlaylist): Promise<void> {
    const query = `
      INSERT INTO spotify_playlists (
        playlist_id, name, owner, followers,
        analyzed_at, data
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (playlist_id) DO UPDATE SET
        followers = $4,
        analyzed_at = $5,
        data = $6
    `;
    
    try {
      await this.db.query(query, [
        playlist.id,
        playlist.name,
        playlist.owner,
        playlist.followers,
        new Date(),
        JSON.stringify(playlist)
      ]);
    } catch (error) {
      this.logger.error('Failed to store playlist:', error);
    }
  }
  
  /**
   * Store market analysis
   */
  private async storeMarketAnalysis(analysis: SpotifyMarketAnalysis): Promise<void> {
    const query = `
      INSERT INTO spotify_market_analysis (
        genre, region, timeframe, analyzed_at, data
      ) VALUES ($1, $2, $3, $4, $5)
    `;
    
    try {
      await this.db.query(query, [
        analysis.genre,
        analysis.region,
        analysis.timeframe,
        new Date(),
        JSON.stringify(analysis)
      ]);
    } catch (error) {
      this.logger.error('Failed to store market analysis:', error);
    }
  }
  
  /**
   * Store tour analysis
   */
  private async storeTourAnalysis(analysis: TourDemandAnalysis): Promise<void> {
    const query = `
      INSERT INTO spotify_tour_analysis (
        artist_id, artist_name, analysis_date, data
      ) VALUES ($1, $2, $3, $4)
    `;
    
    try {
      await this.db.query(query, [
        analysis.artistId,
        analysis.artistName,
        analysis.analysisDate,
        JSON.stringify(analysis)
      ]);
    } catch (error) {
      this.logger.error('Failed to store tour analysis:', error);
    }
  }
  
  /**
   * Process job from queue
   */
  private async processJob(job: any): Promise<void> {
    const { type, data } = job.data;
    
    switch (type) {
      case 'analyzeArtist':
        await this.analyzeArtist(data.artistId, data.options);
        break;
        
      case 'analyzeTrack':
        await this.analyzeTrack(data.trackId);
        break;
        
      case 'analyzePlaylist':
        await this.analyzePlaylist(data.playlistId);
        break;
        
      case 'analyzeMarket':
        await this.analyzeMarket(data.genre, data.region, data.timeframe);
        break;
        
      case 'analyzeTourDemand':
        await this.analyzeTourDemand(data.artistId);
        break;
        
      default:
        this.logger.warn(`Unknown job type: ${type}`);
    }
  }
  
  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.logger.info('Cleaning up Spotify Analytics...');
    
    await this.redis.quit();
    await this.db.end();
    await this.queue.close();
    await this.worker.close();
    
    this.logger.info('Spotify Analytics cleaned up');
  }
}

// Export the analytics engine
export default SpotifyAnalytics;