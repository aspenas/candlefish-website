import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import {
  CheckCircleIcon,
  XCircleIcon,
  PencilSquareIcon,
  EyeIcon,
  ArrowRightIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline';

interface ActivityItem {
  id: string;
  action: 'updated' | 'created' | 'viewed' | 'decided';
  item: string;
  room?: string;
  decision?: 'keep' | 'sell' | 'unsure';
  timestamp: string;
  user?: string;
}

// Mock data for recent activity since we don't have this endpoint yet
const mockActivity: ActivityItem[] = [
  {
    id: '1',
    action: 'decided',
    item: 'West Elm Sectional Sofa',
    room: 'Living Room',
    decision: 'keep',
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 mins ago
    user: 'You'
  },
  {
    id: '2',
    action: 'updated',
    item: 'Moroccan Area Rug',
    room: 'Dining Room',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    user: 'You'
  },
  {
    id: '3',
    action: 'decided',
    item: 'Vintage Coffee Table',
    room: 'Living Room',
    decision: 'sell',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), // 4 hours ago
    user: 'You'
  },
  {
    id: '4',
    action: 'viewed',
    item: 'Plant Collection',
    room: 'Whole Property (Plants)',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    user: 'You'
  },
  {
    id: '5',
    action: 'created',
    item: 'Dining Chair Set',
    room: 'Dining Room',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), // 2 days ago
    user: 'System Import'
  }
];

const getActionIcon = (action: string, decision?: string) => {
  switch (action) {
    case 'decided':
      return decision === 'keep' ? (
        <CheckCircleIcon className="h-5 w-5 text-green-500" />
      ) : decision === 'sell' ? (
        <XCircleIcon className="h-5 w-5 text-yellow-500" />
      ) : (
        <QuestionMarkCircleIcon className="h-5 w-5 text-gray-500" />
      );
    case 'updated':
      return <PencilSquareIcon className="h-5 w-5 text-blue-500" />;
    case 'viewed':
      return <EyeIcon className="h-5 w-5 text-gray-500" />;
    case 'created':
      return <div className="h-5 w-5 bg-green-500 rounded-full" />;
    default:
      return <div className="h-5 w-5 bg-gray-300 rounded-full" />;
  }
};

const getActionText = (activity: ActivityItem) => {
  switch (activity.action) {
    case 'decided':
      const decisionText = activity.decision === 'keep' ? 'kept' :
                          activity.decision === 'sell' ? 'marked for sale' : 'marked as unsure';
      return `${decisionText} "${activity.item}"`;
    case 'updated':
      return `updated "${activity.item}"`;
    case 'viewed':
      return `viewed "${activity.item}"`;
    case 'created':
      return `added "${activity.item}"`;
    default:
      return `interacted with "${activity.item}"`;
  }
};

export default function RecentActivity() {
  // In a real app, this would fetch from an API endpoint
  // const { data: activities, isLoading } = useQuery({
  //   queryKey: ['recent-activity'],
  //   queryFn: () => api.getRecentActivity(),
  // });

  const activities = mockActivity; // Using mock data for now
  const isLoading = false;

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse flex items-center space-x-3">
            <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
          <ArrowRightIcon className="h-6 w-6 text-gray-400 dark:text-gray-500" />
        </div>
        <p className="text-gray-500 dark:text-gray-400">No recent activity</p>
        <p className="text-sm text-gray-400 dark:text-gray-500">Activity will appear here as you work with items</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <div key={activity.id} className="flex items-start space-x-3 group hover:bg-gray-50 dark:hover:bg-gray-700 -mx-2 px-2 py-2 rounded-md transition-colors">
          <div className="flex-shrink-0 mt-1">
            {getActionIcon(activity.action, activity.decision)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-900 dark:text-gray-100 truncate">
                <span className="font-medium">{activity.user || 'You'}</span>
                {' '}
                {getActionText(activity)}
              </p>
              <time className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2">
                {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
              </time>
            </div>
            {activity.room && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                in {activity.room}
              </p>
            )}
          </div>
        </div>
      ))}

      <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
        <button className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium">
          View all activity →
        </button>
      </div>
    </div>
  );
}
