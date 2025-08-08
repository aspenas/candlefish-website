/**
 * Mock API Service for KIND HOME Painting
 * Provides realistic data while backend is being fixed
 */

export const mockCustomers = [
  {
    Id: 'SF001',
    Name: 'John Anderson',
    FirstName: 'John',
    LastName: 'Anderson',
    Email: 'john.anderson@email.com',
    Phone: '(303) 555-0123',
    MobilePhone: '(720) 555-0145',
    AccountId: 'ACC001',
    Account: { Name: 'Anderson Residence' },
    MailingStreet: '1234 Cherry Creek Drive',
    MailingCity: 'Denver',
    MailingState: 'CO',
    MailingPostalCode: '80246',
    LastModifiedDate: '2024-01-15T10:30:00Z',
    CreatedDate: '2023-06-20T14:00:00Z'
  },
  {
    Id: 'SF002',
    Name: 'Sarah Mitchell',
    FirstName: 'Sarah',
    LastName: 'Mitchell',
    Email: 'smitchell@techcorp.com',
    Phone: '(303) 555-0234',
    MobilePhone: '(720) 555-0256',
    AccountId: 'ACC002',
    Account: { Name: 'TechCorp Denver Office' },
    MailingStreet: '500 16th Street Mall',
    MailingCity: 'Denver',
    MailingState: 'CO',
    MailingPostalCode: '80202',
    LastModifiedDate: '2024-01-10T09:15:00Z',
    CreatedDate: '2023-08-15T11:30:00Z'
  },
  {
    Id: 'SF003',
    Name: 'Robert Chen',
    FirstName: 'Robert',
    LastName: 'Chen',
    Email: 'rchen@mountainviewhomes.com',
    Phone: '(303) 555-0345',
    MobilePhone: '(720) 555-0367',
    AccountId: 'ACC003',
    Account: { Name: 'Mountain View Homes LLC' },
    MailingStreet: '789 Pearl Street',
    MailingCity: 'Boulder',
    MailingState: 'CO',
    MailingPostalCode: '80302',
    LastModifiedDate: '2024-01-20T16:45:00Z',
    CreatedDate: '2023-09-01T10:00:00Z'
  },
  {
    Id: 'SF004',
    Name: 'Emily Rodriguez',
    FirstName: 'Emily',
    LastName: 'Rodriguez',
    Email: 'emily.r@gmail.com',
    Phone: '(720) 555-0456',
    MobilePhone: '(303) 555-0478',
    AccountId: 'ACC004',
    Account: { Name: 'Rodriguez Family Trust' },
    MailingStreet: '567 Washington Park',
    MailingCity: 'Denver',
    MailingState: 'CO',
    MailingPostalCode: '80209',
    LastModifiedDate: '2024-01-18T13:20:00Z',
    CreatedDate: '2023-07-10T15:45:00Z'
  },
  {
    Id: 'SF005',
    Name: 'Michael Thompson',
    FirstName: 'Michael',
    LastName: 'Thompson',
    Email: 'mthompson@realestate.com',
    Phone: '(303) 555-0567',
    MobilePhone: '(720) 555-0589',
    AccountId: 'ACC005',
    Account: { Name: 'Thompson Real Estate Group' },
    MailingStreet: '123 Highlands Ranch Pkwy',
    MailingCity: 'Highlands Ranch',
    MailingState: 'CO',
    MailingPostalCode: '80129',
    LastModifiedDate: '2024-01-22T11:00:00Z',
    CreatedDate: '2023-05-25T09:30:00Z'
  }
];

export const mockAccounts = [
  {
    Id: 'ACC001',
    Name: 'Anderson Residence',
    Type: 'Residential',
    Industry: 'Residential Property',
    Phone: '(303) 555-0123',
    Website: null,
    BillingStreet: '1234 Cherry Creek Drive',
    BillingCity: 'Denver',
    BillingState: 'CO',
    BillingPostalCode: '80246',
    BillingCountry: 'USA',
    Description: 'Single family home, 3500 sq ft, built 2005',
    NumberOfEmployees: null,
    AnnualRevenue: null,
    LastModifiedDate: '2024-01-15T10:30:00Z',
    CreatedDate: '2023-06-20T14:00:00Z'
  },
  {
    Id: 'ACC002',
    Name: 'TechCorp Denver Office',
    Type: 'Commercial',
    Industry: 'Technology',
    Phone: '(303) 555-0234',
    Website: 'www.techcorp.com',
    BillingStreet: '500 16th Street Mall',
    BillingCity: 'Denver',
    BillingState: 'CO',
    BillingPostalCode: '80202',
    BillingCountry: 'USA',
    Description: 'Corporate office building, 25,000 sq ft across 3 floors',
    NumberOfEmployees: 150,
    AnnualRevenue: 50000000,
    LastModifiedDate: '2024-01-10T09:15:00Z',
    CreatedDate: '2023-08-15T11:30:00Z'
  },
  {
    Id: 'ACC003',
    Name: 'Mountain View Homes LLC',
    Type: 'Commercial',
    Industry: 'Real Estate Development',
    Phone: '(303) 555-0345',
    Website: 'www.mountainviewhomes.com',
    BillingStreet: '789 Pearl Street',
    BillingCity: 'Boulder',
    BillingState: 'CO',
    BillingPostalCode: '80302',
    BillingCountry: 'USA',
    Description: 'Residential development company, multiple properties',
    NumberOfEmployees: 25,
    AnnualRevenue: 15000000,
    LastModifiedDate: '2024-01-20T16:45:00Z',
    CreatedDate: '2023-09-01T10:00:00Z'
  }
];

