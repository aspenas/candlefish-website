import { NextResponse } from 'next/server';
import workshopData from '../../../workshop/index.json';

// Workshop API endpoint to serve project titles for header morph effect
export async function GET() {
  try {
    // Return workshop projects with rotation-friendly format
    const projects = workshopData.map(project => ({
      id: project.slug,
      title: project.title.toLowerCase(), // Lowercase for design consistency
      status: project.status,
      domain: project.domain,
      complexity: project.complexity,
      impact: project.impact,
      updated_at: project.updated_at
    }));

    return NextResponse.json({
      projects,
      count: projects.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to load workshop data:', error);
    return NextResponse.json(
      { error: 'Failed to load workshop data' },
      { status: 500 }
    );
  }
}