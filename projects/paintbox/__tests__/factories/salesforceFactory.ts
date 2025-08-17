/**
 * @file Salesforce test data factory
 * @description Provides factory functions for creating Salesforce test data
 */

import { faker } from '@faker-js/faker';

export interface SalesforceAccount {
  Id: string;
  Name: string;
  Type: string;
  Industry: string;
  Phone: string;
  Website: string;
  BillingAddress: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  ShippingAddress: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  CreatedDate: string;
  LastModifiedDate: string;
}

export interface SalesforceContact {
  Id: string;
  AccountId: string;
  FirstName: string;
  LastName: string;
  Email: string;
  Phone: string;
  MobilePhone: string;
  Title: string;
  Department: string;
  MailingAddress: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  CreatedDate: string;
  LastModifiedDate: string;
}

export interface SalesforceOpportunity {
  Id: string;
  AccountId: string;
  ContactId: string;
  Name: string;
  Amount: number;
  StageName: string;
  CloseDate: string;
  Probability: number;
  Type: string;
  LeadSource: string;
  Description: string;
  NextStep: string;
  CreatedDate: string;
  LastModifiedDate: string;
}

export interface SalesforceOAuthResponse {
  access_token: string;
  instance_url: string;
  id: string;
  token_type: string;
  issued_at: string;
  signature: string;
  refresh_token?: string;
}

export interface SalesforceAPIResponse<T> {
  totalSize: number;
  done: boolean;
  records: T[];
}

/**
 * Creates a Salesforce Account record
 */
export function createSalesforceAccount(overrides?: Partial<SalesforceAccount>): SalesforceAccount {
  const billingAddress = {
    street: faker.location.streetAddress(),
    city: faker.location.city(),
    state: faker.location.state({ abbreviated: true }),
    postalCode: faker.location.zipCode(),
    country: 'USA',
  };

  return {
    Id: faker.string.alphanumeric(18),
    Name: faker.company.name(),
    Type: faker.helpers.arrayElement(['Customer', 'Prospect', 'Partner', 'Other']),
    Industry: faker.helpers.arrayElement([
      'Construction',
      'Real Estate',
      'Property Management',
      'Hospitality',
      'Retail',
    ]),
    Phone: faker.phone.number(),
    Website: faker.internet.url(),
    BillingAddress: billingAddress,
    ShippingAddress: billingAddress, // Same as billing by default
    CreatedDate: faker.date.recent({ days: 365 }).toISOString(),
    LastModifiedDate: faker.date.recent({ days: 30 }).toISOString(),
    ...overrides,
  };
}

/**
 * Creates a Salesforce Contact record
 */
export function createSalesforceContact(
  accountId?: string,
  overrides?: Partial<SalesforceContact>
): SalesforceContact {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();

  return {
    Id: faker.string.alphanumeric(18),
    AccountId: accountId || faker.string.alphanumeric(18),
    FirstName: firstName,
    LastName: lastName,
    Email: faker.internet.email({ firstName, lastName }),
    Phone: faker.phone.number(),
    MobilePhone: faker.phone.number(),
    Title: faker.person.jobTitle(),
    Department: faker.helpers.arrayElement([
      'Operations',
      'Facilities',
      'Property Management',
      'Maintenance',
    ]),
    MailingAddress: {
      street: faker.location.streetAddress(),
      city: faker.location.city(),
      state: faker.location.state({ abbreviated: true }),
      postalCode: faker.location.zipCode(),
      country: 'USA',
    },
    CreatedDate: faker.date.recent({ days: 365 }).toISOString(),
    LastModifiedDate: faker.date.recent({ days: 30 }).toISOString(),
    ...overrides,
  };
}

/**
 * Creates a Salesforce Opportunity record
 */
export function createSalesforceOpportunity(
  accountId?: string,
  contactId?: string,
  overrides?: Partial<SalesforceOpportunity>
): SalesforceOpportunity {
  const propertyTypes = ['Office Building', 'Retail Store', 'Warehouse', 'Restaurant', 'Hotel'];
  const propertyType = faker.helpers.arrayElement(propertyTypes);

  return {
    Id: faker.string.alphanumeric(18),
    AccountId: accountId || faker.string.alphanumeric(18),
    ContactId: contactId || faker.string.alphanumeric(18),
    Name: `${propertyType} Painting Project - ${faker.location.city()}`,
    Amount: faker.number.int({ min: 5000, max: 50000 }),
    StageName: faker.helpers.arrayElement([
      'Prospecting',
      'Qualification',
      'Proposal',
      'Negotiation',
      'Closed Won',
      'Closed Lost',
    ]),
    CloseDate: faker.date.future({ years: 1 }).toISOString().split('T')[0],
    Probability: faker.number.int({ min: 10, max: 90 }),
    Type: faker.helpers.arrayElement(['New Business', 'Existing Business', 'Add-On']),
    LeadSource: faker.helpers.arrayElement([
      'Web',
      'Phone Inquiry',
      'Partner Referral',
      'Purchased List',
      'Trade Show',
    ]),
    Description: `Painting project for ${propertyType.toLowerCase()} including interior and exterior work`,
    NextStep: faker.helpers.arrayElement([
      'Schedule site visit',
      'Prepare proposal',
      'Follow up on proposal',
      'Contract negotiation',
      'Schedule start date',
    ]),
    CreatedDate: faker.date.recent({ days: 365 }).toISOString(),
    LastModifiedDate: faker.date.recent({ days: 30 }).toISOString(),
    ...overrides,
  };
}

