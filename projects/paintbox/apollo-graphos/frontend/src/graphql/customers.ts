import { gql } from '@apollo/client';

// Fragments
export const ADDRESS_FRAGMENT = gql`
  fragment AddressFragment on Address {
    street
    city
    state
    zipCode
    country
    latitude
    longitude
  }
`;

export const CUSTOMER_FRAGMENT = gql`
  ${ADDRESS_FRAGMENT}
  fragment CustomerFragment on Customer {
    id
    name
    email
    phone
    address {
      ...AddressFragment
    }
    status
    createdAt
    updatedAt
    salesforceId
    lastSync
    totalProjects
    totalRevenue
    notes
  }
`;

// Queries
export const GET_CUSTOMER = gql`
  ${CUSTOMER_FRAGMENT}
  query GetCustomer($id: ID!) {
    customer(id: $id) {
      ...CustomerFragment
    }
  }
`;

export const SEARCH_CUSTOMERS = gql`
  ${CUSTOMER_FRAGMENT}
  query SearchCustomers($filter: CustomerFilter, $limit: Int = 10, $offset: Int = 0) {
    customers(filter: $filter, limit: $limit, offset: $offset) {
      edges {
        node {
          ...CustomerFragment
        }
        cursor
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      totalCount
    }
  }
`;

export const GET_CUSTOMER_HISTORY = gql`
  query GetCustomerHistory($customerId: ID!, $limit: Int = 20) {
    customerHistory(customerId: $customerId, limit: $limit) {
      id
      type
      title
      description
      timestamp
      userId
      metadata
    }
  }
`;

// Mutations
export const CREATE_CUSTOMER = gql`
  ${CUSTOMER_FRAGMENT}
  mutation CreateCustomer($input: CreateCustomerInput!) {
    createCustomer(input: $input) {
      ...CustomerFragment
    }
  }
`;

export const UPDATE_CUSTOMER = gql`
  ${CUSTOMER_FRAGMENT}
  mutation UpdateCustomer($id: ID!, $input: UpdateCustomerInput!) {
    updateCustomer(id: $id, input: $input) {
      ...CustomerFragment
    }
  }
`;

export const DELETE_CUSTOMER = gql`
  mutation DeleteCustomer($id: ID!) {
    deleteCustomer(id: $id)
  }
`;

export const SYNC_CUSTOMER_SALESFORCE = gql`
  ${CUSTOMER_FRAGMENT}
  mutation SyncCustomerSalesforce($id: ID!) {
    syncCustomerSalesforce(id: $id) {
      ...CustomerFragment
    }
  }
`;

// Subscriptions
export const CUSTOMER_UPDATED = gql`
  ${CUSTOMER_FRAGMENT}
  subscription CustomerUpdated($id: ID!) {
    customerUpdated(id: $id) {
      ...CustomerFragment
    }
  }
`;
