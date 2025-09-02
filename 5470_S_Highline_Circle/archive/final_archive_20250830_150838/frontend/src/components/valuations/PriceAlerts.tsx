import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { format, parseISO } from 'date-fns';
import clsx from 'clsx';
import {
  BellIcon,
  BellSlashIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  SpeakerWaveIcon,
  EnvelopeIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
} from '@heroicons/react/24/outline';
import type { PriceAlert, PriceAlertRequest, PriceAlertType } from '../../types';

interface PriceAlertsProps {
  alerts: PriceAlert[];
  onCreateAlert: (alert: PriceAlertRequest) => void;
  onUpdateAlert: (alertId: string, updates: Partial<PriceAlert>) => void;
  onDeleteAlert: (alertId: string) => void;
  onToggleAlert: (alertId: string, isActive: boolean) => void;
  className?: string;
}

interface AlertFormData extends PriceAlertRequest {}

const alertTypeOptions = [
  {
    value: 'above_threshold',
    label: 'Price Above Threshold',
    description: 'Notify when valuation exceeds a specific amount',
    icon: ArrowTrendingUpIcon,
    color: 'text-green-600',
  },
  {
    value: 'below_threshold',
    label: 'Price Below Threshold', 
    description: 'Notify when valuation drops below a specific amount',
    icon: ArrowTrendingDownIcon,
    color: 'text-red-600',
  },
  {
    value: 'significant_change',
    label: 'Significant Change',
    description: 'Notify when valuation changes by a percentage',
    icon: ExclamationTriangleIcon,
    color: 'text-orange-600',
  },
  {
    value: 'market_opportunity',
    label: 'Market Opportunity',
    description: 'Notify when market conditions favor selling',
    icon: SpeakerWaveIcon,
    color: 'text-blue-600',
  },
];

const notificationMethodOptions = [
  { value: 'email', label: 'Email', icon: EnvelopeIcon },
  { value: 'sms', label: 'SMS', icon: DevicePhoneMobileIcon },
  { value: 'push', label: 'Push', icon: BellIcon },
  { value: 'in_app', label: 'In-App', icon: ComputerDesktopIcon },
];

const getAlertTypeInfo = (type: PriceAlertType) => {
  return alertTypeOptions.find(option => option.value === type);
};

