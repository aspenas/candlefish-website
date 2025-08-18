export async function ingestPhotos(input: any) {
  return { assetsKey: `assets-${Date.now()}` };
}

export async function extractMeasurements(key: string) {
  return { measurements: { areaSqft: 1200 } };
}

export async function calculatePricing(measurements: any) {
  const total = Math.round((measurements.areaSqft || 0) * 1.25);
  return { total, breakdown: { labor: total * 0.7, materials: total * 0.3 } };
}

export async function generatePdf(input: any) {
  return { pdfUrl: "https://example.com/estimate.pdf" };
}

export async function syncSalesforce(input: any) {
  return { opportunityId: `oppty-${Date.now()}` };
}