export const mockCompanyCamProjects = [
  {
    id: 'CC001',
    name: 'Anderson Residence - Exterior Paint',
    address: '1234 Cherry Creek Drive, Denver, CO 80246',
    status: 'active',
    created_at: '2024-01-10T08:00:00Z',
    updated_at: '2024-01-20T14:30:00Z',
    photos: [
      {
        id: 'PH001',
        uri: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&h=600&fit=crop',
        created_at: '2024-01-10T08:15:00Z',
        tags: ['exterior', 'before', 'front'],
        annotations: [
          { text: 'Peeling paint on trim', x: 150, y: 200 },
          { text: 'Water damage', x: 300, y: 350 }
        ]
      },
      {
        id: 'PH002',
        uri: 'https://images.unsplash.com/photo-1523217582562-09d0def993a6?w=800&h=600&fit=crop',
        created_at: '2024-01-15T10:30:00Z',
        tags: ['exterior', 'progress', 'front'],
        annotations: [
          { text: 'Primer applied', x: 200, y: 250 }
        ]
      }
    ]
  },
  {
    id: 'CC002',
    name: 'TechCorp Office - Interior Refresh',
    address: '500 16th Street Mall, Denver, CO 80202',
    status: 'active',
    created_at: '2024-01-05T09:00:00Z',
    updated_at: '2024-01-18T16:45:00Z',
    photos: [
      {
        id: 'PH003',
        uri: 'https://images.unsplash.com/photo-1564078516393-cf04bd966897?w=800&h=600&fit=crop',
        created_at: '2024-01-05T09:30:00Z',
        tags: ['interior', 'before', 'conference-room'],
        annotations: [
          { text: 'Scuff marks on walls', x: 100, y: 150 },
          { text: 'Outdated color scheme', x: 250, y: 300 }
        ]
      },
      {
        id: 'PH004',
        uri: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=800&h=600&fit=crop',
        created_at: '2024-01-08T14:00:00Z',
        tags: ['interior', 'color-selection'],
        annotations: [
          { text: 'Client selected Option B', x: 200, y: 200 }
        ]
      }
    ]
  },
  {
    id: 'CC003',
    name: 'Mountain View Homes - Model Home',
    address: '789 Pearl Street, Boulder, CO 80302',
    status: 'completed',
    created_at: '2023-12-15T10:00:00Z',
    updated_at: '2024-01-02T15:30:00Z',
    photos: [
      {
        id: 'PH005',
        uri: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=600&fit=crop',
        created_at: '2024-01-02T15:00:00Z',
        tags: ['exterior', 'after', 'completed'],
        annotations: [
          { text: 'Final coat applied', x: 175, y: 225 }
        ]
      },
      {
        id: 'PH006',
        uri: 'https://images.unsplash.com/photo-1600607687644-aac4c3eac7f4?w=800&h=600&fit=crop',
        created_at: '2024-01-02T15:15:00Z',
        tags: ['interior', 'after', 'completed'],
        annotations: []
      }
    ]
  }
];

