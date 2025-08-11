import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer } from '@/components/dashboard/chart-container';
import { Activity, Users, Clock, TrendingUp } from 'lucide-react';

interface Contractor {
  id: string;
  name: string;
  company: string;
  status: string;
  accessCount: number;
  createdAt: string;
  lastAccess?: string;
}

interface ContractorStatsProps {
  contractors: Contractor[];
}

export function ContractorStats({ contractors }: ContractorStatsProps) {
  // Calculate basic stats
  const totalContractors = contractors.length;
  const activeContractors = contractors.filter(c => c.status === 'ACTIVE').length;
  const totalAccesses = contractors.reduce((sum, c) => sum + c.accessCount, 0);
  const averageAccess = totalContractors > 0 ? totalAccesses / totalContractors : 0;

  // Generate usage data for charts
  const usageData = contractors
    .filter(c => c.accessCount > 0)
    .sort((a, b) => b.accessCount - a.accessCount)
    .slice(0, 5)
    .map(c => ({
      name: c.name,
      company: c.company,
      value: c.accessCount,
    }));

  // Generate timeline data (mock data for demonstration)
  const timelineData = [
    { period: 'Jan', count: 12, duration: 4.2 },
    { period: 'Feb', count: 19, duration: 3.8 },
    { period: 'Mar', count: 15, duration: 4.5 },
    { period: 'Apr', count: 22, duration: 4.1 },
    { period: 'May', count: 28, duration: 3.9 },
    { period: 'Jun', count: 24, duration: 4.3 },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Usage Chart */}
      <ChartContainer
        title="Top Contractor Usage"
        description="Most active contractors by access count"
        data={usageData}
        type="bar"
        dataKey="value"
        xAxisKey="name"
      />

      {/* Timeline Chart */}
      <ChartContainer
        title="Monthly Activity"
        description="Contractor sessions over time"
        data={timelineData}
        type="line"
        dataKey="count"
        xAxisKey="period"
      />

      {/* Quick Stats */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Usage Statistics</span>
          </CardTitle>
          <CardDescription>
            Overview of contractor activity and engagement
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Users className="h-6 w-6 text-blue-500" />
              </div>
              <p className="text-2xl font-bold">{totalContractors}</p>
              <p className="text-sm text-muted-foreground">Total Contractors</p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Activity className="h-6 w-6 text-green-500" />
              </div>
              <p className="text-2xl font-bold">{activeContractors}</p>
              <p className="text-sm text-muted-foreground">Currently Active</p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <TrendingUp className="h-6 w-6 text-purple-500" />
              </div>
              <p className="text-2xl font-bold">{totalAccesses}</p>
              <p className="text-sm text-muted-foreground">Total Accesses</p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Clock className="h-6 w-6 text-orange-500" />
              </div>
              <p className="text-2xl font-bold">{averageAccess.toFixed(1)}</p>
              <p className="text-sm text-muted-foreground">Avg. Per Contractor</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
