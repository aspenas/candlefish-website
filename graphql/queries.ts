/**
 * Candlefish AI Documentation Platform - Client-side GraphQL Queries
 * Philosophy: Operational craft - efficient, reusable query patterns
 */

import { gql } from '@apollo/client';

// ============================================================================
// FRAGMENTS - Reusable field selections for consistency
// ============================================================================

export const USER_FRAGMENT = gql`
  fragment UserFragment on User {
    id
    email
    username
    fullName
    role
    avatar
    isActive
    createdAt
    updatedAt
  }
`;

export const DOCUMENTATION_FRAGMENT = gql`
  fragment DocumentationFragment on Documentation {
    id
    title
    slug
    excerpt
    status
    version
    createdAt
    updatedAt
    publishedAt
    section
    order
    readingTime
    difficulty
    views
    tags
    metadata
  }
`;

export const DOCUMENTATION_DETAIL_FRAGMENT = gql`
  fragment DocumentationDetailFragment on Documentation {
    ...DocumentationFragment
    content
    tableOfContents {
      id
      title
      level
      anchor
      children {
        id
        title
        level
        anchor
      }
    }
    author {
      ...UserFragment
    }
    category {
      id
      name
      slug
      description
      icon
      color
    }
    relatedDocuments {
      ...DocumentationFragment
    }
    reactions {
      id
      type
      createdAt
    }
    searchKeywords
  }
  ${USER_FRAGMENT}
  ${DOCUMENTATION_FRAGMENT}
`;

export const PARTNER_FRAGMENT = gql`
  fragment PartnerFragment on Partner {
    id
    name
    slug
    description
    website
    logo
    banner
    tier
    status
    joinedAt
    contactEmail
    profileViews
    isVerified
    verifiedAt
  }
`;

export const PARTNER_DETAIL_FRAGMENT = gql`
  fragment PartnerDetailFragment on Partner {
    ...PartnerFragment
    contactPhone
    industry {
      id
      name
      slug
    }
    size
    location {
      country
      state
      city
      timezone
    }
    specializations
    certifications {
      id
      name
      issuer
      issuedAt
      expiresAt
      credentialUrl
      isActive
    }
    implementations {
      id
      title
      description
      client
      industry {
        id
        name
      }
      duration
      teamSize
      technologies
      outcomes
      isPublic
    }
    testimonials {
      id
      content
      author
      authorTitle
      authorCompany
      rating
      isPublic
      createdAt
    }
    primaryContact {
      ...UserFragment
    }
  }
  ${PARTNER_FRAGMENT}
  ${USER_FRAGMENT}
`;

export const OPERATOR_FRAGMENT = gql`
  fragment OperatorFragment on Operator {
    id
    email
    fullName
    title
    bio
    avatar
    experience
    availability
    projectsCompleted
    clientRating
    responseTime
    isPublicProfile
    allowDirectContact
    preferredContactMethod
    createdAt
    updatedAt
  }
`;

export const API_REFERENCE_FRAGMENT = gql`
  fragment APIReferenceFragment on APIReference {
    id
    title
    slug
    description
    endpoint
    method
    apiVersion
    isPublic
    requiresAuth
    scopes
    createdAt
    updatedAt
    deprecatedAt
  }
`;

// ============================================================================
// DOCUMENTATION QUERIES
// ============================================================================

export const GET_DOCUMENTATION = gql`
  query GetDocumentation($slug: String!) {
    documentation(slug: $slug) {
      ...DocumentationDetailFragment
      blocks {
        ... on TextBlock {
          id
          type
          order
          content
          format
        }
        ... on CodeBlock {
          id
          type
          order
          code
          language
          filename
          showLineNumbers
        }
        ... on ImageBlock {
          id
          type
          order
          caption
          alt
          asset {
            id
            url
            cdnUrl
            alt
            description
          }
        }
        ... on VideoBlock {
          id
          type
          order
          caption
          url
          thumbnail
          asset {
            id
            url
            cdnUrl
          }
        }
      }
      assets {
        id
        filename
        url
        cdnUrl
        alt
        description
        mimeType
        size
      }
      feedback {
        id
        content
        type
        rating
        isPublic
        createdAt
        user {
          username
        }
      }
    }
  }
  ${DOCUMENTATION_DETAIL_FRAGMENT}
`;

