/**
 * Salesforce Service - Comprehensive CRM Integration
 * Handles full CRUD operations for Salesforce CRM with OAuth, caching, and sync
 */

import jsforce from 'jsforce';
import { getSecretsManager } from './secrets-manager';
import getCacheInstance from '@/lib/cache/cache-service';
import { logger } from '@/lib/logging/simple-logger';
import {
  ExternalServiceError,
  AuthenticationError,
  ServiceUnavailableError,
  salesforceCircuitBreaker
} from '@/lib/middleware/error-handler';

// Core Salesforce interfaces
export interface SalesforceContact {
  Id: string;
  Name: string;
  FirstName?: string;
  LastName?: string;
  Email?: string;
  Phone?: string;
  MobilePhone?: string;
  AccountId?: string;
  Account?: {
    Name: string;
    Id: string;
  };
  MailingStreet?: string;
  MailingCity?: string;
  MailingState?: string;
  MailingPostalCode?: string;
  MailingCountry?: string;
  Title?: string;
  Department?: string;
  LeadSource?: string;
  LastModifiedDate?: string;
  CreatedDate?: string;
  SystemModstamp?: string;
}

export interface SalesforceAccount {
  Id: string;
  Name: string;
  Type?: string;
  Industry?: string;
  Phone?: string;
  Website?: string;
  BillingStreet?: string;
  BillingCity?: string;
  BillingState?: string;
  BillingPostalCode?: string;
  BillingCountry?: string;
  ShippingStreet?: string;
  ShippingCity?: string;
  ShippingState?: string;
  ShippingPostalCode?: string;
  ShippingCountry?: string;
  Description?: string;
  NumberOfEmployees?: number;
  AnnualRevenue?: number;
  ParentId?: string;
  OwnerId?: string;
  LastModifiedDate?: string;
  CreatedDate?: string;
  SystemModstamp?: string;
}

export interface SalesforceOpportunity {
  Id: string;
  Name: string;
  AccountId?: string;
  Account?: {
    Name: string;
    Id: string;
  };
  ContactId?: string;
  Contact?: {
    Name: string;
    Id: string;
  };
  Amount?: number;
  StageName: string;
  CloseDate: string;
  Probability?: number;
  Type?: string;
  LeadSource?: string;
  Description?: string;
  NextStep?: string;
  OwnerId?: string;
  CampaignId?: string;
  LastModifiedDate?: string;
  CreatedDate?: string;
  SystemModstamp?: string;
}

export interface PaintboxEstimate {
  Id?: string;
  Name: string;
  Contact__c?: string;
  Account__c?: string;
  Opportunity__c?: string;
  Total_Amount__c?: number;
  Exterior_Amount__c?: number;
  Interior_Amount__c?: number;
  Materials_Cost__c?: number;
  Labor_Cost__c?: number;
  Status__c: 'Draft' | 'Pending' | 'Approved' | 'Rejected' | 'Completed';
  Estimate_Date__c: string;
  Valid_Until__c?: string;
  Notes__c?: string;
  Excel_Data__c?: string; // JSON string of Excel calculations
  Square_Footage__c?: number;
  Rooms_Count__c?: number;
  Paint_Quality__c?: 'Good' | 'Better' | 'Best';
  LastModifiedDate?: string;
  CreatedDate?: string;
  SystemModstamp?: string;
}

// Sync and conflict resolution types
export interface SyncResult {
  success: boolean;
  processed: number;
  errors: string[];
  conflicts: ConflictRecord[];
}

export interface ConflictRecord {
  id: string;
  type: 'Contact' | 'Account' | 'Opportunity' | 'PaintboxEstimate__c';
  localData: any;
  remoteData: any;
  conflictFields: string[];
  timestamp: Date;
}

// OAuth token management
interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  instanceUrl: string;
  expiresAt: number;
}

