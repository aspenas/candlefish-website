import { NextRequest, NextResponse } from 'next/server';
import { securityScannerService } from '@/lib/services/security-scanner';

export async function GET(request: NextRequest) {
  try {
    const vulnerabilities = await securityScannerService.getVulnerabilities();

    return NextResponse.json({
      vulnerabilities,
      total: vulnerabilities.length,
      summary: {
        critical: vulnerabilities.filter(v => v.severity === 'critical').length,
        high: vulnerabilities.filter(v => v.severity === 'high').length,
        medium: vulnerabilities.filter(v => v.severity === 'medium').length,
        low: vulnerabilities.filter(v => v.severity === 'low').length
      }
    });
  } catch (error) {
    console.error('Error fetching vulnerabilities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vulnerabilities' },
      { status: 500 }
    );
  }
}
