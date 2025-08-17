/**
 * @file Company Cam test data factory
 * @description Provides factory functions for creating Company Cam test data
 */

import { faker } from '@faker-js/faker';

export interface CompanyCamProject {
  id: string;
  name: string;
  address: {
    street_line_1: string;
    street_line_2?: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  status: 'active' | 'completed' | 'archived';
  created_at: string;
  updated_at: string;
  public_share_hash?: string;
  metadata?: Record<string, any>;
}

export interface CompanyCamPhoto {
  id: string;
  project_id: string;
  filename: string;
  url: string;
  thumbnail_url: string;
  tags: string[];
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  timestamp: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  metadata?: Record<string, any>;
}

export interface CompanyCamTag {
  id: string;
  name: string;
  color: string;
  category: 'woodwork' | 'surface' | 'room' | 'issue' | 'progress';
  created_at: string;
}

export interface CompanyCamUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'viewer';
  avatar_url?: string;
  last_active: string;
}

export interface CompanyCamWoodworkData {
  type: 'trim' | 'doors' | 'windows' | 'cabinets' | 'baseboards' | 'crown_molding';
  room: string;
  condition: 'excellent' | 'good' | 'fair' | 'poor';
  prep_needed: 'minimal' | 'standard' | 'extensive';
  paint_type: 'primer' | 'paint' | 'stain' | 'clear_coat';
  linear_feet?: number;
  surface_area?: number;
  notes?: string;
}

/**
 * Creates a Company Cam project
 */
export function createCompanyCamProject(overrides?: Partial<CompanyCamProject>): CompanyCamProject {
  return {
    id: faker.string.uuid(),
    name: `${faker.location.streetAddress()} - Painting Project`,
    address: {
      street_line_1: faker.location.streetAddress(),
      city: faker.location.city(),
      state: faker.location.state({ abbreviated: true }),
      zip: faker.location.zipCode(),
      country: 'US',
    },
    status: faker.helpers.arrayElement(['active', 'completed', 'archived']),
    created_at: faker.date.recent({ days: 30 }).toISOString(),
    updated_at: faker.date.recent({ days: 7 }).toISOString(),
    public_share_hash: faker.string.alphanumeric(16),
    metadata: {
      estimate_id: faker.string.uuid(),
      project_type: faker.helpers.arrayElement(['interior', 'exterior', 'both']),
      square_footage: faker.number.int({ min: 500, max: 5000 }),
    },
    ...overrides,
  };
}

/**
 * Creates a Company Cam photo
 */
export function createCompanyCamPhoto(
  projectId?: string,
  overrides?: Partial<CompanyCamPhoto>
): CompanyCamPhoto {
  const woodworkTags = [
    'trim-before',
    'trim-after',
    'doors-condition',
    'windows-prep',
    'cabinets-priming',
    'baseboards-painting',
    'crown-molding-detail',
  ];

  const generalTags = [
    'before',
    'after',
    'in-progress',
    'surface-prep',
    'primer-application',
    'final-coat',
    'quality-check',
  ];

  return {
    id: faker.string.uuid(),
    project_id: projectId || faker.string.uuid(),
    filename: `IMG_${faker.string.numeric(4)}.jpg`,
    url: faker.image.url({ width: 1920, height: 1080 }),
    thumbnail_url: faker.image.url({ width: 300, height: 200 }),
    tags: faker.helpers.arrayElements([...woodworkTags, ...generalTags], {
      min: 1,
      max: 3,
    }),
    coordinates: faker.datatype.boolean()
      ? {
          latitude: faker.location.latitude(),
          longitude: faker.location.longitude(),
        }
      : undefined,
    timestamp: faker.date.recent({ days: 7 }).toISOString(),
    user: {
      id: faker.string.uuid(),
      name: faker.person.fullName(),
      email: faker.internet.email(),
    },
    metadata: {
      camera_info: {
        make: faker.helpers.arrayElement(['iPhone', 'Samsung', 'Canon', 'Nikon']),
        model: faker.string.alphanumeric(10),
      },
      file_size: faker.number.int({ min: 1000000, max: 10000000 }),
      dimensions: {
        width: 1920,
        height: 1080,
      },
    },
    ...overrides,
  };
}

/**
 * Creates Company Cam tags
 */
export function createCompanyCamTag(overrides?: Partial<CompanyCamTag>): CompanyCamTag {
  const tagsByCategory = {
    woodwork: [
      'trim',
      'doors',
      'windows',
      'cabinets',
      'baseboards',
      'crown-molding',
      'railings',
      'shutters',
    ],
    surface: ['walls', 'ceiling', 'floors', 'drywall', 'plaster', 'wood-siding', 'stucco'],
    room: [
      'kitchen',
      'bathroom',
      'living-room',
      'bedroom',
      'office',
      'hallway',
      'basement',
      'attic',
    ],
    issue: [
      'crack',
      'hole',
      'water-damage',
      'peeling-paint',
      'mold',
      'rust',
      'stain',
      'discoloration',
    ],
    progress: [
      'before',
      'during',
      'after',
      'prep-work',
      'priming',
      'first-coat',
      'second-coat',
      'final-inspection',
    ],
  };

  const category = faker.helpers.arrayElement([
    'woodwork',
    'surface',
    'room',
    'issue',
    'progress',
  ] as const);
  const name = faker.helpers.arrayElement(tagsByCategory[category]);

  return {
    id: faker.string.uuid(),
    name,
    color: faker.internet.color(),
    category,
    created_at: faker.date.recent({ days: 30 }).toISOString(),
    ...overrides,
  };
}

