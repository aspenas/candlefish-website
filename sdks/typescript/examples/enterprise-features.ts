/**
 * Enterprise Features Example for Candlefish Claude Config SDK
 * 
 * This example demonstrates advanced enterprise features:
 * - OAuth2 authentication with token refresh
 * - Advanced configuration management
 * - Security and access controls
 * - Performance monitoring
 * - Multi-tier service usage
 */

import {
  createClientWithOAuth2,
  CandlefishConfigClient,
  ServiceTier,
  AuthMethod,
  ConfigProfile,
  mergeConfigs,
  isWithinRateLimit,
  formatTimestamp
} from '@candlefish/claude-config';

class EnterpriseConfigManager {
  private client: CandlefishConfigClient;
  private requestCount = 0;
  private startTime = Date.now();

  constructor(accessToken: string, refreshToken: string, expiresAt: number) {
    // Initialize with OAuth2 and Enterprise tier
    this.client = new CandlefishConfigClient(
      {
        method: AuthMethod.OAuth2,
        accessToken,
        refreshToken,
        expiresAt
      },
      {
        tier: ServiceTier.Enterprise,
        timeout: 45000, // Longer timeout for enterprise
        retry: {
          max_attempts: 5,
          base_delay_ms: 2000,
          max_delay_ms: 15000,
          backoff_multiplier: 2.5
        },
        headers: {
          'X-Organization': 'enterprise-corp',
          'X-User-Role': 'admin'
        }
      }
    );

    // Set up automatic token refresh
    this.setupTokenRefresh();
  }

  /**
   * Setup automatic token refresh
   */
  private setupTokenRefresh(): void {
    setInterval(async () => {
      if (this.client.areCredentialsExpired()) {
        try {
          console.log('Refreshing OAuth2 tokens...');
          await this.client.refreshToken();
          console.log('Tokens refreshed successfully');
        } catch (error) {
          console.error('Token refresh failed:', error);
        }
      }
    }, 5 * 60 * 1000); // Check every 5 minutes
  }

  /**
   * Create enterprise-grade configuration profile
   */
  async createEnterpriseProfile(): Promise<ConfigProfile> {
    const enterpriseProfile: Omit<ConfigProfile, 'profile_id'> = {
      name: 'Enterprise Production Profile',
      version: '2.1.0',
      description: 'High-security, high-performance production configuration',
      settings: {
        languages: ['typescript', 'python', 'go', 'rust'],
        tools: ['kubernetes', 'docker', 'terraform', 'helm'],
        environment: {
          NODE_ENV: 'production',
          LOG_LEVEL: 'info',
          MONITORING_ENABLED: true,
          AUDIT_LOGGING: true
        },
        models: {
          primary: 'claude-3-opus',
          fallback: ['claude-3-sonnet', 'claude-3-haiku'],
          routing: {
            strategy: 'load-based',
            rules: [
              {
                condition: 'request.complexity > 0.9',
                target: 'claude-3-opus',
                priority: 10
              },
              {
                condition: 'request.type === "code_generation"',
                target: 'claude-3-sonnet',
                priority: 8
              },
              {
                condition: 'request.urgency === "high"',
                target: 'claude-3-haiku',
                priority: 6
              }
            ],
            fallback: 'queue'
          }
        },
        security: {
          api_keys: {
            rotation_days: 30,
            allow_multiple: false
          },
          oauth2: {
            scopes: ['read:config', 'write:config', 'admin:config'],
            refresh_token_ttl: 86400 // 24 hours
          },
          rate_limits: {
            requests_per_minute: 1000,
            concurrent_requests: 100,
            burst_allowance: 200
          },
          acl: [
            {
              resource: '/config/profiles/*',
              actions: ['read', 'write', 'delete'],
              principals: ['admin', 'devops']
            },
            {
              resource: '/config/profiles/production-*',
              actions: ['read'],
              principals: ['developer']
            }
          ]
        },
        performance: {
          timeout_ms: 45000,
          connection_pool: {
            max_connections: 200,
            idle_timeout_ms: 300000 // 5 minutes
          },
          caching: {
            enabled: true,
            ttl_seconds: 600, // 10 minutes
            key_patterns: ['config:*', 'profile:*']
          },
          monitoring: {
            detailed_analytics: true,
            metrics_interval_ms: 30000, // 30 seconds
            log_level: 'info'
          }
        }
      },
      metadata: {
        tags: ['production', 'enterprise', 'high-security'],
        owner: 'devops@enterprise-corp.com',
        analytics: {
          usage_count: 0,
          performance_metrics: {
            avg_response_time_ms: 0,
            success_rate: 100,
            error_count: 0
          }
        }
      }
    };

    console.log('Creating enterprise profile...');
    const profile = await this.client.createProfile(enterpriseProfile);
    console.log(`Enterprise profile created: ${profile.profile_id}`);
    
    return profile;
  }

