// Comprehensive test data factories for inventory management system
import { faker } from '@faker-js/faker';

// Type definitions for test data
export interface TestRoom {
  id?: string;
  name: string;
  floor: string;
  square_footage?: number;
  description?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface TestItem {
  id?: string;
  room_id: string;
  name: string;
  description?: string;
  category: string;
  decision: 'Keep' | 'Sell' | 'Donate' | 'Unsure' | 'Sold';
  purchase_price: number;
  designer_invoice_price?: number;
  asking_price?: number;
  sold_price?: number;
  quantity: number;
  is_fixture: boolean;
  source?: string;
  invoice_ref?: string;
  condition?: string;
  placement_notes?: string;
  purchase_date?: Date;
  created_at?: Date;
  updated_at?: Date;
}

export interface TestImage {
  id?: string;
  item_id: string;
  url: string;
  thumbnail_url?: string;
  caption?: string;
  is_primary: boolean;
  uploaded_at?: Date;
}

export interface TestActivity {
  id?: string;
  action: string;
  item_id?: string;
  item_name?: string;
  room_name?: string;
  details: string;
  old_value?: string;
  new_value?: string;
  created_at?: Date;
}

export interface TestUser {
  id?: string;
  email: string;
  password: string;
  name: string;
  role: 'owner' | 'admin' | 'viewer';
  created_at?: Date;
}

// Constants for realistic data generation
const FURNITURE_CATEGORIES = [
  'Furniture',
  'Art / Decor',
  'Lighting',
  'Electronics',
  'Rug / Carpet',
  'Plant (Indoor)',
  'Planter (Indoor)',
  'Outdoor Planter/Plant',
  'Planter Accessory',
  'Other'
];

const FURNITURE_NAMES = {
  'Furniture': [
    'Sectional Sofa', 'Coffee Table', 'Dining Table', 'Accent Chair', 'Bookshelf',
    'Dresser', 'Nightstand', 'Ottoman', 'Console Table', 'Side Table',
    'Armoire', 'Desk', 'Dining Chair', 'Bar Stool', 'Bench'
  ],
  'Art / Decor': [
    'Wall Art', 'Sculpture', 'Vase', 'Picture Frame', 'Mirror',
    'Decorative Bowl', 'Candle Holder', 'Throw Pillow', 'Wall Clock', 'Tapestry'
  ],
  'Lighting': [
    'Table Lamp', 'Floor Lamp', 'Pendant Light', 'Chandelier', 'Desk Lamp',
    'Wall Sconce', 'Track Lighting', 'Ceiling Fan', 'String Lights', 'LED Strip'
  ],
  'Electronics': [
    'Television', 'Sound System', 'Gaming Console', 'Smart Speaker', 'Tablet',
    'Projector', 'Streaming Device', 'Router', 'Smart Hub', 'Camera'
  ],
  'Rug / Carpet': [
    'Area Rug', 'Persian Rug', 'Runner', 'Carpet', 'Floor Mat',
    'Vintage Rug', 'Moroccan Rug', 'Oriental Rug', 'Contemporary Rug', 'Kilim'
  ]
};

const FURNITURE_BRANDS = [
  'West Elm', 'Pottery Barn', 'CB2', 'Crate & Barrel', 'Room & Board',
  'Article', 'Restoration Hardware', 'IKEA', 'Target', 'Wayfair',
  'World Market', 'Pier 1', 'Anthropologie', 'Urban Outfitters', 'Local Artisan'
];

const ROOM_NAMES = [
  'Living Room', 'Master Bedroom', 'Guest Bedroom', 'Kitchen', 'Dining Room',
  'Office', 'Family Room', 'Entryway', 'Bathroom', 'Laundry Room',
  'Basement', 'Attic', 'Garage', 'Sunroom', 'Library'
];

const FLOORS = ['Main Floor', 'Upper Floor', 'Lower Floor', 'Basement', 'Attic'];

const CONDITIONS = ['Excellent', 'Very Good', 'Good', 'Fair', 'Poor', 'Needs Repair'];

const DECISIONS = ['Keep', 'Sell', 'Donate', 'Unsure', 'Sold'] as const;

const ACTIVITY_ACTIONS = [
  'created', 'updated', 'deleted', 'decided', 'priced', 'moved', 'sold', 'viewed',
  'photographed', 'catalogued', 'marked', 'tagged', 'noted'
];

/**
 * Room Factory - Creates test room data
 */
export class RoomFactory {
  static create(overrides: Partial<TestRoom> = {}): TestRoom {
    const roomName = faker.helpers.arrayElement(ROOM_NAMES);
    const floor = faker.helpers.arrayElement(FLOORS);

    return {
      id: faker.string.uuid(),
      name: roomName,
      floor,
      square_footage: faker.number.int({ min: 80, max: 500 }),
      description: `${roomName} on the ${floor.toLowerCase()} with ${faker.word.adjective()} ambiance`,
      created_at: faker.date.past({ years: 2 }),
      updated_at: faker.date.recent({ days: 30 }),
      ...overrides
    };
  }

