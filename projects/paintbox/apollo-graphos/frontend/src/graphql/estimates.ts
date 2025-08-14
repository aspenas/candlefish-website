import { gql } from '@apollo/client';

// Fragments
export const ESTIMATE_FRAGMENT = gql`
  fragment EstimateFragment on Estimate {
    id
    customerId
    projectId
    goodPrice
    betterPrice
    bestPrice
    selectedTier
    status
    createdAt
    updatedAt
    createdBy
    totalSquareFootage
    laborHours
    materialCost
    pdfUrl
    notes
  }
`;

export const PRICING_CALCULATION_FRAGMENT = gql`
  fragment PricingCalculationFragment on PricingCalculation {
    laborCost
    materialCost
    overheadCost
    profitMargin
    subtotal
    tax
    total
  }
`;

// Queries
export const GET_ESTIMATE = gql`
  ${ESTIMATE_FRAGMENT}
  query GetEstimate($id: ID!) {
    estimate(id: $id) {
      ...EstimateFragment
    }
  }
`;

export const GET_ESTIMATES = gql`
  ${ESTIMATE_FRAGMENT}
  query GetEstimates($filter: EstimateFilter, $limit: Int = 10, $offset: Int = 0) {
    estimates(filter: $filter, limit: $limit, offset: $offset) {
      edges {
        node {
          ...EstimateFragment
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

export const CALCULATE_PRICING = gql`
  ${PRICING_CALCULATION_FRAGMENT}
  query CalculatePricing($input: PricingInput!) {
    calculatePricing(input: $input) {
      ...PricingCalculationFragment
    }
  }
`;

// Mutations
export const CREATE_ESTIMATE = gql`
  ${ESTIMATE_FRAGMENT}
  mutation CreateEstimate($input: CreateEstimateInput!) {
    createEstimate(input: $input) {
      ...EstimateFragment
    }
  }
`;

export const UPDATE_ESTIMATE = gql`
  ${ESTIMATE_FRAGMENT}
  mutation UpdateEstimate($id: ID!, $input: UpdateEstimateInput!) {
    updateEstimate(id: $id, input: $input) {
      ...EstimateFragment
    }
  }
`;

export const DELETE_ESTIMATE = gql`
  mutation DeleteEstimate($id: ID!) {
    deleteEstimate(id: $id)
  }
`;

export const GENERATE_PDF = gql`
  mutation GeneratePDF($estimateId: ID!) {
    generatePDF(estimateId: $estimateId) {
      success
      url
      error
    }
  }
`;

// Subscriptions
export const ESTIMATE_UPDATED = gql`
  ${ESTIMATE_FRAGMENT}
  subscription EstimateUpdated($id: ID!) {
    estimateUpdated(id: $id) {
      ...EstimateFragment
    }
  }
`;

export const CALCULATION_PROGRESS = gql`
  subscription CalculationProgress($estimateId: ID!) {
    calculationProgress(estimateId: $estimateId) {
      estimateId
      stage
      progress
      message
      completed
    }
  }
`;
