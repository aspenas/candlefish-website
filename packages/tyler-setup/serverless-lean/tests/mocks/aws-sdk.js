/**
 * Mock AWS SDK clients and commands for testing
 */

export const mockDynamoDBDocumentClient = {
  send: jest.fn(),
};

export const mockCloudWatchClient = {
  send: jest.fn(),
};

export const mockSecretsManagerClient = {
  send: jest.fn(),
};

export const mockSESClient = {
  send: jest.fn(),
};

// Mock AWS SDK modules
jest.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: jest.fn(() => mockDynamoDBDocumentClient),
  },
  GetCommand: jest.fn((params) => ({ name: 'GetCommand', params })),
  PutCommand: jest.fn((params) => ({ name: 'PutCommand', params })),
  QueryCommand: jest.fn((params) => ({ name: 'QueryCommand', params })),
  ScanCommand: jest.fn((params) => ({ name: 'ScanCommand', params })),
  DeleteCommand: jest.fn((params) => ({ name: 'DeleteCommand', params })),
  UpdateCommand: jest.fn((params) => ({ name: 'UpdateCommand', params })),
}));

jest.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: jest.fn(() => ({})),
}));

jest.mock('@aws-sdk/client-cloudwatch', () => ({
  CloudWatchClient: jest.fn(() => mockCloudWatchClient),
  PutMetricDataCommand: jest.fn((params) => ({ name: 'PutMetricDataCommand', params })),
}));

jest.mock('@aws-sdk/client-secrets-manager', () => ({
  SecretsManagerClient: jest.fn(() => mockSecretsManagerClient),
  GetSecretValueCommand: jest.fn((params) => ({ name: 'GetSecretValueCommand', params })),
  CreateSecretCommand: jest.fn((params) => ({ name: 'CreateSecretCommand', params })),
  UpdateSecretCommand: jest.fn((params) => ({ name: 'UpdateSecretCommand', params })),
  DeleteSecretCommand: jest.fn((params) => ({ name: 'DeleteSecretCommand', params })),
  ListSecretsCommand: jest.fn((params) => ({ name: 'ListSecretsCommand', params })),
}));

jest.mock('@aws-sdk/client-ses', () => ({
  SESClient: jest.fn(() => mockSESClient),
  SendEmailCommand: jest.fn((params) => ({ name: 'SendEmailCommand', params })),
  SendTemplatedEmailCommand: jest.fn((params) => ({ name: 'SendTemplatedEmailCommand', params })),
}));

// Helper functions for setting up mock responses
export const mockDynamoDBResponse = (operation, response) => {
  mockDynamoDBDocumentClient.send.mockImplementation((command) => {
    if (command.name === operation) {
      return Promise.resolve(response);
    }
    return Promise.resolve({});
  });
};

export const mockDynamoDBError = (operation, error) => {
  mockDynamoDBDocumentClient.send.mockImplementation((command) => {
    if (command.name === operation) {
      return Promise.reject(error);
    }
    return Promise.resolve({});
  });
};

export const mockCloudWatchResponse = (response) => {
  mockCloudWatchClient.send.mockResolvedValue(response);
};

export const mockSecretsManagerResponse = (operation, response) => {
  mockSecretsManagerClient.send.mockImplementation((command) => {
    if (command.name === operation) {
      return Promise.resolve(response);
    }
    return Promise.resolve({});
  });
};

export const resetAllMocks = () => {
  mockDynamoDBDocumentClient.send.mockReset();
  mockCloudWatchClient.send.mockReset();
  mockSecretsManagerClient.send.mockReset();
  mockSESClient.send.mockReset();
};
