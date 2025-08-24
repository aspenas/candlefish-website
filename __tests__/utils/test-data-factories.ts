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

// Export commonly used test data sets
export const TestDataSets = {
  small: () => InventoryDatasetFactory.createMinimal(),
  medium: () => InventoryDatasetFactory.createRealistic(),
  large: () => InventoryDatasetFactory.createLarge(),

  // Specific scenarios
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
  }
};
