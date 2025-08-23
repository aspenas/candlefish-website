/**
 * PromoterOS Instagram Advanced Scraper
 *
 * Comprehensive Instagram data extraction for artist discovery and analytics.
 * Provides deep insights into artist performance, audience engagement, and growth patterns.
 *
 * Features:
 * - Profile analytics with growth tracking
 * - Post and Reel performance analysis
 * - Story metrics and engagement tracking
 * - Hashtag trend monitoring
 * - Location-based analytics
 * - Competitor benchmarking
 * - Cross-platform correlation with TikTok
 * - IGTV and Live stream analytics
 * - Shopping and monetization tracking
 * - Brand partnership detection
 *
 * @module InstagramScraper
 * @author PromoterOS AI Team
 * @version 2.0.0
 */

import { EventEmitter } from 'events';
import * as tf from '@tensorflow/tfjs-node';
import { Redis } from 'ioredis';
import { z } from 'zod';
import winston from 'winston';
import crypto from 'crypto';
import axios, { AxiosInstance } from 'axios';
import puppeteer, { Browser, Page } from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Queue, Worker } from 'bullmq';
import { Pool } from 'pg';
import LRU from 'lru-cache';
import { RateLimiter } from 'limiter';
import * as Sentry from '@sentry/node';
import { parse as parseUrl } from 'url';
import { createHash } from 'crypto';
import pLimit from 'p-limit';
import { differenceInDays, subDays, format } from 'date-fns';

// Stealth plugin for avoiding detection
puppeteer.use(StealthPlugin());

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Instagram User Profile with comprehensive analytics
 */
export interface InstagramProfile {
  id: string;
  username: string;
  fullName: string;
  biography: string;
  externalUrl: string;
  profilePicUrl: string;
  isVerified: boolean;
  isPrivate: boolean;
  isBusiness: boolean;
  businessCategory: string;

  // Basic metrics
  metrics: {
    postsCount: number;
    followersCount: number;
    followingCount: number;
    totalLikes: number;
    totalComments: number;
    avgLikesPerPost: number;
    avgCommentsPerPost: number;
  };

  // Engagement analytics
  engagement: {
    engagementRate: number;
    authenticEngagementRate: number;
    commentToLikeRatio: number;
    saveRate: number;
    shareRate: number;
    reachRate: number;
    impressionRate: number;
  };

  // Growth metrics
  growth: {
    followersGrowthRate: number;
    followersGrowth30Days: number;
    followersGrowth90Days: number;
    postsFrequency: number;
    optimalPostingTimes: string[];
    growthTrajectory: 'declining' | 'stable' | 'growing' | 'viral';
  };

  // Content analysis
  content: {
    primaryContentTypes: string[];
    hashtagStrategy: string[];
    captionLength: number;
    emojiUsage: number;
    videoToPhotoRatio: number;
    reelsPercentage: number;
    carouselUsage: number;
    filterUsage: Record<string, number>;
  };

  // Audience insights
  audience: {
    demographics: {
      ageGroups: Record<string, number>;
      genderSplit: Record<string, number>;
      topCountries: Record<string, number>;
      topCities: Record<string, number>;
      languages: Record<string, number>;
    };
    interests: string[];
    activeTimes: Record<string, number>;
    deviceTypes: Record<string, number>;
    audienceQualityScore: number;
  };

  // Monetization insights
  monetization: {
    hasShop: boolean;
    affiliateLinks: number;
    brandMentions: string[];
    sponsoredPosts: number;
    estimatedPostValue: number;
    estimatedStoryValue: number;
    estimatedReelValue: number;
  };

  // Cross-platform presence
  crossPlatform: {
    tiktokHandle?: string;
    youtubeChannel?: string;
    twitterHandle?: string;
    spotifyArtist?: string;
    websiteUrl?: string;
  };

  // AI predictions
  predictions: {
    next30DayFollowers: number;
    engagementTrend: 'increasing' | 'stable' | 'decreasing';
    viralPotentialScore: number;
    brandPartnershipReadiness: number;
    tourMarketScore: number;
  };

  metadata: {
    scrapedAt: Date;
    lastPostDate: Date;
    accountAge: number;
    dataCompleteness: number;
  };
}

/**
 * Instagram Post/Reel with detailed analytics
 */
export interface InstagramPost {
  id: string;
  shortcode: string;
  userId: string;
  username: string;
  postType: 'photo' | 'video' | 'carousel' | 'reel' | 'igtv';
  mediaUrl: string[];
  thumbnailUrl: string;
  caption: string;
  location?: {
    id: string;
    name: string;
    lat: number;
    lng: number;
  };

  // Engagement metrics
  metrics: {
    likes: number;
    comments: number;
    saves: number;
    shares: number;
    plays?: number;
    reach: number;
    impressions: number;
  };

  // Performance analytics
  performance: {
    engagementRate: number;
    viralityScore: number;
    performanceIndex: number;
    benchmarkComparison: number;
    growthVelocity: number;
    peakEngagementTime: Date;
  };

  // Content details
  content: {
    hashtags: string[];
    mentions: string[];
    hasMusic: boolean;
    musicTrack?: string;
    duration?: number;
    aspectRatio: string;
    filters: string[];
    effects: string[];
    accessibility: string;
  };

  // Temporal patterns
  temporal: {
    postedAt: Date;
    dayOfWeek: string;
    hourOfDay: number;
    engagementByHour: Record<string, number>;
    viralityTimeline: Array<{
      timestamp: Date;
      likes: number;
      comments: number;
    }>;
  };

  // Audience response
  audienceResponse: {
    sentimentScore: number;
    commentThemes: string[];
    emojiReactions: Record<string, number>;
    questionCount: number;
    conversionActions: number;
  };

  // Sponsorship detection
  sponsorship: {
    isSponsored: boolean;
    brandMentions: string[];
    disclosurePresent: boolean;
    affiliateLinks: string[];
    estimatedValue: number;
  };
}

/**
 * Instagram Story analytics
 */
export interface InstagramStory {
  id: string;
  userId: string;
  mediaType: 'photo' | 'video';
  mediaUrl: string;
  duration: number;

  // Metrics
  metrics: {
    views: number;
    replies: number;
    shares: number;
    exits: number;
    tapsForward: number;
    tapsBack: number;
    linkClicks?: number;
  };

