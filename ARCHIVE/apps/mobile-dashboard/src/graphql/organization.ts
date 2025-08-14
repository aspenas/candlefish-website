import { gql } from '@apollo/client';

// Fragments
export const ORGANIZATION_FRAGMENT = gql`
  fragment OrganizationDetails on Organization {
    id
    name
    slug
    logo
    website
    description
    industry
    size
    status
    subscription {
      id
      plan
      status
      billingCycle
      currentPeriodStart
      currentPeriodEnd
      trialEnd
      cancelAtPeriodEnd
      usage {
        users {
          current
          limit
          percentage
        }
        dashboards {
          current
          limit
          percentage
        }
        dataSources {
          current
          limit
          percentage
        }
        apiCalls {
          current
          limit
          percentage
        }
        storage {
          current
          limit
          percentage
        }
        exports {
          current
          limit
          percentage
        }
      }
    }
    settings {
      timezone
      dateFormat
      currency
      language
      requireTwoFactor
      passwordPolicy {
        minLength
        requireUppercase
        requireLowercase
        requireNumbers
        requireSymbols
        preventReuse
        maxAge
      }
      sessionTimeout
      allowedDomains
      ipWhitelist
      dataRetentionDays
      allowDataExport
      enableAuditLogs
      enableRealTime
      enableCustomMetrics
      enableAdvancedFilters
      enableAPIAccess
    }
    branding {
      primaryColor
      secondaryColor
      accentColor
      logoUrl
      faviconUrl
      customCSS
      customDomain
    }
    usage {
      users
      dashboards
      widgets
      dataSources
      apiCalls
      storage
      monthlyQueries
    }
    limits {
      maxUsers
      maxDashboards
      maxDataSources
      maxWidgets
      maxApiCallsPerHour
      maxStorageMB
      maxQueriesPerMonth
    }
    createdAt
    updatedAt
  }
`;

export const ORGANIZATION_MEMBERSHIP_FRAGMENT = gql`
  fragment OrganizationMembershipDetails on OrganizationMembership {
    id
    role
    permissions {
      id
      name
      resource
      action
      conditions
    }
    invitedBy {
      id
      firstName
      lastName
      email
    }
    joinedAt
    isActive
    organization {
      ...OrganizationDetails
    }
    user {
      id
      firstName
      lastName
      email
      avatar
    }
  }
  ${ORGANIZATION_FRAGMENT}
`;

export const INVITATION_FRAGMENT = gql`
  fragment InvitationDetails on Invitation {
    id
    email
    role
    invitedBy {
      id
      firstName
      lastName
      email
    }
    invitedAt
    expiresAt
    acceptedAt
    status
  }
`;

// Queries
export const GET_USER_ORGANIZATIONS_QUERY = gql`
  query GetUserOrganizations {
    currentUser {
      id
      organizations {
        ...OrganizationMembershipDetails
      }
    }
  }
  ${ORGANIZATION_MEMBERSHIP_FRAGMENT}
`;

export const GET_ORGANIZATION_QUERY = gql`
  query GetOrganization($organizationId: UUID!) {
    organization(id: $organizationId) {
      ...OrganizationDetails
      members {
        ...OrganizationMembershipDetails
      }
      invitations {
        ...InvitationDetails
      }
    }
  }
  ${ORGANIZATION_FRAGMENT}
  ${ORGANIZATION_MEMBERSHIP_FRAGMENT}
  ${INVITATION_FRAGMENT}
`;

export const GET_ORGANIZATION_MEMBERS_QUERY = gql`
  query GetOrganizationMembers($organizationId: UUID!) {
    organizationMembers(organizationId: $organizationId) {
      ...OrganizationMembershipDetails
    }
  }
  ${ORGANIZATION_MEMBERSHIP_FRAGMENT}
`;

export const GET_ORGANIZATION_INVITATIONS_QUERY = gql`
  query GetOrganizationInvitations($organizationId: UUID!) {
    organizationInvitations(organizationId: $organizationId) {
      ...InvitationDetails
    }
  }
  ${INVITATION_FRAGMENT}
`;

export const GET_ORGANIZATION_USAGE_QUERY = gql`
  query GetOrganizationUsage($organizationId: UUID!, $timeRange: TimeRange) {
    organizationUsage(organizationId: $organizationId, timeRange: $timeRange) {
      users {
        current
        trend
        history {
          date
          value
        }
      }
      dashboards {
        current
        trend
        history {
          date
          value
        }
      }
      apiCalls {
        current
        trend
        history {
          date
          value
        }
      }
      storage {
        current
        trend
        history {
          date
          value
        }
      }
      queries {
        current
        trend
        history {
          date
          value
        }
      }
    }
  }
`;

// Mutations
export const CREATE_ORGANIZATION_MUTATION = gql`
  mutation CreateOrganization($input: CreateOrganizationInput!) {
    createOrganization(input: $input) {
      ...OrganizationDetails
      members {
        ...OrganizationMembershipDetails
      }
    }
  }
  ${ORGANIZATION_FRAGMENT}
  ${ORGANIZATION_MEMBERSHIP_FRAGMENT}
`;

