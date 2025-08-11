import { useState, useCallback } from 'react';
import { useMutation, useQuery, useSubscription, gql } from '@apollo/client';
import {
  GET_CONTRACTORS_QUERY,
  GET_CONTRACTOR_QUERY,
  INVITE_CONTRACTOR_MUTATION,
  REVOKE_CONTRACTOR_ACCESS_MUTATION,
  BULK_REVOKE_CONTRACTORS_MUTATION,
  CONTRACTOR_STATUS_CHANGED_SUBSCRIPTION,
  CONTRACTOR_ACCESSED_SUBSCRIPTION,
} from '@/lib/graphql/contractors';
import { toast } from '@/hooks/use-toast';
import { createOptimisticResponse } from '@/lib/apollo';

interface ContractorFilters {
  status?: 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'REVOKED';
  search?: string;
}

interface InviteContractorInput {
  email: string;
  name: string;
  company: string;
  accessDuration?: number;
  permissions: string[];
  allowedSecrets: string[];
  reason: string;
  notifyEmail?: boolean;
}

export const useContractors = (filters: ContractorFilters = {}) => {
  const [pagination, setPagination] = useState({
    limit: 20,
    offset: 0,
  });

  // Query contractors
  const {
    data: contractorsData,
    loading: contractorsLoading,
    error: contractorsError,
    refetch: refetchContractors,
    fetchMore,
  } = useQuery(GET_CONTRACTORS_QUERY, {
    variables: {
      pagination,
      sort: { field: 'createdAt', direction: 'DESC' },
      status: filters.status,
    },
    errorPolicy: 'all',
    notifyOnNetworkStatusChange: true,
  });

  // Subscribe to contractor status changes
  useSubscription(CONTRACTOR_STATUS_CHANGED_SUBSCRIPTION, {
    onData: ({ data, client }) => {
      if (data.data?.contractorStatusChanged) {
        const contractor = data.data.contractorStatusChanged;

        toast({
          title: 'Contractor Status Changed',
          description: `${contractor.name} is now ${contractor.status.toLowerCase()}`,
        });

        // Update cache
        client.writeFragment({
          id: `Contractor:${contractor.id}`,
          fragment: gql`
            fragment ContractorUpdate on Contractor {
              id
              status
              isActive
              isExpired
            }
          `,
          data: {
            id: contractor.id,
            status: contractor.status,
            isActive: contractor.isActive,
            isExpired: contractor.isExpired,
          },
        });
      }
    },
  });

  // Subscribe to contractor access events
  useSubscription(CONTRACTOR_ACCESSED_SUBSCRIPTION, {
    onData: ({ data }) => {
      if (data.data?.contractorAccessed) {
        const contractor = data.data.contractorAccessed;

        toast({
          title: 'Contractor Access',
          description: `${contractor.name} from ${contractor.company} accessed the system`,
          duration: 3000,
        });
      }
    },
  });

  // Invite contractor mutation
  const [inviteContractorMutation, { loading: inviting }] = useMutation(INVITE_CONTRACTOR_MUTATION, {
    errorPolicy: 'all',
    onCompleted: (data) => {
      toast({
        title: 'Contractor Invited',
        description: `${data.inviteContractor.name} has been successfully invited`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to Invite Contractor',
        description: error.message,
        variant: 'destructive',
      });
    },
    update: (cache, { data }) => {
      if (data?.inviteContractor) {
        // Add new contractor to the list
        const existingData = cache.readQuery({
          query: GET_CONTRACTORS_QUERY,
          variables: {
            pagination,
            sort: { field: 'createdAt', direction: 'DESC' },
            status: filters.status,
          },
        });

        if (existingData) {
          cache.writeQuery({
            query: GET_CONTRACTORS_QUERY,
            variables: {
              pagination,
              sort: { field: 'createdAt', direction: 'DESC' },
              status: filters.status,
            },
            data: {
              contractors: {
                ...existingData.contractors,
                contractors: [data.inviteContractor, ...existingData.contractors.contractors],
                pagination: {
                  ...existingData.contractors.pagination,
                  totalCount: existingData.contractors.pagination.totalCount + 1,
                },
              },
            },
          });
        }
      }
    },
  });

  // Revoke access mutation
  const [revokeAccessMutation, { loading: revoking }] = useMutation(REVOKE_CONTRACTOR_ACCESS_MUTATION, {
    errorPolicy: 'all',
    onCompleted: () => {
      toast({
        title: 'Access Revoked',
        description: 'Contractor access has been successfully revoked',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to Revoke Access',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Bulk revoke mutation
  const [bulkRevokeMutation, { loading: bulkRevoking }] = useMutation(BULK_REVOKE_CONTRACTORS_MUTATION, {
    errorPolicy: 'all',
    onCompleted: (data) => {
      toast({
        title: 'Bulk Revoke Complete',
        description: 'Selected contractor access has been revoked',
      });
    },
    onError: (error) => {
      toast({
        title: 'Bulk Revoke Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
    refetchQueries: [
      {
        query: GET_CONTRACTORS_QUERY,
        variables: {
          pagination,
          sort: { field: 'createdAt', direction: 'DESC' },
          status: filters.status,
        },
      },
    ],
  });

  // Actions
  const inviteContractor = useCallback(async (input: InviteContractorInput) => {
    try {
      await inviteContractorMutation({
        variables: { input },
        optimisticResponse: {
          inviteContractor: createOptimisticResponse('Contractor', {
            id: `temp-${Date.now()}`,
            email: input.email,
            name: input.name,
            company: input.company,
            status: 'PENDING',
            permissions: input.permissions,
            allowedSecrets: input.allowedSecrets,
            reason: input.reason,
            accessDuration: input.accessDuration || 7,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + (input.accessDuration || 7) * 24 * 60 * 60 * 1000).toISOString(),
            accessCount: 0,
            isExpired: false,
            isActive: false,
            remainingDays: input.accessDuration || 7,
            invitedBy: {
              id: 'current-user',
              name: 'Current User',
              email: 'current@user.com',
            },
            stats: {
              totalAccesses: 0,
              secretsAccessedCount: 0,
              averageSessionDuration: 0,
              accessPattern: 'None',
            },
          }),
        },
      });
    } catch (error) {
      // Error handled in onError
    }
  }, [inviteContractorMutation]);

  const revokeAccess = useCallback(async (contractorId: string) => {
    try {
      await revokeAccessMutation({
        variables: { id: contractorId },
        optimisticResponse: {
          revokeContractorAccess: {
            success: true,
            message: 'Access revoked successfully',
          },
        },
        update: (cache) => {
          cache.writeFragment({
            id: `Contractor:${contractorId}`,
            fragment: gql`
              fragment ContractorRevoke on Contractor {
                id
                status
                isActive
                revokedAt
              }
            `,
            data: {
              id: contractorId,
              status: 'REVOKED',
              isActive: false,
              revokedAt: new Date().toISOString(),
            },
          });
        },
      });
    } catch (error) {
      // Error handled in onError
    }
  }, [revokeAccessMutation]);

  const bulkRevokeAccess = useCallback(async (contractorIds: string[]) => {
    try {
      await bulkRevokeMutation({
        variables: { ids: contractorIds },
      });
    } catch (error) {
      // Error handled in onError
    }
  }, [bulkRevokeMutation]);

  // Pagination
  const loadMore = useCallback(async () => {
    if (contractorsData?.contractors.pagination.hasNextPage) {
      await fetchMore({
        variables: {
          pagination: {
            ...pagination,
            offset: pagination.offset + pagination.limit,
          },
        },
      });

      setPagination(prev => ({
        ...prev,
        offset: prev.offset + prev.limit,
      }));
    }
  }, [contractorsData, fetchMore, pagination]);

  const resetPagination = useCallback(() => {
    setPagination({ limit: 20, offset: 0 });
  }, []);

  // Computed values
  const contractors = contractorsData?.contractors.contractors || [];
  const totalCount = contractorsData?.contractors.pagination.totalCount || 0;
  const hasNextPage = contractorsData?.contractors.pagination.hasNextPage || false;

  const activeContractors = contractors.filter(c => c.status === 'ACTIVE').length;
  const pendingContractors = contractors.filter(c => c.status === 'PENDING').length;
  const expiredContractors = contractors.filter(c => c.status === 'EXPIRED').length;

  return {
    // Data
    contractors,
    totalCount,
    hasNextPage,

    // Computed
    activeContractors,
    pendingContractors,
    expiredContractors,

    // Loading states
    loading: contractorsLoading,
    inviting,
    revoking,
    bulkRevoking,

    // Error
    error: contractorsError,

    // Actions
    inviteContractor,
    revokeAccess,
    bulkRevokeAccess,
    refetch: refetchContractors,
    loadMore,
    resetPagination,

    // Pagination
    pagination,
    setPagination,
  };
};

// Individual contractor hook
export const useContractor = (contractorId?: string) => {
  const { data, loading, error, refetch } = useQuery(GET_CONTRACTOR_QUERY, {
    variables: { id: contractorId! },
    skip: !contractorId,
    errorPolicy: 'all',
  });

  return {
    contractor: data?.contractor,
    loading,
    error,
    refetch,
  };
};
