import { gql } from '@apollo/client';

// Fragments
export const CONTRACTOR_FRAGMENT = gql`
  fragment ContractorDetails on Contractor {
    id
    firstName
    lastName
    email
    phone
    company
    title
    status
    role
    permissions
    avatar
    timezone
    locale
    lastLoginAt
    invitedBy {
      id
      firstName
      lastName
    }
    invitedAt
    joinedAt
    lastActiveAt
    dashboardAccess {
      dashboardId
      dashboard {
        id
        name
        description
      }
      permissions
      expiresAt
    }
    metadata
    createdAt
    updatedAt
  }
`;

export const CONTRACTOR_INVITATION_FRAGMENT = gql`
  fragment ContractorInvitationDetails on ContractorInvitation {
    id
    email
    firstName
    lastName
    company
    message
    status
    token
    dashboardAccess {
      dashboardId
      permissions
      expiresAt
    }
    invitedBy {
      id
      firstName
      lastName
    }
    expiresAt
    sentAt
    acceptedAt
    createdAt
  }
`;

// Queries
export const GET_CONTRACTORS_QUERY = gql`
  query GetContractors(
    $organizationId: UUID!
    $status: ContractorStatus
    $search: String
    $limit: Int
    $offset: Int
  ) {
    contractors(
      organizationId: $organizationId
      status: $status
      search: $search
      limit: $limit
      offset: $offset
    ) {
      items {
        ...ContractorDetails
      }
      totalCount
      hasNextPage
      hasPreviousPage
    }
  }
  ${CONTRACTOR_FRAGMENT}
`;

export const GET_CONTRACTOR_QUERY = gql`
  query GetContractor($contractorId: UUID!) {
    contractor(id: $contractorId) {
      ...ContractorDetails
      organization {
        id
        name
        slug
      }
      dashboards {
        id
        name
        description
        lastAccessed
        accessCount
        permissions
      }
      activityLog {
        id
        action
        description
        timestamp
        metadata
      }
    }
  }
  ${CONTRACTOR_FRAGMENT}
`;

export const GET_CONTRACTOR_INVITATIONS_QUERY = gql`
  query GetContractorInvitations(
    $organizationId: UUID!
    $status: InvitationStatus
    $limit: Int
    $offset: Int
  ) {
    contractorInvitations(
      organizationId: $organizationId
      status: $status
      limit: $limit
      offset: $offset
    ) {
      items {
        ...ContractorInvitationDetails
      }
      totalCount
      hasNextPage
      hasPreviousPage
    }
  }
  ${CONTRACTOR_INVITATION_FRAGMENT}
`;

export const SEARCH_CONTRACTORS_QUERY = gql`
  query SearchContractors($organizationId: UUID!, $query: String!) {
    searchContractors(organizationId: $organizationId, query: $query) {
      ...ContractorDetails
    }
  }
  ${CONTRACTOR_FRAGMENT}
`;

// Mutations
export const INVITE_CONTRACTOR_MUTATION = gql`
  mutation InviteContractor($input: InviteContractorInput!) {
    inviteContractor(input: $input) {
      ...ContractorInvitationDetails
    }
  }
  ${CONTRACTOR_INVITATION_FRAGMENT}
`;

export const ACCEPT_CONTRACTOR_INVITATION_MUTATION = gql`
  mutation AcceptContractorInvitation($invitationToken: String!) {
    acceptContractorInvitation(invitationToken: $invitationToken) {
      ...ContractorDetails
      organization {
        id
        name
        slug
      }
    }
  }
  ${CONTRACTOR_FRAGMENT}
`;

export const UPDATE_CONTRACTOR_MUTATION = gql`
  mutation UpdateContractor($contractorId: UUID!, $input: UpdateContractorInput!) {
    updateContractor(contractorId: $contractorId, input: $input) {
      ...ContractorDetails
    }
  }
  ${CONTRACTOR_FRAGMENT}
`;

export const UPDATE_CONTRACTOR_STATUS_MUTATION = gql`
  mutation UpdateContractorStatus($contractorId: UUID!, $status: ContractorStatus!) {
    updateContractorStatus(contractorId: $contractorId, status: $status) {
      ...ContractorDetails
    }
  }
  ${CONTRACTOR_FRAGMENT}
`;