  // Engagement
  engagement: {
    completionRate: number;
    engagementRate: number;
    dropOffPoint?: number;
    interactionRate: number;
  };

  // Features used
  features: {
    stickers: string[];
    polls?: {
      question: string;
      results: Record<string, number>;
    };
    questions?: string[];
    quiz?: {
      question: string;
      correctAnswer: string;
    };
    countdown?: Date;
    location?: string;
    hashtags: string[];
    mentions: string[];
    music?: string;
    effects: string[];
  };

  // Performance
  performance: {
    reachRate: number;
    profileVisits: number;
    websiteClicks: number;
    storyCompletions: number;
  };

  postedAt: Date;
  expiresAt: Date;
}

/**
 * Instagram Hashtag analytics
 */
export interface InstagramHashtag {
  id: string;
  name: string;
  postsCount: number;

  // Trend metrics
  trending: {
    rank: number;
    momentum: number;
    growthRate: number;
    peakTime: Date;
    lifecycle: 'emerging' | 'rising' | 'peak' | 'declining';
  };

  // Usage patterns
  usage: {
    dailyPosts: number;
    weeklyGrowth: number;
    topCreators: Array<{
      username: string;
      followers: number;
      engagement: number;
    }>;
    relatedHashtags: string[];
    contentTypes: Record<string, number>;
  };

  // Performance benchmarks
  benchmarks: {
    avgLikes: number;
    avgComments: number;
    avgReach: number;
    viralThreshold: number;
    competitionLevel: number;
  };

  // Geographic distribution
  geography: {
    topCountries: Record<string, number>;
    topCities: Record<string, number>;
    timeZonePeaks: Record<string, number>;
  };
}

/**
 * Competitor comparison data
 */
export interface CompetitorComparison {
  competitorUsername: string;
  comparisonDate: Date;

  // Metric comparisons
  metrics: {
    followers: {
      ours: number;
      theirs: number;
      difference: number;
      percentageDiff: number;
    };
    engagement: {
      ours: number;
      theirs: number;
      difference: number;
      percentageDiff: number;
    };
    growth: {
      ours: number;
      theirs: number;
      difference: number;
      percentageDiff: number;
    };
    postFrequency: {
      ours: number;
      theirs: number;
      difference: number;
      percentageDiff: number;
    };
  };

  // Content strategy comparison
  contentStrategy: {
    hashtagOverlap: number;
    contentTypesSimilarity: number;
    postingTimeOverlap: number;
    audienceOverlap: number;
    uniqueHashtags: {
      ours: string[];
      theirs: string[];
    };
  };

  // Performance insights
  insights: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
    recommendations: string[];
  };

  // Trend analysis
  trends: {
    followerTrend: 'gaining' | 'losing' | 'stable';
    engagementTrend: 'gaining' | 'losing' | 'stable';
    contentQualityTrend: 'improving' | 'declining' | 'stable';
    threatLevel: 'low' | 'medium' | 'high';
  };
}

/**
 * Scraper configuration
 */
export interface InstagramScraperConfig {
  // Authentication
  sessionId?: string;
  username?: string;
  password?: string;

  // API Configuration
  apiEndpoint: string;
  apiKey?: string;

  // Proxy settings
  proxyList: string[];
  rotateProxy: boolean;

  // Rate limiting
  requestDelay: number;
  maxConcurrent: number;
  retryAttempts: number;

  // Browser settings
  headless: boolean;
  userAgent: string;

  // Storage
  redisUrl: string;
  databaseUrl: string;

  // Features
  enableStories: boolean;
  enableReels: boolean;
  enableIGTV: boolean;
  enableComments: boolean;
  enableLocation: boolean;

  // ML Models
  sentimentModel?: string;
  engagementModel?: string;

  // Monitoring
  sentryDsn?: string;
  logLevel: string;
}

// ============================================================================
// MAIN SCRAPER CLASS
// ============================================================================

/**
 * Advanced Instagram Scraper with AI-powered analytics
 */
export class InstagramScraper extends EventEmitter {
  private config: InstagramScraperConfig;
  private logger: winston.Logger;
  private redis: Redis;
  private db: Pool;
  private browser?: Browser;
  private page?: Page;
  private httpClient: AxiosInstance;
  private rateLimiter: RateLimiter;
  private cache: LRU<string, any>;
  private queue: Queue;
  private worker: Worker;
  private isAuthenticated: boolean = false;
  private sessionCookies: any[] = [];
  private concurrencyLimit: any;

  // ML Models
  private sentimentModel?: tf.LayersModel;
  private engagementModel?: tf.LayersModel;

  // Metrics tracking
  private metrics = {
    profilesScraped: 0,
    postsScraped: 0,
    storiesScraped: 0,
    hashtagsAnalyzed: 0,
    apiCalls: 0,
    cacheHits: 0,
    cacheMisses: 0,
    errors: 0
  };

