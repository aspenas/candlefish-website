/**
 * Alert Service for Paintbox Application
 * Comprehensive alerting system for service failures and dependency issues
 */

import { logger } from '@/lib/logging/simple-logger';
import getCacheInstance from '@/lib/cache/cache-service';

export type AlertLevel = 'info' | 'warning' | 'error' | 'critical';
export type AlertCategory = 'dependency' | 'service' | 'security' | 'performance' | 'health' | 'deployment';

export interface Alert {
  id: string;
  level: AlertLevel;
  category: AlertCategory;
  title: string;
  message: string;
  component: string;
  timestamp: string;
  metadata?: Record<string, any>;
  resolved?: boolean;
  resolvedAt?: string;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
}

export interface AlertChannel {
  name: string;
  type: 'slack' | 'email' | 'webhook' | 'sms' | 'pagerduty';
  config: Record<string, any>;
  enabled: boolean;
  levels: AlertLevel[];
  categories: AlertCategory[];
}

export interface AlertRule {
  id: string;
  name: string;
  condition: string; // Condition expression
  level: AlertLevel;
  category: AlertCategory;
  enabled: boolean;
  cooldownMs: number;
  channels: string[];
  template?: {
    title: string;
    message: string;
  };
}

class AlertService {
  private cache = getCacheInstance();
  private channels: Map<string, AlertChannel> = new Map();
  private rules: Map<string, AlertRule> = new Map();
  private alertCooldowns: Map<string, number> = new Map();

  constructor() {
    this.initializeDefaultChannels();
    this.initializeDefaultRules();
  }

