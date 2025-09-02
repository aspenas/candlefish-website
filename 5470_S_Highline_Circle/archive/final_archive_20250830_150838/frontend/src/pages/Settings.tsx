import React, { useState } from 'react';
import {
  CogIcon,
  DocumentArrowDownIcon,
  CloudArrowUpIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { ThemeToggleSwitch } from '../components/ThemeToggle';
import { useTheme } from '../contexts/ThemeContext';

export default function Settings() {
  const { theme } = useTheme();
  const [settings, setSettings] = useState({
    currency: 'USD',
    itemsPerPage: 50,
    autoSave: true,
    showImages: true,
    notifications: {
      emailDigests: true,
      browserNotifications: false,
      exportComplete: true,
    },
  });

  const [isImporting, setIsImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [showDangerZone, setShowDangerZone] = useState(false);

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleNotificationChange = (key: string, value: boolean) => {
    setSettings(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: value,
      },
    }));
  };

  const handleExportData = () => {
    // This would typically call an API endpoint
    window.open('/api/v1/export/all-data', '_blank');
  };

  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      // This would typically be an API call
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call

      setImportSuccess(true);
      setTimeout(() => setImportSuccess(false), 3000);
    } catch (error) {
      console.error('Import failed:', error);
    } finally {
      setIsImporting(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleResetData = async () => {
    if (!window.confirm('Are you sure you want to reset all data? This action cannot be undone.')) {
      return;
    }

    // This would typically call an API endpoint
    console.log('Resetting all data...');
  };

  const handleDeleteAllItems = async () => {
    const confirmation = window.prompt(
      'This will delete ALL items permanently. Type "DELETE ALL" to confirm:'
    );

    if (confirmation !== 'DELETE ALL') {
      return;
    }

    // This would typically call an API endpoint
    console.log('Deleting all items...');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <div className="flex items-center">
          <CogIcon className="h-8 w-8 text-gray-600 dark:text-gray-300 mr-3" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
            <p className="mt-1 text-gray-600 dark:text-gray-300">
              Configure your inventory management preferences
            </p>
          </div>
        </div>
      </div>

      {/* Display Settings */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Display Settings</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Currency
              </label>
              <select
                value={settings.currency}
                onChange={(e) => handleSettingChange('currency', e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - British Pound</option>
                <option value="CAD">CAD - Canadian Dollar</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Items Per Page
              </label>
              <select
                value={settings.itemsPerPage}
                onChange={(e) => handleSettingChange('itemsPerPage', parseInt(e.target.value))}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value={25}>25 items</option>
                <option value={50}>50 items</option>
                <option value={100}>100 items</option>
                <option value={200}>200 items</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={settings.showImages}
                onChange={(e) => handleSettingChange('showImages', e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label className="ml-2 text-sm text-gray-700">
                Show item images in lists
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                checked={settings.autoSave}
                onChange={(e) => handleSettingChange('autoSave', e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label className="ml-2 text-sm text-gray-700">
                Auto-save changes
              </label>
            </div>

            <ThemeToggleSwitch
              label="Dark mode"
              description="Toggle between light and dark themes"
            />
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Notifications</h2>
        <div className="space-y-3">
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={settings.notifications.emailDigests}
              onChange={(e) => handleNotificationChange('emailDigests', e.target.checked)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label className="ml-2 text-sm text-gray-700">
              Email digest notifications
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              checked={settings.notifications.browserNotifications}
              onChange={(e) => handleNotificationChange('browserNotifications', e.target.checked)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label className="ml-2 text-sm text-gray-700">
              Browser push notifications
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              checked={settings.notifications.exportComplete}
              onChange={(e) => handleNotificationChange('exportComplete', e.target.checked)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label className="ml-2 text-sm text-gray-700">
              Export completion notifications
            </label>
          </div>
        </div>
      </div>

      {/* Data Management */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Data Management</h2>
        <div className="space-y-4">
          {/* Export Data */}
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-md">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Export All Data</h3>
              <p className="text-sm text-gray-600">Download a complete backup of your inventory</p>
            </div>
            <button
              onClick={handleExportData}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
              Export
            </button>
          </div>

          {/* Import Data */}
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-md">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Import Data</h3>
              <p className="text-sm text-gray-600">Import items from Excel or CSV file</p>
            </div>
            <div className="flex items-center space-x-2">
              {importSuccess && (
                <div className="flex items-center text-green-600">
                  <CheckCircleIcon className="h-4 w-4 mr-1" />
                  <span className="text-sm">Import successful!</span>
                </div>
              )}
              <label className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
                <CloudArrowUpIcon className="h-4 w-4 mr-2" />
                {isImporting ? 'Importing...' : 'Import'}
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleImportData}
                  disabled={isImporting}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* System Information */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">System Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center p-3 bg-gray-50 rounded-md">
            <InformationCircleIcon className="h-5 w-5 text-gray-400 mr-3" />
            <div>
              <div className="text-sm font-medium text-gray-900">Version</div>
              <div className="text-sm text-gray-600">1.0.0</div>
            </div>
          </div>

          <div className="flex items-center p-3 bg-gray-50 rounded-md">
            <InformationCircleIcon className="h-5 w-5 text-gray-400 mr-3" />
            <div>
              <div className="text-sm font-medium text-gray-900">Last Backup</div>
              <div className="text-sm text-gray-600">{new Date().toLocaleDateString()}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-red-600">Danger Zone</h2>
          <button
            onClick={() => setShowDangerZone(!showDangerZone)}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            {showDangerZone ? 'Hide' : 'Show'}
          </button>
        </div>

        {showDangerZone && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-red-200 rounded-md bg-red-50">
              <div className="flex items-start">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-3 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-red-900">Reset All Data</h3>
                  <p className="text-sm text-red-700">Clear all items and reset to default settings</p>
                </div>
              </div>
              <button
                onClick={handleResetData}
                className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100"
              >
                Reset
              </button>
            </div>

            <div className="flex items-center justify-between p-4 border border-red-200 rounded-md bg-red-50">
              <div className="flex items-start">
                <TrashIcon className="h-5 w-5 text-red-500 mr-3 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-red-900">Delete All Items</h3>
                  <p className="text-sm text-red-700">Permanently delete all inventory items</p>
                </div>
              </div>
              <button
                onClick={handleDeleteAllItems}
                className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100"
              >
                Delete All
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
          <CheckCircleIcon className="h-5 w-5 mr-2" />
          Save Settings
        </button>
      </div>
    </div>
  );
}
