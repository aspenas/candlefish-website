import { AlertTriangle, Shield, X, Eye } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatRelativeTime } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface SecurityAlert {
  id: string;
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  timestamp: string;
  resolved: boolean;
}

interface SecurityAlertsProps {
  alerts: SecurityAlert[];
}

const severityColors = {
  LOW: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  MEDIUM: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  HIGH: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  CRITICAL: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

const severityIcons = {
  LOW: Shield,
  MEDIUM: AlertTriangle,
  HIGH: AlertTriangle,
  CRITICAL: AlertTriangle,
};

export function SecurityAlerts({ alerts }: SecurityAlertsProps) {
  const activeAlerts = alerts.filter(alert => !alert.resolved);
  const recentAlerts = alerts.slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <span>Security Alerts</span>
            </CardTitle>
            <CardDescription>
              Real-time security notifications and warnings
            </CardDescription>
          </div>
          {activeAlerts.length > 0 && (
            <Badge variant="destructive" className="text-xs">
              {activeAlerts.length} active
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {recentAlerts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Shield className="h-8 w-8 mx-auto mb-2 text-green-500 opacity-50" />
            <p>No security alerts</p>
            <p className="text-xs mt-1">System is secure</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentAlerts.map((alert) => {
              const Icon = severityIcons[alert.severity];

              return (
                <div
                  key={alert.id}
                  className={cn(
                    'flex items-start space-x-3 p-3 rounded-lg border',
                    alert.resolved
                      ? 'bg-gray-50 dark:bg-gray-800/50 opacity-60'
                      : 'bg-card'
                  )}
                >
                  <div className={cn('p-2 rounded-full', severityColors[alert.severity])}>
                    <Icon className="h-4 w-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {alert.message}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge
                            className={cn('text-xs', severityColors[alert.severity])}
                            variant="outline"
                          >
                            {alert.severity}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {alert.type}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            •
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatRelativeTime(alert.timestamp)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1">
                        {alert.resolved && (
                          <Badge variant="outline" className="text-xs text-green-600">
                            Resolved
                          </Badge>
                        )}
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <Eye className="h-3 w-3" />
                        </Button>
                        {!alert.resolved && (
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {alerts.length > 5 && (
              <div className="text-center pt-2">
                <Button variant="ghost" size="sm">
                  View all alerts
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
