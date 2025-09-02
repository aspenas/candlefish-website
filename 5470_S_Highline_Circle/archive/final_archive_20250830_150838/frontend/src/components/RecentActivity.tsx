import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { api } from '../services/api';
import {
  CheckCircleIcon,
  XCircleIcon,
  PencilSquareIcon,
  EyeIcon,
  ArrowRightIcon,
  QuestionMarkCircleIcon,
  TrashIcon,
  DocumentArrowDownIcon,
  DocumentArrowUpIcon,
  CubeIcon,
} from '@heroicons/react/24/outline';

interface ActivityItem {
  id: string;
  action: 'updated' | 'created' | 'viewed' | 'decided' | 'deleted' | 'bulk_updated' | 'exported' | 'imported';
  item_name?: string;
  room_name?: string;
  details?: string;
  old_value?: string;
  new_value?: string;
  created_at: string;
  user?: string;
}


const getActionIcon = (action: string, oldValue?: string, newValue?: string) => {
  switch (action) {
    case 'decided':
      return newValue === 'Keep' ? (
        <CheckCircleIcon className="h-5 w-5 text-green-500" />
      ) : newValue === 'Sell' ? (
        <XCircleIcon className="h-5 w-5 text-yellow-500" />
      ) : (
        <QuestionMarkCircleIcon className="h-5 w-5 text-gray-500" />
      );
    case 'updated':
      return <PencilSquareIcon className="h-5 w-5 text-blue-500" />;
    case 'viewed':
      return <EyeIcon className="h-5 w-5 text-gray-500" />;
    case 'created':
      return <CubeIcon className="h-5 w-5 text-green-500" />;
    case 'deleted':
      return <TrashIcon className="h-5 w-5 text-red-500" />;
    case 'exported':
      return <DocumentArrowDownIcon className="h-5 w-5 text-indigo-500" />;
    case 'imported':
      return <DocumentArrowUpIcon className="h-5 w-5 text-purple-500" />;
    case 'bulk_updated':
      return <CubeIcon className="h-5 w-5 text-orange-500" />;
    default:
      return <div className="h-5 w-5 bg-gray-300 rounded-full" />;
  }
};

const getActionText = (activity: ActivityItem) => {
  const itemName = activity.item_name || 'Unknown Item';

  switch (activity.action) {
    case 'decided':
      const decisionText = activity.new_value === 'Keep' ? 'kept' :
                          activity.new_value === 'Sell' ? 'marked for sale' : 'marked as unsure';
      return `${decisionText} "${itemName}"`;
    case 'updated':
      return `updated "${itemName}"`;
    case 'viewed':
      return `viewed "${itemName}"`;
    case 'created':
      return `added "${itemName}"`;
    case 'deleted':
      return `deleted "${itemName}"`;
    case 'exported':
      return activity.details || `exported items`;
    case 'imported':
      return activity.details || `imported items`;
    case 'bulk_updated':
      return activity.details || `performed bulk update`;
    default:
      return activity.details || `interacted with "${itemName}"`;
  }
};

export default function RecentActivity() {
  const { data, isLoading } = useQuery({
    queryKey: ['recent-activity'],
    queryFn: () => api.getActivities(10),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const activities = data?.activities || [];

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
            {getActionIcon(activity.action, activity.old_value, activity.new_value)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-900 dark:text-gray-100 truncate">
                <span className="font-medium">{activity.user || 'You'}</span>
                {' '}
                {getActionText(activity)}
              </p>
              <time className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2">
                {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
              </time>
            </div>
            {activity.room_name && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                in {activity.room_name}
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