  static createMany(count: number, overrides: Partial<TestRoom> = {}): TestRoom[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  static createWithFixedFloor(floor: string, count: number = 1): TestRoom[] {
    return this.createMany(count, { floor });
  }

  static createRoomHierarchy(): TestRoom[] {
    return [
      this.create({ name: 'Living Room', floor: 'Main Floor', square_footage: 400 }),
      this.create({ name: 'Kitchen', floor: 'Main Floor', square_footage: 200 }),
      this.create({ name: 'Dining Room', floor: 'Main Floor', square_footage: 150 }),
      this.create({ name: 'Master Bedroom', floor: 'Upper Floor', square_footage: 350 }),
      this.create({ name: 'Guest Bedroom', floor: 'Upper Floor', square_footage: 200 }),
      this.create({ name: 'Office', floor: 'Upper Floor', square_footage: 120 }),
    ];
  }
}

/**
 * Item Factory - Creates test item data with realistic relationships
 */
export class ItemFactory {
  static create(room_id: string, overrides: Partial<TestItem> = {}): TestItem {
    const category = faker.helpers.arrayElement(FURNITURE_CATEGORIES);
    const itemNames = FURNITURE_NAMES[category as keyof typeof FURNITURE_NAMES] || ['Generic Item'];
    const baseName = faker.helpers.arrayElement(itemNames);
    const brand = faker.helpers.arrayElement(FURNITURE_BRANDS);
    const condition = faker.helpers.arrayElement(CONDITIONS);
    const decision = faker.helpers.arrayElement(DECISIONS);

    // Generate realistic pricing based on category and condition
    const basePriceRange = this.getPriceRange(category, condition);
    const purchasePrice = faker.number.float({
      min: basePriceRange.min,
      max: basePriceRange.max,
      fractionDigits: 2
    });

    const askingPrice = purchasePrice * faker.number.float({ min: 0.6, max: 0.9, fractionDigits: 2 });
    const designerPrice = purchasePrice * faker.number.float({ min: 1.2, max: 1.8, fractionDigits: 2 });

    return {
      id: faker.string.uuid(),
      room_id,
      name: `${brand} ${baseName}`,
      description: faker.lorem.sentence(),
      category,
      decision,
      purchase_price: purchasePrice,
      designer_invoice_price: Math.random() > 0.7 ? designerPrice : undefined,
      asking_price: decision === 'Sell' ? askingPrice : undefined,
      sold_price: decision === 'Sold' ? askingPrice * faker.number.float({ min: 0.8, max: 1.2 }) : undefined,
      quantity: faker.helpers.weightedArrayElement([
        { weight: 70, value: 1 },
        { weight: 20, value: 2 },
        { weight: 8, value: faker.number.int({ min: 3, max: 6 }) },
        { weight: 2, value: faker.number.int({ min: 7, max: 20 }) }
      ]),
      is_fixture: faker.helpers.weightedArrayElement([
        { weight: 85, value: false },
        { weight: 15, value: true }
      ]),
      source: brand,
      invoice_ref: Math.random() > 0.6 ? `${brand.toUpperCase()}-${faker.date.past().getFullYear()}-${faker.number.int({ min: 1, max: 999 }).toString().padStart(3, '0')}` : undefined,
      condition,
      placement_notes: Math.random() > 0.7 ? faker.lorem.sentence() : undefined,
      purchase_date: faker.date.past({ years: 5 }),
      created_at: faker.date.past({ years: 1 }),
      updated_at: faker.date.recent({ days: 30 }),
      ...overrides
    };
  }

  static createMany(room_id: string, count: number, overrides: Partial<TestItem> = {}): TestItem[] {
    return Array.from({ length: count }, () => this.create(room_id, overrides));
  }

  static createByCategory(room_id: string, category: string, count: number = 1): TestItem[] {
    return this.createMany(room_id, count, { category });
  }

  static createByDecision(room_id: string, decision: TestItem['decision'], count: number = 1): TestItem[] {
    return this.createMany(room_id, count, { decision });
  }

  static createHighValueItems(room_id: string, count: number = 3): TestItem[] {
    return this.createMany(room_id, count, {
      purchase_price: faker.number.float({ min: 2000, max: 10000, fractionDigits: 2 }),
      category: faker.helpers.arrayElement(['Furniture', 'Art / Decor']),
      condition: faker.helpers.arrayElement(['Excellent', 'Very Good'])
    });
  }

  static createLowStockItems(room_id: string, count: number = 2): TestItem[] {
    return this.createMany(room_id, count, {
      quantity: 0,
      decision: 'Unsure'
    });
  }

  static createItemsForRoom(room: TestRoom): TestItem[] {
    const itemCount = faker.number.int({ min: 5, max: 25 });
    const items: TestItem[] = [];

    // Ensure variety in each room
    const categories = faker.helpers.arrayElements(FURNITURE_CATEGORIES, { min: 2, max: 4 });
    const decisions = faker.helpers.arrayElements(DECISIONS, { min: 2, max: 4 });

    for (let i = 0; i < itemCount; i++) {
      const category = faker.helpers.arrayElement(categories);
      const decision = faker.helpers.arrayElement(decisions);

      items.push(this.create(room.id!, { category, decision }));
    }

    return items;
  }

  private static getPriceRange(category: string, condition: string): { min: number; max: number } {
    const baseRanges: Record<string, { min: number; max: number }> = {
      'Furniture': { min: 100, max: 3000 },
      'Art / Decor': { min: 20, max: 1500 },
      'Lighting': { min: 30, max: 800 },
      'Electronics': { min: 50, max: 2000 },
      'Rug / Carpet': { min: 80, max: 2500 },
      'Plant (Indoor)': { min: 10, max: 200 },
      'Other': { min: 10, max: 500 }
    };

    const conditionMultipliers: Record<string, number> = {
      'Excellent': 1.0,
      'Very Good': 0.8,
      'Good': 0.6,
      'Fair': 0.4,
      'Poor': 0.2,
      'Needs Repair': 0.1
    };

    const baseRange = baseRanges[category] || baseRanges['Other'];
    const multiplier = conditionMultipliers[condition] || 0.5;

    return {
      min: baseRange.min * multiplier,
      max: baseRange.max * multiplier
    };
  }
}

/**
 * Image Factory - Creates test image data for items
 */
export class ImageFactory {
  static create(item_id: string, overrides: Partial<TestImage> = {}): TestImage {
    const imageId = faker.string.uuid();
    const baseUrl = 'https://images.example.com';

    return {
      id: imageId,
      item_id,
      url: `${baseUrl}/items/${item_id}/${imageId}.jpg`,
      thumbnail_url: `${baseUrl}/items/${item_id}/thumbnails/${imageId}_thumb.jpg`,
      caption: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.7 }),
      is_primary: false,
      uploaded_at: faker.date.recent({ days: 60 }),
      ...overrides
    };
  }