export const GET_ALL_DOCUMENTATION = gql`
  query GetAllDocumentation(
    $first: Int = 20
    $after: String
    $category: String
    $status: ContentStatus
    $tags: [String!]
  ) {
    allDocumentation(
      first: $first
      after: $after
      category: $category
      status: $status
      tags: $tags
    ) {
      edges {
        node {
          ...DocumentationFragment
          author {
            username
            fullName
          }
          category {
            name
            slug
            icon
          }
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
  ${DOCUMENTATION_FRAGMENT}
`;

export const GET_DOCUMENTATION_CATEGORIES = gql`
  query GetDocumentationCategories {
    documentationCategories {
      id
      name
      slug
      description
      icon
      color
      order
      parentCategory {
        id
        name
        slug
      }
      subcategories {
        id
        name
        slug
        description
        icon
      }
    }
  }
`;

// ============================================================================
// PARTNER QUERIES
// ============================================================================

export const GET_PARTNER = gql`
  query GetPartner($slug: String!) {
    partner(slug: $slug) {
      ...PartnerDetailFragment
      operators {
        ...OperatorFragment
        skills {
          id
          name
          category
          level
        }
        specializations
        certifications {
          id
          name
          issuer
          issuedAt
          expiresAt
        }
        partner {
          id
          name
        }
      }
      resources {
        id
        title
        slug
        resourceType
        downloadUrl
        externalUrl
        accessLevel
        downloads
        createdAt
      }
      caseStudies {
        id
        title
        slug
        client
        industry {
          name
        }
        challenge
        solution
        results
        featured
        isPublic
      }
    }
  }
  ${PARTNER_DETAIL_FRAGMENT}
  ${OPERATOR_FRAGMENT}
`;

export const GET_ALL_PARTNERS = gql`
  query GetAllPartners(
    $first: Int = 20
    $after: String
    $tier: PartnerTier
    $status: PartnerStatus
    $industry: String
  ) {
    allPartners(
      first: $first
      after: $after
      tier: $tier
      status: $status
      industry: $industry
    ) {
      edges {
        node {
          ...PartnerFragment
          industry {
            name
          }
          location {
            country
            city
          }
          operators(first: 3) {
            edges {
              node {
                id
                fullName
                title
                avatar
                availability
              }
            }
            totalCount
          }
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
  ${PARTNER_FRAGMENT}
`;

export const GET_OPERATORS = gql`
  query GetOperators(
    $first: Int = 20
    $after: String
    $partner: ID
    $skills: [String!]
    $availability: Availability
  ) {
    operators(
      first: $first
      after: $after
      partner: $partner
      skills: $skills
      availability: $availability
    ) {
      edges {
        node {
          ...OperatorFragment
          skills {
            id
            name
            category
            level
          }
          partner {
            id
            name
            logo
            tier
          }
          specializations
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
  ${OPERATOR_FRAGMENT}
`;

// ============================================================================
// API REFERENCE QUERIES
// ============================================================================

export const GET_API_REFERENCE = gql`
  query GetAPIReference($slug: String!) {
    apiReference(slug: $slug) {
      ...APIReferenceFragment
      content
      service {
        id
        name
        slug
        description
        baseUrl
        version
        isActive
      }
      parameters {
        name
        type
        required
        description
        example
        enum
        format
        pattern
      }
      requestBody {
        type
        properties
        example
        schema
      }
      responses {
        statusCode
        description
        schema {
          type
          properties
          example
        }
        headers {
          name
          value
          description
        }
        examples
      }
      examples {
        id
        title
        description
        language
        request {
          method
          url
          headers
          body
        }
        response {
          statusCode
          headers
          body
        }
      }
      rateLimit {
        requests
        window
        burst
      }
      author {
        username
        fullName
      }
    }
  }
  ${API_REFERENCE_FRAGMENT}
`;