/**
 * Creates OAuth response data
 */
export function createSalesforceOAuthResponse(
  overrides?: Partial<SalesforceOAuthResponse>
): SalesforceOAuthResponse {
  return {
    access_token: faker.string.alphanumeric(100),
    instance_url: `https://${faker.string.alphanumeric(20)}.salesforce.com`,
    id: `https://login.salesforce.com/id/${faker.string.alphanumeric(18)}/${faker.string.alphanumeric(18)}`,
    token_type: 'Bearer',
    issued_at: Date.now().toString(),
    signature: faker.string.alphanumeric(40),
    refresh_token: faker.string.alphanumeric(100),
    ...overrides,
  };
}

/**
 * Creates Salesforce API response wrapper
 */
export function createSalesforceAPIResponse<T>(
  records: T[],
  overrides?: Partial<SalesforceAPIResponse<T>>
): SalesforceAPIResponse<T> {
  return {
    totalSize: records.length,
    done: true,
    records,
    ...overrides,
  };
}

/**
 * Creates a complete Salesforce data set (Account, Contact, Opportunity)
 */
export function createSalesforceDataSet(): {
  account: SalesforceAccount;
  contact: SalesforceContact;
  opportunity: SalesforceOpportunity;
} {
  const account = createSalesforceAccount();
  const contact = createSalesforceContact(account.Id);
  const opportunity = createSalesforceOpportunity(account.Id, contact.Id);

  return { account, contact, opportunity };
}

/**
 * Creates multiple Salesforce accounts for batch testing
 */
export function createSalesforceAccountBatch(count: number): SalesforceAccount[] {
  return Array.from({ length: count }, () => createSalesforceAccount());
}

/**
 * Creates error response for testing
 */
export function createSalesforceErrorResponse(message?: string) {
  return {
    error: 'invalid_grant',
    error_description: message || 'authentication failure',
  };
}

/**
 * Creates query response with pagination
 */
export function createSalesforceQueryResponse<T>(
  records: T[],
  pageSize: number = 200
): SalesforceAPIResponse<T> {
  const hasMore = records.length > pageSize;
  const responseRecords = records.slice(0, pageSize);

  return {
    totalSize: records.length,
    done: !hasMore,
    records: responseRecords,
    ...(hasMore && {
      nextRecordsUrl: `/services/data/v57.0/query/${faker.string.alphanumeric(20)}`,
    }),
  };
}

/**
 * Creates Salesforce custom field data
 */
export function createCustomFieldData(): Record<string, any> {
  return {
    Paintbox_Estimate_Id__c: faker.string.uuid(),
    Project_Type__c: faker.helpers.arrayElement(['Interior', 'Exterior', 'Both']),
    Square_Footage__c: faker.number.int({ min: 500, max: 5000 }),
    Paint_Gallons__c: faker.number.int({ min: 5, max: 50 }),
    Labor_Hours__c: faker.number.int({ min: 20, max: 200 }),
    Good_Price__c: faker.number.int({ min: 2000, max: 5000 }),
    Better_Price__c: faker.number.int({ min: 5000, max: 8000 }),
    Best_Price__c: faker.number.int({ min: 8000, max: 12000 }),
    Selected_Tier__c: faker.helpers.arrayElement(['Good', 'Better', 'Best']),
    Estimate_Status__c: faker.helpers.arrayElement(['Draft', 'In Progress', 'Completed', 'Approved']),
    Last_Sync__c: faker.date.recent().toISOString(),
  };
}

/**
 * Creates test data for OAuth flow testing
 */
export function createOAuthTestData() {
  return {
    clientId: faker.string.alphanumeric(32),
    clientSecret: faker.string.alphanumeric(64),
    redirectUri: 'https://app.paintbox.com/auth/salesforce/callback',
    scope: 'full refresh_token',
    state: faker.string.alphanumeric(16),
    code: faker.string.alphanumeric(20),
  };
}

/**
 * Creates Salesforce metadata for field validation
 */
export function createFieldMetadata() {
  return {
    Account: {
      fields: [
        { name: 'Name', type: 'string', required: true },
        { name: 'Type', type: 'picklist', required: false },
        { name: 'Industry', type: 'picklist', required: false },
        { name: 'Phone', type: 'phone', required: false },
      ],
    },
    Contact: {
      fields: [
        { name: 'FirstName', type: 'string', required: false },
        { name: 'LastName', type: 'string', required: true },
        { name: 'Email', type: 'email', required: false },
        { name: 'Phone', type: 'phone', required: false },
      ],
    },
    Opportunity: {
      fields: [
        { name: 'Name', type: 'string', required: true },
        { name: 'Amount', type: 'currency', required: false },
        { name: 'StageName', type: 'picklist', required: true },
        { name: 'CloseDate', type: 'date', required: true },
      ],
    },
  };
}