  /**
   * Demonstrate profile inheritance and merging
   */
  async demonstrateProfileInheritance(): Promise<void> {
    // Base configuration
    const baseConfig = {
      settings: {
        languages: ['typescript'],
        tools: ['npm'],
        environment: {
          NODE_ENV: 'development'
        }
      }
    };

    // Environment-specific overrides
    const productionOverrides = {
      settings: {
        tools: ['pnpm', 'docker'],
        environment: {
          NODE_ENV: 'production',
          LOG_LEVEL: 'warn',
          MONITORING_ENABLED: true
        },
        security: {
          rate_limits: {
            requests_per_minute: 1000
          }
        }
      }
    };

    // Merge configurations
    const mergedConfig = mergeConfigs(baseConfig, productionOverrides);
    console.log('Merged configuration:', JSON.stringify(mergedConfig, null, 2));

    // Create profile with merged config
    const profile = await this.client.createProfile({
      name: 'Merged Production Profile',
      version: '1.0.0',
      description: 'Profile created from base config + production overrides',
      ...mergedConfig
    });

    console.log('Profile with merged config created:', profile.profile_id);
  }

  /**
   * Monitor performance and rate limits
   */
  async monitorPerformance(): Promise<void> {
    this.requestCount++;
    const timeElapsed = Date.now() - this.startTime;
    
    // Check rate limit compliance
    const withinLimits = isWithinRateLimit(
      ServiceTier.Enterprise,
      this.requestCount,
      timeElapsed
    );

    console.log(`Request #${this.requestCount}`);
    console.log(`Time elapsed: ${timeElapsed}ms`);
    console.log(`Within rate limits: ${withinLimits}`);

    if (!withinLimits) {
      console.warn('⚠️  Approaching rate limits!');
    }

    // Get API health
    const health = await this.client.healthCheck();
    console.log(`API Health: ${health.status} at ${formatTimestamp(health.timestamp)}`);
  }

  /**
   * Bulk operations for enterprise customers
   */
  async performBulkOperations(): Promise<void> {
    console.log('Performing bulk operations...');

    // Create multiple profiles concurrently
    const profilePromises = [];
    for (let i = 1; i <= 5; i++) {
      profilePromises.push(
        this.client.createProfile({
          name: `Bulk Profile ${i}`,
          version: `1.0.${i}`,
          description: `Bulk created profile #${i}`,
          settings: {
            languages: ['typescript'],
            tools: [`tool-${i}`]
          },
          metadata: {
            tags: ['bulk-created', `batch-${Math.ceil(i / 2)}`]
          }
        })
      );
    }

    // Wait for all profiles to be created
    const createdProfiles = await Promise.allSettled(profilePromises);
    
    console.log('Bulk creation results:');
    createdProfiles.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        console.log(`✅ Profile ${index + 1}: ${result.value.profile_id}`);
      } else {
        console.log(`❌ Profile ${index + 1}: ${result.reason}`);
      }
    });

    // List profiles with advanced filtering
    const filteredProfiles = await this.client.listProfiles({
      limit: 10,
      name_filter: 'Bulk Profile',
      tags: ['bulk-created'],
      sort_by: 'created_at',
      sort_order: 'desc'
    });

    console.log(`Found ${filteredProfiles.length} bulk-created profiles`);
  }

  /**
   * Demonstrate real-time monitoring
   */
  setupRealTimeMonitoring(): void {
    console.log('Setting up real-time monitoring...');
    
    const ws = this.client.connectToConfigEvents({
      onOpen: () => {
        console.log('🔗 Real-time monitoring connected');
      },
      onMessage: (event) => {
        console.log(`📡 Event received: ${event.event_type}`);
        console.log(`   Timestamp: ${formatTimestamp(event.timestamp)}`);
        
        if (event.metadata?.correlation_id) {
          console.log(`   Correlation ID: ${event.metadata.correlation_id}`);
        }

        // Handle different event types
        switch (event.event_type) {
          case 'profile_created':
            console.log(`   ✅ Profile created: ${event.payload.name}`);
            break;
          case 'profile_updated':
            console.log(`   🔄 Profile updated: ${event.payload.name}`);
            break;
          case 'profile_deleted':
            console.log(`   🗑️  Profile deleted: ${event.payload.profile_id}`);
            break;
          case 'security_event':
            console.log(`   🛡️  Security event: ${event.payload.type}`);
            break;
          case 'performance_alert':
            console.log(`   ⚡ Performance alert: ${event.payload.metric}`);
            break;
        }
      },
      onClose: (event) => {
        console.log('🔌 Real-time monitoring disconnected');
        if (!event.wasClean) {
          console.log('   Unexpected disconnection, will retry...');
        }
      },
      onError: (error) => {
        console.error('❌ Real-time monitoring error:', error);
      }
    });

    // Keep connection alive and monitor
    return ws;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    console.log('Cleaning up enterprise config manager...');
    this.client.destroy();
  }
}

// Usage example
async function main() {
  const manager = new EnterpriseConfigManager(
    process.env.OAUTH_ACCESS_TOKEN!,
    process.env.OAUTH_REFRESH_TOKEN!,
    Date.now() + 3600000 // 1 hour from now
  );

  try {
    // Monitor performance
    await manager.monitorPerformance();

    // Create enterprise profile
    await manager.createEnterpriseProfile();

    // Demonstrate profile inheritance
    await manager.demonstrateProfileInheritance();

    // Perform bulk operations
    await manager.performBulkOperations();

    // Setup real-time monitoring
    manager.setupRealTimeMonitoring();

    // Keep the process running to receive events
    console.log('Enterprise manager is running. Press Ctrl+C to exit.');
    process.on('SIGINT', () => {
      console.log('Shutting down...');
      manager.destroy();
      process.exit(0);
    });

  } catch (error) {
    console.error('Enterprise operation failed:', error);
    manager.destroy();
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { EnterpriseConfigManager };