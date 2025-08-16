/**
 * @file Estimate test data factory
 * @description Provides factory functions for creating test estimates with realistic data
 */

import { faker } from '@faker-js/faker';
import Decimal from 'decimal.js';

export interface EstimateData {
  id: string;
  clientInfo: {
    name: string;
    email: string;
    phone: string;
    address: {
      street: string;
      city: string;
      state: string;
      zip: string;
    };
    projectType: 'interior' | 'exterior' | 'both';
  };
  measurements: {
    rooms: RoomData[];
    exterior: ExteriorData;
  };
  pricing: {
    goodTotal: Decimal;
    betterTotal: Decimal;
    bestTotal: Decimal;
    selectedTier: 'good' | 'better' | 'best';
  };
  calculations: {
    formulas: FormulaResult[];
    totalSqFt: number;
    paintGallons: number;
    laborHours: number;
  };
  salesforce?: {
    accountId?: string;
    opportunityId?: string;
    contactId?: string;
  };
  companyCam?: {
    projectId?: string;
    photoCount?: number;
  };
  status: 'draft' | 'in_progress' | 'completed' | 'approved';
  createdAt: Date;
  updatedAt: Date;
}

export interface RoomData {
  id: string;
  name: string;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  surfaces: SurfaceData[];
  doors: number;
  windows: number;
  paintType: 'flat' | 'eggshell' | 'satin' | 'semi-gloss' | 'gloss';
  prep: 'minimal' | 'standard' | 'extensive';
}

export interface SurfaceData {
  id: string;
  type: 'wall' | 'ceiling' | 'trim';
  area: number;
  condition: 'excellent' | 'good' | 'fair' | 'poor';
  coats: 1 | 2 | 3;
}

export interface ExteriorData {
  siding: {
    type: 'vinyl' | 'wood' | 'stucco' | 'brick' | 'fiber_cement';
    condition: 'excellent' | 'good' | 'fair' | 'poor';
    area: number;
  };
  trim: {
    linearFeet: number;
    condition: 'excellent' | 'good' | 'fair' | 'poor';
  };
  gutters: {
    linearFeet: number;
    included: boolean;
  };
  pressure_washing: boolean;
  primer_needed: boolean;
}

export interface FormulaResult {
  formula: string;
  cellReference: string;
  result: number | string;
  dependencies: string[];
}

/**
 * Creates a basic estimate with minimal data
 */
export function createBasicEstimate(overrides?: Partial<EstimateData>): EstimateData {
  const baseData: EstimateData = {
    id: faker.string.uuid(),
    clientInfo: {
      name: faker.person.fullName(),
      email: faker.internet.email(),
      phone: faker.phone.number(),
      address: {
        street: faker.location.streetAddress(),
        city: faker.location.city(),
        state: faker.location.state({ abbreviated: true }),
        zip: faker.location.zipCode(),
      },
      projectType: faker.helpers.arrayElement(['interior', 'exterior', 'both']),
    },
    measurements: {
      rooms: [],
      exterior: createBasicExterior(),
    },
    pricing: {
      goodTotal: new Decimal(faker.number.int({ min: 2000, max: 5000 })),
      betterTotal: new Decimal(faker.number.int({ min: 5000, max: 8000 })),
      bestTotal: new Decimal(faker.number.int({ min: 8000, max: 12000 })),
      selectedTier: 'better',
    },
    calculations: {
      formulas: [],
      totalSqFt: faker.number.int({ min: 500, max: 3000 }),
      paintGallons: faker.number.int({ min: 5, max: 20 }),
      laborHours: faker.number.int({ min: 20, max: 80 }),
    },
    status: 'draft',
    createdAt: faker.date.recent(),
    updatedAt: faker.date.recent(),
  };

  return { ...baseData, ...overrides };
}

/**
 * Creates a complete estimate with all data populated
 */
export function createCompleteEstimate(overrides?: Partial<EstimateData>): EstimateData {
  const rooms = Array.from({ length: faker.number.int({ min: 3, max: 8 }) }, () =>
    createTestRoom()
  );

  const formulas = Array.from({ length: 50 }, () => createFormulaResult());

  const estimate = createBasicEstimate({
    measurements: {
      rooms,
      exterior: createCompleteExterior(),
    },
    calculations: {
      formulas,
      totalSqFt: rooms.reduce((total, room) => total + calculateRoomArea(room), 0),
      paintGallons: Math.ceil(
        rooms.reduce((total, room) => total + calculateRoomArea(room), 0) / 350
      ),
      laborHours: Math.ceil(
        rooms.reduce((total, room) => total + calculateRoomArea(room), 0) / 100
      ),
    },
    salesforce: {
      accountId: faker.string.alphanumeric(18),
      opportunityId: faker.string.alphanumeric(18),
      contactId: faker.string.alphanumeric(18),
    },
    companyCam: {
      projectId: faker.string.uuid(),
      photoCount: faker.number.int({ min: 5, max: 50 }),
    },
    status: faker.helpers.arrayElement(['in_progress', 'completed', 'approved']),
    ...overrides,
  });

  return estimate;
}

/**
 * Creates test room data
 */