export const GET_API_REFERENCES = gql`
  query GetAPIReferences(
    $first: Int = 20
    $after: String
    $service: String
    $version: String
  ) {
    apiReferences(
      first: $first
      after: $after
      service: $service
      version: $version
    ) {
      edges {
        node {
          ...APIReferenceFragment
          service {
            name
            version
          }
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
  ${API_REFERENCE_FRAGMENT}
`;

export const GET_API_SERVICES = gql`
  query GetAPIServices {
    apiServices {
      id
      name
      slug
      description
      baseUrl
      version
      isActive
      authentication {
        type
        description
      }
      endpoints {
        id
        title
        endpoint
        method
        description
        requiresAuth
      }
    }
  }
`;

// ============================================================================
// SEARCH QUERIES
// ============================================================================

export const SEARCH_CONTENT = gql`
  query SearchContent(
    $query: String!
    $types: [SearchResultType!]
    $page: Int = 1
    $pageSize: Int = 20
  ) {
    search(query: $query, types: $types, page: $page, pageSize: $pageSize) {
      query
      total
      page
      pageSize
      results {
        id
        type
        title
        excerpt
        url
        score
        highlights
        metadata
      }
      facets
      suggestions
    }
  }
`;

// ============================================================================
// USER QUERIES
// ============================================================================

export const GET_ME = gql`
  query GetMe {
    me {
      ...UserFragment
      permissions
      partnerProfile {
        id
        name
        slug
        tier
        status
      }
    }
  }
  ${USER_FRAGMENT}
`;

export const GET_USER_DOCUMENTS = gql`
  query GetUserDocuments($first: Int = 20, $after: String) {
    me {
      id
      createdDocuments(first: $first, after: $after) {
        edges {
          node {
            ...DocumentationFragment
            category {
              name
              icon
            }
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
  }
  ${DOCUMENTATION_FRAGMENT}
`;

// ============================================================================
// ANALYTICS QUERIES
// ============================================================================

export const GET_ANALYTICS = gql`
  query GetAnalytics(
    $type: String!
    $period: AnalyticsPeriod!
    $startDate: DateTime
    $endDate: DateTime
  ) {
    analytics(
      type: $type
      period: $period
      startDate: $startDate
      endDate: $endDate
    ) {
      period
      startDate
      endDate
      metrics
    }
  }
`;

// ============================================================================
// MUTATIONS
// ============================================================================

export const CREATE_DOCUMENTATION = gql`
  mutation CreateDocumentation($input: CreateDocumentationInput!) {
    createDocumentation(input: $input) {
      ...DocumentationDetailFragment
    }
  }
  ${DOCUMENTATION_DETAIL_FRAGMENT}
`;

export const UPDATE_DOCUMENTATION = gql`
  mutation UpdateDocumentation($id: ID!, $input: UpdateDocumentationInput!) {
    updateDocumentation(id: $id, input: $input) {
      ...DocumentationDetailFragment
    }
  }
  ${DOCUMENTATION_DETAIL_FRAGMENT}
`;

export const PUBLISH_DOCUMENTATION = gql`
  mutation PublishDocumentation($id: ID!) {
    publishDocumentation(id: $id) {
      id
      status
      publishedAt
    }
  }
`;

export const REGISTER_PARTNER = gql`
  mutation RegisterPartner($input: RegisterPartnerInput!) {
    registerPartner(input: $input) {
      ...PartnerFragment
    }
  }
  ${PARTNER_FRAGMENT}
`;

export const SUBMIT_LEAD = gql`
  mutation SubmitLead($input: SubmitLeadInput!) {
    submitLead(input: $input) {
      id
      name
      email
      company
      message
      status
      createdAt
    }
  }
`;

export const ADD_REACTION = gql`
  mutation AddReaction($contentId: ID!, $type: ReactionType!) {
    addReaction(contentId: $contentId, type: $type) {
      id
      type
      createdAt
    }
  }
`;

export const SUBMIT_FEEDBACK = gql`
  mutation SubmitFeedback($input: SubmitFeedbackInput!) {
    submitFeedback(input: $input) {
      id
      content
      type
      rating
      createdAt
    }
  }
`;

export const LOGIN = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      refreshToken
      expiresAt
      user {
        ...UserFragment
        permissions
      }
    }
  }
  ${USER_FRAGMENT}
