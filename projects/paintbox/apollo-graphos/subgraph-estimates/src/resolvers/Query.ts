import { Resolvers, PricingTier, EstimateStatus } from "../__generated__/resolvers-types";

export const Query: Resolvers = {
  Query: {
    estimate(_parent, { id }, _context) {
      // Mock implementation - replace with actual database call
      return {
        id,
        customerId: 'customer-123',
        projectId: 'project-456',
        goodPrice: 1500.00,
        betterPrice: 2000.00,
        bestPrice: 2500.00,
        selectedTier: PricingTier.Good,
        status: EstimateStatus.Draft,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'user-123',
        totalSquareFootage: 2500,
        laborHours: 40,
        materialCost: 800,
        pdfUrl: null as string | null,
        notes: 'Sample estimate for testing'
      };
    },

    estimates(_parent, { filter, limit = 10, offset = 0 }, _context) {
      // Mock implementation
      const mockEstimate = {
        id: 'estimate-1',
        customerId: 'customer-123',
        projectId: 'project-456',
        goodPrice: 1500.00,
        betterPrice: 2000.00,
        bestPrice: 2500.00,
        selectedTier: PricingTier.Good,
        status: EstimateStatus.Draft,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'user-123',
        totalSquareFootage: 2500,
        laborHours: 40,
        materialCost: 800,
        pdfUrl: null as string | null,
        notes: 'Sample estimate'
      };

      return {
        edges: [{
          node: mockEstimate,
          cursor: 'cursor-1'
        }],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: 'cursor-1',
          endCursor: 'cursor-1'
        },
        totalCount: 1
      };
    },

    calculatePricing(_parent, { input }, _context) {
      const { squareFootage, laborHours, materialType, complexity } = input;

      // Mock pricing calculation based on input
      const baseRate = materialType === 'LUXURY' ? 5 :
                       materialType === 'PREMIUM' ? 3.5 :
                       materialType === 'STANDARD' ? 2.5 : 1.5;

      const complexityMultiplier = complexity === 'HIGHLY_COMPLEX' ? 1.5 :
                                    complexity === 'COMPLEX' ? 1.3 :
                                    complexity === 'MODERATE' ? 1.15 : 1.0;

      const laborCost = laborHours * 50 * complexityMultiplier;
      const materialCost = squareFootage * baseRate;
      const overheadCost = (laborCost + materialCost) * 0.15;
      const profitMargin = (laborCost + materialCost + overheadCost) * 0.20;
      const subtotal = laborCost + materialCost + overheadCost + profitMargin;
      const tax = subtotal * 0.08;
      const total = subtotal + tax;

      return {
        laborCost,
        materialCost,
        overheadCost,
        profitMargin,
        subtotal,
        tax,
        total
      };
    }
  },
};
