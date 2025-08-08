/**
 * Recommendations List Component
 *
 * Displays system recommendations with priority indicators and action items
 */

'use client';

import React, { useState } from 'react';
import { SystemRecommendation, AlertSeverity, RecommendationType } from '@/lib/types/dashboard';
import {
  ArrowsPointingOutIcon,
  WrenchScrewdriverIcon,
  Cog6ToothIcon,
  ShieldCheckIcon,
  ClockIcon,
  ChartBarIcon,
  LightBulbIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

interface RecommendationsListProps {
  recommendations: SystemRecommendation[];
  maxItems?: number;
  showAll?: boolean;
}

export function RecommendationsList({
  recommendations,
  maxItems = 10,
  showAll = false
}: RecommendationsListProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [showAllItems, setShowAllItems] = useState(showAll);

  const displayedRecommendations = showAllItems
    ? recommendations
    : recommendations.slice(0, maxItems);

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const getTypeIcon = (type: RecommendationType) => {
    switch (type) {
      case RecommendationType.SCALING:
        return ArrowsPointingOutIcon;
      case RecommendationType.OPTIMIZATION:
        return WrenchScrewdriverIcon;
      case RecommendationType.CONFIGURATION:
        return Cog6ToothIcon;
      case RecommendationType.SECURITY:
        return ShieldCheckIcon;
      case RecommendationType.MAINTENANCE:
        return ClockIcon;
      case RecommendationType.MONITORING:
        return ChartBarIcon;
      default:
        return LightBulbIcon;
    }
  };

  const getTypeColor = (type: RecommendationType) => {
    switch (type) {
      case RecommendationType.SCALING:
        return 'text-blue-600 dark:text-blue-400';
      case RecommendationType.OPTIMIZATION:
        return 'text-green-600 dark:text-green-400';
      case RecommendationType.CONFIGURATION:
        return 'text-purple-600 dark:text-purple-400';
      case RecommendationType.SECURITY:
        return 'text-red-600 dark:text-red-400';
      case RecommendationType.MAINTENANCE:
        return 'text-yellow-600 dark:text-yellow-400';
      case RecommendationType.MONITORING:
        return 'text-orange-600 dark:text-orange-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getPriorityColor = (priority: AlertSeverity) => {
    switch (priority) {
      case AlertSeverity.CRITICAL:
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200';
      case AlertSeverity.HIGH:
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-200';
      case AlertSeverity.MEDIUM:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200';
      case AlertSeverity.LOW:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  if (recommendations.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="text-center py-8">
          <LightBulbIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No Recommendations
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Your system is performing optimally. Check back later for new recommendations.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Recommendations
        </h2>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {recommendations.length} total
          </span>
          {recommendations.length > maxItems && !showAll && (
            <button
              onClick={() => setShowAllItems(!showAllItems)}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              {showAllItems ? 'Show less' : 'Show all'}
            </button>
          )}
        </div>
      </div>

      {/* Recommendations List */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {displayedRecommendations.map((recommendation) => {
          const TypeIcon = getTypeIcon(recommendation.type);
          const isExpanded = expandedItems.has(recommendation.id);

          return (
            <div key={recommendation.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  {/* Type Icon */}
                  <div className={cn(
                    'p-2 rounded-lg flex-shrink-0',
                    recommendation.type === RecommendationType.SCALING && 'bg-blue-100 dark:bg-blue-900/20',
                    recommendation.type === RecommendationType.OPTIMIZATION && 'bg-green-100 dark:bg-green-900/20',
                    recommendation.type === RecommendationType.CONFIGURATION && 'bg-purple-100 dark:bg-purple-900/20',
                    recommendation.type === RecommendationType.SECURITY && 'bg-red-100 dark:bg-red-900/20',
                    recommendation.type === RecommendationType.MAINTENANCE && 'bg-yellow-100 dark:bg-yellow-900/20',
                    recommendation.type === RecommendationType.MONITORING && 'bg-orange-100 dark:bg-orange-900/20'
                  )}>
                    <TypeIcon className={cn('w-5 h-5', getTypeColor(recommendation.type))} />
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {recommendation.title}
                      </h3>
                      <span className={cn(
                        'px-2 py-1 text-xs font-medium rounded-full',
                        getPriorityColor(recommendation.priority)
                      )}>
                        {recommendation.priority.toLowerCase()}
                      </span>
                      {recommendation.automatable && (
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200 rounded-full">
                          Auto-fixable
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {recommendation.description}
                    </p>

                    {recommendation.service && (
                      <div className="text-xs text-gray-500 dark:text-gray-500 mb-2">
                        Service: {recommendation.service.displayName || recommendation.service.name}
                      </div>
                    )}

                    <div className="text-xs text-gray-500 dark:text-gray-500 mb-3">
                      Impact: {recommendation.estimatedImpact}
                    </div>

                    {/* Action Items */}
                    {isExpanded && recommendation.actionItems.length > 0 && (
                      <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                          Action Items:
                        </h4>
                        <ul className="space-y-1">
                          {recommendation.actionItems.map((item, index) => (
                            <li key={index} className="text-sm text-gray-600 dark:text-gray-400 flex items-start">
                              <span className="inline-block w-1 h-1 bg-gray-400 rounded-full mt-2 mr-2 flex-shrink-0" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {/* Expand/Collapse Button */}
                {recommendation.actionItems.length > 0 && (
                  <button
                    onClick={() => toggleExpanded(recommendation.id)}
                    className="ml-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    title={isExpanded ? 'Collapse' : 'Expand'}
                  >
                    {isExpanded ? (
                      <ChevronUpIcon className="w-4 h-4" />
                    ) : (
                      <ChevronDownIcon className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>

              {/* Quick Action Button */}
              {recommendation.automatable && (
                <div className="mt-4 flex justify-end">
                  <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    Auto-fix
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Show More/Less */}
      {recommendations.length > maxItems && !showAll && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 text-center">
          <button
            onClick={() => setShowAllItems(!showAllItems)}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            {showAllItems
              ? `Show less`
              : `Show ${recommendations.length - maxItems} more recommendations`
            }
          </button>
        </div>
      )}
    </div>
  );
}

export default RecommendationsList;
