import { buildSchema, validateSchema, GraphQLError } from 'graphql';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Security Dashboard GraphQL Schema Validation', () => {
  let schema: any;

  beforeAll(() => {
    // Load the GraphQL schema
    const schemaPath = join(__dirname, '../../../graphql/schema/security-dashboard.graphql');
    const schemaString = readFileSync(schemaPath, 'utf-8');

    try {
      schema = buildSchema(schemaString);
    } catch (error) {
      console.error('Failed to build schema:', error);
      throw error;
    }
  });

  describe('Schema Structure', () => {
    it('should be a valid GraphQL schema', () => {
      expect(schema).toBeDefined();

      const errors = validateSchema(schema);
      if (errors.length > 0) {
        console.error('Schema validation errors:', errors);
      }
      expect(errors).toHaveLength(0);
    });

    it('should have required root types', () => {
      const queryType = schema.getQueryType();
      const mutationType = schema.getMutationType();
      const subscriptionType = schema.getSubscriptionType();

      expect(queryType).toBeDefined();
      expect(mutationType).toBeDefined();
      expect(subscriptionType).toBeDefined();
    });

    it('should have security-specific query fields', () => {
      const queryType = schema.getQueryType();
      const queryFields = queryType.getFields();

      const expectedQueries = [
        'securityOverview',
        'assets',
        'asset',
        'vulnerabilities',
        'securityEvents',
        'alerts',
        'kongAdminApiStatus',
        'kongServices',
        'kongRoutes'
      ];

      expectedQueries.forEach(queryName => {
        expect(queryFields[queryName]).toBeDefined();
      });
    });

    it('should have security-specific mutation fields', () => {
      const mutationType = schema.getMutationType();
      const mutationFields = mutationType.getFields();

      const expectedMutations = [
        'createAsset',
        'updateAsset',
        'deleteAsset',
        'createVulnerability',
        'updateVulnerability',
        'resolveVulnerability',
        'createAlert',
        'updateAlert',
        'acknowledgeAlert',
        'resolveAlert'
      ];

      expectedMutations.forEach(mutationName => {
        expect(mutationFields[mutationName]).toBeDefined();
      });
    });

    it('should have security-specific subscription fields', () => {
      const subscriptionType = schema.getSubscriptionType();
      const subscriptionFields = subscriptionType.getFields();

      const expectedSubscriptions = [
        'securityEventAdded',
        'vulnerabilityDetected',
        'alertTriggered',
        'kongAdminApiStatusChanged',
        'threatLevelChanged'
      ];

      expectedSubscriptions.forEach(subscriptionName => {
        expect(subscriptionFields[subscriptionName]).toBeDefined();
      });
    });
  });

  describe('Core Security Types', () => {
    it('should have Asset type with required fields', () => {
      const assetType = schema.getType('Asset');
      expect(assetType).toBeDefined();

      const assetFields = assetType.getFields();
      const requiredFields = [
        'id',
        'organizationId',
        'name',
        'assetType',
        'environment',
        'platform',
        'vulnerabilities',
        'securityEvents',
        'alerts',
        'healthStatus',
        'createdAt',
        'updatedAt'
      ];

      requiredFields.forEach(fieldName => {
        expect(assetFields[fieldName]).toBeDefined();
      });
    });

    it('should have Vulnerability type with required fields', () => {
      const vulnerabilityType = schema.getType('Vulnerability');
      expect(vulnerabilityType).toBeDefined();

      const vulnerabilityFields = vulnerabilityType.getFields();
      const requiredFields = [
        'id',
        'assetId',
        'title',
        'description',
        'severity',
        'status',
        'detectedAt',
        'createdAt',
        'updatedAt'
      ];

      requiredFields.forEach(fieldName => {
        expect(vulnerabilityFields[fieldName]).toBeDefined();
      });
    });

    it('should have SecurityEvent type with required fields', () => {
      const securityEventType = schema.getType('SecurityEvent');
      expect(securityEventType).toBeDefined();

      const securityEventFields = securityEventType.getFields();
      const requiredFields = [
        'id',
        'assetId',
        'organizationId',
        'eventType',
        'severity',
        'title',
        'description',
        'acknowledged',
        'createdAt'
      ];

      requiredFields.forEach(fieldName => {
        expect(securityEventFields[fieldName]).toBeDefined();
      });
    });

    it('should have Alert type with required fields', () => {
      const alertType = schema.getType('Alert');
      expect(alertType).toBeDefined();

      const alertFields = alertType.getFields();
      const requiredFields = [
        'id',
        'organizationId',
        'title',
        'description',
        'severity',
        'status',
        'triggeredAt',
        'createdAt',
        'updatedAt'
      ];

      requiredFields.forEach(fieldName => {
        expect(alertFields[fieldName]).toBeDefined();
      });
    });

    it('should have KongAdminApiStatus type with required fields', () => {
      const kongStatusType = schema.getType('KongAdminApiStatus');
      expect(kongStatusType).toBeDefined();

      const kongStatusFields = kongStatusType.getFields();
      const requiredFields = [
        'isSecure',
        'protocol',
        'isVulnerable',
        'riskLevel',
        'recommendedActions',
        'lastChecked'
      ];

      requiredFields.forEach(fieldName => {
        expect(kongStatusFields[fieldName]).toBeDefined();
      });
    });
  });

  describe('Enum Types', () => {
    it('should have ThreatLevel enum with correct values', () => {
      const threatLevelEnum = schema.getType('ThreatLevel');
      expect(threatLevelEnum).toBeDefined();

      const expectedValues = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
      const enumValues = threatLevelEnum.getValues();

      expectedValues.forEach(value => {
        expect(enumValues.find(v => v.name === value)).toBeDefined();
      });
    });

    it('should have AssetType enum with correct values', () => {
      const assetTypeEnum = schema.getType('AssetType');
      expect(assetTypeEnum).toBeDefined();

      const expectedValues = ['APPLICATION', 'DATABASE', 'API', 'WEBSITE'];
      const enumValues = assetTypeEnum.getValues();

      expectedValues.forEach(value => {
        expect(enumValues.find(v => v.name === value)).toBeDefined();
      });
    });

    it('should have Environment enum with correct values', () => {
      const environmentEnum = schema.getType('Environment');
      expect(environmentEnum).toBeDefined();

      const expectedValues = ['DEVELOPMENT', 'STAGING', 'PRODUCTION'];
      const enumValues = environmentEnum.getValues();

      expectedValues.forEach(value => {
        expect(enumValues.find(v => v.name === value)).toBeDefined();
      });
    });

    it('should have Platform enum with correct values', () => {
      const platformEnum = schema.getType('Platform');
      expect(platformEnum).toBeDefined();

      const expectedValues = ['KUBERNETES', 'AWS', 'GCP', 'AZURE', 'ON_PREMISE'];
      const enumValues = platformEnum.getValues();

      expectedValues.forEach(value => {
        expect(enumValues.find(v => v.name === value)).toBeDefined();
      });
    });
  });

  describe('Input Types', () => {
    it('should have CreateAssetInput with required fields', () => {
      const createAssetInput = schema.getType('CreateAssetInput');
      expect(createAssetInput).toBeDefined();

      const inputFields = createAssetInput.getFields();
      const requiredFields = ['name', 'assetType', 'environment', 'platform'];
      const optionalFields = ['url', 'description'];

      requiredFields.forEach(fieldName => {
        expect(inputFields[fieldName]).toBeDefined();
        expect(inputFields[fieldName].type.toString()).not.toContain('null');
      });

      optionalFields.forEach(fieldName => {
        expect(inputFields[fieldName]).toBeDefined();
      });
    });

    it('should have UpdateAssetInput with optional fields', () => {
      const updateAssetInput = schema.getType('UpdateAssetInput');
      expect(updateAssetInput).toBeDefined();

      const inputFields = updateAssetInput.getFields();
      const expectedFields = ['name', 'assetType', 'environment', 'platform', 'url', 'description'];

      expectedFields.forEach(fieldName => {
        expect(inputFields[fieldName]).toBeDefined();
        // All fields in update input should be optional
        expect(inputFields[fieldName].type.toString()).toContain('null');
      });
    });

    it('should have AssetFilter input for querying', () => {
      const assetFilterInput = schema.getType('AssetFilter');
      expect(assetFilterInput).toBeDefined();

      const inputFields = assetFilterInput.getFields();
      const expectedFields = ['assetType', 'environment', 'platform', 'search'];

      expectedFields.forEach(fieldName => {
        expect(inputFields[fieldName]).toBeDefined();
      });
    });
  });

  describe('Field Types and Non-Nullability', () => {
    it('should have correct non-nullable fields on Asset', () => {
      const assetType = schema.getType('Asset');
      const assetFields = assetType.getFields();

      const nonNullableFields = ['id', 'organizationId', 'name', 'assetType', 'environment', 'platform'];

      nonNullableFields.forEach(fieldName => {
        expect(assetFields[fieldName].type.toString()).not.toContain('null');
      });

      const nullableFields = ['url', 'description', 'resolvedAt'];

      nullableFields.forEach(fieldName => {
        if (assetFields[fieldName]) {
          expect(assetFields[fieldName].type.toString()).toContain('null');
        }
      });
    });

    it('should have correct list types for relationships', () => {
      const assetType = schema.getType('Asset');
      const assetFields = assetType.getFields();

      // These should be non-nullable lists of non-nullable items
      expect(assetFields.vulnerabilities.type.toString()).toBe('[Vulnerability!]!');
      expect(assetFields.securityEvents.type.toString()).toBe('[SecurityEvent!]!');
      expect(assetFields.alerts.type.toString()).toBe('[Alert!]!');
    });
  });

  describe('Query Arguments', () => {
    it('should have correct arguments for securityOverview query', () => {
      const queryType = schema.getQueryType();
      const securityOverviewQuery = queryType.getFields().securityOverview;

      const args = securityOverviewQuery.args;
      expect(args).toHaveLength(1);
      expect(args[0].name).toBe('organizationId');
      expect(args[0].type.toString()).toBe('ID!');
    });

    it('should have correct arguments for assets query', () => {
      const queryType = schema.getQueryType();
      const assetsQuery = queryType.getFields().assets;

      const args = assetsQuery.args;
      const argNames = args.map(arg => arg.name);

      expect(argNames).toContain('organizationId');
      expect(argNames).toContain('filter');
      expect(argNames).toContain('limit');
      expect(argNames).toContain('offset');
    });

    it('should have correct arguments for securityEvents query', () => {
      const queryType = schema.getQueryType();
      const securityEventsQuery = queryType.getFields().securityEvents;

      const args = securityEventsQuery.args;
      const argNames = args.map(arg => arg.name);

      expect(argNames).toContain('organizationId');
      expect(argNames).toContain('assetId');
      expect(argNames).toContain('severity');
      expect(argNames).toContain('limit');
    });
  });

  describe('Subscription Return Types', () => {
    it('should have correct return types for subscriptions', () => {
      const subscriptionType = schema.getSubscriptionType();
      const subscriptionFields = subscriptionType.getFields();

      expect(subscriptionFields.securityEventAdded.type.toString()).toBe('SecurityEvent!');
      expect(subscriptionFields.vulnerabilityDetected.type.toString()).toBe('Vulnerability!');
      expect(subscriptionFields.alertTriggered.type.toString()).toBe('Alert!');
      expect(subscriptionFields.kongAdminApiStatusChanged.type.toString()).toBe('KongAdminApiStatus!');
    });
  });

  describe('Schema Documentation', () => {
    it('should have descriptions for important types', () => {
      const assetType = schema.getType('Asset');
      const vulnerabilityType = schema.getType('Vulnerability');
      const securityEventType = schema.getType('SecurityEvent');

      // Check that key types have descriptions (if your schema includes them)
      expect(assetType.description || '').toBeTruthy();
      expect(vulnerabilityType.description || '').toBeTruthy();
      expect(securityEventType.description || '').toBeTruthy();
    });
  });
});