export function createTestRoom(overrides?: Partial<RoomData>): RoomData {
  const length = faker.number.int({ min: 8, max: 20 });
  const width = faker.number.int({ min: 8, max: 16 });
  const height = faker.number.int({ min: 8, max: 12 });

  const room: RoomData = {
    id: faker.string.uuid(),
    name: faker.helpers.arrayElement([
      'Living Room',
      'Kitchen',
      'Master Bedroom',
      'Guest Bedroom',
      'Dining Room',
      'Bathroom',
      'Office',
      'Hallway',
    ]),
    dimensions: { length, width, height },
    surfaces: [
      createSurfaceData({ type: 'wall', area: (length + width) * 2 * height }),
      createSurfaceData({ type: 'ceiling', area: length * width }),
      createSurfaceData({ type: 'trim', area: (length + width) * 2 * 0.5 }),
    ],
    doors: faker.number.int({ min: 1, max: 3 }),
    windows: faker.number.int({ min: 0, max: 4 }),
    paintType: faker.helpers.arrayElement(['flat', 'eggshell', 'satin', 'semi-gloss']),
    prep: faker.helpers.arrayElement(['minimal', 'standard', 'extensive']),
  };

  return { ...room, ...overrides };
}

/**
 * Creates surface data
 */
export function createSurfaceData(overrides?: Partial<SurfaceData>): SurfaceData {
  return {
    id: faker.string.uuid(),
    type: 'wall',
    area: faker.number.int({ min: 50, max: 400 }),
    condition: faker.helpers.arrayElement(['excellent', 'good', 'fair', 'poor']),
    coats: faker.helpers.arrayElement([1, 2, 3]),
    ...overrides,
  };
}

/**
 * Creates basic exterior data
 */
export function createBasicExterior(): ExteriorData {
  return {
    siding: {
      type: 'vinyl',
      condition: 'good',
      area: 1200,
    },
    trim: {
      linearFeet: 200,
      condition: 'good',
    },
    gutters: {
      linearFeet: 150,
      included: false,
    },
    pressure_washing: true,
    primer_needed: false,
  };
}

/**
 * Creates complete exterior data
 */
export function createCompleteExterior(): ExteriorData {
  return {
    siding: {
      type: faker.helpers.arrayElement(['vinyl', 'wood', 'stucco', 'brick', 'fiber_cement']),
      condition: faker.helpers.arrayElement(['excellent', 'good', 'fair', 'poor']),
      area: faker.number.int({ min: 800, max: 2500 }),
    },
    trim: {
      linearFeet: faker.number.int({ min: 100, max: 400 }),
      condition: faker.helpers.arrayElement(['excellent', 'good', 'fair', 'poor']),
    },
    gutters: {
      linearFeet: faker.number.int({ min: 80, max: 250 }),
      included: faker.datatype.boolean(),
    },
    pressure_washing: faker.datatype.boolean(),
    primer_needed: faker.datatype.boolean(),
  };
}

/**
 * Creates formula result data
 */
export function createFormulaResult(overrides?: Partial<FormulaResult>): FormulaResult {
  const cellRef = `${faker.helpers.arrayElement(['A', 'B', 'C', 'D', 'E'])}${faker.number.int({
    min: 1,
    max: 100,
  })}`;

  return {
    formula: `=${faker.helpers.arrayElement(['SUM', 'PRODUCT', 'IF', 'VLOOKUP'])}(${faker.helpers.arrayElement(
      ['A1:A10', 'B1:B5', 'C1', 'D1*E1']
    )})`,
    cellReference: cellRef,
    result: faker.number.float({ min: 0, max: 10000, fractionDigits: 2 }),
    dependencies: Array.from({ length: faker.number.int({ min: 1, max: 5 }) }, () =>
      `${faker.helpers.arrayElement(['A', 'B', 'C', 'D', 'E'])}${faker.number.int({
        min: 1,
        max: 100,
      })}`
    ),
    ...overrides,
  };
}

/**
 * Creates estimate data for Excel parity testing
 */
export function createExcelParityEstimate(): EstimateData {
  return createCompleteEstimate({
    clientInfo: {
      name: 'Excel Test Client',
      email: 'test@example.com',
      phone: '555-123-4567',
      address: {
        street: '123 Test Street',
        city: 'Test City',
        state: 'CA',
        zip: '90210',
      },
      projectType: 'both',
    },
    measurements: {
      rooms: [
        createTestRoom({
          name: 'Test Room 1',
          dimensions: { length: 12, width: 10, height: 9 },
          doors: 2,
          windows: 2,
          paintType: 'eggshell',
          prep: 'standard',
        }),
        createTestRoom({
          name: 'Test Room 2',
          dimensions: { length: 15, width: 12, height: 9 },
          doors: 1,
          windows: 3,
          paintType: 'satin',
          prep: 'minimal',
        }),
      ],
      exterior: createCompleteExterior(),
    },
    status: 'completed',
  });
}

/**
 * Creates estimate data for performance testing
 */
export function createPerformanceTestEstimate(): EstimateData {
  // Create large estimate with many rooms and complex calculations
  const rooms = Array.from({ length: 20 }, (_, i) =>
    createTestRoom({
      name: `Performance Test Room ${i + 1}`,
    })
  );

  const formulas = Array.from({ length: 500 }, () => createFormulaResult());

  return createCompleteEstimate({
    measurements: { rooms, exterior: createCompleteExterior() },
    calculations: {
      formulas,
      totalSqFt: 5000,
      paintGallons: 50,
      laborHours: 200,
    },
  });
}

/**
 * Helper function to calculate room area
 */
function calculateRoomArea(room: RoomData): number {
  const { length, width, height } = room.dimensions;
  const wallArea = (length + width) * 2 * height;
  const ceilingArea = length * width;
  return wallArea + ceilingArea;
}

/**
 * Creates multiple estimates for batch testing
 */
export function createEstimateBatch(count: number): EstimateData[] {
  return Array.from({ length: count }, () => createCompleteEstimate());
}

/**
 * Creates estimates with specific status for workflow testing
 */
export function createEstimatesWithStatus(
  status: EstimateData['status'],
  count: number = 5
): EstimateData[] {
  return Array.from({ length: count }, () => createCompleteEstimate({ status }));
}