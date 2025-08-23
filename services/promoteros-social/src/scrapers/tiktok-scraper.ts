import { chromium, Browser, Page } from 'playwright';
import { logger } from '../utils/logger';
import { EventEmitter } from 'events';

export interface TikTokVideo {
  id: string;
  author: {
    username: string;
    nickname: string;
    followers: number;
    verified: boolean;
  };
  stats: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
    engagement_rate: number;
  };
  music: {
    title: string;
    author: string;
    original: boolean;
  };
  content: {
    description: string;
    hashtags: string[];
    mentions: string[];
  };
  created_at: Date;
  growth_velocity: number; // views per hour
  viral_score: number; // 0-100
}

export class TikTokScraper extends EventEmitter {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private isInitialized = false;

  async initialize() {
    try {
      this.browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      this.page = await this.browser.newPage();

      // Set realistic user agent
      await this.page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      );

      this.isInitialized = true;
      logger.info('TikTok scraper initialized');
    } catch (error) {
      logger.error('Failed to initialize TikTok scraper:', error);
      throw error;
    }
  }

  async getTrendingMusic(limit = 50): Promise<TikTokVideo[]> {
    if (!this.isInitialized) await this.initialize();

    const videos: TikTokVideo[] = [];

    try {
      // Navigate to TikTok music trending page
      await this.page!.goto('https://www.tiktok.com/music', {
        waitUntil: 'networkidle'
      });

      // Scroll to load more content
      for (let i = 0; i < 5; i++) {
        await this.page!.evaluate(() => window.scrollBy(0, window.innerHeight));
        await this.page!.waitForTimeout(2000);
      }

      // Extract video data
      const rawVideos = await this.page!.evaluate(() => {
        const videos: any[] = [];
        const videoElements = document.querySelectorAll('[data-e2e="music-item"]');

        videoElements.forEach(el => {
          // Extract data from DOM
          // This is simplified - real implementation would be more robust
          const video = {
            // ... extract video data
          };
          videos.push(video);
        });

        return videos;
      });

      // Process and score videos
      for (const raw of rawVideos) {
        const processed = await this.processVideo(raw);
        videos.push(processed);

        // Emit for real-time processing
        this.emit('video:discovered', processed);

        if (videos.length >= limit) break;
      }

    } catch (error) {
      logger.error('Error scraping TikTok:', error);
      throw error;
    }

    return videos;
  }

  async getArtistMetrics(username: string): Promise<any> {
    if (!this.isInitialized) await this.initialize();

    try {
      await this.page!.goto(`https://www.tiktok.com/@${username}`, {
        waitUntil: 'networkidle'
      });

      // Extract profile metrics
      const metrics = await this.page!.evaluate(() => {
        return {
          followers: parseInt(document.querySelector('[data-e2e="followers-count"]')?.textContent || '0'),
          following: parseInt(document.querySelector('[data-e2e="following-count"]')?.textContent || '0'),
          likes: parseInt(document.querySelector('[data-e2e="likes-count"]')?.textContent || '0'),
          videos: document.querySelectorAll('[data-e2e="user-post-item"]').length
        };
      });

      // Get recent videos for trend analysis
      const recentVideos = await this.getRecentVideos(username, 10);

      // Calculate growth metrics
      const growthMetrics = this.calculateGrowthMetrics(recentVideos);

      return {
        username,
        ...metrics,
        ...growthMetrics,
        scrapedAt: new Date()
      };

    } catch (error) {
      logger.error(`Error getting metrics for ${username}:`, error);
      throw error;
    }
  }

  private async processVideo(raw: any): Promise<TikTokVideo> {
    // Calculate engagement rate
    const engagementRate = this.calculateEngagementRate(raw);

    // Calculate viral score
    const viralScore = this.calculateViralScore(raw);

    // Calculate growth velocity
    const growthVelocity = this.calculateGrowthVelocity(raw);

    return {
      id: raw.id,
      author: {
        username: raw.author.uniqueId,
        nickname: raw.author.nickname,
        followers: raw.authorStats.followerCount,
        verified: raw.author.verified
      },
      stats: {
        views: raw.stats.playCount,
        likes: raw.stats.diggCount,
        comments: raw.stats.commentCount,
        shares: raw.stats.shareCount,
        engagement_rate: engagementRate
      },
      music: {
        title: raw.music.title,
        author: raw.music.authorName,
        original: raw.music.original
      },
      content: {
        description: raw.desc,
        hashtags: this.extractHashtags(raw.desc),
        mentions: this.extractMentions(raw.desc)
      },
      created_at: new Date(raw.createTime * 1000),
      growth_velocity: growthVelocity,
      viral_score: viralScore
    };
  }

  private calculateEngagementRate(video: any): number {
    const totalEngagements = video.stats.diggCount +
                            video.stats.commentCount +
                            video.stats.shareCount;
    return (totalEngagements / video.stats.playCount) * 100;
  }

  private calculateViralScore(video: any): number {
    // Proprietary viral scoring algorithm
    const factors = {
      views: Math.min(video.stats.playCount / 1000000, 1) * 30,
      engagement: Math.min(this.calculateEngagementRate(video) / 10, 1) * 25,
      shares: Math.min(video.stats.shareCount / 10000, 1) * 20,
      velocity: Math.min(this.calculateGrowthVelocity(video) / 100000, 1) * 25
    };

    return Object.values(factors).reduce((a, b) => a + b, 0);
  }

  private calculateGrowthVelocity(video: any): number {
    const hoursOld = (Date.now() - video.createTime * 1000) / (1000 * 60 * 60);
    return video.stats.playCount / Math.max(hoursOld, 1);
  }

  private calculateGrowthMetrics(videos: any[]): any {
    if (videos.length < 2) return { growthRate: 0, trending: false };

    // Sort by date
    videos.sort((a, b) => a.createTime - b.createTime);

    // Calculate average views growth
    let totalGrowth = 0;
    for (let i = 1; i < videos.length; i++) {
      const growth = (videos[i].stats.playCount - videos[i-1].stats.playCount) /
                    videos[i-1].stats.playCount;
      totalGrowth += growth;
    }

    const avgGrowth = totalGrowth / (videos.length - 1);

    return {
      growthRate: avgGrowth * 100,
      trending: avgGrowth > 0.5, // 50% growth between videos
      avgViews: videos.reduce((sum, v) => sum + v.stats.playCount, 0) / videos.length,
      avgEngagement: videos.reduce((sum, v) => sum + this.calculateEngagementRate(v), 0) / videos.length
    };
  }

  private extractHashtags(text: string): string[] {
    return text.match(/#\w+/g) || [];
  }

  private extractMentions(text: string): string[] {
    return text.match(/@\w+/g) || [];
  }

  private async getRecentVideos(username: string, limit: number): Promise<any[]> {
    // Implementation to get recent videos
    // This would scrape the user's profile page
    return [];
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
      this.isInitialized = false;
    }
  }
}

