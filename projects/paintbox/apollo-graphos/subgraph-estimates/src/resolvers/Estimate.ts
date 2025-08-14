import { Resolvers, PricingTier, EstimateStatus } from "../__generated__/resolvers-types";

export const Estimate: Resolvers = {
  Estimate: {
    __resolveReference(estimate) {
      // This would typically fetch from a database
      // For now, returning mock data based on the ID
      return {
        id: estimate.id,
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
        pdfUrl: null,
        notes: 'Referenced estimate'
      };
    }
  }
};
