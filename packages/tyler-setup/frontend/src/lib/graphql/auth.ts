import { gql } from '@apollo/client';

// Fragments
export const USER_FRAGMENT = gql`
  fragment UserFields on User {
    id
    email
    name
    role
    status
    lastLogin
    createdAt
    updatedAt
    isActive
    fullName
    initials
    profile {
      displayName
      avatar
      preferences
      timezone
      lastActivity
    }
  }
`;

export const AUTH_RESPONSE_FRAGMENT = gql`
  fragment AuthResponseFields on AuthResponse {
    success
    token
    refreshToken
    expiresIn
    message
    user {
      ...UserFields
    }
  }
  ${USER_FRAGMENT}
`;

// Queries
export const ME_QUERY = gql`
  query Me {
    me {
      ...UserFields
      stats {
        totalLogins
        lastLoginDaysAgo
        createdUsersCount
        invitedContractorsCount
        secretsAccessedCount
        activityScore
      }
    }
  }
  ${USER_FRAGMENT}
`;

export const REFRESH_TOKEN_QUERY = gql`
  query RefreshToken($token: String!) {
    refreshToken(token: $token) {
      ...AuthResponseFields
    }
  }
  ${AUTH_RESPONSE_FRAGMENT}
`;

// Mutations
export const LOGIN_MUTATION = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      ...AuthResponseFields
    }
  }
  ${AUTH_RESPONSE_FRAGMENT}
`;

export const LOGOUT_MUTATION = gql`
  mutation Logout($refreshToken: String) {
    logout(refreshToken: $refreshToken) {
      success
      message
    }
  }
`;

export const CREATE_USER_MUTATION = gql`
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) {
      ...UserFields
    }
  }
  ${USER_FRAGMENT}
`;

export const UPDATE_USER_MUTATION = gql`
  mutation UpdateUser($id: ID!, $input: UpdateUserInput!) {
    updateUser(id: $id, input: $input) {
      ...UserFields
    }
  }
  ${USER_FRAGMENT}
`;

export const DELETE_USER_MUTATION = gql`
  mutation DeleteUser($id: ID!) {
    deleteUser(id: $id) {
      success
      message
    }
  }
`;

// Subscriptions
export const USER_STATUS_CHANGED_SUBSCRIPTION = gql`
  subscription UserStatusChanged($userId: ID) {
    userStatusChanged(userId: $userId) {
      ...UserFields
    }
  }
  ${USER_FRAGMENT}
`;

export const USER_LOGGED_IN_SUBSCRIPTION = gql`
  subscription UserLoggedIn {
    userLoggedIn {
      ...UserFields
    }
  }
  ${USER_FRAGMENT}
`;

export const USER_LOGGED_OUT_SUBSCRIPTION = gql`
  subscription UserLoggedOut {
    userLoggedOut {
      ...UserFields
    }
  }
  ${USER_FRAGMENT}
`;