  static createMany(item_id: string, count: number, overrides: Partial<TestImage> = {}): TestImage[] {
    const images = Array.from({ length: count }, (_, index) =>
      this.create(item_id, { is_primary: index === 0, ...overrides })
    );
    return images;
  }

  static createImageSet(item_id: string): TestImage[] {
    const imageCount = faker.helpers.weightedArrayElement([
      { weight: 20, value: 1 },
      { weight: 40, value: 2 },
      { weight: 25, value: 3 },
      { weight: 10, value: 4 },
      { weight: 5, value: faker.number.int({ min: 5, max: 8 }) }
    ]);

    return this.createMany(item_id, imageCount);
  }
}

/**
 * Activity Factory - Creates test activity/audit log data
 */
export class ActivityFactory {
  static create(overrides: Partial<TestActivity> = {}): TestActivity {
    const action = faker.helpers.arrayElement(ACTIVITY_ACTIONS);

    return {
      id: faker.string.uuid(),
      action,
      item_id: faker.helpers.maybe(() => faker.string.uuid(), { probability: 0.8 }),
      item_name: faker.helpers.maybe(() => `${faker.helpers.arrayElement(FURNITURE_BRANDS)} ${faker.helpers.arrayElement(Object.values(FURNITURE_NAMES).flat())}`, { probability: 0.8 }),
      room_name: faker.helpers.maybe(() => faker.helpers.arrayElement(ROOM_NAMES), { probability: 0.7 }),
      details: this.generateActivityDetails(action),
      old_value: faker.helpers.maybe(() => this.generateValue(), { probability: 0.5 }),
      new_value: faker.helpers.maybe(() => this.generateValue(), { probability: 0.5 }),
      created_at: faker.date.recent({ days: 90 }),
      ...overrides
    };
  }

  static createMany(count: number, overrides: Partial<TestActivity> = {}): TestActivity[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  static createForItem(item_id: string, item_name: string, count: number = 3): TestActivity[] {
    return this.createMany(count, { item_id, item_name });
  }

  static createTimeSequence(item_id: string, item_name: string): TestActivity[] {
    const baseDate = faker.date.past({ years: 1 });

    return [
      this.create({
        action: 'created',
        item_id,
        item_name,
        details: 'Item added to inventory',
        created_at: baseDate
      }),
      this.create({
        action: 'photographed',
        item_id,
        item_name,
        details: 'Photos uploaded',
        created_at: new Date(baseDate.getTime() + 1000 * 60 * 30) // 30 minutes later
      }),
      this.create({
        action: 'priced',
        item_id,
        item_name,
        details: 'Purchase price updated',
        old_value: 'Unknown',
        new_value: faker.number.float({ min: 100, max: 3000, fractionDigits: 2 }).toString(),
        created_at: new Date(baseDate.getTime() + 1000 * 60 * 60 * 2) // 2 hours later
      }),
      this.create({
        action: 'decided',
        item_id,
        item_name,
        details: 'Decision made',
        old_value: 'Unsure',
        new_value: faker.helpers.arrayElement(['Keep', 'Sell', 'Donate']),
        created_at: new Date(baseDate.getTime() + 1000 * 60 * 60 * 24) // 1 day later
      })
    ];
  }

  private static generateActivityDetails(action: string): string {
    const templates: Record<string, string[]> = {
      'created': ['Item added to inventory', 'New item catalogued', 'Item registered'],
      'updated': ['Item details modified', 'Information updated', 'Record changed'],
      'deleted': ['Item removed from inventory', 'Record deleted', 'Item archived'],
      'decided': ['Decision made about item', 'Status changed', 'Disposition determined'],
      'priced': ['Price information updated', 'Valuation changed', 'Cost adjusted'],
      'moved': ['Item relocated', 'Room assignment changed', 'Position updated'],
      'sold': ['Item sold successfully', 'Sale completed', 'Transaction finalized'],
      'viewed': ['Item details accessed', 'Record viewed', 'Information retrieved'],
      'photographed': ['Photos uploaded', 'Images added', 'Visual documentation updated']
    };

    const actionTemplates = templates[action] || ['Activity performed', 'Action completed', 'Operation executed'];
    return faker.helpers.arrayElement(actionTemplates);
  }

  private static generateValue(): string {
    return faker.helpers.arrayElement([
      faker.helpers.arrayElement(DECISIONS),
      faker.number.float({ min: 10, max: 5000, fractionDigits: 2 }).toString(),
      faker.helpers.arrayElement(CONDITIONS),
      faker.helpers.arrayElement(ROOM_NAMES),
      faker.lorem.word()
    ]);
  }
}

/**
 * User Factory - Creates test user data
 */
export class UserFactory {
  static create(overrides: Partial<TestUser> = {}): TestUser {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const email = faker.internet.email({ firstName, lastName });

    return {
      id: faker.string.uuid(),
      email,
      password: 'TestPassword123!',
      name: `${firstName} ${lastName}`,
      role: faker.helpers.weightedArrayElement([
        { weight: 10, value: 'owner' },
        { weight: 30, value: 'admin' },
        { weight: 60, value: 'viewer' }
      ]),
      created_at: faker.date.past({ years: 2 }),
      ...overrides
    };
  }

