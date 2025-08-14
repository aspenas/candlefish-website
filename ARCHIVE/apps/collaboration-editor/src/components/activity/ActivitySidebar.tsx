'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  MessageCircle,
  Edit3,
  Users,
  Share2,
  GitBranch,
  X,
  Clock
} from 'lucide-react';
import { useCollaborationStore } from '@/stores/collaboration-store';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

const ActivityIcons = {
  edit: Edit3,
  comment: MessageCircle,
  presence: Users,
  version: GitBranch,
  share: Share2,
};

export function ActivitySidebar({ className }: { className?: string }) {
  const {
    activities,
    unreadActivities,
    markActivitiesRead,
    showActivity,
    toggleActivity
  } = useCollaborationStore();

  // Mark activities as read when sidebar is opened
  useEffect(() => {
    if (showActivity && unreadActivities > 0) {
      const timer = setTimeout(() => {
        markActivitiesRead();
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [showActivity, unreadActivities, markActivitiesRead]);

  if (!showActivity) return null;

  const groupedActivities = activities.reduce((groups, activity) => {
    const date = activity.timestamp.toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(activity);
    return groups;
  }, {} as Record<string, typeof activities>);

  const sortedDates = Object.keys(groupedActivities).sort((a, b) =>
    new Date(b).getTime() - new Date(a).getTime()
  );

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      className={cn(
        "w-80 bg-card border-l h-full flex flex-col",
        className
      )}
    >
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center">
            <Activity className="w-5 h-5 mr-2" />
            Activity Feed
          </h3>
          <div className="flex items-center space-x-2">
            {unreadActivities > 0 && (
              <Badge variant="destructive" className="text-xs">
                {unreadActivities} new
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleActivity}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {activities.length} activities
        </p>
      </div>

      {/* Activity List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {sortedDates.map((date) => (
          <div key={date} className="pb-4">
            {/* Date Header */}
            <div className="sticky top-0 bg-card/95 backdrop-blur-sm p-3 border-b">
              <p className="text-sm font-medium text-muted-foreground">
                {new Date(date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>

            {/* Activities for this date */}
            <div className="space-y-1">
              {groupedActivities[date]
                .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
                .map((activity, index) => {
                  const Icon = ActivityIcons[activity.type] || Activity;

                  return (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="activity-item"
                    >
                      <div className="flex-shrink-0">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={activity.actor.avatar} alt={activity.actor.name} />
                          <AvatarFallback className="text-xs">
                            {activity.actor.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <Icon className={cn(
                            "w-3 h-3",
                            activity.type === 'edit' && "text-blue-500",
                            activity.type === 'comment' && "text-yellow-500",
                            activity.type === 'presence' && "text-green-500",
                            activity.type === 'version' && "text-purple-500",
                            activity.type === 'share' && "text-orange-500"
                          )} />
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs h-5",
                              activity.impact.severity === 'high' && "border-red-500 text-red-700",
                              activity.impact.severity === 'medium' && "border-yellow-500 text-yellow-700",
                              activity.impact.severity === 'low' && "border-blue-500 text-blue-700",
                              activity.impact.severity === 'info' && "border-gray-500 text-gray-700"
                            )}
                          >
                            {activity.type}
                          </Badge>
                        </div>

                        <p className="text-sm text-foreground mb-1">
                          <span className="font-medium">{activity.actor.name}</span>
                          {' '}
                          <span>{activity.description}</span>
                        </p>

                        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>
                            {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                          </span>
                          <span>•</span>
                          <span className="capitalize">{activity.impact.scope}</span>
                          {activity.target && (
                            <>
                              <span>•</span>
                              <span>{activity.target.name}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
            </div>
          </div>
        ))}

        {/* Empty State */}
        {activities.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <Activity className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No activity yet</h3>
            <p className="text-sm text-muted-foreground">
              Document activity will appear here as you and others make changes.
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Activity is updated in real-time</span>
          {unreadActivities > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markActivitiesRead}
              className="h-6 px-2 text-xs"
            >
              Mark all read
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
