import { NextResponse } from 'next/server'
import { generateInstrumentSnapshot } from '../../../lib/instruments/snapshot-generator'
import fs from 'fs/promises'
import path from 'path'

export async function GET() {
  try {
    // Generate fresh snapshot
    const snapshot = await generateInstrumentSnapshot()

    // Get list of historical snapshots
    const publicDir = path.join(process.cwd(), 'public', 'status')
    let historicalSnapshots: string[] = []

    try {
      const files = await fs.readdir(publicDir)
      historicalSnapshots = files
        .filter(f => f.startsWith('instruments-') && f.endsWith('.json') && f !== 'instruments-latest.json')
        .sort()
        .reverse()
        .slice(0, 30) // Last 30 days
    } catch (error) {
      console.error('Could not read historical snapshots:', error)
    }

    return NextResponse.json({
      current: snapshot,
      historical: historicalSnapshots.map(f => ({
        filename: f,
        date: f.replace('instruments-', '').replace('.json', ''),
        url: `/status/${f}`
      })),
      meta: {
        generated: new Date().toISOString(),
        version: '1.0.0',
        verificationMethod: 'SHA-256'
      }
    })
  } catch (error) {
    console.error('Status generation failed:', error)
    return NextResponse.json(
      { error: 'Failed to generate status' },
      { status: 500 }
    )
  }
}
