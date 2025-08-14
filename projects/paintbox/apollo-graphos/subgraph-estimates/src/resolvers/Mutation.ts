import { Resolvers, PricingTier, EstimateStatus } from "../__generated__/resolvers-types";

export const Mutation: Resolvers = {
  Mutation: {
    createEstimate(_parent, { input }, _context) {
      // Mock implementation - replace with actual database call
      const newEstimate = {
        id: `estimate-${Date.now()}`,
        customerId: input.customerId,
        projectId: input.projectId || null,
        goodPrice: 1500.00,
        betterPrice: 2000.00,
        bestPrice: 2500.00,
        selectedTier: PricingTier.Good,
        status: EstimateStatus.Draft,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'user-123',
        totalSquareFootage: 0,
        laborHours: 0,
        materialCost: 0,
        pdfUrl: null as string | null,
        notes: input.notes || null
      };

      return newEstimate;
    },

    updateEstimate(_parent, { id, input }, _context) {
      // Mock implementation
      const updatedEstimate = {
        id,
        customerId: 'customer-123',
        projectId: 'project-456',
        goodPrice: 1500.00,
        betterPrice: 2000.00,
        bestPrice: 2500.00,
        selectedTier: input.selectedTier || PricingTier.Good,
        status: input.status || EstimateStatus.Draft,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'user-123',
        totalSquareFootage: 2500,
        laborHours: 40,
        materialCost: 800,
        pdfUrl: null as string | null,
        notes: input.notes || 'Updated estimate'
      };

      return updatedEstimate;
    },

    deleteEstimate(_parent, { id }, _context) {
      // Mock implementation
      console.log(`Deleting estimate ${id}`);
      return true;
    },

    generatePDF(_parent, { estimateId }, _context) {
      // Mock implementation
      return {
        success: true,
        url: `https://paintbox.candlefish.ai/pdfs/${estimateId}.pdf`,
        error: null
      };
    }
  },
};
