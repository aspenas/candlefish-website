import { gql } from '@apollo/client';

// Fragments
export const USER_FRAGMENT = gql`
  fragment UserDetails on User {
    id
    email
    firstName
    lastName
    avatar
    role
    status
    preferences {
      theme
      language
      timezone
      dateFormat
      currency
      dashboardLayout
      emailNotifications
      pushNotifications
      analyticsPreferences {
        defaultTimeRange
        defaultChartType
        autoRefresh
        refreshInterval
        showTooltips
        enableAnimations
        colorScheme
      }
    }
    createdAt
    updatedAt
    lastLoginAt
    timezone
    locale
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
      id
      name
      slug
      logo
      status
      subscription {
        plan
        status
      }
    }
  }
`;

// Mutations
export const LOGIN_MUTATION = gql`
  mutation Login($email: EmailAddress!, $password: String!) {
    login(email: $email, password: $password) {
      user {
        ...UserDetails
        organizations {
          ...OrganizationMembershipDetails
        }
      }
      token
      refreshToken
    }
  }
  ${USER_FRAGMENT}
  ${ORGANIZATION_MEMBERSHIP_FRAGMENT}
`;

export const REFRESH_TOKEN_MUTATION = gql`
  mutation RefreshToken($refreshToken: String!) {
    refreshToken(refreshToken: $refreshToken) {
      user {
        ...UserDetails
      }
      token
      refreshToken
    }
  }
  ${USER_FRAGMENT}
`;

export const LOGOUT_MUTATION = gql`
  mutation Logout {
    logout {
      success
    }
  }
`;

export const REGISTER_MUTATION = gql`
  mutation Register(
    $email: EmailAddress!
    $password: String!
    $firstName: NonEmptyString!
    $lastName: NonEmptyString!
    $organizationName: String
    $invitationToken: String
  ) {
    register(
      input: {
        email: $email
        password: $password
        firstName: $firstName
        lastName: $lastName
        organizationName: $organizationName
        invitationToken: $invitationToken
      }
    ) {
      user {
        ...UserDetails
        organizations {
          ...OrganizationMembershipDetails
        }
      }
      token
      refreshToken
    }
  }
  ${USER_FRAGMENT}
  ${ORGANIZATION_MEMBERSHIP_FRAGMENT}
`;

export const REQUEST_PASSWORD_RESET_MUTATION = gql`
  mutation RequestPasswordReset($email: EmailAddress!) {
    requestPasswordReset(email: $email) {
      success
      message
    }
  }
`;

export const RESET_PASSWORD_MUTATION = gql`
  mutation ResetPassword($token: String!, $password: String!) {
    resetPassword(token: $token, password: $password) {
      success
      message
    }
  }
`;

export const CHANGE_PASSWORD_MUTATION = gql`
  mutation ChangePassword($currentPassword: String!, $newPassword: String!) {
    changePassword(currentPassword: $currentPassword, newPassword: $newPassword) {
      success
      message
    }
  }
`;

export const UPDATE_PROFILE_MUTATION = gql`
  mutation UpdateProfile($input: UpdateUserInput!) {
    updateProfile(input: $input) {
      ...UserDetails
    }
  }
  ${USER_FRAGMENT}
`;

export const UPDATE_USER_PREFERENCES_MUTATION = gql`
  mutation UpdateUserPreferences($preferences: UserPreferencesInput!) {
    updateUserPreferences(preferences: $preferences) {
      ...UserDetails
    }
  }
  ${USER_FRAGMENT}
`;

export const ENABLE_TWO_FACTOR_MUTATION = gql`
  mutation EnableTwoFactor {
    enableTwoFactor {
      qrCodeUrl
      backupCodes
    }
  }
`;

export const CONFIRM_TWO_FACTOR_MUTATION = gql`
  mutation ConfirmTwoFactor($code: String!) {
    confirmTwoFactor(code: $code) {
      success
      backupCodes
    }
  }
`;

export const DISABLE_TWO_FACTOR_MUTATION = gql`
  mutation DisableTwoFactor($password: String!) {
    disableTwoFactor(password: $password) {
      success
    }
  }
`;

// Queries
export const GET_CURRENT_USER = gql`
  query GetCurrentUser {
    currentUser {
      ...UserDetails
      organizations {
        ...OrganizationMembershipDetails
      }
    }
  }
  ${USER_FRAGMENT}
  ${ORGANIZATION_MEMBERSHIP_FRAGMENT}
`;

export const VERIFY_EMAIL_QUERY = gql`
  query VerifyEmail($token: String!) {
    verifyEmail(token: $token) {
      success
      message
      user {
        ...UserDetails
      }
    }
  }
  ${USER_FRAGMENT}
`;

export const CHECK_EMAIL_AVAILABILITY_QUERY = gql`
  query CheckEmailAvailability($email: EmailAddress!) {
    checkEmailAvailability(email: $email) {
      available
    }
  }
`;

// Subscriptions
export const USER_UPDATED_SUBSCRIPTION = gql`
  subscription UserUpdated($userId: UUID!) {
    userUpdated(userId: $userId) {
      ...UserDetails
    }
  }
  ${USER_FRAGMENT}
`;

export const SESSION_EXPIRED_SUBSCRIPTION = gql`
  subscription SessionExpired {
    sessionExpired {
      reason
      timestamp
    }
  }
`;
