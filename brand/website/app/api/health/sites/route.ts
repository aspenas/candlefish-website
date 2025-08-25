// GET /api/health/sites - Health check for all sites
import { NextRequest, NextResponse } from 'next/server';
import { mockCandlefishSites } from '../../../../__tests__/factories/netlify-factory';

// Force dynamic rendering for this route since it uses searchParams
export const dynamic = 'force-dynamic';

interface SiteHealth {
  siteId: string;
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'maintenance';
  lastCheck: Date;
  responseTime: number;
  uptime: number;
  issues: Array<{
    type: 'performance' | 'availability' | 'security' | 'configuration';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    since?: Date;
  }>;
  metrics: {
    availability: number;
    averageResponseTime: number;
    errorRate: number;
    deploymentStatus: string;
  };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const includeDetails = searchParams.get('details') === 'true';
    const statusFilter = searchParams.get('status');

    // Simulate health checks for all sites
    const siteHealthData: SiteHealth[] = mockCandlefishSites.map(site => {
      // Generate realistic health data
      const baseResponseTime = Math.floor(Math.random() * 200 + 100);
      const availability = Math.random() * 5 + 95; // 95-100% availability
      const errorRate = Math.random() * 0.05; // 0-5% error rate

      // Determine overall status
      let status: SiteHealth['status'] = 'healthy';
      if (site.status === 'building') {
        status = 'maintenance';
      } else if (availability < 98 || errorRate > 0.03) {
        status = 'degraded';
      } else if (availability < 95 || errorRate > 0.05) {
        status = 'unhealthy';
      }

      // Generate issues based on status
      const issues: SiteHealth['issues'] = [];
      if (status === 'degraded') {
        issues.push({
          type: 'performance',
          severity: 'medium',
          message: 'Response time above threshold',
          since: new Date(Date.now() - Math.random() * 60 * 60 * 1000) // Random time in last hour
        });
      }
      if (status === 'unhealthy') {
        issues.push({
          type: 'availability',
          severity: 'high',
          message: 'Intermittent connection failures',
          since: new Date(Date.now() - Math.random() * 2 * 60 * 60 * 1000) // Random time in last 2 hours
        });
      }
      if (site.status === 'building') {
        issues.push({
          type: 'configuration',
          severity: 'low',
          message: 'Deployment in progress',
          since: new Date(Date.now() - Math.random() * 15 * 60 * 1000) // Random time in last 15 minutes
        });
      }

      return {
        siteId: site.id,
        name: site.name,
        status,
        lastCheck: new Date(),
        responseTime: baseResponseTime,
        uptime: availability,
        issues,
        metrics: {
          availability,
          averageResponseTime: baseResponseTime,
          errorRate,
          deploymentStatus: site.status
        }
      };
    });

    // Filter by status if requested
    let filteredData = siteHealthData;
    if (statusFilter) {
      filteredData = siteHealthData.filter(site => site.status === statusFilter);
    }

    // Calculate overall system health
    const overallHealth = {
      totalSites: filteredData.length,
      healthySites: filteredData.filter(s => s.status === 'healthy').length,
      degradedSites: filteredData.filter(s => s.status === 'degraded').length,
      unhealthySites: filteredData.filter(s => s.status === 'unhealthy').length,
      maintenanceSites: filteredData.filter(s => s.status === 'maintenance').length,
      averageResponseTime: Math.round(filteredData.reduce((acc, s) => acc + s.responseTime, 0) / filteredData.length),
      overallUptime: Math.round((filteredData.reduce((acc, s) => acc + s.uptime, 0) / filteredData.length) * 100) / 100,
      criticalIssues: filteredData.reduce((acc, s) => acc + s.issues.filter(i => i.severity === 'critical').length, 0)
    };

    // Response based on detail level
    const responseData = {
      success: true,
      data: {
        overview: overallHealth,
        sites: includeDetails ? filteredData : filteredData.map(site => ({
          siteId: site.siteId,
          name: site.name,
          status: site.status,
          responseTime: site.responseTime,
          uptime: site.uptime,
          issueCount: site.issues.length
        }))
      },
      timestamp: new Date()
    };

    // Return appropriate status code based on overall health
    let httpStatus = 200;
    if (overallHealth.criticalIssues > 0 || overallHealth.unhealthySites > overallHealth.totalSites * 0.2) {
      httpStatus = 503; // Service Unavailable
    } else if (overallHealth.degradedSites > overallHealth.totalSites * 0.1) {
      httpStatus = 207; // Multi-Status (partial degradation)
    }

    return NextResponse.json(responseData, { status: httpStatus });

  } catch (error) {
    console.error('Error checking site health:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to check site health',
        code: 'INTERNAL_ERROR',
        timestamp: new Date()
      },
      { status: 500 }
    );
  }
}