export const mockPaintingMeasurements = {
  exterior: {
    surfaces: [
      { name: 'Front Wall', width: 40, height: 12, sqft: 480, condition: 'fair', substrate: 'wood-siding' },
      { name: 'Back Wall', width: 40, height: 12, sqft: 480, condition: 'good', substrate: 'wood-siding' },
      { name: 'Left Side', width: 30, height: 12, sqft: 360, condition: 'poor', substrate: 'wood-siding' },
      { name: 'Right Side', width: 30, height: 12, sqft: 360, condition: 'fair', substrate: 'wood-siding' },
      { name: 'Garage Doors', width: 16, height: 8, sqft: 128, condition: 'good', substrate: 'metal' },
      { name: 'Front Door & Trim', width: 8, height: 8, sqft: 64, condition: 'fair', substrate: 'wood' },
      { name: 'Window Trim (12 windows)', width: 4, height: 5, sqft: 240, condition: 'poor', substrate: 'wood' },
      { name: 'Fascia & Soffits', width: 140, height: 2, sqft: 280, condition: 'fair', substrate: 'wood' }
    ],
    totalSqft: 2392,
    prepWork: {
      powerWashing: true,
      scraping: true,
      priming: true,
      caulking: true,
      minorRepairs: true
    }
  },
  interior: {
    rooms: [
      {
        name: 'Living Room',
        walls: { width: 50, height: 10, sqft: 500 },
        ceiling: { width: 20, height: 25, sqft: 500 },
        trim: { linear_feet: 100 },
        doors: 2,
        windows: 3
      },
      {
        name: 'Kitchen',
        walls: { width: 40, height: 10, sqft: 400 },
        ceiling: { width: 15, height: 20, sqft: 300 },
        trim: { linear_feet: 80 },
        doors: 2,
        windows: 2,
        cabinets: { count: 24, condition: 'paint' }
      },
      {
        name: 'Master Bedroom',
        walls: { width: 45, height: 10, sqft: 450 },
        ceiling: { width: 18, height: 20, sqft: 360 },
        trim: { linear_feet: 90 },
        doors: 3,
        windows: 2
      },
      {
        name: 'Bedroom 2',
        walls: { width: 35, height: 10, sqft: 350 },
        ceiling: { width: 14, height: 16, sqft: 224 },
        trim: { linear_feet: 70 },
        doors: 2,
        windows: 1
      },
      {
        name: 'Bedroom 3',
        walls: { width: 35, height: 10, sqft: 350 },
        ceiling: { width: 14, height: 16, sqft: 224 },
        trim: { linear_feet: 70 },
        doors: 2,
        windows: 1
      },
      {
        name: 'Bathrooms (2)',
        walls: { width: 30, height: 10, sqft: 300 },
        ceiling: { width: 10, height: 12, sqft: 120 },
        trim: { linear_feet: 60 },
        doors: 2,
        windows: 2
      }
    ],
    totalWallSqft: 2350,
    totalCeilingSqft: 1728,
    totalTrimLinearFeet: 470,
    totalDoors: 13,
    totalWindows: 11
  }
};

export const mockPricingCalculation = {
  exterior: {
    labor: {
      prep: { hours: 24, rate: 65, total: 1560 },
      painting: { hours: 40, rate: 65, total: 2600 },
      total: 4160
    },
    materials: {
      primer: { gallons: 8, pricePerGallon: 45, total: 360 },
      paint: { gallons: 12, pricePerGallon: 55, total: 660 },
      supplies: 200,
      total: 1220
    },
    subtotal: 5380
  },
  interior: {
    labor: {
      prep: { hours: 16, rate: 65, total: 1040 },
      painting: { hours: 48, rate: 65, total: 3120 },
      total: 4160
    },
    materials: {
      primer: { gallons: 6, pricePerGallon: 40, total: 240 },
      paint: { gallons: 15, pricePerGallon: 50, total: 750 },
      supplies: 150,
      total: 1140
    },
    subtotal: 5300
  },
  pricingTiers: {
    good: {
      name: 'Good',
      description: 'Quality paint job with standard materials',
      exterior: 5380,
      interior: 5300,
      total: 10680,
      warranty: '2 years'
    },
    better: {
      name: 'Better',
      description: 'Premium paint and extended prep work',
      exterior: 6456,
      interior: 6360,
      total: 12816,
      warranty: '3 years',
      multiplier: 1.2
    },
    best: {
      name: 'Best',
      description: 'Top-tier materials and meticulous attention to detail',
      exterior: 7532,
      interior: 7420,
      total: 14952,
      warranty: '5 years',
      multiplier: 1.4
    }
  },
  summary: {
    projectTotal: 10680,
    taxRate: 0.0875,
    tax: 934.50,
    grandTotal: 11614.50,
    estimatedDuration: '7-10 days',
    crew: '3-4 painters'
  }
};

// Mock API delay to simulate network request
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class MockApiService {
  async searchContacts(query: string): Promise<any[]> {
    await delay(300);
    const lowercaseQuery = query.toLowerCase();
    return mockCustomers.filter(customer =>
      customer.Name.toLowerCase().includes(lowercaseQuery) ||
      customer.Email?.toLowerCase().includes(lowercaseQuery) ||
      customer.Phone?.includes(query) ||
      customer.MailingCity?.toLowerCase().includes(lowercaseQuery)
    );
  }

  async searchAccounts(query: string): Promise<any[]> {
    await delay(300);
    const lowercaseQuery = query.toLowerCase();
    return mockAccounts.filter(account =>
      account.Name.toLowerCase().includes(lowercaseQuery) ||
      account.Phone?.includes(query) ||
      account.BillingCity?.toLowerCase().includes(lowercaseQuery)
    );
  }

  async getCompanyCamProjects(): Promise<any[]> {
    await delay(500);
    return mockCompanyCamProjects;
  }

  async getCompanyCamProject(projectId: string): Promise<any | null> {
    await delay(300);
    return mockCompanyCamProjects.find(p => p.id === projectId) || null;
  }

  async getMeasurements(): Promise<any> {
    await delay(400);
    return mockPaintingMeasurements;
  }

  async calculatePricing(measurements: any): Promise<any> {
    await delay(600);
    return mockPricingCalculation;
  }

  async saveEstimate(estimate: any): Promise<{ success: boolean, id: string }> {
    await delay(500);
    return {
      success: true,
      id: `EST-${Date.now()}`
    };
  }
}

export const mockApi = new MockApiService();