export const UPDATE_ORGANIZATION_MUTATION = gql`
  mutation UpdateOrganization($organizationId: UUID!, $input: UpdateOrganizationInput!) {
    updateOrganization(id: $organizationId, input: $input) {
      ...OrganizationDetails
    }
  }
  ${ORGANIZATION_FRAGMENT}
`;

export const UPDATE_ORGANIZATION_SETTINGS_MUTATION = gql`
  mutation UpdateOrganizationSettings($organizationId: UUID!, $settings: OrganizationSettingsInput!) {
    updateOrganizationSettings(organizationId: $organizationId, settings: $settings) {
      ...OrganizationDetails
    }
  }
  ${ORGANIZATION_FRAGMENT}
`;

export const UPDATE_ORGANIZATION_BRANDING_MUTATION = gql`
  mutation UpdateOrganizationBranding($organizationId: UUID!, $branding: BrandingSettingsInput!) {
    updateOrganizationBranding(organizationId: $organizationId, branding: $branding) {
      ...OrganizationDetails
    }
  }
  ${ORGANIZATION_FRAGMENT}
`;

export const INVITE_MEMBER_MUTATION = gql`
  mutation InviteMember($organizationId: UUID!, $email: EmailAddress!, $role: OrganizationRole!) {
    inviteMember(organizationId: $organizationId, email: $email, role: $role) {
      ...InvitationDetails
    }
  }
  ${INVITATION_FRAGMENT}
`;

export const RESEND_INVITATION_MUTATION = gql`
  mutation ResendInvitation($invitationId: UUID!) {
    resendInvitation(invitationId: $invitationId) {
      ...InvitationDetails
    }
  }
  ${INVITATION_FRAGMENT}
`;

export const CANCEL_INVITATION_MUTATION = gql`
  mutation CancelInvitation($invitationId: UUID!) {
    cancelInvitation(invitationId: $invitationId) {
      success
    }
  }
`;

export const ACCEPT_INVITATION_MUTATION = gql`
  mutation AcceptInvitation($invitationToken: String!) {
    acceptInvitation(invitationToken: $invitationToken) {
      membership {
        ...OrganizationMembershipDetails
      }
      user {
        id
        organizations {
          ...OrganizationMembershipDetails
        }
      }
    }
  }
  ${ORGANIZATION_MEMBERSHIP_FRAGMENT}
`;

export const UPDATE_MEMBER_ROLE_MUTATION = gql`
  mutation UpdateMemberRole($membershipId: UUID!, $role: OrganizationRole!) {
    updateMemberRole(membershipId: $membershipId, role: $role) {
      ...OrganizationMembershipDetails
    }
  }
  ${ORGANIZATION_MEMBERSHIP_FRAGMENT}
`;

export const REMOVE_MEMBER_MUTATION = gql`
  mutation RemoveMember($membershipId: UUID!) {
    removeMember(membershipId: $membershipId) {
      success
    }
  }
`;

export const LEAVE_ORGANIZATION_MUTATION = gql`
  mutation LeaveOrganization($organizationId: UUID!) {
    leaveOrganization(organizationId: $organizationId) {
      success
    }
  }
`;

export const DELETE_ORGANIZATION_MUTATION = gql`
  mutation DeleteOrganization($organizationId: UUID!, $confirmationText: String!) {
    deleteOrganization(organizationId: $organizationId, confirmationText: $confirmationText) {
      success
    }
  }
`;

export const SWITCH_ORGANIZATION_MUTATION = gql`
  mutation SwitchOrganization($organizationId: UUID!) {
    switchOrganization(organizationId: $organizationId) {
      organization {
        ...OrganizationDetails
      }
      user {
        id
        organizations {
          ...OrganizationMembershipDetails
        }
      }
    }
  }
  ${ORGANIZATION_FRAGMENT}
  ${ORGANIZATION_MEMBERSHIP_FRAGMENT}
`;

// Subscriptions
export const ORGANIZATION_UPDATED_SUBSCRIPTION = gql`
  subscription OrganizationUpdated($organizationId: UUID!) {
    organizationUpdated(organizationId: $organizationId) {
      ...OrganizationDetails
    }
  }
  ${ORGANIZATION_FRAGMENT}
`;

export const ORGANIZATION_MEMBER_ADDED_SUBSCRIPTION = gql`
  subscription OrganizationMemberAdded($organizationId: UUID!) {
    organizationMemberAdded(organizationId: $organizationId) {
      ...OrganizationMembershipDetails
    }
  }
  ${ORGANIZATION_MEMBERSHIP_FRAGMENT}
`;

export const ORGANIZATION_MEMBER_REMOVED_SUBSCRIPTION = gql`
  subscription OrganizationMemberRemoved($organizationId: UUID!) {
    organizationMemberRemoved(organizationId: $organizationId) {
      membershipId
      userId
    }
  }
`;

export const ORGANIZATION_INVITATION_SENT_SUBSCRIPTION = gql`
  subscription OrganizationInvitationSent($organizationId: UUID!) {
    organizationInvitationSent(organizationId: $organizationId) {
      ...InvitationDetails
    }
  }
  ${INVITATION_FRAGMENT}
`;
