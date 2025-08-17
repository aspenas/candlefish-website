import { useEffect, useCallback, useRef } from 'react';
import { useSubscription } from '@apollo/client';
import { useAppStore, useNotificationActions } from '@/store';
import {
  ESTIMATE_UPDATED,
  CALCULATION_PROGRESS
} from '@/graphql/estimates';
import { CUSTOMER_UPDATED } from '@/graphql/customers';
import { PROJECT_PROGRESS } from '@/graphql/projects';
import {
  INTEGRATION_STATUS_UPDATED,
  SYNC_PROGRESS
} from '@/graphql/integrations';
import { formatStatus } from '@/utils/formatting';
import type {
  EstimateUpdatedSubscription,
  CalculationProgressSubscription,
  CustomerUpdatedSubscription,
  ProjectProgressSubscription
} from '@/types/graphql';
import toast from 'react-hot-toast';

interface UseRealtimeSubscriptionsOptions {
  estimateIds?: string[];
  customerIds?: string[];
  projectIds?: string[];
  integrationIds?: string[];
  enableEstimateUpdates?: boolean;
  enableCustomerUpdates?: boolean;
  enableProjectUpdates?: boolean;
  enableIntegrationUpdates?: boolean;
}

export const useRealtimeSubscriptions = (options: UseRealtimeSubscriptionsOptions = {}) => {
  const {
    estimateIds = [],
    customerIds = [],
    projectIds = [],
    integrationIds = [],
    enableEstimateUpdates = true,
    enableCustomerUpdates = true,
    enableProjectUpdates = true,
    enableIntegrationUpdates = true,
  } = options;

  const { addNotification } = useNotificationActions();
  const setConnectionStatus = useAppStore((state) => state.setConnectionStatus);
  const addSubscription = useAppStore((state) => state.addSubscription);
  const removeSubscription = useAppStore((state) => state.removeSubscription);
  const setSubscriptionError = useAppStore((state) => state.setSubscriptionError);
  const updateLastTimestamp = useAppStore((state) => state.updateLastTimestamp);

  const subscriptionRefs = useRef<Set<string>>(new Set());

  // Helper function to handle subscription lifecycle
  const handleSubscriptionLifecycle = useCallback((
    subscriptionId: string,
    isActive: boolean,
    error?: any
  ) => {
    if (isActive) {
      subscriptionRefs.current.add(subscriptionId);
      addSubscription(subscriptionId);
      setConnectionStatus('connected');
    } else {
      subscriptionRefs.current.delete(subscriptionId);
      removeSubscription(subscriptionId);
      if (subscriptionRefs.current.size === 0) {
        setConnectionStatus('disconnected');
      }
    }

    if (error) {
      setSubscriptionError(subscriptionId, error.message);
    } else {
      setSubscriptionError(subscriptionId);
    }
  }, [addSubscription, removeSubscription, setConnectionStatus, setSubscriptionError]);

  // Estimate Updates Subscription
  const estimateSubscriptions = estimateIds.map(estimateId => {
    const subscriptionId = `estimate-${estimateId}`;

    return useSubscription<EstimateUpdatedSubscription>(ESTIMATE_UPDATED, {
      variables: { id: estimateId },
      skip: !enableEstimateUpdates,
      onData: ({ data }) => {
        if (data?.data?.estimateUpdated) {
          const estimate = data.data.estimateUpdated;
          updateLastTimestamp('estimate', Date.now());

          addNotification({
            type: 'info',
            title: 'Estimate Updated',
            message: `Estimate for customer ${estimate.customerId} has been updated to ${formatStatus(estimate.status)}`,
            actions: [
              {
                label: 'View Estimate',
                action: () => {
                  // Navigate to estimate view
                  console.log('Navigate to estimate:', estimate.id);
                },
              },
            ],
          });
        }
      },
      onComplete: () => {
        handleSubscriptionLifecycle(subscriptionId, false);
      },
      onError: (error) => {
        console.error('Estimate subscription error:', error);
        handleSubscriptionLifecycle(subscriptionId, false, error);
        toast.error('Lost connection to estimate updates');
      },
    });
  });

  // Calculation Progress Subscription
  const calculationSubscriptions = estimateIds.map(estimateId => {
    const subscriptionId = `calculation-${estimateId}`;

    return useSubscription<CalculationProgressSubscription>(CALCULATION_PROGRESS, {
      variables: { estimateId },
      skip: !enableEstimateUpdates,
      onData: ({ data }) => {
        if (data?.data?.calculationProgress) {
          const progress = data.data.calculationProgress;
          updateLastTimestamp('calculation', Date.now());

          if (progress.completed) {
            addNotification({
              type: 'success',
              title: 'Calculation Complete',
              message: `Pricing calculation for estimate ${progress.estimateId} has been completed`,
              actions: [
                {
                  label: 'View Results',
                  action: () => {
                    console.log('Navigate to estimate results:', progress.estimateId);
                  },
                },
              ],
            });
          } else {
            // Show progress updates for long-running calculations
            if (progress.progress > 0) {
              toast.success(`${progress.stage}: ${Math.round(progress.progress)}% complete`, {
                id: `calculation-${progress.estimateId}`, // Use same ID to replace previous toast
              });
            }
          }
        }
      },
      onComplete: () => {
        handleSubscriptionLifecycle(subscriptionId, false);
      },
      onError: (error) => {
        console.error('Calculation subscription error:', error);
        handleSubscriptionLifecycle(subscriptionId, false, error);
      },
    });
  });

  // Customer Updates Subscription
  const customerSubscriptions = customerIds.map(customerId => {
    const subscriptionId = `customer-${customerId}`;

    return useSubscription<CustomerUpdatedSubscription>(CUSTOMER_UPDATED, {
      variables: { id: customerId },
      skip: !enableCustomerUpdates,
      onData: ({ data }) => {
        if (data?.data?.customerUpdated) {
          const customer = data.data.customerUpdated;
          updateLastTimestamp('customer', Date.now());

          addNotification({
            type: 'info',
            title: 'Customer Updated',
            message: `${customer.name} information has been updated`,
          });
        }
      },
      onComplete: () => {
        handleSubscriptionLifecycle(subscriptionId, false);
      },
      onError: (error) => {
        console.error('Customer subscription error:', error);
        handleSubscriptionLifecycle(subscriptionId, false, error);
      },
    });
  });

  // Project Progress Subscription
  const projectSubscriptions = projectIds.map(projectId => {
    const subscriptionId = `project-${projectId}`;

    return useSubscription<ProjectProgressSubscription>(PROJECT_PROGRESS, {
      variables: { projectId },
      skip: !enableProjectUpdates,
      onData: ({ data }) => {
        if (data?.data?.projectProgress) {
          const event = data.data.projectProgress;
          updateLastTimestamp('project', Date.now());

          addNotification({
            type: 'info',
            title: 'Project Update',
            message: event.title,
            actions: [
              {
                label: 'View Timeline',
                action: () => {
                  console.log('Navigate to project timeline:', projectId);
                },
              },
            ],
          });
        }
      },
      onComplete: () => {
        handleSubscriptionLifecycle(subscriptionId, false);
      },
      onError: (error) => {
        console.error('Project subscription error:', error);
        handleSubscriptionLifecycle(subscriptionId, false, error);
      },
    });
  });

  // Integration Status Updates
  const integrationSubscriptions = integrationIds.map(integrationId => {
    const subscriptionId = `integration-${integrationId}`;

    return useSubscription(INTEGRATION_STATUS_UPDATED, {
      variables: { id: integrationId },
      skip: !enableIntegrationUpdates,
      onData: ({ data }) => {
        if (data?.data?.integrationStatusUpdated) {
          const integration = data.data.integrationStatusUpdated;
          updateLastTimestamp('integration', Date.now());

          const notificationType = integration.status === 'HEALTHY' ? 'success' :
                                  integration.status === 'WARNING' ? 'warning' : 'error';

          addNotification({
            type: notificationType,
            title: 'Integration Status Changed',
            message: `${integration.name} is now ${integration.status.toLowerCase()}`,
            actions: [
              {
                label: 'View Details',
                action: () => {
                  console.log('Navigate to integration details:', integration.id);
                },
              },
            ],
          });
        }
      },
      onComplete: () => {
        handleSubscriptionLifecycle(subscriptionId, false);
      },
      onError: (error) => {
        console.error('Integration subscription error:', error);
        handleSubscriptionLifecycle(subscriptionId, false, error);
      },
    });
  });

  // Mark subscriptions as active when they start
  useEffect(() => {
    const activeSubscriptions = [
      ...estimateIds.map(id => `estimate-${id}`),
      ...estimateIds.map(id => `calculation-${id}`),
      ...customerIds.map(id => `customer-${id}`),
      ...projectIds.map(id => `project-${id}`),
      ...integrationIds.map(id => `integration-${id}`),
    ];

    activeSubscriptions.forEach(subscriptionId => {
      handleSubscriptionLifecycle(subscriptionId, true);
    });

    // Cleanup on unmount
    return () => {
      activeSubscriptions.forEach(subscriptionId => {
        handleSubscriptionLifecycle(subscriptionId, false);
      });
    };
  }, [estimateIds, customerIds, projectIds, integrationIds, handleSubscriptionLifecycle]);

  // Connection status management
  useEffect(() => {
    const totalSubscriptions = subscriptionRefs.current.size;
    if (totalSubscriptions > 0) {
      setConnectionStatus('connected');
    } else {
      setConnectionStatus('disconnected');
    }
  }, [setConnectionStatus]);

  return {
    isConnected: subscriptionRefs.current.size > 0,
    activeSubscriptions: subscriptionRefs.current.size,
    subscriptionIds: Array.from(subscriptionRefs.current),
  };
};

// Hook for global subscriptions that should always be active
export const useGlobalRealtimeSubscriptions = () => {
  return useRealtimeSubscriptions({
    enableEstimateUpdates: true,
    enableCustomerUpdates: true,
    enableProjectUpdates: true,
    enableIntegrationUpdates: true,
  });
};

// Specialized hooks for specific entities
export const useEstimateSubscriptions = (estimateIds: string[]) => {
  return useRealtimeSubscriptions({
    estimateIds,
    enableEstimateUpdates: true,
    enableCustomerUpdates: false,
    enableProjectUpdates: false,
    enableIntegrationUpdates: false,
  });
};

export const useCustomerSubscriptions = (customerIds: string[]) => {
  return useRealtimeSubscriptions({
    customerIds,
    enableEstimateUpdates: false,
    enableCustomerUpdates: true,
    enableProjectUpdates: false,
    enableIntegrationUpdates: false,
  });
};

export const useProjectSubscriptions = (projectIds: string[]) => {
  return useRealtimeSubscriptions({
    projectIds,
    enableEstimateUpdates: false,
    enableCustomerUpdates: false,
    enableProjectUpdates: true,
    enableIntegrationUpdates: false,
  });
};
