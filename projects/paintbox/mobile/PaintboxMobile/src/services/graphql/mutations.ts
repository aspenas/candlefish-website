import { gql } from '@apollo/client';
import { PROJECT_FRAGMENT, ESTIMATE_FRAGMENT, PROJECT_PHOTO_FRAGMENT } from './queries';

// Estimate mutations
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

// Project mutations
export const CREATE_PROJECT = gql`
  ${PROJECT_FRAGMENT}
  mutation CreateProject($input: CreateProjectInput!) {
    createProject(input: $input) {
      ...ProjectFragment
    }
  }
`;

export const UPDATE_PROJECT = gql`
  ${PROJECT_FRAGMENT}
  mutation UpdateProject($id: ID!, $input: UpdateProjectInput!) {
    updateProject(id: $id, input: $input) {
      ...ProjectFragment
    }
  }
`;

export const DELETE_PROJECT = gql`
  mutation DeleteProject($id: ID!) {
    deleteProject(id: $id)
  }
`;

export const START_PROJECT = gql`
  ${PROJECT_FRAGMENT}
  mutation StartProject($id: ID!) {
    startProject(id: $id) {
      ...ProjectFragment
    }
  }
`;

export const PAUSE_PROJECT = gql`
  ${PROJECT_FRAGMENT}
  mutation PauseProject($id: ID!, $reason: String) {
    pauseProject(id: $id, reason: $reason) {
      ...ProjectFragment
    }
  }
`;

export const COMPLETE_PROJECT = gql`
  ${PROJECT_FRAGMENT}
  mutation CompleteProject($id: ID!, $input: CompleteProjectInput!) {
    completeProject(id: $id, input: $input) {
      ...ProjectFragment
    }
  }
`;

export const ARCHIVE_PROJECT = gql`
  ${PROJECT_FRAGMENT}
  mutation ArchiveProject($id: ID!) {
    archiveProject(id: $id) {
      ...ProjectFragment
    }
  }
`;

// Photo mutations - Company Cam integration
export const UPLOAD_PROJECT_PHOTO = gql`
  ${PROJECT_PHOTO_FRAGMENT}
  mutation UploadProjectPhoto($projectId: ID!, $input: PhotoUploadInput!) {
    uploadProjectPhoto(projectId: $projectId, input: $input) {
      ...ProjectPhotoFragment
    }
  }
`;

export const DELETE_PROJECT_PHOTO = gql`
  mutation DeleteProjectPhoto($projectId: ID!, $photoId: ID!) {
    deleteProjectPhoto(projectId: $projectId, photoId: $photoId)
  }
`;

export const SYNC_PROJECT_FROM_COMPANY_CAM = gql`
  ${PROJECT_FRAGMENT}
  mutation SyncProjectFromCompanyCam($companyCamId: String!) {
    syncProjectFromCompanyCam(companyCamId: $companyCamId) {
      ...ProjectFragment
    }
  }
`;

export const BULK_SYNC_PHOTOS = gql`
  mutation BulkSyncPhotos($projectId: ID!) {
    bulkSyncPhotos(projectId: $projectId) {
      projectId
      totalPhotos
      syncedPhotos
      failedPhotos
      errors {
        companyCamId
        error
        retryable
      }
      duration
    }
  }
`;

// Manager approval mutations
export const APPROVE_ESTIMATE_DISCOUNT = gql`
  ${ESTIMATE_FRAGMENT}
  mutation ApproveEstimateDiscount($estimateId: ID!, $discountPercentage: Float!, $reason: String) {
    updateEstimate(
      id: $estimateId
      input: { 
        status: SENT
        notes: $reason 
      }
    ) {
      ...EstimateFragment
    }
  }
`;

export const REJECT_ESTIMATE = gql`
  ${ESTIMATE_FRAGMENT}
  mutation RejectEstimate($estimateId: ID!, $reason: String!) {
    updateEstimate(
      id: $estimateId
      input: { 
        status: REJECTED
        notes: $reason 
      }
    ) {
      ...EstimateFragment
    }
  }
`;

export const APPROVE_PROJECT_CHANGE = gql`
  ${PROJECT_FRAGMENT}
  mutation ApproveProjectChange($projectId: ID!, $changeDescription: String!) {
    updateProject(
      id: $projectId
      input: {
        status: IN_PROGRESS
        notes: $changeDescription
      }
    ) {
      ...ProjectFragment
    }
  }
`;

// Measurement mutations (for offline support)
export const SAVE_MEASUREMENT_DRAFT = gql`
  mutation SaveMeasurementDraft($estimateId: ID!, $measurementData: JSON!) {
    # This would be handled locally and synced later
    # Using a custom local mutation resolver
    saveMeasurementDraft(estimateId: $estimateId, data: $measurementData) @client {
      success
      localId
      syncStatus
    }
  }
`;

export const SYNC_MEASUREMENTS = gql`
  mutation SyncMeasurements($estimateId: ID!, $measurements: [MeasurementInput!]!) {
    # This would sync local measurements to the server
    syncMeasurements(estimateId: $estimateId, measurements: $measurements) {
      syncedCount
      failedCount
      errors
    }
  }
`;

// GPS and location mutations
export const UPDATE_PROJECT_LOCATION = gql`
  ${PROJECT_FRAGMENT}
  mutation UpdateProjectLocation($projectId: ID!, $coordinates: CoordinatesInput!) {
    updateProject(
      id: $projectId
      input: {
        serviceAddress: {
          coordinates: $coordinates
        }
      }
    ) {
      ...ProjectFragment
    }
  }
`;

// Offline queue mutations (handled locally)
export const QUEUE_MUTATION = gql`
  mutation QueueMutation($mutation: String!, $variables: JSON!, $operationName: String!) {
    queueMutation(
      mutation: $mutation
      variables: $variables
      operationName: $operationName
    ) @client {
      id
      status
      queuedAt
    }
  }
`;

export const PROCESS_QUEUE = gql`
  mutation ProcessQueue {
    processQueue @client {
      processed
      failed
      errors
    }
  }
`;

// Photo annotation mutations (WW tags)
export const ADD_WW_TAGS_TO_PHOTO = gql`
  ${PROJECT_PHOTO_FRAGMENT}
  mutation AddWWTagsToPhoto($photoId: ID!, $tags: [String!]!, $surface: String, $room: String) {
    # This would be a custom mutation to add WW tags to photos
    updateProjectPhoto(
      id: $photoId
      input: {
        tags: $tags
        surface: $surface
        room: $room
      }
    ) {
      ...ProjectPhotoFragment
    }
  }
`;

export const ANNOTATE_PHOTO = gql`
  ${PROJECT_PHOTO_FRAGMENT}
  mutation AnnotatePhoto($photoId: ID!, $annotations: JSON!) {
    annotatePhoto(photoId: $photoId, annotations: $annotations) {
      ...ProjectPhotoFragment
    }
  }
`;

// Batch operations for offline efficiency
export const BATCH_UPDATE_PROJECTS = gql`
  ${PROJECT_FRAGMENT}
  mutation BatchUpdateProjects($updates: [ProjectUpdateBatch!]!) {
    batchUpdateProjects(updates: $updates) {
      ...ProjectFragment
    }
  }
`;

export const BATCH_UPLOAD_PHOTOS = gql`
  ${PROJECT_PHOTO_FRAGMENT}
  mutation BatchUploadPhotos($projectId: ID!, $photos: [PhotoUploadInput!]!) {
    batchUploadPhotos(projectId: $projectId, photos: $photos) {
      ...ProjectPhotoFragment
    }
  }
`;