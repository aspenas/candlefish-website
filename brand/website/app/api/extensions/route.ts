// GET /api/extensions - List all available extensions
import { NextRequest, NextResponse } from 'next/server';
import { mockExtensionsByCategory } from '../../../__tests__/factories/netlify-factory';

export async function GET(request: NextRequest) {
  try {
    // In a real implementation, this would fetch from a database or external service
    const allExtensions = Object.values(mockExtensionsByCategory).flat();
    const categories = Object.keys(mockExtensionsByCategory);

    // Optional filtering by category
    const searchParams = request.nextUrl.searchParams;
    const categoryFilter = searchParams.get('category');
    const searchQuery = searchParams.get('search');

    let filteredExtensions = allExtensions;

    if (categoryFilter) {
      filteredExtensions = filteredExtensions.filter(ext => ext.category === categoryFilter);
    }

    if (searchQuery) {
      filteredExtensions = filteredExtensions.filter(ext =>
        ext.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ext.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        extensions: filteredExtensions,
        total: filteredExtensions.length,
        categories
      },
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Error fetching extensions:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch extensions',
        timestamp: new Date()
      },
      { status: 500 }
    );
  }
}