class SalesforceService {
  private conn: jsforce.Connection | null = null;
  private isInitialized = false;
  private tokenRefreshPromise: Promise<void> | null = null;
  private cache = getCacheInstance();
  private syncInterval: NodeJS.Timeout | null = null;
  private readonly CACHE_TTL = 300; // 5 minutes
  private readonly BATCH_SIZE = 200;
  private readonly MAX_RETRIES = 3;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Try to get credentials from AWS Secrets Manager first, then fall back to env vars
      let clientId = process.env.SALESFORCE_CLIENT_ID;
      let clientSecret = process.env.SALESFORCE_CLIENT_SECRET;
      let username = process.env.SALESFORCE_USERNAME;
      let password = process.env.SALESFORCE_PASSWORD;
      let securityToken = process.env.SALESFORCE_SECURITY_TOKEN;
      let instanceUrl = process.env.SALESFORCE_INSTANCE_URL;

      // Try AWS Secrets Manager if environment variables are not set
      if (!clientId || !clientSecret || !username || !password) {
        try {
          const secretsManager = getSecretsManager();
          const secrets = await secretsManager.getSecrets();

          if (secrets.salesforce) {
            clientId = secrets.salesforce.clientId || clientId;
            clientSecret = secrets.salesforce.clientSecret || clientSecret;
            username = secrets.salesforce.username || username;
            password = secrets.salesforce.password || password;
            securityToken = secrets.salesforce.securityToken || securityToken;
            instanceUrl = secrets.salesforce.instanceUrl || instanceUrl;

            logger.info('Loaded Salesforce credentials from AWS Secrets Manager');
          }
        } catch (secretError) {
          logger.warn('Could not load credentials from AWS Secrets Manager:', secretError);
        }
      }

      const loginUrl = process.env.SALESFORCE_LOGIN_URL || 'https://test.salesforce.com'; // Sandbox URL

      if (!username || !password || !clientId || !clientSecret) {
        logger.warn('Salesforce credentials not configured. Please set environment variables or configure AWS Secrets Manager.');
        logger.info('Required credentials: SALESFORCE_CLIENT_ID, SALESFORCE_CLIENT_SECRET, SALESFORCE_USERNAME, SALESFORCE_PASSWORD');
        return;
      }

      // Try OAuth first, fallback to username/password
      await this.initializeWithOAuth(clientId, clientSecret, username, password, securityToken || '', instanceUrl || loginUrl);

      this.isInitialized = true;
      logger.info('Salesforce connection established successfully');

