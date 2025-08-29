import React from 'react';
import { format } from 'date-fns';
import clsx from 'clsx';
import {
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import type { Valuation, ValuationType } from '../../types';

interface ValuationCardProps {
  valuation: Valuation;
  showDetails?: boolean;
  compact?: boolean;
  onRequestUpdate?: () => void;
  onViewHistory?: () => void;
  onViewComparisons?: () => void;
}

const getValuationTypeIcon = (type: ValuationType) => {
  switch (type) {
    case 'ai_estimated':
      return '🤖';
    case 'market_analysis':
      return '📊';
    case 'professional_appraisal':
      return '👨‍🔬';
    case 'user_override':
      return '✏️';
    default:
      return '💰';
  }
};

const getValuationTypeLabel = (type: ValuationType) => {
  switch (type) {
    case 'ai_estimated':
      return 'AI Estimated';
    case 'market_analysis':
      return 'Market Analysis';
    case 'professional_appraisal':
      return 'Professional Appraisal';
    case 'user_override':
      return 'Manual Override';
    default:
      return type;
  }
};

const getConfidenceColor = (score: number) => {
  if (score >= 0.8) return 'text-green-600 bg-green-50';
  if (score >= 0.6) return 'text-yellow-600 bg-yellow-50';
  return 'text-red-600 bg-red-50';
};

const getConfidenceIcon = (score: number) => {
  if (score >= 0.8) return CheckCircleIcon;
  if (score >= 0.6) return ClockIcon;
  return ExclamationTriangleIcon;
};

export const ValuationCard: React.FC<ValuationCardProps> = ({
  valuation,
  showDetails = true,
  compact = false,
  onRequestUpdate,
  onViewHistory,
  onViewComparisons,
}) => {
  const isExpired = valuation.expires_at && new Date(valuation.expires_at) < new Date();
  const confidenceColor = getConfidenceColor(valuation.confidence_score);
  const ConfidenceIcon = getConfidenceIcon(valuation.confidence_score);

  if (compact) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-lg">{getValuationTypeIcon(valuation.valuation_type)}</span>
            <div>
              <div className="font-semibold text-lg">
                ${valuation.estimated_value.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500">
                {getValuationTypeLabel(valuation.valuation_type)}
              </div>
            </div>
          </div>
          <div className={clsx('inline-flex items-center px-2 py-1 rounded-full text-xs font-medium', confidenceColor)}>
            <ConfidenceIcon className="h-3 w-3 mr-1" />
            {Math.round(valuation.confidence_score * 100)}%
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={clsx(
      'bg-white rounded-lg border border-gray-200 shadow-sm',
      isExpired && 'border-amber-200 bg-amber-50'
    )}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <span className="text-2xl">{getValuationTypeIcon(valuation.valuation_type)}</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {getValuationTypeLabel(valuation.valuation_type)}
              </h3>
              <p className="text-sm text-gray-500">
                {format(new Date(valuation.effective_date), 'MMM d, yyyy')}
                {isExpired && (
                  <span className="ml-2 text-amber-600 font-medium">(Expired)</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {onRequestUpdate && (
              <button
                onClick={onRequestUpdate}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Update
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Primary Valuation */}
          <div className="md:col-span-1">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">
                ${valuation.estimated_value.toLocaleString()}
              </div>
              {valuation.low_estimate && valuation.high_estimate && (
                <div className="text-sm text-gray-500 mt-1">
                  Range: ${valuation.low_estimate.toLocaleString()} - ${valuation.high_estimate.toLocaleString()}
                </div>
              )}
            </div>
          </div>

          {/* Confidence & Details */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">Confidence:</span>
                <div className={clsx('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', confidenceColor)}>
                  <ConfidenceIcon className="h-3 w-3 mr-1" />
                  {Math.round(valuation.confidence_score * 100)}%
                </div>
              </div>
              {valuation.expires_at && (
                <div className="text-xs text-gray-500">
                  Expires: {format(new Date(valuation.expires_at), 'MMM d, yyyy')}
                </div>
              )}
            </div>

            {valuation.data_sources.length > 0 && (
              <div>
                <span className="text-sm text-gray-500">Data Sources:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {valuation.data_sources.map((source, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      {source.replace('_', ' ').toUpperCase()}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {showDetails && valuation.methodology_notes && (
              <div>
                <span className="text-sm text-gray-500">Notes:</span>
                <p className="text-sm text-gray-700 mt-1">{valuation.methodology_notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      {showDetails && (
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 rounded-b-lg">
          <div className="flex justify-between items-center">
            <div className="flex space-x-2">
              {onViewHistory && (
                <button
                  onClick={onViewHistory}
                  className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-900"
                >
                  <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
                  View History
                </button>
              )}
              {onViewComparisons && (
                <button
                  onClick={onViewComparisons}
                  className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-900"
                >
                  <CurrencyDollarIcon className="h-4 w-4 mr-1" />
                  Comparisons
                </button>
              )}
            </div>
            <div className="text-xs text-gray-500">
              Last updated: {format(new Date(valuation.updated_at), 'MMM d, yyyy HH:mm')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ValuationCard;