  static createMany(count: number, overrides: Partial<TestUser> = {}): TestUser[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  static createByRole(role: TestUser['role'], count: number = 1): TestUser[] {
    return this.createMany(count, { role });
  }

  static createTestUsers(): TestUser[] {
    return [
      this.create({
        email: 'owner@test.com',
        name: 'Test Owner',
        role: 'owner',
        password: 'TestPassword123!'
      }),
      this.create({
        email: 'admin@test.com',
        name: 'Test Admin',
        role: 'admin',
        password: 'TestPassword123!'
      }),
      this.create({
        email: 'viewer@test.com',
        name: 'Test Viewer',
        role: 'viewer',
        password: 'TestPassword123!'
      }),
    ];
  }
}

/**
 * Complete Dataset Factory - Creates a full inventory dataset with relationships
 */
export class InventoryDatasetFactory {
  static createComplete(options: {
    roomCount?: number;
    avgItemsPerRoom?: number;
    avgImagesPerItem?: number;
    avgActivitiesPerItem?: number;
    userCount?: number;
  } = {}): {
    rooms: TestRoom[];
    items: TestItem[];
    images: TestImage[];
    activities: TestActivity[];
    users: TestUser[];
  } {
    const {
      roomCount = 8,
      avgItemsPerRoom = 12,
      avgImagesPerItem = 2,
      avgActivitiesPerItem = 3,
      userCount = 5
    } = options;

    // Create rooms
    const rooms = RoomFactory.createMany(roomCount);

    // Create items for each room
    const items: TestItem[] = [];
    rooms.forEach(room => {
      const itemCount = faker.number.int({
        min: Math.max(1, avgItemsPerRoom - 5),
        max: avgItemsPerRoom + 8
      });
      const roomItems = ItemFactory.createMany(room.id!, itemCount);
      items.push(...roomItems);
    });

    // Create images for items
    const images: TestImage[] = [];
    items.forEach(item => {
      if (Math.random() > 0.2) { // 80% of items have images
        const imageCount = faker.number.int({
          min: 1,
          max: Math.max(1, avgImagesPerItem + 2)
        });
        const itemImages = ImageFactory.createMany(item.id!, imageCount);
        images.push(...itemImages);
      }
    });

    // Create activities for items
    const activities: TestActivity[] = [];
    items.forEach(item => {
      const activityCount = faker.number.int({
        min: 1,
        max: Math.max(1, avgActivitiesPerItem + 2)
      });
      const itemActivities = ActivityFactory.createForItem(item.id!, item.name, activityCount);
      activities.push(...itemActivities);
    });

    // Create users
    const users = UserFactory.createMany(userCount);

    return {
      rooms,
      items,
      images,
      activities,
      users
    };
  }

  static createRealistic(): ReturnType<typeof InventoryDatasetFactory.createComplete> {
    return this.createComplete({
      roomCount: 12,
      avgItemsPerRoom: 18,
      avgImagesPerItem: 2,
      avgActivitiesPerItem: 4,
      userCount: 3
    });
  }

  static createLarge(): ReturnType<typeof InventoryDatasetFactory.createComplete> {
    return this.createComplete({
      roomCount: 25,
      avgItemsPerRoom: 35,
      avgImagesPerItem: 3,
      avgActivitiesPerItem: 6,
      userCount: 8
    });
  }

  static createMinimal(): ReturnType<typeof InventoryDatasetFactory.createComplete> {
    return this.createComplete({
      roomCount: 3,
      avgItemsPerRoom = 5,
      avgImagesPerItem: 1,
      avgActivitiesPerItem: 2,
      userCount: 2
    });
  }
}

/**
 * Seed Data Helper - Utilities for seeding test databases
 */
export class SeedDataHelper {
  static generateSQLInserts(dataset: ReturnType<typeof InventoryDatasetFactory.createComplete>): {
    rooms: string;
    items: string;
    images: string;
    activities: string;
    users: string;
  } {
    const { rooms, items, images, activities, users } = dataset;

    return {
      rooms: this.generateRoomInserts(rooms),
      items: this.generateItemInserts(items),
      images: this.generateImageInserts(images),
      activities: this.generateActivityInserts(activities),
      users: this.generateUserInserts(users)
    };
  }

  private static generateRoomInserts(rooms: TestRoom[]): string {
    const values = rooms.map(room =>
      `('${room.id}', '${room.name}', '${room.floor}', ${room.square_footage || 'NULL'}, '${room.description}', '${room.created_at?.toISOString()}', '${room.updated_at?.toISOString()}')`
    ).join(',\n');

    return `INSERT INTO rooms (id, name, floor, square_footage, description, created_at, updated_at) VALUES\n${values};`;
  }

  private static generateItemInserts(items: TestItem[]): string {
    const values = items.map(item =>
      `('${item.id}', '${item.room_id}', '${item.name}', '${item.description || ''}', '${item.category}', '${item.decision}', ${item.purchase_price}, ${item.asking_price || 'NULL'}, ${item.quantity}, ${item.is_fixture}, '${item.source || ''}', '${item.condition || ''}', '${item.purchase_date?.toISOString().split('T')[0]}', '${item.created_at?.toISOString()}', '${item.updated_at?.toISOString()}')`
    ).join(',\n');

    return `INSERT INTO items (id, room_id, name, description, category, decision, purchase_price, asking_price, quantity, is_fixture, source, condition, purchase_date, created_at, updated_at) VALUES\n${values};`;
  }