// Real-time monitoring service
export class TikTokMonitor {
  private scraper: TikTokScraper;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private artistWatchlist: Set<string> = new Set();

  constructor() {
    this.scraper = new TikTokScraper();
  }

  async startMonitoring(intervalMs = 60000) {
    await this.scraper.initialize();

    this.monitoringInterval = setInterval(async () => {
      try {
        // Get trending music
        const trending = await this.scraper.getTrendingMusic(20);

        // Check watchlist artists
        for (const artist of this.artistWatchlist) {
          const metrics = await this.scraper.getArtistMetrics(artist);
          this.scraper.emit('artist:update', { artist, metrics });
        }

        // Emit trending update
        this.scraper.emit('trending:update', trending);

      } catch (error) {
        logger.error('Monitoring error:', error);
      }
    }, intervalMs);

    logger.info('TikTok monitoring started');
  }

  addArtistToWatchlist(username: string) {
    this.artistWatchlist.add(username);
    logger.info(`Added ${username} to watchlist`);
  }

  removeArtistFromWatchlist(username: string) {
    this.artistWatchlist.delete(username);
  }

  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.scraper.cleanup();
  }

  onVideoDiscovered(callback: (video: TikTokVideo) => void) {
    this.scraper.on('video:discovered', callback);
  }

  onArtistUpdate(callback: (data: any) => void) {
    this.scraper.on('artist:update', callback);
  }

  onTrendingUpdate(callback: (videos: TikTokVideo[]) => void) {
    this.scraper.on('trending:update', callback);
  }
}