  /**
   * Initialize default alert channels
   */
  private initializeDefaultChannels() {
    // Slack webhook channel
    if (process.env.SLACK_WEBHOOK_URL) {
      this.addChannel({
        name: 'slack-general',
        type: 'slack',
        config: {
          webhookUrl: process.env.SLACK_WEBHOOK_URL,
          channel: '#paintbox-alerts',
          username: 'Paintbox Monitor',
          iconEmoji: ':warning:',
        },
        enabled: true,
        levels: ['warning', 'error', 'critical'],
        categories: ['dependency', 'service', 'security', 'health'],
      });
    }

    // Email channel
    if (process.env.ALERT_EMAIL_TO) {
      this.addChannel({
        name: 'email-critical',
        type: 'email',
        config: {
          to: process.env.ALERT_EMAIL_TO,
          from: process.env.ALERT_EMAIL_FROM || 'alerts@paintbox.app',
          smtpHost: process.env.SMTP_HOST,
          smtpPort: process.env.SMTP_PORT || 587,
          smtpUser: process.env.SMTP_USER,
          smtpPass: process.env.SMTP_PASS,
        },
        enabled: true,
        levels: ['critical'],
        categories: ['dependency', 'service', 'security'],
      });
    }

    // PagerDuty integration
    if (process.env.PAGERDUTY_INTEGRATION_KEY) {
      this.addChannel({
        name: 'pagerduty-critical',
        type: 'pagerduty',
        config: {
          integrationKey: process.env.PAGERDUTY_INTEGRATION_KEY,
          severity: 'critical',
        },
        enabled: true,
        levels: ['critical'],
        categories: ['service', 'security', 'health'],
      });
    }

    // Webhook channel for custom integrations
    if (process.env.CUSTOM_WEBHOOK_URL) {
      this.addChannel({
        name: 'webhook-custom',
        type: 'webhook',
        config: {
          url: process.env.CUSTOM_WEBHOOK_URL,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': process.env.CUSTOM_WEBHOOK_AUTH || '',
          },
        },
        enabled: true,
        levels: ['error', 'critical'],
        categories: ['dependency', 'service', 'security'],
      });
    }
  }

  /**
   * Initialize default alert rules
   */
  private initializeDefaultRules() {
    // Service health rules
    this.addRule({
      id: 'service-down',
      name: 'Service Down',
      condition: 'status === "unhealthy" && consecutiveFailures >= 3',
      level: 'critical',
      category: 'service',
      enabled: true,
      cooldownMs: 300000, // 5 minutes
      channels: ['slack-general', 'email-critical', 'pagerduty-critical'],
      template: {
        title: 'Critical: Service {{component}} is down',
        message: 'Service {{component}} has failed {{consecutiveFailures}} consecutive health checks. Last error: {{error}}',
      },
    });

    // Dependency vulnerability rules
    this.addRule({
      id: 'critical-vulnerability',
      name: 'Critical Security Vulnerability',
      condition: 'vulnerabilities.critical > 0',
      level: 'critical',
      category: 'security',
      enabled: true,
      cooldownMs: 3600000, // 1 hour
      channels: ['slack-general', 'email-critical'],
      template: {
        title: 'Critical: Security vulnerabilities detected',
        message: 'Found {{vulnerabilities.critical}} critical vulnerabilities in dependencies. Immediate action required.',
      },
    });

    // High memory usage rule
    this.addRule({
      id: 'high-memory-usage',
      name: 'High Memory Usage',
      condition: 'memory.usagePercentage > 90',
      level: 'warning',
      category: 'performance',
      enabled: true,
      cooldownMs: 900000, // 15 minutes
      channels: ['slack-general'],
      template: {
        title: 'Warning: High memory usage detected',
        message: 'Memory usage is at {{memory.usagePercentage}}%. Consider scaling or investigating memory leaks.',
      },
    });

    // Dependency health score rule
    this.addRule({
      id: 'poor-dependency-health',
      name: 'Poor Dependency Health',
      condition: 'healthScore < 70',
      level: 'warning',
      category: 'dependency',
      enabled: true,
      cooldownMs: 21600000, // 6 hours
      channels: ['slack-general'],
      template: {
        title: 'Warning: Poor dependency health score',
        message: 'Dependency health score is {{healthScore}}/100. Consider updating dependencies and resolving issues.',
      },
    });

    // Deployment failure rule
    this.addRule({
      id: 'deployment-failure',
      name: 'Deployment Failure',
      condition: 'deploymentStatus === "failed"',
      level: 'error',
      category: 'deployment',
      enabled: true,
      cooldownMs: 0, // No cooldown for deployment failures
      channels: ['slack-general', 'email-critical'],
      template: {
        title: 'Error: Deployment failed',
        message: 'Deployment to {{environment}} failed. Error: {{deploymentError}}',
      },
    });
  }

  /**
   * Add an alert channel
   */
  addChannel(channel: AlertChannel): void {
    this.channels.set(channel.name, channel);
    logger.info('Alert channel added', { channelName: channel.name, type: channel.type });
  }

  /**
   * Add an alert rule
   */
  addRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule);
    logger.info('Alert rule added', { ruleId: rule.id, name: rule.name });
  }

  /**
   * Send an alert
   */
  async sendAlert(alert: Alert): Promise<void> {
    try {
      // Check cooldown
      const cooldownKey = `${alert.component}:${alert.category}:${alert.level}`;
      const lastAlert = this.alertCooldowns.get(cooldownKey);
      const now = Date.now();

      if (lastAlert && (now - lastAlert) < 300000) { // 5 minute default cooldown
        logger.debug('Alert in cooldown period, skipping', { alertId: alert.id });
        return;
      }

      // Store alert
      await this.storeAlert(alert);

      // Find matching channels
      const matchingChannels = Array.from(this.channels.values()).filter(channel =>
        channel.enabled &&
        channel.levels.includes(alert.level) &&
        channel.categories.includes(alert.category)
      );

      // Send to each channel
      const sendPromises = matchingChannels.map(channel =>
        this.sendToChannel(channel, alert)
      );

      await Promise.allSettled(sendPromises);

      // Update cooldown
      this.alertCooldowns.set(cooldownKey, now);

      logger.info('Alert sent', {
        alertId: alert.id,
        level: alert.level,
        category: alert.category,
        channels: matchingChannels.length,
      });

    } catch (error) {
      logger.error('Failed to send alert', {
        alertId: alert.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Evaluate conditions and trigger alerts
   */
  async evaluateConditions(data: Record<string, any>): Promise<void> {
    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;

      try {
        // Simple condition evaluation (in production, use a proper expression parser)
        if (this.evaluateCondition(rule.condition, data)) {
          const alert: Alert = {
            id: `${rule.id}-${Date.now()}`,
            level: rule.level,
            category: rule.category,
            title: this.renderTemplate(rule.template?.title || rule.name, data),
            message: this.renderTemplate(rule.template?.message || 'Alert triggered', data),
            component: data.component || 'system',
            timestamp: new Date().toISOString(),
            metadata: data,
          };

          await this.sendAlert(alert);
        }
      } catch (error) {
        logger.error('Failed to evaluate alert rule', {
          ruleId: rule.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  /**
   * Simple condition evaluation
   */
  private evaluateCondition(condition: string, data: Record<string, any>): boolean {
    try {
      // Replace data references in condition
      let evaluatedCondition = condition;

      // Simple variable substitution
      for (const [key, value] of Object.entries(data)) {
        const regex = new RegExp(`\\b${key}\\b`, 'g');
        evaluatedCondition = evaluatedCondition.replace(regex, JSON.stringify(value));
      }

      // Handle nested properties
      evaluatedCondition = evaluatedCondition.replace(/(\w+)\.(\w+)/g, (match, obj, prop) => {
        if (data[obj] && typeof data[obj] === 'object' && data[obj][prop] !== undefined) {
          return JSON.stringify(data[obj][prop]);
        }
        return '0';
      });

      // Simple evaluation using Function constructor (for controlled expressions only)
      return new Function('return ' + evaluatedCondition)();
    } catch (error) {
      logger.error('Condition evaluation failed', { condition, error });
      return false;
    }
  }

  /**
   * Render template with data
   */
  private renderTemplate(template: string, data: Record<string, any>): string {
    let rendered = template;

    // Replace {{variable}} patterns
    rendered = rendered.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      const value = this.getNestedValue(data, key.trim());
      return value !== undefined ? String(value) : match;
    });

    return rendered;
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Send alert to specific channel
   */
  private async sendToChannel(channel: AlertChannel, alert: Alert): Promise<void> {
    try {
      switch (channel.type) {
        case 'slack':
          await this.sendSlackAlert(channel, alert);
          break;
        case 'email':
          await this.sendEmailAlert(channel, alert);
          break;
        case 'webhook':
          await this.sendWebhookAlert(channel, alert);
          break;
        case 'pagerduty':
          await this.sendPagerDutyAlert(channel, alert);
          break;
        default:
          logger.warning('Unknown channel type', { type: channel.type });
      }
    } catch (error) {
      logger.error('Failed to send to channel', {
        channelName: channel.name,
        channelType: channel.type,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Send Slack alert
   */
  private async sendSlackAlert(channel: AlertChannel, alert: Alert): Promise<void> {
    const config = channel.config;
    const color = this.getAlertColor(alert.level);

    const payload = {
      channel: config.channel,
      username: config.username || 'Paintbox Monitor',
      icon_emoji: config.iconEmoji || ':warning:',
      attachments: [
        {
          color,
          title: alert.title,
          text: alert.message,
          fields: [
            {
              title: 'Level',
              value: alert.level.toUpperCase(),
              short: true,
            },
            {
              title: 'Component',
              value: alert.component,
              short: true,
            },
            {
              title: 'Category',
              value: alert.category,
              short: true,
            },
            {
              title: 'Time',
              value: new Date(alert.timestamp).toLocaleString(),
              short: true,
            },
          ],
          footer: 'Paintbox Alert System',
          ts: Math.floor(new Date(alert.timestamp).getTime() / 1000),
        },
      ],
    };

    await this.httpPost(config.webhookUrl, JSON.stringify(payload), {
      'Content-Type': 'application/json',
    });
  }

  /**
   * Send email alert
   */
  private async sendEmailAlert(channel: AlertChannel, alert: Alert): Promise<void> {
    const config = channel.config;

    // In a real implementation, you would use nodemailer or similar
    const emailData = {
      to: config.to,
      from: config.from,
      subject: `[${alert.level.toUpperCase()}] ${alert.title}`,
      html: `
        <h2>${alert.title}</h2>
        <p><strong>Level:</strong> ${alert.level.toUpperCase()}</p>
        <p><strong>Component:</strong> ${alert.component}</p>
        <p><strong>Category:</strong> ${alert.category}</p>
        <p><strong>Time:</strong> ${new Date(alert.timestamp).toLocaleString()}</p>
        <hr>
        <p>${alert.message}</p>
        ${alert.metadata ? `<pre>${JSON.stringify(alert.metadata, null, 2)}</pre>` : ''}
      `,
    };

    logger.info('Email alert would be sent', { to: config.to, subject: emailData.subject });
    // TODO: Implement actual email sending
  }

  /**
   * Send webhook alert
   */
  private async sendWebhookAlert(channel: AlertChannel, alert: Alert): Promise<void> {
    const config = channel.config;

    const payload = {
      alert,
      timestamp: new Date().toISOString(),
      source: 'paintbox-alert-service',
    };

    await this.httpPost(
      config.url,
      JSON.stringify(payload),
      config.headers || { 'Content-Type': 'application/json' }
    );
  }

  /**
   * Send PagerDuty alert
   */
  private async sendPagerDutyAlert(channel: AlertChannel, alert: Alert): Promise<void> {
    const config = channel.config;

    const payload = {
      routing_key: config.integrationKey,
      event_action: 'trigger',
      dedup_key: `${alert.component}-${alert.category}`,
      payload: {
        summary: alert.title,
        source: alert.component,
        severity: config.severity || alert.level,
        component: alert.component,
        group: alert.category,
        custom_details: {
          message: alert.message,
          level: alert.level,
          category: alert.category,
          timestamp: alert.timestamp,
          metadata: alert.metadata,
        },
      },
    };

    await this.httpPost(
      'https://events.pagerduty.com/v2/enqueue',
      JSON.stringify(payload),
      { 'Content-Type': 'application/json' }
    );
  }

  /**
   * Store alert in cache/database
   */
  private async storeAlert(alert: Alert): Promise<void> {
    try {
      const key = `alert:${alert.id}`;
      await this.cache.set(key, JSON.stringify(alert), 86400 * 7); // 7 days

      // Also store in recent alerts list
      const recentKey = 'alerts:recent';
      const recent = await this.cache.get(recentKey);
      const recentAlerts = recent ? JSON.parse(recent) : [];

      recentAlerts.unshift(alert);
      recentAlerts.splice(100); // Keep only last 100 alerts

      await this.cache.set(recentKey, JSON.stringify(recentAlerts), 86400);
    } catch (error) {
      logger.error('Failed to store alert', { alertId: alert.id, error });
    }
  }

  /**
   * Get alert color for Slack
   */
  private getAlertColor(level: AlertLevel): string {
    switch (level) {
      case 'critical': return 'danger';
      case 'error': return 'danger';
      case 'warning': return 'warning';
      case 'info': return 'good';
      default: return 'good';
    }
  }

  /**
   * HTTP POST helper
   */
  private async httpPost(url: string, data: string, headers: Record<string, string>): Promise<void> {
    const https = require('https');
    const http = require('http');

    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const client = urlObj.protocol === 'https:' ? https : http;

      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: 'POST',
        headers: {
          'Content-Length': Buffer.byteLength(data),
          ...headers,
        },
      };

      const req = client.request(options, (res: any) => {
        let responseData = '';
        res.on('data', (chunk: string) => responseData += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve();
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
          }
        });
      });

      req.on('error', reject);
      req.write(data);
      req.end();
    });
  }

  /**
   * Get recent alerts
   */
  async getRecentAlerts(limit = 50): Promise<Alert[]> {
    try {
      const recent = await this.cache.get('alerts:recent');
      const alerts = recent ? JSON.parse(recent) : [];
      return alerts.slice(0, limit);
    } catch (error) {
      logger.error('Failed to get recent alerts', { error });
      return [];
    }
  }

  /**
   * Acknowledge alert
   */
  async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<void> {
    try {
      const key = `alert:${alertId}`;
      const alertData = await this.cache.get(key);

      if (alertData) {
        const alert: Alert = JSON.parse(alertData);
        alert.acknowledgedBy = acknowledgedBy;
        alert.acknowledgedAt = new Date().toISOString();

        await this.cache.set(key, JSON.stringify(alert), 86400 * 7);
        logger.info('Alert acknowledged', { alertId, acknowledgedBy });
      }
    } catch (error) {
      logger.error('Failed to acknowledge alert', { alertId, error });
    }
  }

  /**
   * Resolve alert
   */
  async resolveAlert(alertId: string, resolvedBy?: string): Promise<void> {
    try {
      const key = `alert:${alertId}`;
      const alertData = await this.cache.get(key);

      if (alertData) {
        const alert: Alert = JSON.parse(alertData);
        alert.resolved = true;
        alert.resolvedAt = new Date().toISOString();

        if (resolvedBy) {
          alert.acknowledgedBy = resolvedBy;
          alert.acknowledgedAt = new Date().toISOString();
        }

        await this.cache.set(key, JSON.stringify(alert), 86400 * 7);
        logger.info('Alert resolved', { alertId, resolvedBy });
      }
    } catch (error) {
      logger.error('Failed to resolve alert', { alertId, error });
    }
  }
}

// Singleton instance
let alertService: AlertService | null = null;

export function getAlertService(): AlertService {
  if (!alertService) {
    alertService = new AlertService();
  }
  return alertService;
}

export { AlertService };
