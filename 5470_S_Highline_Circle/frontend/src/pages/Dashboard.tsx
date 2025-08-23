import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  HomeIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  CheckCircleIcon,
  QuestionMarkCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { api } from '../services/api';
import { formatCurrency } from '../utils/format';
import StatCard from '../components/StatCard';
import RoomValueChart from '../components/RoomValueChart';
import CategoryDistribution from '../components/CategoryDistribution';
import RecentActivity from '../components/RecentActivity';

export default function Dashboard() {
  const { data: summary, isLoading } = useQuery({
    queryKey: ['summary'],
    queryFn: api.getSummary,
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Header Skeleton */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-2/3"></div>
        </div>

        {/* Stats Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-lg"></div>
                <div className="ml-4 flex-1">
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-2"></div>
                  <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-1/3 mb-4"></div>
              <div className="h-64 bg-gray-300 dark:bg-gray-600 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 transform transition-all duration-200 hover:shadow-lg">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">5470 S Highline Circle</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          Master Furnishings Inventory Management System
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Items"
          value={summary?.totalItems || 0}
          icon={<HomeIcon className="h-6 w-6" />}
          color="blue"
        />
        <StatCard
          title="Total Value"
          value={formatCurrency(summary?.totalValue || 0)}
          icon={<CurrencyDollarIcon className="h-6 w-6" />}
          color="green"
        />
        <StatCard
          title="Items to Sell"
          value={summary?.sellCount || 0}
          icon={<CheckCircleIcon className="h-6 w-6" />}
          color="yellow"
        />
        <StatCard
          title="Undecided Items"
          value={summary?.unsureCount || 0}
          icon={<QuestionMarkCircleIcon className="h-6 w-6" />}
          color="gray"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 transform transition-all duration-200 hover:shadow-lg">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Room Values</h2>
          <RoomValueChart data={summary?.roomValues || []} />
        </div>
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 transform transition-all duration-200 hover:shadow-lg">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Category Distribution</h2>
          <CategoryDistribution data={summary?.categoryDistribution || []} />
        </div>
      </div>

      {/* Decision Progress */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 transform transition-all duration-200 hover:shadow-lg">
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Decision Progress</h2>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Keep</span>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {summary?.keepCount || 0} items
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full"
                style={{
                  width: `${((summary?.keepCount || 0) / (summary?.totalItems || 1)) * 100}%`,
                }}
              ></div>
            </div>
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sell</span>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {summary?.sellCount || 0} items
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
              <div
                className="bg-yellow-600 h-2 rounded-full"
                style={{
                  width: `${((summary?.sellCount || 0) / (summary?.totalItems || 1)) * 100}%`,
                }}
              ></div>
            </div>
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Unsure</span>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {summary?.unsureCount || 0} items
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
              <div
                className="bg-gray-600 h-2 rounded-full"
                style={{
                  width: `${((summary?.unsureCount || 0) / (summary?.totalItems || 1)) * 100}%`,
                }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 transform transition-all duration-200 hover:shadow-lg">
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/inventory"
            className="flex items-center justify-center px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors duration-200"
          >
            View All Items
          </Link>
          <Link
            to="/buyer-view"
            className="flex items-center justify-center px-4 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 transition-colors duration-200"
          >
            Generate Buyer View
          </Link>
          <button
            onClick={() => window.open('/api/v1/export/excel', '_blank')}
            className="flex items-center justify-center px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors duration-200"
          >
            Export to Excel
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 transform transition-all duration-200 hover:shadow-lg">
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Recent Activity</h2>
        <RecentActivity />
      </div>
    </div>
  );
}
