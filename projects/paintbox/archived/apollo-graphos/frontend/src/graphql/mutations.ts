import { gql } from '@apollo/client'

// Estimate mutations (from schema)
export const CREATE_ESTIMATE = gql`
  mutation CreateEstimate($input: CreateEstimateInput!) {
    createEstimate(input: $input) {
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
      notes
    }
  }
`

export const UPDATE_ESTIMATE = gql`
  mutation UpdateEstimate($id: ID!, $input: UpdateEstimateInput!) {
    updateEstimate(id: $id, input: $input) {
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
  }
`

export const DELETE_ESTIMATE = gql`
  mutation DeleteEstimate($id: ID!) {
    deleteEstimate(id: $id)
  }
`

export const GENERATE_PDF = gql`
  mutation GeneratePDF($estimateId: ID!) {
    generatePDF(estimateId: $estimateId) {
      success
      url
      error
    }
  }
`

// Customer mutations
export const CREATE_CUSTOMER = gql`
  mutation CreateCustomer($input: CreateCustomerInput!) {
    createCustomer(input: $input) {
      id
      name
      email
      phone
      address
      status
      salesforceId
      createdAt
      updatedAt
    }
  }
`

export const UPDATE_CUSTOMER = gql`
  mutation UpdateCustomer($id: ID!, $input: UpdateCustomerInput!) {
    updateCustomer(id: $id, input: $input) {
      id
      name
      email
      phone
      address
      status
      salesforceId
      lastSyncAt
      createdAt
      updatedAt
    }
  }
`

export const DELETE_CUSTOMER = gql`
  mutation DeleteCustomer($id: ID!) {
    deleteCustomer(id: $id)
  }
`

export const SYNC_CUSTOMER_WITH_SALESFORCE = gql`
  mutation SyncCustomerWithSalesforce($customerId: ID!) {
    syncCustomerWithSalesforce(customerId: $customerId) {
      success
      message
      lastSyncAt
    }
  }
`

// Project mutations
export const CREATE_PROJECT = gql`
  mutation CreateProject($input: CreateProjectInput!) {
    createProject(input: $input) {
      id
      customerId
      name
      description
      status
      createdAt
      updatedAt
    }
  }
`

export const UPDATE_PROJECT = gql`
  mutation UpdateProject($id: ID!, $input: UpdateProjectInput!) {
    updateProject(id: $id, input: $input) {
      id
      customerId
      name
      description
      status
      updatedAt
    }
  }
`

export const DELETE_PROJECT = gql`
  mutation DeleteProject($id: ID!) {
    deleteProject(id: $id)
  }
`

export const UPLOAD_PROJECT_PHOTO = gql`
  mutation UploadProjectPhoto($projectId: ID!, $file: Upload!, $caption: String) {
    uploadProjectPhoto(projectId: $projectId, file: $file, caption: $caption) {
      id
      url
      thumbnailUrl
      caption
      uploadedAt
      uploadedBy
      metadata
    }
  }
`

export const DELETE_PROJECT_PHOTO = gql`
  mutation DeleteProjectPhoto($photoId: ID!) {
    deleteProjectPhoto(photoId: $photoId)
  }
`

export const ADD_PROJECT_TIMELINE_ENTRY = gql`
  mutation AddProjectTimelineEntry($projectId: ID!, $input: TimelineEntryInput!) {
    addProjectTimelineEntry(projectId: $projectId, input: $input) {
      id
      type
      title
      description
      timestamp
      userId
      metadata
    }
  }
`

// Integration mutations
export const TRIGGER_INTEGRATION_SYNC = gql`
  mutation TriggerIntegrationSync($integrationType: String!) {
    triggerIntegrationSync(integrationType: $integrationType) {
      id
      integration
      status
      progress
      startedAt
    }
  }
`

export const CANCEL_SYNC = gql`
  mutation CancelSync($syncId: ID!) {
    cancelSync(syncId: $syncId) {
      id
      status
      cancelledAt
    }
  }
`

export const UPDATE_INTEGRATION_CONFIG = gql`
  mutation UpdateIntegrationConfig($integrationType: String!, $config: JSON!) {
    updateIntegrationConfig(integrationType: $integrationType, config: $config) {
      id
      name
      type
      status
      metadata
    }
  }
`
