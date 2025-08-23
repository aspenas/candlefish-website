import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { CollaborationOverview, BundleProposal, UserRole, InterestLevel } from '../types';
import BundleBuilder from './BundleBuilder';
import BuyerInterestBadge from './BuyerInterestBadge';

interface CollaborationDashboardProps {
  userRole: UserRole;
}

const CollaborationDashboard: React.FC<CollaborationDashboardProps> = ({ userRole }) => {
  const [overview, setOverview] = useState<CollaborationOverview | null>(null);
  const [bundles, setBundles] = useState<BundleProposal[]>([]);
  const [interests, setInterests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'interests' | 'bundles'>('overview');
  const [showBundleBuilder, setShowBundleBuilder] = useState(false);
  const [filterLevel, setFilterLevel] = useState<InterestLevel | 'all'>('all');

  useEffect(() => {
    loadCollaborationData();
  }, []);

  const loadCollaborationData = async () => {
    try {
      setLoading(true);

      const [overviewResponse, bundlesResponse] = await Promise.all([
        api.getCollaborationOverview(),
        api.getBundles()
      ]);

      setOverview(overviewResponse);
      setBundles(bundlesResponse.bundles || []);

      // Load buyer interests if buyer role
      if (userRole === 'buyer') {
        const interestsResponse = await api.getBuyerInterests();
        setInterests(interestsResponse.interests || []);
      }
    } catch (error) {
      console.error('Failed to load collaboration data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString();
  };

  const getStatusColor = (status: string) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      proposed: 'bg-blue-100 text-blue-800',
      accepted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      withdrawn: 'bg-yellow-100 text-yellow-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const filteredInterests = interests.filter(interest =>
    filterLevel === 'all' || interest.interest_level === filterLevel
  );

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Collaboration</h1>
          <p className="text-gray-600 mt-1">
            {userRole === 'owner' ? 'Manage buyer interactions and proposals' : 'Express interest and create bundles'}
          </p>
        </div>

        {userRole === 'buyer' && (
          <button
            onClick={() => setShowBundleBuilder(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Bundle
          </button>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'overview', label: 'Overview', count: null },
            { key: 'interests', label: 'Interests', count: overview?.summary.items_with_interest },
            { key: 'bundles', label: 'Bundles', count: overview?.summary.active_bundles }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`
                py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap
                ${activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {tab.label}
              {tab.count !== null && tab.count > 0 && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-800">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && overview && (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center">
                <div className="text-2xl">🏪</div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Items for Sale</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {overview.summary.total_items_for_sale}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center">
                <div className="text-2xl">❤️</div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">With Interest</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {overview.summary.items_with_interest}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center">
                <div className="text-2xl">📝</div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Total Notes</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {overview.summary.total_notes}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center">
                <div className="text-2xl">📦</div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Active Bundles</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {overview.summary.active_bundles}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Interest Level Breakdown */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold mb-4">Interest Level Breakdown</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl mb-2">🔥</div>
                <div className="text-lg font-semibold text-red-700">
                  {overview.summary.high_interest}
                </div>
                <div className="text-sm text-red-600">High Interest</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-2xl mb-2">💫</div>
                <div className="text-lg font-semibold text-yellow-700">
                  {overview.summary.medium_interest}
                </div>
                <div className="text-sm text-yellow-600">Medium Interest</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl mb-2">💭</div>
                <div className="text-lg font-semibold text-blue-700">
                  {overview.summary.low_interest}
                </div>
                <div className="text-sm text-blue-600">Low Interest</div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold">Recent Activity</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {overview.recent_activity.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  No recent activity
                </div>
              ) : (
                overview.recent_activity.map((activity, index) => (
                  <div key={index} className="p-6 flex items-center">
                    <div className="text-2xl mr-4">
                      {activity.type === 'interest' ? '❤️' :
                       activity.type === 'note' ? '💬' : '📦'}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {activity.item_name}
                      </p>
                      <p className="text-sm text-gray-600">
                        {activity.type === 'interest' && activity.level && (
                          <>Interest set to {activity.level}</>
                        )}
                        {activity.type === 'note' && activity.author && (
                          <>Note added by {activity.author}</>
                        )}
                        {activity.type === 'bundle' && (
                          <>Bundle updated</>
                        )}
                      </p>
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatTime(activity.created_at)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Interests Tab */}
      {activeTab === 'interests' && (
        <div className="space-y-6">
          {/* Filter */}
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-700">Filter by level:</span>
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value as InterestLevel | 'all')}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Levels</option>
              <option value="high">High Interest</option>
              <option value="medium">Medium Interest</option>
              <option value="low">Low Interest</option>
            </select>
          </div>

          {/* Interests List */}
          <div className="grid grid-cols-1 gap-4">
            {filteredInterests.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <div className="text-4xl mb-2">❤️</div>
                <div className="text-sm">No interests {filterLevel !== 'all' ? `at ${filterLevel} level` : 'yet'}</div>
              </div>
            ) : (
              filteredInterests.map((interest) => (
                <div key={interest.item_id} className="bg-white p-6 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{interest.item_name}</h3>
                      <p className="text-sm text-gray-600">{interest.room}</p>
                      <div className="flex items-center mt-2 space-x-4">
                        <BuyerInterestBadge
                          itemId={interest.item_id}
                          currentLevel={interest.interest_level}
                          maxPrice={interest.max_price}
                          userRole={userRole}
                          onUpdate={() => loadCollaborationData()}
                        />
                        {interest.asking_price && (
                          <span className="text-sm text-green-600 font-medium">
                            Asking: ${interest.asking_price.toLocaleString()}
                          </span>
                        )}
                        {interest.max_price && (
                          <span className="text-sm text-blue-600">
                            Max: ${interest.max_price.toLocaleString()}
                          </span>
                        )}
                      </div>
                      {interest.notes && (
                        <p className="text-sm text-gray-700 mt-2 italic">"{interest.notes}"</p>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 text-right">
                      Updated {formatDate(interest.updated_at)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Bundles Tab */}
      {activeTab === 'bundles' && (
        <div className="space-y-6">
          {bundles.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-4xl mb-2">📦</div>
              <div className="text-sm">No bundles created yet</div>
              {userRole === 'buyer' && (
                <button
                  onClick={() => setShowBundleBuilder(true)}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create Your First Bundle
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {bundles.map((bundle) => (
                <div key={bundle.id} className="bg-white p-6 rounded-lg border border-gray-200">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{bundle.name}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(bundle.status)}`}>
                          {bundle.status}
                        </span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600 space-x-4">
                        <span>👤 {bundle.proposed_by}</span>
                        <span>📦 {bundle.item_count} items</span>
                        {bundle.total_price && (
                          <span className="font-medium text-green-600">
                            ${bundle.total_price.toLocaleString()}
                          </span>
                        )}
                      </div>
                      {bundle.notes && (
                        <p className="text-sm text-gray-700 mt-2 italic">"{bundle.notes}"</p>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 text-right">
                      Created {formatDate(bundle.created_at)}
                    </div>
                  </div>

                  {/* Bundle Actions */}
                  <div className="flex space-x-2">
                    <button className="text-sm text-blue-600 hover:text-blue-800">
                      View Details
                    </button>
                    {bundle.proposed_by === userRole && bundle.status === 'draft' && (
                      <button className="text-sm text-green-600 hover:text-green-800">
                        Propose
                      </button>
                    )}
                    {userRole === 'owner' && bundle.status === 'proposed' && (
                      <>
                        <button className="text-sm text-green-600 hover:text-green-800">
                          Accept
                        </button>
                        <button className="text-sm text-red-600 hover:text-red-800">
                          Decline
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bundle Builder Modal */}
      {showBundleBuilder && (
        <BundleBuilder
          userRole={userRole}
          onBundleCreated={(bundle) => {
            setBundles([bundle, ...bundles]);
            loadCollaborationData();
          }}
          onClose={() => setShowBundleBuilder(false)}
        />
      )}
    </div>
  );
};

export default CollaborationDashboard;