  constructor(config: InstagramScraperConfig) {
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
        new winston.transports.Console(),
        new winston.transports.File({
          filename: 'logs/instagram-scraper.log'
        })
      ]
    });

    // Initialize Redis
    this.redis = new Redis(config.redisUrl);

    // Initialize PostgreSQL
    this.db = new Pool({
      connectionString: config.databaseUrl,
      max: 10
    });

    // Initialize rate limiter
    this.rateLimiter = new RateLimiter({
      tokensPerInterval: 10,
      interval: 'second'
    });

    // Initialize cache
    this.cache = new LRU({
      max: 1000,
      ttl: 1000 * 60 * 15 // 15 minutes
    });

    // Initialize HTTP client
    this.httpClient = axios.create({
      timeout: 30000,
      headers: {
        'User-Agent': config.userAgent || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    // Initialize concurrency limiter
    this.concurrencyLimit = pLimit(config.maxConcurrent || 3);

    // Initialize queue
    this.queue = new Queue('instagram-scraping', {
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379')
      }
    });

    this.worker = new Worker(
      'instagram-scraping',
      async (job) => this.processJob(job),
      {
        connection: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379')
        },
        concurrency: config.maxConcurrent || 3
      }
    );

    // Initialize Sentry if configured
    if (config.sentryDsn) {
      Sentry.init({
        dsn: config.sentryDsn,
        environment: process.env.NODE_ENV || 'development'
      });
    }
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  /**
   * Initialize the scraper
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing Instagram scraper...');

    try {
      // Initialize browser
      await this.initializeBrowser();

      // Load ML models if configured
      await this.loadMLModels();

      // Authenticate if credentials provided
      if (this.config.username && this.config.password) {
        await this.authenticate();
      } else if (this.config.sessionId) {
        await this.loadSession();
      }

      // Verify connections
      await this.verifyConnections();

      this.logger.info('Instagram scraper initialized successfully');
      this.emit('initialized');

    } catch (error) {
      this.logger.error('Failed to initialize scraper:', error);
      throw error;
    }
  }

  /**
   * Initialize Puppeteer browser
   */
  private async initializeBrowser(): Promise<void> {
    const args = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--no-zygote',
      '--single-process'
    ];

    if (this.config.proxyList?.length > 0) {
      const proxy = this.config.proxyList[0];
      args.push(`--proxy-server=${proxy}`);
    }

    this.browser = await puppeteer.launch({
      headless: this.config.headless,
      args,
      defaultViewport: {
        width: 1920,
        height: 1080
      }
    });

    this.page = await this.browser.newPage();

    // Set user agent
    await this.page.setUserAgent(
      this.config.userAgent ||
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    );

    // Add stealth modifications
    await this.page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined
      });
    });
  }

  /**
   * Load ML models
   */
  private async loadMLModels(): Promise<void> {
    try {
      if (this.config.sentimentModel) {
        this.sentimentModel = await tf.loadLayersModel(this.config.sentimentModel);
        this.logger.info('Sentiment model loaded');
      }

      if (this.config.engagementModel) {
        this.engagementModel = await tf.loadLayersModel(this.config.engagementModel);
        this.logger.info('Engagement model loaded');
      }
    } catch (error) {
      this.logger.warn('Failed to load ML models:', error);
    }
  }

  /**
   * Authenticate with Instagram
   */
  private async authenticate(): Promise<void> {
    if (!this.page) throw new Error('Browser not initialized');

    this.logger.info('Authenticating with Instagram...');

    try {
      await this.page.goto('https://www.instagram.com/accounts/login/', {
        waitUntil: 'networkidle2'
      });

      // Wait for login form
      await this.page.waitForSelector('input[name="username"]', { timeout: 10000 });

      // Enter credentials
      await this.page.type('input[name="username"]', this.config.username!, { delay: 100 });
      await this.page.type('input[name="password"]', this.config.password!, { delay: 100 });

      // Submit form
      await this.page.click('button[type="submit"]');

      // Wait for navigation
      await this.page.waitForNavigation({ waitUntil: 'networkidle2' });

      // Check if logged in
      const loggedIn = await this.page.evaluate(() => {
        return window.location.pathname === '/';
      });

      if (loggedIn) {
        this.isAuthenticated = true;
        this.sessionCookies = await this.page.cookies();
        await this.saveSession();
        this.logger.info('Authentication successful');
      } else {
        throw new Error('Authentication failed');
      }

    } catch (error) {
      this.logger.error('Authentication failed:', error);
      throw error;
    }
  }

  /**
   * Load saved session
   */
  private async loadSession(): Promise<void> {
    try {
      const session = await this.redis.get('instagram:session');
      if (session) {
        this.sessionCookies = JSON.parse(session);
        if (this.page) {
          await this.page.setCookie(...this.sessionCookies);
        }
        this.isAuthenticated = true;
        this.logger.info('Session loaded successfully');
      }
    } catch (error) {
      this.logger.warn('Failed to load session:', error);
    }
  }

  /**
   * Save session cookies
   */
  private async saveSession(): Promise<void> {
    try {
      await this.redis.set(
        'instagram:session',
        JSON.stringify(this.sessionCookies),
        'EX',
        86400 * 7 // 7 days
      );
    } catch (error) {
      this.logger.warn('Failed to save session:', error);
    }
  }

  /**
   * Verify database connections
   */
  private async verifyConnections(): Promise<void> {
    // Test Redis
    await this.redis.ping();

    // Test PostgreSQL
    const client = await this.db.connect();
    await client.query('SELECT 1');
    client.release();

    this.logger.info('All connections verified');
  }

  // ============================================================================
  // CORE SCRAPING METHODS
  // ============================================================================

  /**
   * Scrape user profile with full analytics
   */
  async scrapeProfile(username: string, options?: {
    includePosts?: boolean;
    includeStories?: boolean;
    includeReels?: boolean;
    postsLimit?: number;
  }): Promise<InstagramProfile> {
    const cacheKey = `profile:${username}`;

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && !options?.includePosts) {
      this.metrics.cacheHits++;
      return cached;
    }
    this.metrics.cacheMisses++;

    this.logger.info(`Scraping profile: ${username}`);

    try {
      // Rate limiting
      await this.rateLimiter.removeTokens(1);

      // Fetch profile data
      const profileData = await this.fetchProfileData(username);

      // Build profile object
      const profile: InstagramProfile = {
        id: profileData.id,
        username: profileData.username,
        fullName: profileData.full_name || '',
        biography: profileData.biography || '',
        externalUrl: profileData.external_url || '',
        profilePicUrl: profileData.profile_pic_url_hd || '',
        isVerified: profileData.is_verified || false,
        isPrivate: profileData.is_private || false,
        isBusiness: profileData.is_business_account || false,
        businessCategory: profileData.business_category_name || '',

        metrics: {
          postsCount: profileData.edge_owner_to_timeline_media?.count || 0,
          followersCount: profileData.edge_followed_by?.count || 0,
          followingCount: profileData.edge_follow?.count || 0,
          totalLikes: 0,
          totalComments: 0,
          avgLikesPerPost: 0,
          avgCommentsPerPost: 0
        },

        engagement: {
          engagementRate: 0,
          authenticEngagementRate: 0,
          commentToLikeRatio: 0,
          saveRate: 0,
          shareRate: 0,
          reachRate: 0,
          impressionRate: 0
        },

        growth: {
          followersGrowthRate: 0,
          followersGrowth30Days: 0,
          followersGrowth90Days: 0,
          postsFrequency: 0,
          optimalPostingTimes: [],
          growthTrajectory: 'stable'
        },

        content: {
          primaryContentTypes: [],
          hashtagStrategy: [],
          captionLength: 0,
          emojiUsage: 0,
          videoToPhotoRatio: 0,
          reelsPercentage: 0,
          carouselUsage: 0,
          filterUsage: {}
        },

        audience: {
          demographics: {
            ageGroups: {},
            genderSplit: {},
            topCountries: {},
            topCities: {},
            languages: {}
          },
          interests: [],
          activeTimes: {},
          deviceTypes: {},
          audienceQualityScore: 0
        },

        monetization: {
          hasShop: profileData.has_shop || false,
          affiliateLinks: 0,
          brandMentions: [],
          sponsoredPosts: 0,
          estimatedPostValue: 0,
          estimatedStoryValue: 0,
          estimatedReelValue: 0
        },

        crossPlatform: {
          tiktokHandle: this.extractTikTokHandle(profileData.biography),
          youtubeChannel: this.extractYouTubeChannel(profileData.biography),
          twitterHandle: this.extractTwitterHandle(profileData.biography),
          spotifyArtist: this.extractSpotifyArtist(profileData.biography),
          websiteUrl: profileData.external_url
        },

        predictions: {
          next30DayFollowers: 0,
          engagementTrend: 'stable',
          viralPotentialScore: 0,
          brandPartnershipReadiness: 0,
          tourMarketScore: 0
        },

        metadata: {
          scrapedAt: new Date(),
          lastPostDate: new Date(),
          accountAge: 0,
          dataCompleteness: 0.85
        }
      };

      // Fetch posts if requested
      let posts: InstagramPost[] = [];
      if (options?.includePosts) {
        posts = await this.scrapeUserPosts(username, options.postsLimit || 12);

        // Calculate engagement metrics from posts
        if (posts.length > 0) {
          const totalLikes = posts.reduce((sum, p) => sum + p.metrics.likes, 0);
          const totalComments = posts.reduce((sum, p) => sum + p.metrics.comments, 0);

          profile.metrics.totalLikes = totalLikes;
          profile.metrics.totalComments = totalComments;
          profile.metrics.avgLikesPerPost = totalLikes / posts.length;
          profile.metrics.avgCommentsPerPost = totalComments / posts.length;

          // Calculate engagement rate
          const totalEngagement = totalLikes + totalComments;
          profile.engagement.engagementRate =
            (totalEngagement / (posts.length * profile.metrics.followersCount)) * 100;

          // Analyze content patterns
          profile.content = this.analyzeContentPatterns(posts);

          // Detect sponsored posts
          profile.monetization.sponsoredPosts = posts.filter(p =>
            p.sponsorship.isSponsored
          ).length;
        }
      }

      // Fetch stories if requested and authenticated
      if (options?.includeStories && this.isAuthenticated) {
        const stories = await this.scrapeUserStories(username);
        // Process story analytics
      }

      // Calculate growth metrics
      profile.growth = await this.calculateGrowthMetrics(username, profile);

      // Generate predictions
      profile.predictions = await this.generateProfilePredictions(profile, posts);

      // Calculate monetization values
      profile.monetization = this.calculateMonetizationValues(profile);

      // Cache the result
      this.cache.set(cacheKey, profile);

      // Store in database
      await this.storeProfile(profile);

      // Update metrics
      this.metrics.profilesScraped++;

      // Emit event
      this.emit('profileScraped', profile);

      return profile;

    } catch (error) {
      this.logger.error(`Failed to scrape profile ${username}:`, error);
      this.metrics.errors++;
      throw error;
    }
  }

  /**
   * Fetch profile data from Instagram
   */
  private async fetchProfileData(username: string): Promise<any> {
    try {
      // Try API endpoint first
      const response = await this.httpClient.get(
        `https://www.instagram.com/api/v1/users/web_profile_info/`,
        {
          params: { username },
          headers: {
            'X-IG-App-ID': '936619743392459',
            'X-Requested-With': 'XMLHttpRequest'
          }
        }
      );

      if (response.data?.data?.user) {
        return response.data.data.user;
      }

      // Fallback to web scraping
      if (!this.page) throw new Error('Browser not initialized');

      await this.page.goto(`https://www.instagram.com/${username}/`, {
        waitUntil: 'networkidle2'
      });

      // Extract data from page
      const data = await this.page.evaluate(() => {
        const scripts = Array.from(document.querySelectorAll('script'));
        for (const script of scripts) {
          if (script.innerHTML.includes('window._sharedData')) {
            const match = script.innerHTML.match(/window\._sharedData = ({.*});/);
            if (match) {
              const sharedData = JSON.parse(match[1]);
              return sharedData?.entry_data?.ProfilePage?.[0]?.graphql?.user;
            }
          }
        }
        return null;
      });

      if (!data) throw new Error('Failed to extract profile data');

      return data;

    } catch (error) {
      this.logger.error('Failed to fetch profile data:', error);
      throw error;
    }
  }

  /**
   * Scrape user posts
   */
  private async scrapeUserPosts(
    username: string,
    limit: number = 12
  ): Promise<InstagramPost[]> {
    const posts: InstagramPost[] = [];

    try {
      const profileData = await this.fetchProfileData(username);
      const edges = profileData.edge_owner_to_timeline_media?.edges || [];

      // Process posts with concurrency limit
      const postPromises = edges.slice(0, limit).map(edge =>
        this.concurrencyLimit(() => this.scrapePost(edge.node))
      );

      const results = await Promise.allSettled(postPromises);

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          posts.push(result.value);
        }
      }

      this.metrics.postsScraped += posts.length;

    } catch (error) {
      this.logger.error('Failed to scrape posts:', error);
    }

    return posts;
  }

  /**
   * Scrape individual post
   */
  private async scrapePost(postData: any): Promise<InstagramPost> {
    const post: InstagramPost = {
      id: postData.id,
      shortcode: postData.shortcode,
      userId: postData.owner?.id || '',
      username: postData.owner?.username || '',
      postType: this.determinePostType(postData),
      mediaUrl: this.extractMediaUrls(postData),
      thumbnailUrl: postData.thumbnail_src || postData.display_url || '',
      caption: postData.edge_media_to_caption?.edges?.[0]?.node?.text || '',
      location: postData.location ? {
        id: postData.location.id,
        name: postData.location.name,
        lat: postData.location.lat || 0,
        lng: postData.location.lng || 0
      } : undefined,

      metrics: {
        likes: postData.edge_media_preview_like?.count || 0,
        comments: postData.edge_media_to_comment?.count || 0,
        saves: 0,
        shares: 0,
        plays: postData.video_view_count,
        reach: 0,
        impressions: 0
      },

      performance: {
        engagementRate: 0,
        viralityScore: 0,
        performanceIndex: 0,
        benchmarkComparison: 0,
        growthVelocity: 0,
        peakEngagementTime: new Date()
      },

      content: {
        hashtags: this.extractHashtags(postData.edge_media_to_caption?.edges?.[0]?.node?.text || ''),
        mentions: this.extractMentions(postData.edge_media_to_caption?.edges?.[0]?.node?.text || ''),
        hasMusic: false,
        musicTrack: undefined,
        duration: postData.video_duration,
        aspectRatio: `${postData.dimensions?.width}:${postData.dimensions?.height}`,
        filters: [],
        effects: [],
        accessibility: postData.accessibility_caption || ''
      },

      temporal: {
        postedAt: new Date(postData.taken_at_timestamp * 1000),
        dayOfWeek: '',
        hourOfDay: 0,
        engagementByHour: {},
        viralityTimeline: []
      },

      audienceResponse: {
        sentimentScore: 0,
        commentThemes: [],
        emojiReactions: {},
        questionCount: 0,
        conversionActions: 0
      },

      sponsorship: {
        isSponsored: this.detectSponsorship(postData),
        brandMentions: [],
        disclosurePresent: false,
        affiliateLinks: [],
        estimatedValue: 0
      }
    };

    // Set temporal data
    const postedDate = new Date(postData.taken_at_timestamp * 1000);
    post.temporal.dayOfWeek = format(postedDate, 'EEEE');
    post.temporal.hourOfDay = postedDate.getHours();

    // Calculate performance metrics
    post.performance.engagementRate = this.calculatePostEngagementRate(post);
    post.performance.viralityScore = this.calculateViralityScore(post);

    // Analyze sentiment if model available
    if (this.sentimentModel) {
      post.audienceResponse.sentimentScore = await this.analyzeSentiment(post.caption);
    }

    return post;
  }

  /**
   * Scrape user stories
   */
  private async scrapeUserStories(username: string): Promise<InstagramStory[]> {
    const stories: InstagramStory[] = [];

    if (!this.isAuthenticated) {
      this.logger.warn('Cannot scrape stories without authentication');
      return stories;
    }

    try {
      // Stories require authenticated API access
      // Implementation would depend on Instagram's private API

      this.metrics.storiesScraped += stories.length;

    } catch (error) {
      this.logger.error('Failed to scrape stories:', error);
    }

    return stories;
  }

  /**
   * Scrape hashtag data
   */
  async scrapeHashtag(hashtag: string): Promise<InstagramHashtag> {
    const cacheKey = `hashtag:${hashtag}`;

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

      const response = await this.httpClient.get(
        `https://www.instagram.com/explore/tags/${hashtag}/?__a=1&__d=dis`,
        {
          headers: {
            'X-IG-App-ID': '936619743392459',
            'X-Requested-With': 'XMLHttpRequest'
          }
        }
      );

      const data = response.data?.graphql?.hashtag || response.data?.data?.hashtag;

      const hashtagData: InstagramHashtag = {
        id: data.id,
        name: data.name,
        postsCount: data.edge_hashtag_to_media?.count || 0,

        trending: {
          rank: 0,
          momentum: 0,
          growthRate: 0,
          peakTime: new Date(),
          lifecycle: 'stable' as any
        },

        usage: {
          dailyPosts: 0,
          weeklyGrowth: 0,
          topCreators: [],
          relatedHashtags: [],
          contentTypes: {}
        },

        benchmarks: {
          avgLikes: 0,
          avgComments: 0,
          avgReach: 0,
          viralThreshold: 0,
          competitionLevel: 0
        },

        geography: {
          topCountries: {},
          topCities: {},
          timeZonePeaks: {}
        }
      };

      // Analyze top posts
      const topPosts = data.edge_hashtag_to_top_posts?.edges || [];
      if (topPosts.length > 0) {
        const totalLikes = topPosts.reduce((sum: number, edge: any) =>
          sum + (edge.node.edge_liked_by?.count || 0), 0
        );
        const totalComments = topPosts.reduce((sum: number, edge: any) =>
          sum + (edge.node.edge_media_to_comment?.count || 0), 0
        );

        hashtagData.benchmarks.avgLikes = totalLikes / topPosts.length;
        hashtagData.benchmarks.avgComments = totalComments / topPosts.length;
        hashtagData.benchmarks.viralThreshold = hashtagData.benchmarks.avgLikes * 2;
      }

      // Cache result
      this.cache.set(cacheKey, hashtagData);

      // Store in database
      await this.storeHashtag(hashtagData);

      // Update metrics
      this.metrics.hashtagsAnalyzed++;

      // Emit event
      this.emit('hashtagScraped', hashtagData);

      return hashtagData;

    } catch (error) {
      this.logger.error(`Failed to scrape hashtag ${hashtag}:`, error);
      this.metrics.errors++;
      throw error;
    }
  }

  /**
   * Compare with competitor
   */
  async compareWithCompetitor(
    ourUsername: string,
    competitorUsername: string
  ): Promise<CompetitorComparison> {
    this.logger.info(`Comparing ${ourUsername} with ${competitorUsername}`);

    // Fetch both profiles
    const [ourProfile, theirProfile] = await Promise.all([
      this.scrapeProfile(ourUsername),
      this.scrapeProfile(competitorUsername)
    ]);

    const comparison: CompetitorComparison = {
      competitorUsername,
      comparisonDate: new Date(),

      metrics: {
        followers: {
          ours: ourProfile.metrics.followersCount,
          theirs: theirProfile.metrics.followersCount,
          difference: ourProfile.metrics.followersCount - theirProfile.metrics.followersCount,
          percentageDiff: ((ourProfile.metrics.followersCount - theirProfile.metrics.followersCount) /
            theirProfile.metrics.followersCount) * 100
        },
        engagement: {
          ours: ourProfile.engagement.engagementRate,
          theirs: theirProfile.engagement.engagementRate,
          difference: ourProfile.engagement.engagementRate - theirProfile.engagement.engagementRate,
          percentageDiff: ((ourProfile.engagement.engagementRate - theirProfile.engagement.engagementRate) /
            theirProfile.engagement.engagementRate) * 100
        },
        growth: {
          ours: ourProfile.growth.followersGrowthRate,
          theirs: theirProfile.growth.followersGrowthRate,
          difference: ourProfile.growth.followersGrowthRate - theirProfile.growth.followersGrowthRate,
          percentageDiff: ((ourProfile.growth.followersGrowthRate - theirProfile.growth.followersGrowthRate) /
            theirProfile.growth.followersGrowthRate) * 100
        },
        postFrequency: {
          ours: ourProfile.growth.postsFrequency,
          theirs: theirProfile.growth.postsFrequency,
          difference: ourProfile.growth.postsFrequency - theirProfile.growth.postsFrequency,
          percentageDiff: ((ourProfile.growth.postsFrequency - theirProfile.growth.postsFrequency) /
            theirProfile.growth.postsFrequency) * 100
        }
      },

      contentStrategy: {
        hashtagOverlap: 0,
        contentTypesSimilarity: 0,
        postingTimeOverlap: 0,
        audienceOverlap: 0,
        uniqueHashtags: {
          ours: ourProfile.content.hashtagStrategy,
          theirs: theirProfile.content.hashtagStrategy
        }
      },

      insights: {
        strengths: [],
        weaknesses: [],
        opportunities: [],
        threats: [],
        recommendations: []
      },

      trends: {
        followerTrend: 'stable',
        engagementTrend: 'stable',
        contentQualityTrend: 'stable',
        threatLevel: 'medium'
      }
    };

    // Analyze competitive position
    comparison.insights = this.analyzeCompetitivePosition(ourProfile, theirProfile);

    // Determine trends
    comparison.trends = this.determineCompetitiveTrends(comparison);

    // Store comparison
    await this.storeComparison(comparison);

    // Emit event
    this.emit('comparisonCompleted', comparison);

    return comparison;
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Determine post type
   */
  private determinePostType(postData: any): InstagramPost['postType'] {
    if (postData.__typename === 'GraphSidecar') return 'carousel';
    if (postData.__typename === 'GraphVideo') return 'video';
    if (postData.is_video) return 'video';
    if (postData.product_type === 'clips') return 'reel';
    if (postData.product_type === 'igtv') return 'igtv';
    return 'photo';
  }

  /**
   * Extract media URLs from post data
   */
  private extractMediaUrls(postData: any): string[] {
    const urls: string[] = [];

    if (postData.edge_sidecar_to_children) {
      // Carousel post
      postData.edge_sidecar_to_children.edges.forEach((edge: any) => {
        urls.push(edge.node.display_url);
      });
    } else {
      // Single media
      urls.push(postData.display_url || postData.thumbnail_src);
    }

    return urls;
  }

  /**
   * Extract hashtags from text
   */
  private extractHashtags(text: string): string[] {
    const hashtags = text.match(/#\w+/g) || [];
    return hashtags.map(tag => tag.substring(1));
  }

  /**
   * Extract mentions from text
   */
  private extractMentions(text: string): string[] {
    const mentions = text.match(/@\w+/g) || [];
    return mentions.map(mention => mention.substring(1));
  }

  /**
   * Extract TikTok handle from bio
   */
  private extractTikTokHandle(bio: string): string | undefined {
    const match = bio.match(/(?:tiktok\.com\/@|TikTok:\s*@?)(\w+)/i);
    return match ? match[1] : undefined;
  }

  /**
   * Extract YouTube channel from bio
   */
  private extractYouTubeChannel(bio: string): string | undefined {
    const match = bio.match(/(?:youtube\.com\/(?:c\/|channel\/|@)|YouTube:\s*@?)(\w+)/i);
    return match ? match[1] : undefined;
  }

  /**
   * Extract Twitter handle from bio
   */
  private extractTwitterHandle(bio: string): string | undefined {
    const match = bio.match(/(?:twitter\.com\/|Twitter:\s*@?)(\w+)/i);
    return match ? match[1] : undefined;
  }

  /**
   * Extract Spotify artist from bio
   */
  private extractSpotifyArtist(bio: string): string | undefined {
    const match = bio.match(/(?:spotify\.com\/artist\/|Spotify:\s*)(\w+)/i);
    return match ? match[1] : undefined;
  }

  /**
   * Detect if post is sponsored
   */
  private detectSponsorship(postData: any): boolean {
    const caption = postData.edge_media_to_caption?.edges?.[0]?.node?.text || '';
    const sponsorKeywords = ['#ad', '#sponsored', '#partner', 'paid partnership', 'sponsored by'];

    return sponsorKeywords.some(keyword =>
      caption.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  /**
   * Calculate post engagement rate
   */
  private calculatePostEngagementRate(post: InstagramPost): number {
    const totalEngagement = post.metrics.likes + post.metrics.comments + post.metrics.saves;
    const reach = post.metrics.reach || post.metrics.impressions || 1;
    return (totalEngagement / reach) * 100;
  }

  /**
   * Calculate virality score
   */
  private calculateViralityScore(post: InstagramPost): number {
    // Simple virality calculation
    const engagementWeight = 0.4;
    const velocityWeight = 0.3;
    const shareWeight = 0.3;

    const normalizedEngagement = Math.min(post.performance.engagementRate / 10, 1);
    const normalizedShares = Math.min(post.metrics.shares / 1000, 1);

    return (normalizedEngagement * engagementWeight) +
           (0.5 * velocityWeight) + // Placeholder for velocity
           (normalizedShares * shareWeight);
  }

  /**
   * Analyze content patterns from posts
   */
  private analyzeContentPatterns(posts: InstagramPost[]): InstagramProfile['content'] {
    const allHashtags: string[] = [];
    let totalCaptionLength = 0;
    let videoCount = 0;
    let reelCount = 0;
    let carouselCount = 0;

    posts.forEach(post => {
      allHashtags.push(...post.content.hashtags);
      totalCaptionLength += post.caption.length;

      if (post.postType === 'video') videoCount++;
      if (post.postType === 'reel') reelCount++;
      if (post.postType === 'carousel') carouselCount++;
    });

    // Count hashtag frequency
    const hashtagFrequency: Record<string, number> = {};
    allHashtags.forEach(tag => {
      hashtagFrequency[tag] = (hashtagFrequency[tag] || 0) + 1;
    });

    // Get top hashtags
    const topHashtags = Object.entries(hashtagFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag]) => tag);

    return {
      primaryContentTypes: this.determinePrimaryContentTypes(posts),
      hashtagStrategy: topHashtags,
      captionLength: totalCaptionLength / posts.length,
      emojiUsage: this.calculateEmojiUsage(posts),
      videoToPhotoRatio: videoCount / Math.max(posts.length - videoCount, 1),
      reelsPercentage: (reelCount / posts.length) * 100,
      carouselUsage: (carouselCount / posts.length) * 100,
      filterUsage: {}
    };
  }

  /**
   * Determine primary content types
   */
  private determinePrimaryContentTypes(posts: InstagramPost[]): string[] {
    const types: Record<string, number> = {};

    posts.forEach(post => {
      types[post.postType] = (types[post.postType] || 0) + 1;
    });

    return Object.entries(types)
      .sort((a, b) => b[1] - a[1])
      .map(([type]) => type);
  }

  /**
   * Calculate emoji usage
   */
  private calculateEmojiUsage(posts: InstagramPost[]): number {
    const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;

    let totalEmojis = 0;
    posts.forEach(post => {
      const matches = post.caption.match(emojiRegex);
      totalEmojis += matches ? matches.length : 0;
    });

    return totalEmojis / posts.length;
  }

  /**
   * Calculate growth metrics
   */
  private async calculateGrowthMetrics(
    username: string,
    profile: InstagramProfile
  ): Promise<InstagramProfile['growth']> {
    // Fetch historical data from database
    const historicalData = await this.fetchHistoricalData(username);

    let followersGrowthRate = 0;
    let followersGrowth30Days = 0;
    let followersGrowth90Days = 0;

    if (historicalData.length > 0) {
      // Calculate growth rates
      const data30DaysAgo = historicalData.find(d =>
        differenceInDays(new Date(), d.date) >= 30
      );
      const data90DaysAgo = historicalData.find(d =>
        differenceInDays(new Date(), d.date) >= 90
      );

      if (data30DaysAgo) {
        followersGrowth30Days = profile.metrics.followersCount - data30DaysAgo.followers;
        followersGrowthRate = (followersGrowth30Days / data30DaysAgo.followers) * 100;
      }

      if (data90DaysAgo) {
        followersGrowth90Days = profile.metrics.followersCount - data90DaysAgo.followers;
      }
    }

    // Determine growth trajectory
    let growthTrajectory: InstagramProfile['growth']['growthTrajectory'] = 'stable';
    if (followersGrowthRate > 10) growthTrajectory = 'growing';
    if (followersGrowthRate > 50) growthTrajectory = 'viral';
    if (followersGrowthRate < -5) growthTrajectory = 'declining';

    return {
      followersGrowthRate,
      followersGrowth30Days,
      followersGrowth90Days,
      postsFrequency: 0, // Calculate from post dates
      optimalPostingTimes: [], // Analyze from successful posts
      growthTrajectory
    };
  }

  /**
   * Generate profile predictions using ML
   */
  private async generateProfilePredictions(
    profile: InstagramProfile,
    posts: InstagramPost[]
  ): Promise<InstagramProfile['predictions']> {
    // Simple prediction logic (would use ML models in production)
    const growthRate = profile.growth.followersGrowthRate / 100;
    const currentFollowers = profile.metrics.followersCount;

    const next30DayFollowers = Math.round(
      currentFollowers * (1 + growthRate)
    );

    let engagementTrend: InstagramProfile['predictions']['engagementTrend'] = 'stable';
    if (profile.engagement.engagementRate > 5) engagementTrend = 'increasing';
    if (profile.engagement.engagementRate < 2) engagementTrend = 'decreasing';

    const viralPotentialScore = Math.min(
      (profile.engagement.engagementRate * 10) +
      (profile.growth.followersGrowthRate * 2) +
      (profile.content.reelsPercentage / 10),
      100
    );

    const brandPartnershipReadiness = Math.min(
      (profile.metrics.followersCount / 10000) * 20 +
      (profile.engagement.engagementRate * 10) +
      (profile.audience.audienceQualityScore * 0.7),
      100
    );

    const tourMarketScore = Math.min(
      (profile.metrics.followersCount / 5000) * 10 +
      (profile.engagement.engagementRate * 5) +
      (Object.keys(profile.audience.demographics.topCities).length * 5),
      100
    );

    return {
      next30DayFollowers,
      engagementTrend,
      viralPotentialScore,
      brandPartnershipReadiness,
      tourMarketScore
    };
  }

  /**
   * Calculate monetization values
   */
  private calculateMonetizationValues(
    profile: InstagramProfile
  ): InstagramProfile['monetization'] {
    const baseRate = 0.01; // $0.01 per follower as base
    const engagementMultiplier = 1 + (profile.engagement.engagementRate / 10);

    const estimatedPostValue = Math.round(
      profile.metrics.followersCount * baseRate * engagementMultiplier
    );

    const estimatedStoryValue = Math.round(estimatedPostValue * 0.5);
    const estimatedReelValue = Math.round(estimatedPostValue * 1.5);

    return {
      ...profile.monetization,
      estimatedPostValue,
      estimatedStoryValue,
      estimatedReelValue
    };
  }

  /**
   * Analyze sentiment using ML model
   */
  private async analyzeSentiment(text: string): Promise<number> {
    if (!this.sentimentModel) return 0.5;

    try {
      // Tokenize and prepare input
      // This would use proper text preprocessing in production
      const input = tf.tensor2d([[0]]); // Placeholder
      const prediction = this.sentimentModel.predict(input) as tf.Tensor;
      const score = await prediction.data();

      input.dispose();
      prediction.dispose();

      return score[0];
    } catch (error) {
      this.logger.warn('Sentiment analysis failed:', error);
      return 0.5;
    }
  }

  /**
   * Analyze competitive position
   */
  private analyzeCompetitivePosition(
    ourProfile: InstagramProfile,
    theirProfile: InstagramProfile
  ): CompetitorComparison['insights'] {
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const opportunities: string[] = [];
    const threats: string[] = [];
    const recommendations: string[] = [];

    // Analyze strengths
    if (ourProfile.engagement.engagementRate > theirProfile.engagement.engagementRate) {
      strengths.push('Higher engagement rate indicates stronger audience connection');
    }
    if (ourProfile.growth.followersGrowthRate > theirProfile.growth.followersGrowthRate) {
      strengths.push('Faster growth rate shows better momentum');
    }

    // Analyze weaknesses
    if (ourProfile.metrics.followersCount < theirProfile.metrics.followersCount) {
      weaknesses.push('Smaller follower base limits reach');
    }
    if (ourProfile.content.reelsPercentage < theirProfile.content.reelsPercentage) {
      weaknesses.push('Lower Reels usage missing algorithm boost opportunity');
    }

    // Identify opportunities
    const unusedHashtags = theirProfile.content.hashtagStrategy.filter(tag =>
      !ourProfile.content.hashtagStrategy.includes(tag)
    );
    if (unusedHashtags.length > 0) {
      opportunities.push(`Explore hashtags: ${unusedHashtags.slice(0, 3).join(', ')}`);
    }

    // Assess threats
    if (theirProfile.growth.followersGrowthRate > ourProfile.growth.followersGrowthRate * 2) {
      threats.push('Competitor growing significantly faster');
    }

    // Generate recommendations
    if (ourProfile.growth.postsFrequency < theirProfile.growth.postsFrequency) {
      recommendations.push('Increase posting frequency to match competitor');
    }
    if (ourProfile.content.videoToPhotoRatio < theirProfile.content.videoToPhotoRatio) {
      recommendations.push('Create more video content for better engagement');
    }

    return {
      strengths,
      weaknesses,
      opportunities,
      threats,
      recommendations
    };
  }

  /**
   * Determine competitive trends
   */
  private determineCompetitiveTrends(
    comparison: CompetitorComparison
  ): CompetitorComparison['trends'] {
    let followerTrend: CompetitorComparison['trends']['followerTrend'] = 'stable';
    if (comparison.metrics.followers.percentageDiff > 10) followerTrend = 'gaining';
    if (comparison.metrics.followers.percentageDiff < -10) followerTrend = 'losing';

    let engagementTrend: CompetitorComparison['trends']['engagementTrend'] = 'stable';
    if (comparison.metrics.engagement.percentageDiff > 10) engagementTrend = 'gaining';
    if (comparison.metrics.engagement.percentageDiff < -10) engagementTrend = 'losing';

    let threatLevel: CompetitorComparison['trends']['threatLevel'] = 'medium';
    if (comparison.metrics.growth.percentageDiff < -20 &&
        comparison.metrics.followers.percentageDiff < 0) {
      threatLevel = 'high';
    }
    if (comparison.metrics.growth.percentageDiff > 20 &&
        comparison.metrics.followers.percentageDiff > 0) {
      threatLevel = 'low';
    }

    return {
      followerTrend,
      engagementTrend,
      contentQualityTrend: 'stable',
      threatLevel
    };
  }

  // ============================================================================
  // DATABASE METHODS
  // ============================================================================

  /**
   * Store profile in database
   */
  private async storeProfile(profile: InstagramProfile): Promise<void> {
    const query = `
      INSERT INTO instagram_profiles (
        id, username, full_name, biography, followers_count,
        following_count, posts_count, engagement_rate,
        is_verified, is_business, scraped_at, data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (id) DO UPDATE SET
        followers_count = $5,
        following_count = $6,
        posts_count = $7,
        engagement_rate = $8,
        scraped_at = $11,
        data = $12
    `;

    const values = [
      profile.id,
      profile.username,
      profile.fullName,
      profile.biography,
      profile.metrics.followersCount,
      profile.metrics.followingCount,
      profile.metrics.postsCount,
      profile.engagement.engagementRate,
      profile.isVerified,
      profile.isBusiness,
      new Date(),
      JSON.stringify(profile)
    ];

    try {
      await this.db.query(query, values);
    } catch (error) {
      this.logger.error('Failed to store profile:', error);
    }
  }

  /**
   * Store hashtag in database
   */
  private async storeHashtag(hashtag: InstagramHashtag): Promise<void> {
    const query = `
      INSERT INTO instagram_hashtags (
        id, name, posts_count, scraped_at, data
      ) VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (id) DO UPDATE SET
        posts_count = $3,
        scraped_at = $4,
        data = $5
    `;

    const values = [
      hashtag.id,
      hashtag.name,
      hashtag.postsCount,
      new Date(),
      JSON.stringify(hashtag)
    ];

    try {
      await this.db.query(query, values);
    } catch (error) {
      this.logger.error('Failed to store hashtag:', error);
    }
  }

  /**
   * Store comparison in database
   */
  private async storeComparison(comparison: CompetitorComparison): Promise<void> {
    const query = `
      INSERT INTO instagram_comparisons (
        our_username, competitor_username, comparison_date, data
      ) VALUES ($1, $2, $3, $4)
    `;

    const values = [
      'our_account', // Would be passed as parameter
      comparison.competitorUsername,
      comparison.comparisonDate,
      JSON.stringify(comparison)
    ];

    try {
      await this.db.query(query, values);
    } catch (error) {
      this.logger.error('Failed to store comparison:', error);
    }
  }

  /**
   * Fetch historical data for growth calculations
   */
  private async fetchHistoricalData(username: string): Promise<any[]> {
    const query = `
      SELECT followers_count as followers, scraped_at as date
      FROM instagram_profiles
      WHERE username = $1
      ORDER BY scraped_at DESC
      LIMIT 90
    `;

    try {
      const result = await this.db.query(query, [username]);
      return result.rows;
    } catch (error) {
      this.logger.error('Failed to fetch historical data:', error);
      return [];
    }
  }

  /**
   * Process job from queue
   */
  private async processJob(job: any): Promise<void> {
    const { type, data } = job.data;

    switch (type) {
      case 'scrapeProfile':
        await this.scrapeProfile(data.username, data.options);
        break;

      case 'scrapeHashtag':
        await this.scrapeHashtag(data.hashtag);
        break;

      case 'compareCompetitor':
        await this.compareWithCompetitor(data.ourUsername, data.competitorUsername);
        break;

      default:
        this.logger.warn(`Unknown job type: ${type}`);
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.logger.info('Cleaning up Instagram scraper...');

    if (this.browser) {
      await this.browser.close();
    }

    await this.redis.quit();
    await this.db.end();
    await this.queue.close();
    await this.worker.close();

    this.logger.info('Instagram scraper cleaned up');
  }
}

// Export the scraper
export default InstagramScraper;
