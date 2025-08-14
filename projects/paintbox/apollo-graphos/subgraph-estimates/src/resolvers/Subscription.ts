import { Resolvers, PricingTier, EstimateStatus } from "../__generated__/resolvers-types";

export const Subscription: Resolvers = {
  Subscription: {
    estimateUpdated: {
      resolve: (payload: any) => payload.estimateUpdated,
      subscribe: async function* (_parent, { id }, _context) {
        // Mock subscription - in production, this would connect to a pub/sub system
        let count = 0;
        while (count < 5) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          yield {
            estimateUpdated: {
              id,
              customerId: 'customer-123',
              projectId: 'project-456',
              goodPrice: 1500.00 + (count * 100),
              betterPrice: 2000.00 + (count * 100),
              bestPrice: 2500.00 + (count * 100),
              selectedTier: PricingTier.Good,
              status: EstimateStatus.InProgress,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              createdBy: 'user-123',
              totalSquareFootage: 2500,
              laborHours: 40,
              materialCost: 800 + (count * 50),
              pdfUrl: null,
              notes: `Update ${count + 1}`
            }
          };
          count++;
        }
      }
    },

    calculationProgress: {
      resolve: (payload: any) => payload.calculationProgress,
      subscribe: async function* (_parent, { estimateId }, _context) {
        // Mock calculation progress
        const stages = [
          { stage: 'Calculating materials', progress: 0.2 },
          { stage: 'Calculating labor', progress: 0.4 },
          { stage: 'Applying overhead', progress: 0.6 },
          { stage: 'Calculating profit margin', progress: 0.8 },
          { stage: 'Finalizing estimate', progress: 1.0 }
        ];

        for (const stage of stages) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          yield {
            calculationProgress: {
              estimateId,
              stage: stage.stage,
              progress: stage.progress,
              message: stage.stage,
              completed: stage.progress === 1.0
            }
          };
        }
      }
    }
  }
};
