import React, { useState, useCallback, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import clsx from 'clsx';
import {
  CurrencyDollarIcon,
  ChartBarIcon,
  BellIcon,
  DocumentTextIcon,
  ArrowPathIcon,
  PlusIcon,
  EyeIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';

// Components
import ValuationCard from '../components/valuations/ValuationCard';
import PriceHistoryChart from '../components/valuations/PriceHistoryChart';
import MarketComparisonTable from '../components/valuations/MarketComparisonTable';
import ValuationRequestForm from '../components/valuations/ValuationRequestForm';
import PortfolioAnalytics from '../components/valuations/PortfolioAnalytics';
import PriceAlerts from '../components/valuations/PriceAlerts';

// Hooks
import {
  useItemValuationData,
  useCreateValuation,
  useTriggerAIValuation,
  useTriggerMarketAnalysis,
  useCreateAppraisalRequest,
  usePortfolioMetrics,
  useCreatePriceAlert,
  useUpdatePriceAlert,
  useDeletePriceAlert,
  useTogglePriceAlert,
  usePriceAlerts,
} from '../hooks/useValuations';

// WebSocket hooks - commented out until implemented
// import {
//   useValuationUpdateEvents,
//   usePriceAlertEvents,
//   useMarketDataEvents,
//   useAppraisalStatusEvents,
// } from '../services/websocketManager';

// Types
import type { Item, AppraisalRequestData, PriceAlertRequest, MarketComparison } from '../types';

interface ValuationsProps {
  className?: string;
}

export const Valuations: React.FC<ValuationsProps> = ({ className }) => {
  const { itemId } = useParams<{ itemId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // State
  const [selectedTab, setSelectedTab] = useState(searchParams.get('tab') || 'overview');
  const [timeRange, setTimeRange] = useState<'1M' | '3M' | '6M' | '1Y' | 'ALL'>('6M');
  const [showAppraisalForm, setShowAppraisalForm] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  // Hooks
  const itemValuationData = useItemValuationData(itemId || '', timeRange);
  const portfolioMetrics = usePortfolioMetrics();
  const priceAlerts = usePriceAlerts(itemId);
  
  const createValuation = useCreateValuation();
  const triggerAIValuation = useTriggerAIValuation();
  const triggerMarketAnalysis = useTriggerMarketAnalysis();
  const createAppraisalRequest = useCreateAppraisalRequest();
  const createPriceAlert = useCreatePriceAlert();
  const updatePriceAlert = useUpdatePriceAlert();
  const deletePriceAlert = useDeletePriceAlert();
  const togglePriceAlert = useTogglePriceAlert();

  // WebSocket event handlers
  const handleValuationUpdate = useCallback((event: any) => {
    if (!itemId || event.itemId !== itemId) return;
    
    toast.success(`Valuation updated: $${event.estimatedValue.toLocaleString()}`, {
      duration: 5000,
    });
  }, [itemId]);

  const handlePriceAlert = useCallback((event: any) => {
    toast.error(`Price Alert: ${event.message}`, {
      duration: 8000,
    });
  }, []);

  const handleMarketDataUpdate = useCallback((event: any) => {
    if (!itemId || (event.itemId && event.itemId !== itemId)) return;
    
    toast.success(`Market data updated: ${event.marketTrend} trend`, {
      duration: 4000,
    });
  }, [itemId]);

  const handleAppraisalStatusChange = useCallback((event: any) => {
    if (!itemId || event.itemId !== itemId) return;
    
    toast.success(`Appraisal ${event.newStatus}: ${event.itemName}`, {
      duration: 6000,
    });
  }, [itemId]);

  // Register WebSocket event listeners
  // WebSocket events - commented out until implemented
  // useValuationUpdateEvents(handleValuationUpdate);
  // usePriceAlertEvents(handlePriceAlert);
  // useMarketDataEvents(handleMarketDataUpdate);
  // useAppraisalStatusEvents(handleAppraisalStatusChange);

  // Update URL when tab changes
  useEffect(() => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('tab', selectedTab);
    setSearchParams(newSearchParams, { replace: true });
  }, [selectedTab, searchParams, setSearchParams]);

  // Handlers
  const handleTriggerAIValuation = async () => {
    if (!itemId) return;
    
    try {
      await triggerAIValuation.mutateAsync({ itemId, forceRefresh: true });
      toast.success('AI valuation updated successfully');
    } catch (error) {
      toast.error('Failed to update AI valuation');
    }
  };

  const handleTriggerMarketAnalysis = async () => {
    if (!itemId) return;
    
    try {
      await triggerMarketAnalysis.mutateAsync(itemId);
      toast.success('Market analysis completed');
    } catch (error) {
      toast.error('Failed to complete market analysis');
    }
  };

  const handleCreateAppraisalRequest = async (data: AppraisalRequestData) => {
    try {
      await createAppraisalRequest.mutateAsync(data);
      toast.success('Appraisal request submitted successfully');
      setShowAppraisalForm(false);
    } catch (error) {
      toast.error('Failed to submit appraisal request');
    }
  };

  const handleCreatePriceAlert = async (data: PriceAlertRequest) => {
    try {
      await createPriceAlert.mutateAsync(data);
      toast.success('Price alert created successfully');
    } catch (error) {
      toast.error('Failed to create price alert');
    }
  };

  const handleTogglePriceAlert = async (alertId: string, isActive: boolean) => {
    try {
      await togglePriceAlert.mutateAsync({ alertId, isActive });
      toast.success(`Price alert ${isActive ? 'enabled' : 'disabled'}`);
    } catch (error) {
      toast.error('Failed to update price alert');
    }
  };

  const handleDeletePriceAlert = async (alertId: string) => {
    if (!confirm('Are you sure you want to delete this price alert?')) return;
    
    try {
      await deletePriceAlert.mutateAsync(alertId);
      toast.success('Price alert deleted');
    } catch (error) {
      toast.error('Failed to delete price alert');
    }
  };

  const handleViewComparison = (comparison: MarketComparison) => {
    if (comparison.source_url) {
      window.open(comparison.source_url, '_blank');
    } else {
      toast.info('Source URL not available');
    }
  };

  const handleViewComparisonImages = (comparison: MarketComparison) => {
    // Implementation would open an image viewer modal
    toast.info('Image viewer coming soon');
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: CurrencyDollarIcon },
    { id: 'history', label: 'Price History', icon: ChartBarIcon },
    { id: 'alerts', label: 'Price Alerts', icon: BellIcon },
    { id: 'portfolio', label: 'Portfolio Analytics', icon: ChartBarIcon },
  ];

  if (itemId && itemValuationData.isLoading) {
    return (
      <div className={clsx('flex items-center justify-center min-h-96', className)}>
        <div className="text-center">
          <ArrowPathIcon className="mx-auto h-12 w-12 text-gray-400 animate-spin" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Loading valuation data...</h3>
        </div>
      </div>
    );
  }

  return (
    <div className={clsx('space-y-6', className)}>
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {itemId ? 'Item Valuation' : 'Portfolio Valuations'}
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {itemId ? 'Track and manage item pricing with AI-powered insights' : 'Monitor your entire collection\'s value and performance'}
              </p>
            </div>
            
            {itemId && (
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleTriggerAIValuation}
                  disabled={triggerAIValuation.isPending}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  <ArrowPathIcon className={clsx('h-4 w-4 mr-2', triggerAIValuation.isPending && 'animate-spin')} />
                  Update AI Valuation
                </button>
                
                <button
                  onClick={handleTriggerMarketAnalysis}
                  disabled={triggerMarketAnalysis.isPending}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  <ChartBarIcon className="h-4 w-4 mr-2" />
                  Market Analysis
                </button>
                
                <button
                  onClick={() => setShowAppraisalForm(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <DocumentTextIcon className="h-4 w-4 mr-2" />
                  Request Appraisal
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTab(tab.id)}
                  className={clsx(
                    'flex items-center py-2 px-1 border-b-2 font-medium text-sm',
                    selectedTab === tab.id
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  )}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="px-6">
        {selectedTab === 'overview' && (
          <div className="space-y-6">
            {itemId ? (
              <>
                {/* Current Valuations */}
                {itemValuationData.currentValuation && (
                  <ValuationCard
                    valuation={itemValuationData.currentValuation}
                    onRequestUpdate={handleTriggerAIValuation}
                    onViewHistory={() => setSelectedTab('history')}
                    onViewComparisons={() => {
                      // Scroll to comparisons section
                    }}
                  />
                )}

                {/* Additional Valuations */}
                {itemValuationData.valuations.length > 1 && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Other Valuations</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {itemValuationData.valuations.slice(1).map((valuation) => (
                        <ValuationCard
                          key={valuation.id}
                          valuation={valuation}
                          compact
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Market Comparisons */}
                {itemValuationData.marketComparisons.length > 0 && (
                  <MarketComparisonTable
                    comparisons={itemValuationData.marketComparisons}
                    currentValuation={itemValuationData.currentValuation?.estimated_value}
                    onViewDetails={handleViewComparison}
                    onViewImages={handleViewComparisonImages}
                    onOpenSource={handleViewComparison}
                    maxRows={5}
                  />
                )}

                {/* Quick Actions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Price Alerts</h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Get notified of important price changes
                    </p>
                    <button
                      onClick={() => setSelectedTab('alerts')}
                      className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-900"
                    >
                      <BellIcon className="h-4 w-4 mr-1" />
                      Manage Alerts
                    </button>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Price History</h4>
                    <p className="text-sm text-gray-600 mb-4">
                      View historical pricing trends
                    </p>
                    <button
                      onClick={() => setSelectedTab('history')}
                      className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-900"
                    >
                      <ChartBarIcon className="h-4 w-4 mr-1" />
                      View History
                    </button>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Portfolio View</h4>
                    <p className="text-sm text-gray-600 mb-4">
                      See your complete collection analytics
                    </p>
                    <button
                      onClick={() => setSelectedTab('portfolio')}
                      className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-900"
                    >
                      <ChartBarIcon className="h-4 w-4 mr-1" />
                      View Portfolio
                    </button>
                  </div>
                </div>
              </>
            ) : (
              // Portfolio Overview
              portfolioMetrics.data && (
                <PortfolioAnalytics metrics={portfolioMetrics.data} />
              )
            )}
          </div>
        )}

        {selectedTab === 'history' && itemId && (
          <PriceHistoryChart
            priceHistory={itemValuationData.priceHistory}
            currentPrice={itemValuationData.currentValuation?.estimated_value}
            timeRange={timeRange}
            onTimeRangeChange={setTimeRange}
          />
        )}

        {selectedTab === 'alerts' && (
          <PriceAlerts
            alerts={priceAlerts.data || []}
            onCreateAlert={handleCreatePriceAlert}
            onUpdateAlert={(alertId, updates) => updatePriceAlert.mutate({ alertId, data: updates })}
            onDeleteAlert={handleDeletePriceAlert}
            onToggleAlert={handleTogglePriceAlert}
          />
        )}

        {selectedTab === 'portfolio' && portfolioMetrics.data && (
          <PortfolioAnalytics metrics={portfolioMetrics.data} />
        )}
      </div>

      {/* Appraisal Request Modal */}
      {showAppraisalForm && itemId && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center px-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowAppraisalForm(false)} />
            <div className="relative bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
              <ValuationRequestForm
                itemId={itemId}
                itemName={selectedItem?.name}
                onSubmit={handleCreateAppraisalRequest}
                onCancel={() => setShowAppraisalForm(false)}
                isSubmitting={createAppraisalRequest.isPending}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Valuations;