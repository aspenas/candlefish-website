import { gql } from '@apollo/client';

export const CREATE_ASSESSMENT = gql`
  mutation CreateAssessment($input: CreateAssessmentInput!) {
    createAssessment(input: $input) {
      id
      title
      description
      status
      progress
      assessmentType
      industry
      complexity
      estimatedDuration
      operatorId
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_ASSESSMENT = gql`
  mutation UpdateAssessment($id: ID!, $input: UpdateAssessmentInput!) {
    updateAssessment(id: $id, input: $input) {
      id
      title
      description
      status
      progress
      updatedAt
    }
  }
`;

export const DELETE_ASSESSMENT = gql`
  mutation DeleteAssessment($id: ID!) {
    deleteAssessment(id: $id)
  }
`;

export const SUBMIT_ASSESSMENT_RESPONSE = gql`
  mutation SubmitAssessmentResponse($input: AssessmentResponseInput!) {
    submitAssessmentResponse(input: $input)
  }
`;

export const START_ASSESSMENT_PROCESSING = gql`
  mutation StartAssessmentProcessing($id: ID!) {
    startAssessmentProcessing(id: $id) {
      id
      status
      updatedAt
    }
  }
`;

export const UPLOAD_DOCUMENT = gql`
  mutation UploadDocument($input: DocumentUploadInput!) {
    uploadDocument(input: $input) {
      id
      filename
      originalName
      mimeType
      size
      type
      status
      processingProgress
      assessmentId
      url
      thumbnailUrl
      createdAt
    }
  }
`;

export const PROCESS_DOCUMENT_BATCH = gql`
  mutation ProcessDocumentBatch($input: ProcessDocumentBatchInput!) {
    processDocumentBatch(input: $input) {
      id
      status
      processingProgress
      updatedAt
    }
  }
`;

export const DELETE_DOCUMENT = gql`
  mutation DeleteDocument($id: ID!) {
    deleteDocument(id: $id)
  }
`;

export const CREATE_OPERATOR = gql`
  mutation CreateOperator($input: CreateOperatorInput!) {
    createOperator(input: $input) {
      id
      name
      email
      tier
      companyName
      industry
      permissions
      quotas {
        maxAssessments
        maxDocuments
        maxTokensPerMonth
        maxStorageGB
        maxConcurrentProcessing
      }
      usage {
        assessmentsUsed
        documentsUsed
        tokensUsed
        storageUsedGB
        currentProcessing
        resetDate
      }
      createdAt
    }
  }
`;

export const UPDATE_OPERATOR = gql`
  mutation UpdateOperator($id: ID!, $input: UpdateOperatorInput!) {
    updateOperator(id: $id, input: $input) {
      id
      name
      companyName
      industry
      preferences
      updatedAt
    }
  }
`;

export const UPGRADE_OPERATOR_TIER = gql`
  mutation UpgradeOperatorTier($id: ID!, $tier: OperatorTier!) {
    upgradeOperatorTier(id: $id, tier: $tier) {
      id
      tier
      quotas {
        maxAssessments
        maxDocuments
        maxTokensPerMonth
        maxStorageGB
        maxConcurrentProcessing
      }
      updatedAt
    }
  }
`;

export const GENERATE_REPORT = gql`
  mutation GenerateReport($input: GenerateReportInput!) {
    generateReport(input: $input) {
      id
      title
      format
      summary
      findings {
        id
        category
        severity
        title
        description
        evidence
        recommendations
      }
      recommendations {
        id
        title
        description
        priority
        effort
        impact
        category
        resources
      }
      charts {
        id
        type
        title
        data
        config
      }
      generatedAt
      generatedBy
      parameters
      assessmentId
      url
      expiresAt
    }
  }
`;

export const DOWNLOAD_REPORT = gql`
  mutation DownloadReport($id: ID!) {
    downloadReport(id: $id)
  }
`;

export const TRIGGER_DATA_PROCESSING = gql`
  mutation TriggerDataProcessing($assessmentIds: [ID!]!) {
    triggerDataProcessing(assessmentIds: $assessmentIds)
  }
`;

export const PURGE_EXPIRED_DATA = gql`
  mutation PurgeExpiredData {
    purgeExpiredData
  }
`;