  private static generateImageInserts(images: TestImage[]): string {
    const values = images.map(image =>
      `('${image.id}', '${image.item_id}', '${image.url}', '${image.thumbnail_url || ''}', '${image.caption || ''}', ${image.is_primary}, '${image.uploaded_at?.toISOString()}')`
    ).join(',\n');

    return `INSERT INTO images (id, item_id, url, thumbnail_url, caption, is_primary, uploaded_at) VALUES\n${values};`;
  }

  private static generateActivityInserts(activities: TestActivity[]): string {
    const values = activities.map(activity =>
      `('${activity.id}', '${activity.action}', '${activity.item_id || ''}', '${activity.item_name || ''}', '${activity.room_name || ''}', '${activity.details}', '${activity.old_value || ''}', '${activity.new_value || ''}', '${activity.created_at?.toISOString()}')`
    ).join(',\n');

    return `INSERT INTO activities (id, action, item_id, item_name, room_name, details, old_value, new_value, created_at) VALUES\n${values};`;
  }

  private static generateUserInserts(users: TestUser[]): string {
    const values = users.map(user =>
      `('${user.id}', '${user.email}', '${user.password}', '${user.name}', '${user.role}', '${user.created_at?.toISOString()}')`
    ).join(',\n');

    return `INSERT INTO users (id, email, password, name, role, created_at) VALUES\n${values};`;
  }
}

// =============================================================================
// MATURITY MAP TEST DATA FACTORIES
// =============================================================================

// Type definitions for maturity map test data
export interface TestMaturityAssessment {
  id?: string;
  organizationId: string;
  title: string;
  description?: string;
  status: 'draft' | 'in_progress' | 'completed' | 'archived';
  maturityLevel: number;
  dimensions: TestMaturityDimension[];
  completionRate: number;
  totalQuestions: number;
  answeredQuestions: number;
  createdBy: string;
  assignedTo?: string[];
  dueDate?: Date;
  completedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TestMaturityDimension {
  id?: string;
  assessmentId: string;
  name: string;
  description?: string;
  weight: number;
  score: number;
  maxScore: number;
  questions: TestMaturityQuestion[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TestMaturityQuestion {
  id?: string;
  dimensionId: string;
  text: string;
  type: 'multiple_choice' | 'scale' | 'text' | 'boolean' | 'file_upload';
  required: boolean;
  options?: string[];
  weight: number;
  response?: TestMaturityResponse;
  order: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TestMaturityResponse {
  id?: string;
  questionId: string;
  assessmentId: string;
  value: string | number | boolean;
  confidence: number;
  comments?: string;
  evidence?: TestDocumentUpload[];
  respondedBy: string;
  respondedAt?: Date;
}

export interface TestDocumentUpload {
  id?: string;
  assessmentId: string;
  questionId?: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  processedChunks?: number;
  aiSummary?: string;
  uploadedBy: string;
  uploadedAt?: Date;
}

export interface TestMaturityOrganization {
  id?: string;
  name: string;
  domain?: string;
  industry: string;
  size: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
  description?: string;
  settings: {
    allowSelfAssessment: boolean;
    requireEvidence: boolean;
    enableCollaboration: boolean;
    notificationPreferences: string[];
  };
  createdAt?: Date;
  updatedAt?: Date;
}

// Constants for realistic maturity map data
const MATURITY_DIMENSIONS = [
  { name: 'Strategy & Vision', description: 'Strategic alignment and vision clarity' },
  { name: 'Leadership & Governance', description: 'Leadership effectiveness and governance structures' },
  { name: 'Process Management', description: 'Process optimization and management practices' },
  { name: 'Technology & Innovation', description: 'Technology adoption and innovation capabilities' },
  { name: 'People & Culture', description: 'Human resources and organizational culture' },
  { name: 'Customer Experience', description: 'Customer-centric approaches and experience management' },
  { name: 'Data & Analytics', description: 'Data management and analytics capabilities' },
  { name: 'Risk Management', description: 'Risk assessment and mitigation strategies' }
];

const INDUSTRIES = [
  'Technology', 'Healthcare', 'Finance', 'Manufacturing', 'Retail',
  'Education', 'Government', 'Non-profit', 'Consulting', 'Media'
];

const ORGANIZATION_SIZES = ['startup', 'small', 'medium', 'large', 'enterprise'] as const;

const ASSESSMENT_STATUSES = ['draft', 'in_progress', 'completed', 'archived'] as const;

const QUESTION_TYPES = ['multiple_choice', 'scale', 'text', 'boolean', 'file_upload'] as const;

const SAMPLE_QUESTIONS = {
  'Strategy & Vision': [
    'How clearly defined is your organization\'s strategic vision?',
    'To what extent are strategic objectives communicated across all levels?',
    'How regularly is the strategic plan reviewed and updated?',
    'How well does your organization align initiatives with strategic goals?'
  ],
  'Leadership & Governance': [
    'How effective is leadership in driving organizational change?',
    'To what extent is decision-making decentralized?',
    'How well-defined are governance structures and processes?',
    'How effectively does leadership communicate with stakeholders?'
  ],
  'Process Management': [
    'How well-documented are your key business processes?',
    'To what extent are processes regularly reviewed and optimized?',
    'How standardized are processes across different departments?',
    'How effectively does your organization measure process performance?'
  ]
};

const MULTIPLE_CHOICE_OPTIONS = [
  ['Not at all', 'Slightly', 'Moderately', 'Very much', 'Extremely'],
  ['Never', 'Rarely', 'Sometimes', 'Often', 'Always'],
  ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'],
  ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree']
];

/**
 * Maturity Assessment Factory
 */
export class MaturityAssessmentFactory {
  static create(organizationId: string, overrides: Partial<TestMaturityAssessment> = {}): TestMaturityAssessment {
    const title = faker.helpers.arrayElement([
      'Q4 2024 Organizational Maturity Assessment',
      'Digital Transformation Readiness Assessment',
      'Process Optimization Assessment',
      'Annual Strategic Review',
      'Department-level Maturity Evaluation'
    ]);

    const totalQuestions = faker.number.int({ min: 20, max: 100 });
    const answeredQuestions = faker.number.int({ min: 0, max: totalQuestions });
    const completionRate = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;
    
    const status = faker.helpers.weightedArrayElement([
      { weight: 20, value: 'draft' },
      { weight: 40, value: 'in_progress' },
      { weight: 30, value: 'completed' },
      { weight: 10, value: 'archived' }
    ]);

    return {
      id: faker.string.uuid(),
      organizationId,
      title,
      description: faker.lorem.sentences(2),
      status,
      maturityLevel: faker.number.int({ min: 1, max: 5 }),
      dimensions: [],
      completionRate,
      totalQuestions,
      answeredQuestions,
      createdBy: faker.string.uuid(),
      assignedTo: faker.helpers.arrayElements(
        Array.from({ length: 5 }, () => faker.string.uuid()),
        { min: 1, max: 3 }
      ),
      dueDate: faker.date.future(),
      completedAt: status === 'completed' ? faker.date.recent({ days: 30 }) : undefined,
      createdAt: faker.date.past({ years: 1 }),
      updatedAt: faker.date.recent({ days: 7 }),
      ...overrides
    };
  }

  static createMany(organizationId: string, count: number, overrides: Partial<TestMaturityAssessment> = {}): TestMaturityAssessment[] {
    return Array.from({ length: count }, () => this.create(organizationId, overrides));
  }

  static createByStatus(organizationId: string, status: TestMaturityAssessment['status'], count: number = 1): TestMaturityAssessment[] {
    return this.createMany(organizationId, count, { status });
  }

  static createWithDimensions(organizationId: string, dimensionCount: number = 5): TestMaturityAssessment {
    const assessment = this.create(organizationId);
    const dimensions = MaturityDimensionFactory.createMany(assessment.id!, dimensionCount);
    
    return {
      ...assessment,
      dimensions,
      totalQuestions: dimensions.reduce((sum, dim) => sum + dim.questions.length, 0)
    };
  }
}

/**
 * Maturity Dimension Factory
 */
export class MaturityDimensionFactory {
  static create(assessmentId: string, overrides: Partial<TestMaturityDimension> = {}): TestMaturityDimension {
    const dimension = faker.helpers.arrayElement(MATURITY_DIMENSIONS);
    const maxScore = faker.number.int({ min: 20, max: 100 });
    const score = faker.number.int({ min: 0, max: maxScore });

    return {
      id: faker.string.uuid(),
      assessmentId,
      name: dimension.name,
      description: dimension.description,
      weight: faker.number.float({ min: 0.1, max: 1.0, fractionDigits: 2 }),
      score,
      maxScore,
      questions: [],
      createdAt: faker.date.past({ months: 6 }),
      updatedAt: faker.date.recent({ days: 14 }),
      ...overrides
    };
  }

  static createMany(assessmentId: string, count: number, overrides: Partial<TestMaturityDimension> = {}): TestMaturityDimension[] {
    const selectedDimensions = faker.helpers.arrayElements(MATURITY_DIMENSIONS, count);
    return selectedDimensions.map(dimension => this.create(assessmentId, { 
      name: dimension.name, 
      description: dimension.description,
      ...overrides 
    }));
  }

  static createWithQuestions(assessmentId: string, questionCount: number = 5): TestMaturityDimension {
    const dimension = this.create(assessmentId);
    const questions = MaturityQuestionFactory.createMany(dimension.id!, questionCount);
    
    return {
      ...dimension,
      questions,
      maxScore: questions.reduce((sum, q) => sum + q.weight, 0)
    };
  }
}

/**
 * Maturity Question Factory
 */
export class MaturityQuestionFactory {
  static create(dimensionId: string, overrides: Partial<TestMaturityQuestion> = {}): TestMaturityQuestion {
    const type = faker.helpers.arrayElement(QUESTION_TYPES);
    const questionTexts = Object.values(SAMPLE_QUESTIONS).flat();
    const text = faker.helpers.arrayElement(questionTexts);

    const question: TestMaturityQuestion = {
      id: faker.string.uuid(),
      dimensionId,
      text,
      type,
      required: faker.datatype.boolean({ probability: 0.7 }),
      weight: faker.number.int({ min: 1, max: 10 }),
      order: faker.number.int({ min: 1, max: 50 }),
      createdAt: faker.date.past({ months: 3 }),
      updatedAt: faker.date.recent({ days: 10 }),
      ...overrides
    };

    // Add options for multiple choice questions
    if (type === 'multiple_choice') {
      question.options = faker.helpers.arrayElement(MULTIPLE_CHOICE_OPTIONS);
    }

    return question;
  }

  static createMany(dimensionId: string, count: number, overrides: Partial<TestMaturityQuestion> = {}): TestMaturityQuestion[] {
    return Array.from({ length: count }, (_, index) => 
      this.create(dimensionId, { order: index + 1, ...overrides })
    );
  }

  static createByType(dimensionId: string, type: TestMaturityQuestion['type'], count: number = 1): TestMaturityQuestion[] {
    return this.createMany(dimensionId, count, { type });
  }

  static createWithResponse(dimensionId: string, assessmentId: string): TestMaturityQuestion {
    const question = this.create(dimensionId);
    const response = MaturityResponseFactory.create(question.id!, assessmentId);
    
    return {
      ...question,
      response
    };
  }
}

/**
 * Maturity Response Factory
 */
export class MaturityResponseFactory {
  static create(questionId: string, assessmentId: string, overrides: Partial<TestMaturityResponse> = {}): TestMaturityResponse {
    const value = faker.helpers.arrayElement([
      faker.number.int({ min: 1, max: 5 }),
      faker.datatype.boolean(),
      faker.lorem.sentence(),
      faker.helpers.arrayElement(['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'])
    ]);

    return {
      id: faker.string.uuid(),
      questionId,
      assessmentId,
      value,
      confidence: faker.number.int({ min: 1, max: 10 }),
      comments: faker.helpers.maybe(() => faker.lorem.paragraph(), { probability: 0.6 }),
      evidence: faker.helpers.maybe(() => 
        DocumentUploadFactory.createMany(assessmentId, faker.number.int({ min: 1, max: 3 })), 
        { probability: 0.3 }
      ),
      respondedBy: faker.string.uuid(),
      respondedAt: faker.date.recent({ days: 30 }),
      ...overrides
    };
  }

  static createMany(questionId: string, assessmentId: string, count: number, overrides: Partial<TestMaturityResponse> = {}): TestMaturityResponse[] {
    return Array.from({ length: count }, () => this.create(questionId, assessmentId, overrides));
  }

  static createHighConfidence(questionId: string, assessmentId: string): TestMaturityResponse {
    return this.create(questionId, assessmentId, {
      confidence: faker.number.int({ min: 8, max: 10 }),
      comments: faker.lorem.paragraph()
    });
  }

  static createWithEvidence(questionId: string, assessmentId: string): TestMaturityResponse {
    return this.create(questionId, assessmentId, {
      evidence: DocumentUploadFactory.createMany(assessmentId, faker.number.int({ min: 2, max: 5 }))
    });
  }
}

/**
 * Document Upload Factory
 */
export class DocumentUploadFactory {
  static create(assessmentId: string, overrides: Partial<TestDocumentUpload> = {}): TestDocumentUpload {
    const extensions = ['pdf', 'docx', 'xlsx', 'pptx', 'txt', 'png', 'jpg'];
    const extension = faker.helpers.arrayElement(extensions);
    const filename = `${faker.system.fileName({ extensionCount: 0 })}.${extension}`;

    const mimeTypes: Record<string, string> = {
      pdf: 'application/pdf',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      txt: 'text/plain',
      png: 'image/png',
      jpg: 'image/jpeg'
    };

    return {
      id: faker.string.uuid(),
      assessmentId,
      filename,
      originalName: filename,
      mimeType: mimeTypes[extension],
      size: faker.number.int({ min: 1024, max: 50 * 1024 * 1024 }), // 1KB to 50MB
      url: `https://storage.example.com/assessments/${assessmentId}/${faker.string.uuid()}.${extension}`,
      processedChunks: faker.helpers.maybe(() => faker.number.int({ min: 1, max: 100 }), { probability: 0.7 }),
      aiSummary: faker.helpers.maybe(() => faker.lorem.paragraph(), { probability: 0.5 }),
      uploadedBy: faker.string.uuid(),
      uploadedAt: faker.date.recent({ days: 14 }),
      ...overrides
    };
  }

  static createMany(assessmentId: string, count: number, overrides: Partial<TestDocumentUpload> = {}): TestDocumentUpload[] {
    return Array.from({ length: count }, () => this.create(assessmentId, overrides));
  }

  static createByType(assessmentId: string, extension: string, count: number = 1): TestDocumentUpload[] {
    return this.createMany(assessmentId, count, { 
      filename: `${faker.system.fileName({ extensionCount: 0 })}.${extension}`
    });
  }

  static createLargeFiles(assessmentId: string, count: number = 3): TestDocumentUpload[] {
    return this.createMany(assessmentId, count, {
      size: faker.number.int({ min: 10 * 1024 * 1024, max: 100 * 1024 * 1024 }) // 10MB to 100MB
    });
  }
}

/**
 * Organization Factory
 */
export class MaturityOrganizationFactory {
  static create(overrides: Partial<TestMaturityOrganization> = {}): TestMaturityOrganization {
    const name = faker.company.name();
    const domain = faker.internet.domainName();

    return {
      id: faker.string.uuid(),
      name,
      domain,
      industry: faker.helpers.arrayElement(INDUSTRIES),
      size: faker.helpers.arrayElement(ORGANIZATION_SIZES),
      description: faker.company.catchPhrase(),
      settings: {
        allowSelfAssessment: faker.datatype.boolean({ probability: 0.8 }),
        requireEvidence: faker.datatype.boolean({ probability: 0.6 }),
        enableCollaboration: faker.datatype.boolean({ probability: 0.9 }),
        notificationPreferences: faker.helpers.arrayElements([
          'email', 'slack', 'teams', 'sms', 'push'
        ], { min: 1, max: 3 })
      },
      createdAt: faker.date.past({ years: 2 }),
      updatedAt: faker.date.recent({ days: 30 }),
      ...overrides
    };
  }

  static createMany(count: number, overrides: Partial<TestMaturityOrganization> = {}): TestMaturityOrganization[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  static createBySize(size: TestMaturityOrganization['size'], count: number = 1): TestMaturityOrganization[] {
    return this.createMany(count, { size });
  }

  static createByIndustry(industry: string, count: number = 1): TestMaturityOrganization[] {
    return this.createMany(count, { industry });
  }
}

/**
 * Complete Maturity Dataset Factory
 */
export class MaturityDatasetFactory {
  static createComplete(options: {
    organizationCount?: number;
    assessmentsPerOrg?: number;
    dimensionsPerAssessment?: number;
    questionsPerDimension?: number;
    responseRate?: number;
    documentsPerAssessment?: number;
  } = {}): {
    organizations: TestMaturityOrganization[];
    assessments: TestMaturityAssessment[];
    dimensions: TestMaturityDimension[];
    questions: TestMaturityQuestion[];
    responses: TestMaturityResponse[];
    documents: TestDocumentUpload[];
  } {
    const {
      organizationCount = 3,
      assessmentsPerOrg = 2,
      dimensionsPerAssessment = 5,
      questionsPerDimension = 8,
      responseRate = 0.7,
      documentsPerAssessment = 5
    } = options;

    // Create organizations
    const organizations = MaturityOrganizationFactory.createMany(organizationCount);

    // Create assessments for each organization
    const assessments: TestMaturityAssessment[] = [];
    organizations.forEach(org => {
      const orgAssessments = MaturityAssessmentFactory.createMany(org.id!, assessmentsPerOrg);
      assessments.push(...orgAssessments);
    });

    // Create dimensions for each assessment
    const dimensions: TestMaturityDimension[] = [];
    assessments.forEach(assessment => {
      const assessmentDimensions = MaturityDimensionFactory.createMany(assessment.id!, dimensionsPerAssessment);
      dimensions.push(...assessmentDimensions);
    });

    // Create questions for each dimension
    const questions: TestMaturityQuestion[] = [];
    dimensions.forEach(dimension => {
      const dimensionQuestions = MaturityQuestionFactory.createMany(dimension.id!, questionsPerDimension);
      questions.push(...dimensionQuestions);
    });

    // Create responses for questions based on response rate
    const responses: TestMaturityResponse[] = [];
    questions.forEach(question => {
      if (Math.random() < responseRate) {
        const response = MaturityResponseFactory.create(question.id!, question.dimensionId);
        responses.push(response);
      }
    });

    // Create documents for assessments
    const documents: TestDocumentUpload[] = [];
    assessments.forEach(assessment => {
      if (Math.random() > 0.3) { // 70% of assessments have documents
        const assessmentDocuments = DocumentUploadFactory.createMany(assessment.id!, documentsPerAssessment);
        documents.push(...assessmentDocuments);
      }
    });

    return {
      organizations,
      assessments,
      dimensions,
      questions,
      responses,
      documents
    };
  }

  static createRealistic(): ReturnType<typeof MaturityDatasetFactory.createComplete> {
    return this.createComplete({
      organizationCount: 5,
      assessmentsPerOrg: 3,
      dimensionsPerAssessment: 6,
      questionsPerDimension: 10,
      responseRate: 0.75,
      documentsPerAssessment: 8
    });
  }

  static createLarge(): ReturnType<typeof MaturityDatasetFactory.createComplete> {
    return this.createComplete({
      organizationCount: 15,
      assessmentsPerOrg: 8,
      dimensionsPerAssessment: 8,
      questionsPerDimension: 15,
      responseRate: 0.6,
      documentsPerAssessment: 12
    });
  }

  static createMinimal(): ReturnType<typeof MaturityDatasetFactory.createComplete> {
    return this.createComplete({
      organizationCount: 1,
      assessmentsPerOrg: 1,
      dimensionsPerAssessment: 3,
      questionsPerDimension: 5,
      responseRate: 0.8,
      documentsPerAssessment: 3
    });
  }
}

// =============================================================================
// COMBINED TEST DATA SETS
// =============================================================================

// Export commonly used test data sets
export const TestDataSets = {
  // Inventory datasets
  small: () => InventoryDatasetFactory.createMinimal(),
  medium: () => InventoryDatasetFactory.createRealistic(),
  large: () => InventoryDatasetFactory.createLarge(),

  // Maturity map datasets
  maturitySmall: () => MaturityDatasetFactory.createMinimal(),
  maturityMedium: () => MaturityDatasetFactory.createRealistic(),
  maturityLarge: () => MaturityDatasetFactory.createLarge(),

  // Specific scenarios - Inventory
  highValueInventory: () => {
    const rooms = RoomFactory.createMany(3);
    const items = rooms.flatMap(room =>
      ItemFactory.createHighValueItems(room.id!, 8)
    );
    return { rooms, items, images: [], activities: [], users: [] };
  },

  mixedDecisions: () => {
    const rooms = RoomFactory.createMany(4);
    const items = rooms.flatMap(room => [
      ...ItemFactory.createByDecision(room.id!, 'Keep', 5),
      ...ItemFactory.createByDecision(room.id!, 'Sell', 4),
      ...ItemFactory.createByDecision(room.id!, 'Donate', 2),
      ...ItemFactory.createByDecision(room.id!, 'Unsure', 3),
    ]);
    return { rooms, items, images: [], activities: [], users: [] };
  },

  // Specific scenarios - Maturity Map
  completedAssessments: () => {
    const organizations = MaturityOrganizationFactory.createMany(2);
    const assessments = organizations.flatMap(org =>
      MaturityAssessmentFactory.createByStatus(org.id!, 'completed', 3)
    );
    return { organizations, assessments, dimensions: [], questions: [], responses: [], documents: [] };
  },

  highResponseRate: () => {
    return MaturityDatasetFactory.createComplete({
      organizationCount: 3,
      assessmentsPerOrg: 2,
      responseRate: 0.95,
      documentsPerAssessment: 10
    });
  },

  multiIndustryOrgs: () => {
    const organizations = [
      ...MaturityOrganizationFactory.createByIndustry('Technology', 2),
      ...MaturityOrganizationFactory.createByIndustry('Healthcare', 2),
      ...MaturityOrganizationFactory.createByIndustry('Finance', 2)
    ];
    return { organizations, assessments: [], dimensions: [], questions: [], responses: [], documents: [] };
  }
};