export const GRANT_DASHBOARD_ACCESS_MUTATION = gql`
  mutation GrantDashboardAccess($input: GrantDashboardAccessInput!) {
    grantDashboardAccess(input: $input) {
      success
      contractorId
      dashboardId
      permissions
      expiresAt
    }
  }
`;

export const REVOKE_DASHBOARD_ACCESS_MUTATION = gql`
  mutation RevokeDashboardAccess($contractorId: UUID!, $dashboardId: UUID!) {
    revokeDashboardAccess(contractorId: $contractorId, dashboardId: $dashboardId) {
      success
    }
  }
`;

export const REMOVE_CONTRACTOR_MUTATION = gql`
  mutation RemoveContractor($contractorId: UUID!, $organizationId: UUID!) {
    removeContractor(contractorId: $contractorId, organizationId: $organizationId) {
      success
    }
  }
`;

export const RESEND_CONTRACTOR_INVITATION_MUTATION = gql`
  mutation ResendContractorInvitation($invitationId: UUID!) {
    resendContractorInvitation(invitationId: $invitationId) {
      ...ContractorInvitationDetails
    }
  }
  ${CONTRACTOR_INVITATION_FRAGMENT}
`;

export const CANCEL_CONTRACTOR_INVITATION_MUTATION = gql`
  mutation CancelContractorInvitation($invitationId: UUID!) {
    cancelContractorInvitation(invitationId: $invitationId) {
      success
    }
  }
`;

export const BULK_INVITE_CONTRACTORS_MUTATION = gql`
  mutation BulkInviteContractors($input: BulkInviteContractorsInput!) {
    bulkInviteContractors(input: $input) {
      successful {
        ...ContractorInvitationDetails
      }
      failed {
        email
        error
      }
      totalInvited
      totalFailed
    }
  }
  ${CONTRACTOR_INVITATION_FRAGMENT}
`;

// Subscriptions
export const CONTRACTOR_UPDATED_SUBSCRIPTION = gql`
  subscription ContractorUpdated($organizationId: UUID!) {
    contractorUpdated(organizationId: $organizationId) {
      ...ContractorDetails
    }
  }
  ${CONTRACTOR_FRAGMENT}
`;

export const CONTRACTOR_ACTIVITY_SUBSCRIPTION = gql`
  subscription ContractorActivity($contractorId: UUID!) {
    contractorActivity(contractorId: $contractorId) {
      id
      action
      description
      timestamp
      metadata
      contractor {
        id
        firstName
        lastName
      }
      dashboard {
        id
        name
      }
    }
  }
`;

// TypeScript Types
export interface Contractor {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  title?: string;
  status: ContractorStatus;
  role: ContractorRole;
  permissions: string[];
  avatar?: string;
  timezone: string;
  locale: string;
  lastLoginAt?: string;
  invitedBy: {
    id: string;
    firstName: string;
    lastName: string;
  };
  invitedAt: string;
  joinedAt?: string;
  lastActiveAt?: string;
  dashboardAccess: Array<{
    dashboardId: string;
    dashboard: {
      id: string;
      name: string;
      description?: string;
    };
    permissions: string[];
    expiresAt?: string;
  }>;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

export enum ContractorStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  EXPIRED = 'EXPIRED',
}

export enum ContractorRole {
  VIEWER = 'VIEWER',
  COLLABORATOR = 'COLLABORATOR',
  MANAGER = 'MANAGER',
}

export enum InvitationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  ACCEPTED = 'ACCEPTED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export interface InviteContractorInput {
  organizationId: string;
  email: string;
  firstName: string;
  lastName: string;
  company?: string;
  role: ContractorRole;
  message?: string;
  dashboardAccess?: Array<{
    dashboardId: string;
    permissions: string[];
    expiresAt?: string;
  }>;
  expiresAt?: string;
}

export interface UpdateContractorInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
  company?: string;
  title?: string;
  role?: ContractorRole;
  permissions?: string[];
  timezone?: string;
  locale?: string;
}

export interface GrantDashboardAccessInput {
  contractorId: string;
  dashboardId: string;
  permissions: string[];
  expiresAt?: string;
  notify?: boolean;
}

export interface BulkInviteContractorsInput {
  organizationId: string;
  invitations: Array<{
    email: string;
    firstName: string;
    lastName: string;
    company?: string;
    role: ContractorRole;
  }>;
  defaultDashboardAccess?: Array<{
    dashboardId: string;
    permissions: string[];
  }>;
  message?: string;
  expiresAt?: string;
}
