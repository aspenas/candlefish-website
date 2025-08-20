/**
 * Google OAuth Dual-Mode Support for Zero-Downtime Migration
 * 
 * This module allows the application to work with both old and new OAuth
 * credentials during the migration period, ensuring zero downtime.
 */

const { OAuth2Client } = require('google-auth-library');

class DualModeOAuthClient {
    constructor() {
        this.migrationMode = process.env.OAUTH_MIGRATION_MODE || 'single';
        
        // Initialize clients based on migration mode
        if (this.migrationMode === 'dual') {
            this.initializeDualMode();
        } else {
            this.initializeSingleMode();
        }
        
        this.setupMetrics();
    }

    initializeSingleMode() {
        // Standard single client mode
        this.primaryClient = new OAuth2Client(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            this.getRedirectUrl()
        );
        
        this.clients = {
            primary: this.primaryClient
        };
        
        console.log('OAuth initialized in single mode');
    }

    initializeDualMode() {
        // Dual client mode for migration
        this.oldClient = new OAuth2Client(
            process.env.GOOGLE_CLIENT_ID_OLD,
            process.env.GOOGLE_CLIENT_SECRET_OLD,
            this.getRedirectUrl()
        );
        
        this.newClient = new OAuth2Client(
            process.env.GOOGLE_CLIENT_ID_NEW,
            process.env.GOOGLE_CLIENT_SECRET_NEW,
            this.getRedirectUrl()
        );
        
        // Use new client as primary, old as fallback
        this.primaryClient = this.newClient;
        this.fallbackClient = this.oldClient;
        
        this.clients = {
            primary: this.primaryClient,
            fallback: this.fallbackClient,
            old: this.oldClient,
            new: this.newClient
        };
        
        console.log('OAuth initialized in dual mode (migration active)');
    }

    setupMetrics() {
        // Track which client is being used
        this.metrics = {
            oldClientUsage: 0,
            newClientUsage: 0,
            fallbackUsage: 0,
            errors: {
                old: 0,
                new: 0
            }
        };
        
        // Log metrics every 5 minutes
        if (this.migrationMode === 'dual') {
            setInterval(() => this.logMetrics(), 5 * 60 * 1000);
        }
    }

    getRedirectUrl() {
        // Return the appropriate redirect URL based on environment
        const baseUrl = process.env.APP_URL || 'https://paintbox.fly.dev';
        return `${baseUrl}/api/auth/callback/google`;
    }

    /**
     * Generate authorization URL
     * Works with both old and new clients
     */
    generateAuthUrl(options = {}) {
        const authOptions = {
            access_type: 'offline',
            scope: options.scope || [
                'https://www.googleapis.com/auth/userinfo.profile',
                'https://www.googleapis.com/auth/userinfo.email'
            ],
            prompt: options.prompt || 'consent',
            ...options
        };

        return this.primaryClient.generateAuthUrl(authOptions);
    }

    /**
     * Exchange authorization code for tokens
     * Tries new client first, falls back to old if needed
     */
    async getToken(code) {
        if (this.migrationMode !== 'dual') {
            // Single mode - use primary client only
            try {
                const { tokens } = await this.primaryClient.getToken(code);
                return { tokens, client: 'primary' };
            } catch (error) {
                console.error('OAuth token exchange failed:', error);
                throw error;
            }
        }

        // Dual mode - try new first, fallback to old
        try {
            const { tokens } = await this.newClient.getToken(code);
            this.metrics.newClientUsage++;
            console.log('Token obtained using new OAuth client');
            return { tokens, client: 'new' };
        } catch (newError) {
            console.warn('New OAuth client failed, trying old client:', newError.message);
            this.metrics.errors.new++;
            
            try {
                const { tokens } = await this.oldClient.getToken(code);
                this.metrics.oldClientUsage++;
                this.metrics.fallbackUsage++;
                console.log('Token obtained using old OAuth client (fallback)');
                return { tokens, client: 'old' };
            } catch (oldError) {
                console.error('Both OAuth clients failed:', {
                    new: newError.message,
                    old: oldError.message
                });
                this.metrics.errors.old++;
                throw oldError;
            }
        }
    }

