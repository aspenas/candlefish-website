import { gql } from '@apollo/client';

// Fragments
export const CONTRACTOR_FRAGMENT = gql`
  fragment ContractorFields on Contractor {
    id
    email
    name
    company
    status
    permissions
    allowedSecrets
    reason
    accessDuration
    createdAt
    expiresAt
    lastAccess
    revokedAt
    accessCount
    isExpired
    isActive
    remainingDays
    invitedBy {
      id
      name
      email
    }
    revokedBy {
      id
      name
      email
    }
    stats {
      totalAccesses
      lastAccessDaysAgo
      secretsAccessedCount
      averageSessionDuration
      accessPattern
    }
  }
`;

export const CONTRACTOR_USAGE_FRAGMENT = gql`
  fragment ContractorUsageFields on ContractorUsage {
    date
    accessCount
    secretsAccessed
    duration
  }
`;

// Queries
export const GET_CONTRACTORS_QUERY = gql`
  query GetContractors(
    $pagination: PaginationInput
    $sort: SortInput
    $status: ContractorStatus
  ) {
    contractors(pagination: $pagination, sort: $sort, status: $status) {
      contractors {
        ...ContractorFields
      }
      pagination {
        hasNextPage
        hasPreviousPage
        totalCount
        cursor
      }
    }
  }
  ${CONTRACTOR_FRAGMENT}
`;

export const GET_CONTRACTOR_QUERY = gql`
  query GetContractor($id: ID!) {
    contractor(id: $id) {
      ...ContractorFields
      stats {
        totalAccesses
        lastAccessDaysAgo
        secretsAccessedCount
        averageSessionDuration
        dailyUsage {
          ...ContractorUsageFields
        }
        accessPattern
      }
      auditLogs {
        id
        action
        timestamp
        ip
        userAgent
        success
        details
        formattedTimestamp
        riskLevel
      }
    }
  }
  ${CONTRACTOR_FRAGMENT}
  ${CONTRACTOR_USAGE_FRAGMENT}
`;

export const GET_CONTRACTOR_BY_TOKEN_QUERY = gql`
  query GetContractorByToken($token: String!) {
    contractorByToken(token: $token) {
      ...ContractorFields
    }
  }
  ${CONTRACTOR_FRAGMENT}
`;

// Mutations
export const INVITE_CONTRACTOR_MUTATION = gql`
  mutation InviteContractor($input: InviteContractorInput!) {
    inviteContractor(input: $input) {
      ...ContractorFields
      accessUrl
    }
  }
  ${CONTRACTOR_FRAGMENT}
`;

export const REVOKE_CONTRACTOR_ACCESS_MUTATION = gql`
  mutation RevokeContractorAccess($id: ID!) {
    revokeContractorAccess(id: $id) {
      success
      message
    }
  }
`;

export const BULK_REVOKE_CONTRACTORS_MUTATION = gql`
  mutation BulkRevokeContractors($ids: [ID!]!) {
    bulkRevokeContractors(ids: $ids) {
      success
      message
    }
  }
`;

// Subscriptions
export const CONTRACTOR_STATUS_CHANGED_SUBSCRIPTION = gql`
  subscription ContractorStatusChanged {
    contractorStatusChanged {
      ...ContractorFields
    }
  }
  ${CONTRACTOR_FRAGMENT}
`;

export const CONTRACTOR_ACCESSED_SUBSCRIPTION = gql`
  subscription ContractorAccessed {
    contractorAccessed {
      ...ContractorFields
    }
  }
  ${CONTRACTOR_FRAGMENT}
`;
