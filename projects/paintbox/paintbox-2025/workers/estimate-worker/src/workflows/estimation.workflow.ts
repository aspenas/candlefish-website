import { proxyActivities, defineSignal, setHandler } from "@temporalio/workflow";

const { ingestPhotos, extractMeasurements, calculatePricing, generatePdf, syncSalesforce } = proxyActivities<{
  ingestPhotos(input: any): Promise<{ assetsKey: string }>;
  extractMeasurements(key: string): Promise<{ measurements: any }>;
  calculatePricing(measurements: any): Promise<{ total: number; breakdown: any }>;
  generatePdf(input: any): Promise<{ pdfUrl: string }>;
  syncSalesforce(input: any): Promise<{ opportunityId: string }>;
}>({
  startToCloseTimeout: "10 minutes",
  retry: { maximumAttempts: 3 },
});

export const approvalSignal = defineSignal<[boolean]>("approvalSignal");

export async function EstimationWorkflow(input: any) {
  let approved = false;
  setHandler(approvalSignal, (value) => {
    approved = Boolean(value);
  });

  const { assetsKey } = await ingestPhotos(input);
  const { measurements } = await extractMeasurements(assetsKey);
  const pricing = await calculatePricing(measurements);
  const pdf = await generatePdf({ measurements, pricing });

  // wait for approval signal (demo)
  while (!approved) {
    await new Promise((r) => setTimeout(r, 1000));
  }

  const salesforce = await syncSalesforce({ pdf, pricing, input });
  return { pricing, pdf, salesforce };
}