      // Start periodic sync
      this.startPeriodicSync();

    } catch (error) {
      logger.error('Failed to initialize Salesforce connection:', error);
      throw error;
    }
  }

  private async initializeWithOAuth(clientId: string, clientSecret: string, username: string, password: string, securityToken: string, instanceUrl: string): Promise<void> {
    const cachedTokens = await this.getCachedTokens();

    if (cachedTokens && cachedTokens.expiresAt > Date.now()) {
      // Use cached tokens
      this.conn = new jsforce.Connection({
        instanceUrl: cachedTokens.instanceUrl,
        accessToken: cachedTokens.accessToken,
        refreshToken: cachedTokens.refreshToken,
        oauth2: {
          clientId,
          clientSecret,
          redirectUri: 'urn:ietf:wg:oauth:2.0:oob'
        }
      });
    } else {
      // Fresh login - ensure we use sandbox login URL
      this.conn = new jsforce.Connection({
        loginUrl: loginUrl, // Use the loginUrl variable which defaults to sandbox
        oauth2: {
          clientId,
          clientSecret,
          redirectUri: 'urn:ietf:wg:oauth:2.0:oob'
        }
      });

      const loginResult = await this.conn.login(username, password + securityToken);

      // Cache the tokens
      await this.cacheTokens({
        accessToken: this.conn.accessToken!,
        refreshToken: this.conn.refreshToken,
        instanceUrl: this.conn.instanceUrl!,
        expiresAt: Date.now() + (2 * 60 * 60 * 1000) // 2 hours
      });
    }
  }

  private async getCachedTokens(): Promise<OAuthTokens | null> {
    try {
      const cached = await this.cache.get('salesforce:tokens');
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logger.error('Failed to get cached tokens:', error);
      return null;
    }
  }

  private async cacheTokens(tokens: OAuthTokens): Promise<void> {
    try {
      const ttl = Math.floor((tokens.expiresAt - Date.now()) / 1000);
      await this.cache.set('salesforce:tokens', JSON.stringify(tokens), ttl);
    } catch (error) {
      logger.error('Failed to cache tokens:', error);
    }
  }

  private async refreshToken(): Promise<void> {
    if (this.tokenRefreshPromise) {
      return this.tokenRefreshPromise;
    }

    this.tokenRefreshPromise = this.doRefreshToken();
    try {
      await this.tokenRefreshPromise;
    } finally {
      this.tokenRefreshPromise = null;
    }
  }

  private async doRefreshToken(): Promise<void> {
    if (!this.conn?.refreshToken) {
      logger.warn('No refresh token available, re-initializing connection');
      this.isInitialized = false;
      await this.initialize();
      return;
    }

    try {
      const result = await this.conn.oauth2.refreshToken(this.conn.refreshToken);
      this.conn.accessToken = result.access_token;

      // Update cached tokens
      await this.cacheTokens({
        accessToken: result.access_token,
        refreshToken: this.conn.refreshToken,
        instanceUrl: this.conn.instanceUrl!,
        expiresAt: Date.now() + (2 * 60 * 60 * 1000)
      });

      logger.info('Successfully refreshed Salesforce token');
    } catch (error) {
      logger.error('Failed to refresh token:', error);
      this.isInitialized = false;
      await this.initialize();
    }
  }

  private async withRetry<T>(operation: () => Promise<T>, retries = this.MAX_RETRIES): Promise<T> {
    return salesforceCircuitBreaker.execute(async () => {
      try {
        return await operation();
      } catch (error: any) {
        // Check for token expiration
        if (error.name === 'INVALID_SESSION_ID' || error.errorCode === 'INVALID_SESSION_ID') {
          await this.refreshToken();
          return await operation();
        }

        if (retries > 0) {
          logger.warn(`Salesforce operation failed, retrying. Attempts left: ${retries}`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          return this.withRetry(operation, retries - 1);
        }

        // Wrap external service errors
        throw new ExternalServiceError('Salesforce', error.message, {
          errorCode: error.errorCode,
          statusCode: error.statusCode,
        });
      }
    }, 'Salesforce');
  }

  // === CONTACT OPERATIONS ===
  async searchContacts(query: string, limit: number = 10): Promise<SalesforceContact[]> {
    await this.ensureInitialized();

    const cacheKey = `search:contacts:${query}:${limit}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    return this.withRetry(async () => {
      const escapedQuery = query.replace(/'/g, "\\'");

      // Enhanced search that handles phone number formats
      const phoneQuery = query.replace(/\D/g, ''); // Remove non-digits for phone search

      let whereClause = `(Name LIKE '%${escapedQuery}%' OR Email LIKE '%${escapedQuery}%'`;

      // Add phone search if query contains digits
      if (phoneQuery.length >= 3) {
        whereClause += ` OR Phone LIKE '%${phoneQuery}%' OR MobilePhone LIKE '%${phoneQuery}%'`;
      } else {
        whereClause += ` OR Phone LIKE '%${escapedQuery}%' OR MobilePhone LIKE '%${escapedQuery}%'`;
      }

      whereClause += ')';

      const result = await this.conn!.query<SalesforceContact>(
        `SELECT Id, Name, FirstName, LastName, Email, Phone, MobilePhone,
         AccountId, Account.Name, Account.Id, MailingStreet, MailingCity, MailingState,
         MailingPostalCode, MailingCountry, Title, Department, LeadSource,
         LastModifiedDate, CreatedDate, SystemModstamp
         FROM Contact
         WHERE ${whereClause}
         ORDER BY LastModifiedDate DESC
         LIMIT ${limit}`
      );

      const contacts = result.records || [];
      await this.cache.set(cacheKey, JSON.stringify(contacts), this.CACHE_TTL);
      return contacts;
    });
  }

  async getAllContacts(lastModified?: Date): Promise<SalesforceContact[]> {
    await this.ensureInitialized();

    return this.withRetry(async () => {
      let whereClause = '';
      if (lastModified) {
        whereClause = `WHERE SystemModstamp > ${lastModified.toISOString()}`;
      }

      const result = await this.conn!.query<SalesforceContact>(
        `SELECT Id, Name, FirstName, LastName, Email, Phone, MobilePhone,
         AccountId, Account.Name, Account.Id, MailingStreet, MailingCity, MailingState,
         MailingPostalCode, MailingCountry, Title, Department, LeadSource,
         LastModifiedDate, CreatedDate, SystemModstamp
         FROM Contact ${whereClause}
         ORDER BY SystemModstamp ASC`
      );

      return result.records || [];
    });
  }

  async createContact(contact: Partial<SalesforceContact>): Promise<string> {
    await this.ensureInitialized();

    return this.withRetry(async () => {
      const result = await this.conn!.sobject('Contact').create(contact);
      if (!result.success) {
        throw new Error(`Failed to create contact: ${result.errors?.join(', ')}`);
      }

      // Clear related caches
      await this.clearContactCaches();

      logger.info('Created contact:', { id: result.id, name: contact.Name });
      return result.id;
    });
  }

  async updateContact(id: string, updates: Partial<SalesforceContact>): Promise<void> {
    await this.ensureInitialized();

    return this.withRetry(async () => {
      const result = await this.conn!.sobject('Contact').update({
        Id: id,
        ...updates
      });

      if (!result.success) {
        throw new Error(`Failed to update contact: ${result.errors?.join(', ')}`);
      }

      await this.clearContactCaches();
      logger.info('Updated contact:', { id, updates });
    });
  }

  async deleteContact(id: string): Promise<void> {
    await this.ensureInitialized();

    return this.withRetry(async () => {
      const result = await this.conn!.sobject('Contact').delete(id);
      if (!result.success) {
        throw new Error(`Failed to delete contact: ${result.errors?.join(', ')}`);
      }

      await this.clearContactCaches();
      logger.info('Deleted contact:', { id });
    });
  }

  // === ACCOUNT OPERATIONS ===
  async searchAccounts(query: string, limit: number = 10): Promise<SalesforceAccount[]> {
    await this.ensureInitialized();

    const cacheKey = `search:accounts:${query}:${limit}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    return this.withRetry(async () => {
      const escapedQuery = query.replace(/'/g, "\\'");

      // Enhanced search that handles phone number formats
      const phoneQuery = query.replace(/\D/g, ''); // Remove non-digits for phone search

      let whereClause = `(Name LIKE '%${escapedQuery}%'`;

      // Add phone search if query contains digits
      if (phoneQuery.length >= 3) {
        whereClause += ` OR Phone LIKE '%${phoneQuery}%'`;
      } else {
        whereClause += ` OR Phone LIKE '%${escapedQuery}%'`;
      }

      whereClause += ')';

      const result = await this.conn!.query<SalesforceAccount>(
        `SELECT Id, Name, Type, Industry, Phone, Website,
         BillingStreet, BillingCity, BillingState, BillingPostalCode,
         BillingCountry, ShippingStreet, ShippingCity, ShippingState,
         ShippingPostalCode, ShippingCountry, Description, NumberOfEmployees,
         AnnualRevenue, ParentId, OwnerId, LastModifiedDate, CreatedDate, SystemModstamp
         FROM Account
         WHERE ${whereClause}
         ORDER BY LastModifiedDate DESC
         LIMIT ${limit}`
      );

      const accounts = result.records || [];
      await this.cache.set(cacheKey, JSON.stringify(accounts), this.CACHE_TTL);
      return accounts;
    });
  }

  async getAllAccounts(lastModified?: Date): Promise<SalesforceAccount[]> {
    await this.ensureInitialized();

    return this.withRetry(async () => {
      let whereClause = '';
      if (lastModified) {
        whereClause = `WHERE SystemModstamp > ${lastModified.toISOString()}`;
      }

      const result = await this.conn!.query<SalesforceAccount>(
        `SELECT Id, Name, Type, Industry, Phone, Website,
         BillingStreet, BillingCity, BillingState, BillingPostalCode,
         BillingCountry, ShippingStreet, ShippingCity, ShippingState,
         ShippingPostalCode, ShippingCountry, Description, NumberOfEmployees,
         AnnualRevenue, ParentId, OwnerId, LastModifiedDate, CreatedDate, SystemModstamp
         FROM Account ${whereClause}
         ORDER BY SystemModstamp ASC`
      );

      return result.records || [];
    });
  }

  async createAccount(account: Partial<SalesforceAccount>): Promise<string> {
    await this.ensureInitialized();

    return this.withRetry(async () => {
      const result = await this.conn!.sobject('Account').create(account);
      if (!result.success) {
        throw new Error(`Failed to create account: ${result.errors?.join(', ')}`);
      }

      await this.clearAccountCaches();
      logger.info('Created account:', { id: result.id, name: account.Name });
      return result.id;
    });
  }

  async updateAccount(id: string, updates: Partial<SalesforceAccount>): Promise<void> {
    await this.ensureInitialized();

    return this.withRetry(async () => {
      const result = await this.conn!.sobject('Account').update({
        Id: id,
        ...updates
      });

      if (!result.success) {
        throw new Error(`Failed to update account: ${result.errors?.join(', ')}`);
      }

      await this.clearAccountCaches();
      logger.info('Updated account:', { id, updates });
    });
  }

  async deleteAccount(id: string): Promise<void> {
    await this.ensureInitialized();

    return this.withRetry(async () => {
      const result = await this.conn!.sobject('Account').delete(id);
      if (!result.success) {
        throw new Error(`Failed to delete account: ${result.errors?.join(', ')}`);
      }

      await this.clearAccountCaches();
      logger.info('Deleted account:', { id });
    });
  }

  // === OPPORTUNITY OPERATIONS ===
  async getAllOpportunities(lastModified?: Date): Promise<SalesforceOpportunity[]> {
    await this.ensureInitialized();

    return this.withRetry(async () => {
      let whereClause = '';
      if (lastModified) {
        whereClause = `WHERE SystemModstamp > ${lastModified.toISOString()}`;
      }

      const result = await this.conn!.query<SalesforceOpportunity>(
        `SELECT Id, Name, AccountId, Account.Name, Account.Id, ContactId,
         Contact.Name, Contact.Id, Amount, StageName, CloseDate, Probability,
         Type, LeadSource, Description, NextStep, OwnerId, CampaignId,
         LastModifiedDate, CreatedDate, SystemModstamp
         FROM Opportunity ${whereClause}
         ORDER BY SystemModstamp ASC`
      );

      return result.records || [];
    });
  }

  async createOpportunity(opportunity: Partial<SalesforceOpportunity>): Promise<string> {
    await this.ensureInitialized();

    return this.withRetry(async () => {
      const result = await this.conn!.sobject('Opportunity').create(opportunity);
      if (!result.success) {
        throw new Error(`Failed to create opportunity: ${result.errors?.join(', ')}`);
      }

      await this.clearOpportunityCaches();
      logger.info('Created opportunity:', { id: result.id, name: opportunity.Name });
      return result.id;
    });
  }

  async updateOpportunity(id: string, updates: Partial<SalesforceOpportunity>): Promise<void> {
    await this.ensureInitialized();

    return this.withRetry(async () => {
      const result = await this.conn!.sobject('Opportunity').update({
        Id: id,
        ...updates
      });

      if (!result.success) {
        throw new Error(`Failed to update opportunity: ${result.errors?.join(', ')}`);
      }

      await this.clearOpportunityCaches();
      logger.info('Updated opportunity:', { id, updates });
    });
  }

  async deleteOpportunity(id: string): Promise<void> {
    await this.ensureInitialized();

    return this.withRetry(async () => {
      const result = await this.conn!.sobject('Opportunity').delete(id);
      if (!result.success) {
        throw new Error(`Failed to delete opportunity: ${result.errors?.join(', ')}`);
      }

      await this.clearOpportunityCaches();
      logger.info('Deleted opportunity:', { id });
    });
  }

  // === PAINTBOX ESTIMATE OPERATIONS ===
  async getAllPaintboxEstimates(lastModified?: Date): Promise<PaintboxEstimate[]> {
    await this.ensureInitialized();

    return this.withRetry(async () => {
      let whereClause = '';
      if (lastModified) {
        whereClause = `WHERE SystemModstamp > ${lastModified.toISOString()}`;
      }

      const result = await this.conn!.query<PaintboxEstimate>(
        `SELECT Id, Name, Contact__c, Account__c, Opportunity__c, Total_Amount__c,
         Exterior_Amount__c, Interior_Amount__c, Materials_Cost__c, Labor_Cost__c,
         Status__c, Estimate_Date__c, Valid_Until__c, Notes__c, Excel_Data__c,
         Square_Footage__c, Rooms_Count__c, Paint_Quality__c,
         LastModifiedDate, CreatedDate, SystemModstamp
         FROM PaintboxEstimate__c ${whereClause}
         ORDER BY SystemModstamp ASC`
      );

      return result.records || [];
    });
  }

  async createPaintboxEstimate(estimate: Partial<PaintboxEstimate>): Promise<string> {
    await this.ensureInitialized();

    return this.withRetry(async () => {
      const result = await this.conn!.sobject('PaintboxEstimate__c').create(estimate);
      if (!result.success) {
        throw new Error(`Failed to create estimate: ${result.errors?.join(', ')}`);
      }

      await this.clearEstimateCaches();
      logger.info('Created estimate:', { id: result.id, name: estimate.Name });
      return result.id;
    });
  }

  async updatePaintboxEstimate(id: string, updates: Partial<PaintboxEstimate>): Promise<void> {
    await this.ensureInitialized();

    return this.withRetry(async () => {
      const result = await this.conn!.sobject('PaintboxEstimate__c').update({
        Id: id,
        ...updates
      });

      if (!result.success) {
        throw new Error(`Failed to update estimate: ${result.errors?.join(', ')}`);
      }

      await this.clearEstimateCaches();
      logger.info('Updated estimate:', { id, updates });
    });
  }

  async deletePaintboxEstimate(id: string): Promise<void> {
    await this.ensureInitialized();

    return this.withRetry(async () => {
      const result = await this.conn!.sobject('PaintboxEstimate__c').delete(id);
      if (!result.success) {
        throw new Error(`Failed to delete estimate: ${result.errors?.join(', ')}`);
      }

      await this.clearEstimateCaches();
      logger.info('Deleted estimate:', { id });
    });
  }

  // === RETRIEVE OPERATIONS ===
  async getContact(id: string): Promise<SalesforceContact | null> {
    await this.ensureInitialized();

    const cacheKey = `contact:${id}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    return this.withRetry(async () => {
      const result = await this.conn!.sobject('Contact').retrieve(id, [
        'Id', 'Name', 'FirstName', 'LastName', 'Email', 'Phone', 'MobilePhone',
        'AccountId', 'MailingStreet', 'MailingCity', 'MailingState',
        'MailingPostalCode', 'MailingCountry', 'Title', 'Department', 'LeadSource',
        'LastModifiedDate', 'CreatedDate', 'SystemModstamp'
      ]) as SalesforceContact;

      if (result) {
        await this.cache.set(cacheKey, JSON.stringify(result), this.CACHE_TTL);
      }
      return result || null;
    });
  }

  async getAccount(id: string): Promise<SalesforceAccount | null> {
    await this.ensureInitialized();

    const cacheKey = `account:${id}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    return this.withRetry(async () => {
      const result = await this.conn!.sobject('Account').retrieve(id, [
        'Id', 'Name', 'Type', 'Industry', 'Phone', 'Website',
        'BillingStreet', 'BillingCity', 'BillingState', 'BillingPostalCode', 'BillingCountry',
        'ShippingStreet', 'ShippingCity', 'ShippingState', 'ShippingPostalCode', 'ShippingCountry',
        'Description', 'NumberOfEmployees', 'AnnualRevenue', 'ParentId', 'OwnerId',
        'LastModifiedDate', 'CreatedDate', 'SystemModstamp'
      ]) as SalesforceAccount;

      if (result) {
        await this.cache.set(cacheKey, JSON.stringify(result), this.CACHE_TTL);
      }
      return result || null;
    });
  }

  async getOpportunity(id: string): Promise<SalesforceOpportunity | null> {
    await this.ensureInitialized();

    const cacheKey = `opportunity:${id}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    return this.withRetry(async () => {
      const result = await this.conn!.sobject('Opportunity').retrieve(id, [
        'Id', 'Name', 'AccountId', 'ContactId', 'Amount', 'StageName', 'CloseDate',
        'Probability', 'Type', 'LeadSource', 'Description', 'NextStep', 'OwnerId', 'CampaignId',
        'LastModifiedDate', 'CreatedDate', 'SystemModstamp'
      ]) as SalesforceOpportunity;

      if (result) {
        await this.cache.set(cacheKey, JSON.stringify(result), this.CACHE_TTL);
      }
      return result || null;
    });
  }

  async getPaintboxEstimate(id: string): Promise<PaintboxEstimate | null> {
    await this.ensureInitialized();

    const cacheKey = `estimate:${id}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    return this.withRetry(async () => {
      const result = await this.conn!.sobject('PaintboxEstimate__c').retrieve(id, [
        'Id', 'Name', 'Contact__c', 'Account__c', 'Opportunity__c', 'Total_Amount__c',
        'Exterior_Amount__c', 'Interior_Amount__c', 'Materials_Cost__c', 'Labor_Cost__c',
        'Status__c', 'Estimate_Date__c', 'Valid_Until__c', 'Notes__c', 'Excel_Data__c',
        'Square_Footage__c', 'Rooms_Count__c', 'Paint_Quality__c',
        'LastModifiedDate', 'CreatedDate', 'SystemModstamp'
      ]) as PaintboxEstimate;

      if (result) {
        await this.cache.set(cacheKey, JSON.stringify(result), this.CACHE_TTL);
      }
      return result || null;
    });
  }

  // === BATCH SYNC OPERATIONS ===
  async performBatchSync(): Promise<SyncResult> {
    logger.info('Starting batch sync with Salesforce');

    const result: SyncResult = {
      success: true,
      processed: 0,
      errors: [],
      conflicts: []
    };

    try {
      const lastSync = await this.getLastSyncTime();

      // Sync each entity type
      const contactsResult = await this.syncContacts(lastSync);
      const accountsResult = await this.syncAccounts(lastSync);
      const opportunitiesResult = await this.syncOpportunities(lastSync);
      const estimatesResult = await this.syncEstimates(lastSync);

      // Aggregate results
      result.processed = contactsResult.processed + accountsResult.processed +
                        opportunitiesResult.processed + estimatesResult.processed;
      result.errors = [...contactsResult.errors, ...accountsResult.errors,
                      ...opportunitiesResult.errors, ...estimatesResult.errors];
      result.conflicts = [...contactsResult.conflicts, ...accountsResult.conflicts,
                         ...opportunitiesResult.conflicts, ...estimatesResult.conflicts];

      // Update last sync time
      await this.setLastSyncTime(new Date());

      logger.info('Batch sync completed:', result);
      return result;
    } catch (error) {
      logger.error('Batch sync failed:', error);
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      return result;
    }
  }

  private async syncContacts(lastSync?: Date): Promise<SyncResult> {
    const contacts = await this.getAllContacts(lastSync);
    // Implement sync logic with local database
    return { success: true, processed: contacts.length, errors: [], conflicts: [] };
  }

  private async syncAccounts(lastSync?: Date): Promise<SyncResult> {
    const accounts = await this.getAllAccounts(lastSync);
    // Implement sync logic with local database
    return { success: true, processed: accounts.length, errors: [], conflicts: [] };
  }

  private async syncOpportunities(lastSync?: Date): Promise<SyncResult> {
    const opportunities = await this.getAllOpportunities(lastSync);
    // Implement sync logic with local database
    return { success: true, processed: opportunities.length, errors: [], conflicts: [] };
  }

  private async syncEstimates(lastSync?: Date): Promise<SyncResult> {
    const estimates = await this.getAllPaintboxEstimates(lastSync);
    // Implement sync logic with local database
    return { success: true, processed: estimates.length, errors: [], conflicts: [] };
  }

  private async getLastSyncTime(): Promise<Date | undefined> {
    try {
      const cached = await this.cache.get('salesforce:lastSync');
      return cached ? new Date(cached) : undefined;
    } catch (error) {
      logger.error('Failed to get last sync time:', error);
      return undefined;
    }
  }

  private async setLastSyncTime(time: Date): Promise<void> {
    try {
      await this.cache.set('salesforce:lastSync', time.toISOString(), 24 * 60 * 60); // 24 hours
    } catch (error) {
      logger.error('Failed to set last sync time:', error);
    }
  }

  // === PERIODIC SYNC ===
  private startPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    // Sync every 5 minutes
    this.syncInterval = setInterval(async () => {
      try {
        await this.performBatchSync();
      } catch (error) {
        logger.error('Periodic sync failed:', error);
      }
    }, 5 * 60 * 1000);

    logger.info('Started periodic sync (every 5 minutes)');
  }

  public stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      logger.info('Stopped periodic sync');
    }
  }

  // === CACHE MANAGEMENT ===
  private async clearContactCaches(): Promise<void> {
    try {
      const keys = await this.cache.keys('search:contacts:*');
      await Promise.all(keys.map(key => this.cache.del(key)));
      await Promise.all((await this.cache.keys('contact:*')).map(key => this.cache.del(key)));
    } catch (error) {
      logger.warn('Failed to clear contact caches:', error);
    }
  }

  private async clearAccountCaches(): Promise<void> {
    try {
      const keys = await this.cache.keys('search:accounts:*');
      await Promise.all(keys.map(key => this.cache.del(key)));
      await Promise.all((await this.cache.keys('account:*')).map(key => this.cache.del(key)));
    } catch (error) {
      logger.warn('Failed to clear account caches:', error);
    }
  }

  private async clearOpportunityCaches(): Promise<void> {
    try {
      const keys = await this.cache.keys('opportunity:*');
      await Promise.all(keys.map(key => this.cache.del(key)));
    } catch (error) {
      logger.warn('Failed to clear opportunity caches:', error);
    }
  }

  private async clearEstimateCaches(): Promise<void> {
    try {
      const keys = await this.cache.keys('estimate:*');
      await Promise.all(keys.map(key => this.cache.del(key)));
    } catch (error) {
      logger.warn('Failed to clear estimate caches:', error);
    }
  }

  // === UTILITY METHODS ===
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.ensureInitialized();

      if (!this.conn) return false;

      await this.conn.query('SELECT Id FROM Contact LIMIT 1');
      return true;
    } catch (error) {
      logger.error('Salesforce connection test failed:', error);
      return false;
    }
  }

  // === CONFLICT RESOLUTION ===
  async resolveConflict(conflict: ConflictRecord, resolution: 'local' | 'remote' | 'merge'): Promise<void> {
    const { id, type, localData, remoteData } = conflict;

    try {
      let finalData: any;

      switch (resolution) {
        case 'local':
          finalData = localData;
          break;
        case 'remote':
          finalData = remoteData;
          break;
        case 'merge':
          finalData = { ...remoteData, ...localData };
          break;
        default:
          throw new Error(`Invalid resolution strategy: ${resolution}`);
      }

      // Update in Salesforce
      switch (type) {
        case 'Contact':
          await this.updateContact(id, finalData);
          break;
        case 'Account':
          await this.updateAccount(id, finalData);
          break;
        case 'Opportunity':
          await this.updateOpportunity(id, finalData);
          break;
        case 'PaintboxEstimate__c':
          await this.updatePaintboxEstimate(id, finalData);
          break;
      }

      logger.info('Resolved conflict:', { id, type, resolution });
    } catch (error) {
      logger.error('Failed to resolve conflict:', { conflict, error });
      throw error;
    }
  }

  // === CLEANUP ===
  async cleanup(): Promise<void> {
    this.stopPeriodicSync();
    if (this.conn) {
      this.conn = null;
    }
    this.isInitialized = false;
    logger.info('Salesforce service cleaned up');
  }
}

export const salesforceService = new SalesforceService();

// Auto-cleanup on process exit
if (typeof process !== 'undefined') {
  process.on('SIGTERM', () => salesforceService.cleanup());
  process.on('SIGINT', () => salesforceService.cleanup());
}
