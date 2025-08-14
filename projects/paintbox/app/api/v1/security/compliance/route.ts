import { NextRequest, NextResponse } from 'next/server';
import { securityScannerService } from '@/lib/services/security-scanner';

export async function GET(request: NextRequest) {
  try {
    const complianceStatus = await securityScannerService.getComplianceStatus();

    return NextResponse.json({
      compliance: complianceStatus,
      summary: {
        compliant: complianceStatus.filter(s => s.status === 'compliant').length,
        nonCompliant: complianceStatus.filter(s => s.status === 'non-compliant').length,
        partial: complianceStatus.filter(s => s.status === 'partial').length
      }
    });
  } catch (error) {
    console.error('Error fetching compliance status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch compliance status' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { framework = 'SOC2' } = body;

    const status = await securityScannerService.checkCompliance(framework);

    return NextResponse.json(status, { status: 201 });
  } catch (error) {
    console.error('Error checking compliance:', error);
    return NextResponse.json(
      { error: 'Failed to check compliance' },
      { status: 500 }
    );
  }
}