`;

// ============================================================================
// SUBSCRIPTIONS
// ============================================================================

export const DOCUMENTATION_UPDATED_SUBSCRIPTION = gql`
  subscription DocumentationUpdated($categoryId: ID) {
    documentationUpdated(categoryId: $categoryId) {
      ...DocumentationFragment
    }
  }
  ${DOCUMENTATION_FRAGMENT}
`;

export const DOCUMENTATION_PUBLISHED_SUBSCRIPTION = gql`
  subscription DocumentationPublished {
    documentationPublished {
      ...DocumentationFragment
      author {
        username
        fullName
      }
      category {
        name
      }
    }
  }
  ${DOCUMENTATION_FRAGMENT}
`;

export const PARTNER_STATUS_CHANGED_SUBSCRIPTION = gql`
  subscription PartnerStatusChanged($partnerId: ID) {
    partnerStatusChanged(partnerId: $partnerId) {
      ...PartnerFragment
    }
  }
  ${PARTNER_FRAGMENT}
`;

export const OPERATOR_AVAILABILITY_CHANGED_SUBSCRIPTION = gql`
  subscription OperatorAvailabilityChanged($partnerId: ID) {
    operatorAvailabilityChanged(partnerId: $partnerId) {
      ...OperatorFragment
      partner {
        id
        name
      }
    }
  }
  ${OPERATOR_FRAGMENT}
`;

// ============================================================================
// QUERY COMPLEXITY SCORING
// ============================================================================

/**
 * Query complexity analysis for rate limiting and performance monitoring
 * Philosophy: Operational craft - predictable performance characteristics
 */
export const QUERY_COMPLEXITY_RULES = {
  // Base complexity for each type
  User: 1,
  Documentation: 2,
  Partner: 2,
  Operator: 1,
  APIReference: 2,

  // Field-specific complexity multipliers
  'Documentation.relatedDocuments': 5,
  'Documentation.blocks': 3,
  'Documentation.assets': 2,
  'Partner.operators': 4,
  'Partner.implementations': 3,
  'Partner.testimonials': 2,
  'User.createdDocuments': 4,

  // Connection complexity (pagination)
  connection: 2,

  // Search complexity
  search: 10,

  // Analytics complexity
  analytics: 15,

  // Maximum allowed complexity per query
  maxComplexity: 100,

  // Complexity scoring function
  calculateComplexity: (query: any): number => {
    // This would be implemented to traverse the query AST
    // and calculate total complexity based on the rules above
    return 0;
  },
};

export default {
  // Fragments
  USER_FRAGMENT,
  DOCUMENTATION_FRAGMENT,
  DOCUMENTATION_DETAIL_FRAGMENT,
  PARTNER_FRAGMENT,
  PARTNER_DETAIL_FRAGMENT,
  OPERATOR_FRAGMENT,
  API_REFERENCE_FRAGMENT,

  // Queries
  GET_DOCUMENTATION,
  GET_ALL_DOCUMENTATION,
  GET_DOCUMENTATION_CATEGORIES,
  GET_PARTNER,
  GET_ALL_PARTNERS,
  GET_OPERATORS,
  GET_API_REFERENCE,
  GET_API_REFERENCES,
  GET_API_SERVICES,
  SEARCH_CONTENT,
  GET_ME,
  GET_USER_DOCUMENTS,
  GET_ANALYTICS,

  // Mutations
  CREATE_DOCUMENTATION,
  UPDATE_DOCUMENTATION,
  PUBLISH_DOCUMENTATION,
  REGISTER_PARTNER,
  SUBMIT_LEAD,
  ADD_REACTION,
  SUBMIT_FEEDBACK,
  LOGIN,

  // Subscriptions
  DOCUMENTATION_UPDATED_SUBSCRIPTION,
  DOCUMENTATION_PUBLISHED_SUBSCRIPTION,
  PARTNER_STATUS_CHANGED_SUBSCRIPTION,
  OPERATOR_AVAILABILITY_CHANGED_SUBSCRIPTION,

  // Complexity rules
  QUERY_COMPLEXITY_RULES,
};
