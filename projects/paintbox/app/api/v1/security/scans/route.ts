import { NextRequest, NextResponse } from 'next/server';
import { securityScannerService } from '@/lib/services/security-scanner';

export async function GET(request: NextRequest) {
  try {
    const scans = await securityScannerService.getAllScans();

    return NextResponse.json({
      scans,
      total: scans.length
    });
  } catch (error) {
    console.error('Error fetching security scans:', error);
    return NextResponse.json(
      { error: 'Failed to fetch security scans' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name = 'Security Scan' } = body;

    const scan = await securityScannerService.startScan(name);

    return NextResponse.json(scan, { status: 201 });
  } catch (error) {
    console.error('Error starting security scan:', error);
    return NextResponse.json(
      { error: 'Failed to start security scan' },
      { status: 500 }
    );
  }
}
