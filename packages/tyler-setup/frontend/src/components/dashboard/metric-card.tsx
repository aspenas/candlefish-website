import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  subtitle?: string;
  icon: LucideIcon;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red';
  loading?: boolean;
}

const colorClasses = {
  blue: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20',
  green: 'text-green-500 bg-green-50 dark:bg-green-900/20',
  purple: 'text-purple-500 bg-purple-50 dark:bg-purple-900/20',
  orange: 'text-orange-500 bg-orange-50 dark:bg-orange-900/20',
  red: 'text-red-500 bg-red-50 dark:bg-red-900/20',
};

export function MetricCard({
  title,
  value,
  change,
  subtitle,
  icon: Icon,
  color = 'blue',
  loading = false,
}: MetricCardProps) {
  const isPositiveChange = change !== undefined && change > 0;
  const isNegativeChange = change !== undefined && change < 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={cn('p-2 rounded-md', colorClasses[color])}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {loading ? (
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer" />
          ) : (
            <div className="text-2xl font-bold">{value}</div>
          )}

          <div className="flex items-center justify-between">
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}

            {change !== undefined && (
              <div
                className={cn(
                  'flex items-center text-xs font-medium',
                  isPositiveChange && 'text-green-600 dark:text-green-400',
                  isNegativeChange && 'text-red-600 dark:text-red-400',
                  change === 0 && 'text-muted-foreground'
                )}
              >
                {change !== 0 && (
                  <>
                    {isPositiveChange ? (
                      <TrendingUp className="h-3 w-3 mr-1" />
                    ) : (
                      <TrendingDown className="h-3 w-3 mr-1" />
                    )}
                    {Math.abs(change).toFixed(1)}%
                  </>
                )}
                {change === 0 && 'No change'}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
