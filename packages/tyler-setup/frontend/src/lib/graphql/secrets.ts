import { gql } from '@apollo/client';

// Fragments
export const SECRET_FRAGMENT = gql`
  fragment SecretFields on Secret {
    name
    description
    type
    createdAt
    lastRotated
    nextRotation
    version
    isEncrypted
    kmsKeyId
  }
`;

export const SECRET_WITH_VALUE_FRAGMENT = gql`
  fragment SecretWithValueFields on Secret {
    ...SecretFields
    value
  }
  ${SECRET_FRAGMENT}
`;

export const SECRET_STATS_FRAGMENT = gql`
  fragment SecretStatsFields on SecretStats {
    accessCount
    rotationCount
    lastAccessDaysAgo
    daysSinceRotation
  }
`;

export const SECRET_ROTATION_FRAGMENT = gql`
  fragment SecretRotationFields on SecretRotation {
    id
    secretName
    rotatedAt
    rotatedBy {
      id
      name
      email
    }
    oldVersion
    newVersion
    success
    errorMessage
    rotationType
    scheduledRotation
  }
`;

export const SECRET_ACCESSOR_FRAGMENT = gql`
  fragment SecretAccessorFields on SecretAccessor {
    user {
      id
      name
      email
    }
    contractor {
      id
      name
      email
    }
    accessCount
    lastAccess
  }
`;

export const SECRET_ACCESS_FRAGMENT = gql`
  fragment SecretAccessFields on SecretAccess {
    date
    accessCount
    uniqueUsers
  }
`;

// Queries
export const GET_SECRETS_QUERY = gql`
  query GetSecrets(
    $pagination: PaginationInput
    $sort: SortInput
    $type: SecretType
  ) {
    secrets(pagination: $pagination, sort: $sort, type: $type) {
      secrets {
        ...SecretFields
        stats {
          ...SecretStatsFields
        }
      }
      pagination {
        hasNextPage
        hasPreviousPage
        totalCount
        cursor
      }
    }
  }
  ${SECRET_FRAGMENT}
  ${SECRET_STATS_FRAGMENT}
`;

export const GET_SECRET_QUERY = gql`
  query GetSecret($name: String!) {
    secret(name: $name) {
      ...SecretWithValueFields
      allowedUsers {
        id
        name
        email
        role
      }
      allowedContractors {
        id
        name
        email
        company
      }
      stats {
        ...SecretStatsFields
        topAccessors {
          ...SecretAccessorFields
        }
        accessTrend {
          ...SecretAccessFields
        }
      }
      rotationHistory {
        ...SecretRotationFields
      }
      auditLogs {
        id
        action
        userId
        timestamp
        ip
        userAgent
        success
        details
        user {
          id
          name
          email
        }
      }
    }
  }
  ${SECRET_WITH_VALUE_FRAGMENT}
  ${SECRET_STATS_FRAGMENT}
  ${SECRET_ROTATION_FRAGMENT}
  ${SECRET_ACCESSOR_FRAGMENT}
  ${SECRET_ACCESS_FRAGMENT}
`;

export const GET_SECRETS_NEEDING_ROTATION_QUERY = gql`
  query GetSecretsNeedingRotation {
    secretsNeedingRotation {
      ...SecretFields
      stats {
        daysSinceRotation
        rotationCount
      }
    }
  }
  ${SECRET_FRAGMENT}
`;

// Mutations
export const CREATE_SECRET_MUTATION = gql`
  mutation CreateSecret($input: CreateSecretInput!) {
    createSecret(input: $input) {
      ...SecretFields
    }
  }
  ${SECRET_FRAGMENT}
`;

export const UPDATE_SECRET_MUTATION = gql`
  mutation UpdateSecret($name: String!, $input: UpdateSecretInput!) {
    updateSecret(name: $name, input: $input) {
      ...SecretFields
    }
  }
  ${SECRET_FRAGMENT}
`;

export const DELETE_SECRET_MUTATION = gql`
  mutation DeleteSecret($name: String!) {
    deleteSecret(name: $name) {
      success
      message
    }
  }
`;

export const ROTATE_SECRET_MUTATION = gql`
  mutation RotateSecret($name: String!) {
    rotateSecret(name: $name) {
      ...SecretFields
    }
  }
  ${SECRET_FRAGMENT}
`;

export const TRIGGER_SECRET_ROTATION_MUTATION = gql`
  mutation TriggerSecretRotation {
    triggerSecretRotation {
      success
      message
    }
  }
`;

// Subscriptions
export const SECRET_ROTATED_SUBSCRIPTION = gql`
  subscription SecretRotated {
    secretRotated {
      ...SecretFields
    }
  }
  ${SECRET_FRAGMENT}
`;

export const SECRET_ACCESSED_SUBSCRIPTION = gql`
  subscription SecretAccessed($secretName: String) {
    secretAccessed(secretName: $secretName) {
      ...SecretFields
      stats {
        ...SecretStatsFields
      }
    }
  }
  ${SECRET_FRAGMENT}
  ${SECRET_STATS_FRAGMENT}
`;