/**
 * Creates Company Cam user
 */
export function createCompanyCamUser(overrides?: Partial<CompanyCamUser>): CompanyCamUser {
  return {
    id: faker.string.uuid(),
    name: faker.person.fullName(),
    email: faker.internet.email(),
    role: faker.helpers.arrayElement(['admin', 'user', 'viewer']),
    avatar_url: faker.image.avatar(),
    last_active: faker.date.recent({ days: 7 }).toISOString(),
    ...overrides,
  };
}

/**
 * Creates woodwork-specific data
 */
export function createWoodworkData(overrides?: Partial<CompanyCamWoodworkData>): CompanyCamWoodworkData {
  const type = faker.helpers.arrayElement([
    'trim',
    'doors',
    'windows',
    'cabinets',
    'baseboards',
    'crown_molding',
  ] as const);

  return {
    type,
    room: faker.helpers.arrayElement([
      'Kitchen',
      'Living Room',
      'Master Bedroom',
      'Guest Bedroom',
      'Bathroom',
      'Office',
      'Dining Room',
      'Hallway',
    ]),
    condition: faker.helpers.arrayElement(['excellent', 'good', 'fair', 'poor']),
    prep_needed: faker.helpers.arrayElement(['minimal', 'standard', 'extensive']),
    paint_type: faker.helpers.arrayElement(['primer', 'paint', 'stain', 'clear_coat']),
    linear_feet: type === 'trim' || type === 'baseboards' ? faker.number.int({ min: 10, max: 100 }) : undefined,
    surface_area: ['doors', 'windows', 'cabinets'].includes(type)
      ? faker.number.int({ min: 20, max: 200 })
      : undefined,
    notes: faker.lorem.sentence(),
    ...overrides,
  };
}

/**
 * Creates a complete project with photos and tags
 */
export function createCompleteCompanyCamProject(): {
  project: CompanyCamProject;
  photos: CompanyCamPhoto[];
  tags: CompanyCamTag[];
  users: CompanyCamUser[];
  woodworkData: CompanyCamWoodworkData[];
} {
  const project = createCompanyCamProject();

  const photos = Array.from({ length: faker.number.int({ min: 10, max: 50 }) }, () =>
    createCompanyCamPhoto(project.id)
  );

  const tags = Array.from({ length: 15 }, () => createCompanyCamTag());

  const users = Array.from({ length: faker.number.int({ min: 3, max: 8 }) }, () =>
    createCompanyCamUser()
  );

  const woodworkData = Array.from({ length: faker.number.int({ min: 5, max: 15 }) }, () =>
    createWoodworkData()
  );

  return {
    project,
    photos,
    tags,
    users,
    woodworkData,
  };
}

/**
 * Creates API response format
 */
export function createCompanyCamAPIResponse<T>(data: T, message?: string) {
  return {
    success: true,
    data,
    message: message || 'Operation completed successfully',
    timestamp: new Date().toISOString(),
  };
}

/**
 * Creates error response for testing
 */
export function createCompanyCamErrorResponse(message: string, code: number = 400) {
  return {
    success: false,
    error: {
      code,
      message,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Creates pagination response
 */
export function createPaginatedResponse<T>(
  items: T[],
  page: number = 1,
  limit: number = 20
) {
  const start = (page - 1) * limit;
  const end = start + limit;
  const paginatedItems = items.slice(start, end);

  return {
    data: paginatedItems,
    pagination: {
      page,
      limit,
      total: items.length,
      totalPages: Math.ceil(items.length / limit),
      hasNext: end < items.length,
      hasPrev: page > 1,
    },
  };
}

/**
 * Creates webhook payload for testing
 */
export function createCompanyCamWebhook(
  event: 'photo_uploaded' | 'project_created' | 'project_updated' | 'tag_added',
  projectId?: string
) {
  const project = createCompanyCamProject({ id: projectId });

  switch (event) {
    case 'photo_uploaded':
      return {
        event,
        timestamp: new Date().toISOString(),
        data: {
          project,
          photo: createCompanyCamPhoto(project.id),
        },
      };

    case 'project_created':
    case 'project_updated':
      return {
        event,
        timestamp: new Date().toISOString(),
        data: { project },
      };

    case 'tag_added':
      return {
        event,
        timestamp: new Date().toISOString(),
        data: {
          project,
          photo: createCompanyCamPhoto(project.id),
          tag: createCompanyCamTag(),
        },
      };

    default:
      throw new Error(`Unknown webhook event: ${event}`);
  }
}

/**
 * Creates test data for photo analysis
 */
export function createPhotoAnalysisData() {
  return {
    woodwork_detected: faker.datatype.boolean(),
    woodwork_types: faker.helpers.arrayElements([
      'trim',
      'doors',
      'windows',
      'cabinets',
      'baseboards',
    ]),
    condition_score: faker.number.float({ min: 0, max: 10, fractionDigits: 1 }),
    prep_recommendation: faker.helpers.arrayElement(['minimal', 'standard', 'extensive']),
    suggested_tags: faker.helpers.arrayElements([
      'needs-sanding',
      'needs-priming',
      'ready-to-paint',
      'water-damage',
      'excellent-condition',
    ]),
    confidence: faker.number.float({ min: 0.5, max: 1.0, fractionDigits: 2 }),
  };
}