    /**
     * Verify ID token
     * Accepts tokens from both old and new clients
     */
    async verifyIdToken(idToken, options = {}) {
        const verifyOptions = {
            idToken,
            audience: options.audience // Optional audience
        };

        if (this.migrationMode !== 'dual') {
            // Single mode verification
            try {
                const ticket = await this.primaryClient.verifyIdToken(verifyOptions);
                return ticket.getPayload();
            } catch (error) {
                console.error('Token verification failed:', error);
                throw error;
            }
        }

        // Dual mode - try both clients
        const errors = [];

        // Try new client first
        try {
            verifyOptions.audience = verifyOptions.audience || process.env.GOOGLE_CLIENT_ID_NEW;
            const ticket = await this.newClient.verifyIdToken(verifyOptions);
            this.metrics.newClientUsage++;
            return ticket.getPayload();
        } catch (newError) {
            errors.push({ client: 'new', error: newError.message });
        }

        // Try old client as fallback
        try {
            verifyOptions.audience = process.env.GOOGLE_CLIENT_ID_OLD;
            const ticket = await this.oldClient.verifyIdToken(verifyOptions);
            this.metrics.oldClientUsage++;
            this.metrics.fallbackUsage++;
            return ticket.getPayload();
        } catch (oldError) {
            errors.push({ client: 'old', error: oldError.message });
        }

        // Both failed
        console.error('Token verification failed with both clients:', errors);
        throw new Error(`Token verification failed: ${JSON.stringify(errors)}`);
    }

    /**
     * Refresh access token
     * Works with tokens from both old and new clients
     */
    async refreshAccessToken(refreshToken) {
        if (this.migrationMode !== 'dual') {
            // Single mode
            this.primaryClient.setCredentials({ refresh_token: refreshToken });
            const { credentials } = await this.primaryClient.refreshAccessToken();
            return credentials;
        }

        // Dual mode - try both clients
        const errors = [];

        // Try new client first
        try {
            this.newClient.setCredentials({ refresh_token: refreshToken });
            const { credentials } = await this.newClient.refreshAccessToken();
            this.metrics.newClientUsage++;
            return { ...credentials, client: 'new' };
        } catch (newError) {
            errors.push({ client: 'new', error: newError.message });
        }

        // Try old client
        try {
            this.oldClient.setCredentials({ refresh_token: refreshToken });
            const { credentials } = await this.oldClient.refreshAccessToken();
            this.metrics.oldClientUsage++;
            return { ...credentials, client: 'old' };
        } catch (oldError) {
            errors.push({ client: 'old', error: oldError.message });
        }

        // Both failed
        console.error('Token refresh failed with both clients:', errors);
        throw new Error(`Token refresh failed: ${JSON.stringify(errors)}`);
    }

    /**
     * Get user info from Google
     */
    async getUserInfo(accessToken) {
        const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch user info: ${response.statusText}`);
        }

        return response.json();
    }

    /**
     * Log migration metrics
     */
    logMetrics() {
        const total = this.metrics.oldClientUsage + this.metrics.newClientUsage;
        
        if (total > 0) {
            const newClientPercentage = (this.metrics.newClientUsage / total * 100).toFixed(2);
            const oldClientPercentage = (this.metrics.oldClientUsage / total * 100).toFixed(2);
            
            console.log('OAuth Migration Metrics:', {
                totalRequests: total,
                newClient: {
                    usage: this.metrics.newClientUsage,
                    percentage: `${newClientPercentage}%`,
                    errors: this.metrics.errors.new
                },
                oldClient: {
                    usage: this.metrics.oldClientUsage,
                    percentage: `${oldClientPercentage}%`,
                    errors: this.metrics.errors.old,
                    fallbacks: this.metrics.fallbackUsage
                },
                migrationProgress: `${newClientPercentage}% migrated to new client`
            });
        }
    }

    /**
     * Get current migration status
     */
    getMigrationStatus() {
        return {
            mode: this.migrationMode,
            metrics: this.metrics,
            clients: {
                old: !!this.oldClient,
                new: !!this.newClient,
                primary: this.primaryClient === this.newClient ? 'new' : 'old'
            }
        };
    }

    /**
     * Health check for OAuth configuration
     */
    async healthCheck() {
        const status = {
            healthy: true,
            mode: this.migrationMode,
            clients: {}
        };

        if (this.migrationMode === 'dual') {
            // Check both clients
            try {
                // Simple check - just verify client is configured
                if (this.newClient._clientId) {
                    status.clients.new = 'configured';
                }
            } catch (error) {
                status.clients.new = 'error';
                status.healthy = false;
            }

            try {
                if (this.oldClient._clientId) {
                    status.clients.old = 'configured';
                }
            } catch (error) {
                status.clients.old = 'error';
            }
        } else {
            try {
                if (this.primaryClient._clientId) {
                    status.clients.primary = 'configured';
                }
            } catch (error) {
                status.clients.primary = 'error';
                status.healthy = false;
            }
        }

        return status;
    }
}

// Export singleton instance
module.exports = new DualModeOAuthClient();

// Also export class for testing
module.exports.DualModeOAuthClient = DualModeOAuthClient;