const getNotificationMethodInfo = (method: string) => {
  return notificationMethodOptions.find(option => option.value === method);
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export const PriceAlerts: React.FC<PriceAlertsProps> = ({
  alerts,
  onCreateAlert,
  onUpdateAlert,
  onDeleteAlert,
  onToggleAlert,
  className,
}) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingAlert, setEditingAlert] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<AlertFormData>();

  const selectedAlertType = watch('alert_type');

  const handleCreateAlert = (data: AlertFormData) => {
    onCreateAlert(data);
    reset();
    setShowCreateForm(false);
  };

  const handleCancelCreate = () => {
    reset();
    setShowCreateForm(false);
  };

  const activeAlerts = alerts.filter(alert => alert.is_active);
  const inactiveAlerts = alerts.filter(alert => !alert.is_active);

  return (
    <div className={clsx('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Price Alerts</h2>
          <p className="text-sm text-gray-600 mt-1">
            Get notified about important price changes and market opportunities
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          New Alert
        </button>
      </div>

      {/* Create Alert Form */}
      {showCreateForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Create Price Alert</h3>
            <button
              onClick={handleCancelCreate}
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircleIcon className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit(handleCreateAlert)} className="space-y-4">
            {/* Alert Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Alert Type *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {alertTypeOptions.map((option) => {
                  const IconComponent = option.icon;
                  return (
                    <label
                      key={option.value}
                      className={clsx(
                        'relative flex items-start p-3 border rounded-lg cursor-pointer hover:border-indigo-300 transition-colors',
                        selectedAlertType === option.value
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200'
                      )}
                    >
                      <input
                        type="radio"
                        {...register('alert_type', { required: 'Alert type is required' })}
                        value={option.value}
                        className="sr-only"
                      />
                      <IconComponent className={clsx('h-5 w-5 mr-3 mt-0.5', option.color)} />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          {option.label}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {option.description}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
              {errors.alert_type && (
                <p className="mt-2 text-sm text-red-600">{errors.alert_type.message}</p>
              )}
            </div>

            {/* Threshold/Percentage */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(selectedAlertType === 'above_threshold' || selectedAlertType === 'below_threshold') && (
                <div>
                  <label htmlFor="threshold_value" className="block text-sm font-medium text-gray-700">
                    Threshold Amount ($) *
                  </label>
                  <input
                    type="number"
                    id="threshold_value"
                    {...register('threshold_value', { 
                      required: 'Threshold value is required',
                      min: { value: 0, message: 'Threshold must be positive' }
                    })}
                    placeholder="Enter amount"
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                  {errors.threshold_value && (
                    <p className="mt-1 text-sm text-red-600">{errors.threshold_value.message}</p>
                  )}
                </div>
              )}

              {selectedAlertType === 'significant_change' && (
                <div>
                  <label htmlFor="percentage_change" className="block text-sm font-medium text-gray-700">
                    Percentage Change (%) *
                  </label>
                  <input
                    type="number"
                    id="percentage_change"
                    {...register('percentage_change', { 
                      required: 'Percentage change is required',
                      min: { value: 1, message: 'Percentage must be at least 1%' },
                      max: { value: 100, message: 'Percentage cannot exceed 100%' }
                    })}
                    placeholder="Enter percentage"
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                  {errors.percentage_change && (
                    <p className="mt-1 text-sm text-red-600">{errors.percentage_change.message}</p>
                  )}
                </div>
              )}

              {/* Notification Method */}
              <div>
                <label htmlFor="notification_method" className="block text-sm font-medium text-gray-700">
                  Notification Method *
                </label>
                <select
                  id="notification_method"
                  {...register('notification_method', { required: 'Notification method is required' })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  <option value="">Select method</option>
                  {notificationMethodOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {errors.notification_method && (
                  <p className="mt-1 text-sm text-red-600">{errors.notification_method.message}</p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={handleCancelCreate}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Create Alert
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Active Alerts */}
      {activeAlerts.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <BellIcon className="h-5 w-5 text-green-600 mr-2" />
              Active Alerts ({activeAlerts.length})
            </h3>
          </div>
          <div className="divide-y divide-gray-200">
            {activeAlerts.map((alert) => {
              const typeInfo = getAlertTypeInfo(alert.alert_type);
              const methodInfo = getNotificationMethodInfo(alert.notification_method);
              const IconComponent = typeInfo?.icon || BellIcon;
              const MethodIcon = methodInfo?.icon || BellIcon;

              return (
                <div key={alert.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <IconComponent className={clsx('h-6 w-6 mt-0.5', typeInfo?.color || 'text-gray-600')} />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-sm font-medium text-gray-900">
                            {typeInfo?.label || alert.alert_type}
                          </h4>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Active
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {alert.threshold_value && (
                            <span>Threshold: {formatCurrency(alert.threshold_value)}</span>
                          )}
                          {alert.percentage_change && (
                            <span>Change: {alert.percentage_change}%</span>
                          )}
                        </div>
                        <div className="flex items-center text-xs text-gray-500 mt-2">
                          <MethodIcon className="h-3 w-3 mr-1" />
                          <span className="mr-4">Via {methodInfo?.label || alert.notification_method}</span>
                          {alert.last_triggered && (
                            <span>Last triggered: {format(parseISO(alert.last_triggered), 'MMM d, yyyy')}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => onToggleAlert(alert.id, false)}
                        className="text-gray-400 hover:text-gray-600"
                        title="Disable alert"
                      >
                        <BellSlashIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => setEditingAlert(alert.id)}
                        className="text-gray-400 hover:text-gray-600"
                        title="Edit alert"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => onDeleteAlert(alert.id)}
                        className="text-red-400 hover:text-red-600"
                        title="Delete alert"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Inactive Alerts */}
      {inactiveAlerts.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <BellSlashIcon className="h-5 w-5 text-gray-400 mr-2" />
              Inactive Alerts ({inactiveAlerts.length})
            </h3>
          </div>
          <div className="divide-y divide-gray-200">
            {inactiveAlerts.map((alert) => {
              const typeInfo = getAlertTypeInfo(alert.alert_type);
              const methodInfo = getNotificationMethodInfo(alert.notification_method);
              const IconComponent = typeInfo?.icon || BellIcon;
              const MethodIcon = methodInfo?.icon || BellIcon;

              return (
                <div key={alert.id} className="p-6 hover:bg-gray-50 opacity-75">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <IconComponent className="h-6 w-6 mt-0.5 text-gray-400" />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-sm font-medium text-gray-600">
                            {typeInfo?.label || alert.alert_type}
                          </h4>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            Inactive
                          </span>
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          {alert.threshold_value && (
                            <span>Threshold: {formatCurrency(alert.threshold_value)}</span>
                          )}
                          {alert.percentage_change && (
                            <span>Change: {alert.percentage_change}%</span>
                          )}
                        </div>
                        <div className="flex items-center text-xs text-gray-400 mt-2">
                          <MethodIcon className="h-3 w-3 mr-1" />
                          <span className="mr-4">Via {methodInfo?.label || alert.notification_method}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => onToggleAlert(alert.id, true)}
                        className="text-gray-400 hover:text-indigo-600"
                        title="Enable alert"
                      >
                        <BellIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => onDeleteAlert(alert.id)}
                        className="text-red-400 hover:text-red-600"
                        title="Delete alert"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {alerts.length === 0 && !showCreateForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <BellIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No price alerts</h3>
          <p className="mt-1 text-sm text-gray-500">
            Set up alerts to stay informed about price changes and market opportunities.
          </p>
          <div className="mt-6">
            <button
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Create Your First Alert
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PriceAlerts;