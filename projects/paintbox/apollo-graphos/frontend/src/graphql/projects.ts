import { gql } from '@apollo/client';
import { ADDRESS_FRAGMENT } from './customers';

// Fragments
export const PHOTO_METADATA_FRAGMENT = gql`
  fragment PhotoMetadataFragment on PhotoMetadata {
    fileName
    fileSize
    dimensions {
      width
      height
    }
    gpsCoordinates {
      latitude
      longitude
    }
    cameraInfo {
      make
      model
    }
  }
`;

export const PROJECT_PHOTO_FRAGMENT = gql`
  ${PHOTO_METADATA_FRAGMENT}
  fragment ProjectPhotoFragment on ProjectPhoto {
    id
    url
    thumbnail
    caption
    takenAt
    companyCamId
    metadata {
      ...PhotoMetadataFragment
    }
  }
`;

export const PROJECT_TIMELINE_EVENT_FRAGMENT = gql`
  fragment ProjectTimelineEventFragment on ProjectTimelineEvent {
    id
    type
    title
    description
    timestamp
    userId
    metadata
  }
`;

export const PROJECT_FRAGMENT = gql`
  ${ADDRESS_FRAGMENT}
  ${PROJECT_PHOTO_FRAGMENT}
  ${PROJECT_TIMELINE_EVENT_FRAGMENT}
  fragment ProjectFragment on Project {
    id
    customerId
    name
    description
    status
    startDate
    endDate
    estimatedDuration
    actualDuration
    createdAt
    updatedAt
    companyCamId
    photos {
      ...ProjectPhotoFragment
    }
    timeline {
      ...ProjectTimelineEventFragment
    }
    address {
      ...AddressFragment
    }
    totalValue
  }
`;

// Queries
export const GET_PROJECT = gql`
  ${PROJECT_FRAGMENT}
  query GetProject($id: ID!) {
    project(id: $id) {
      ...ProjectFragment
    }
  }
`;

export const GET_PROJECTS = gql`
  ${PROJECT_FRAGMENT}
  query GetProjects($filter: ProjectFilter, $limit: Int = 10, $offset: Int = 0) {
    projects(filter: $filter, limit: $limit, offset: $offset) {
      edges {
        node {
          ...ProjectFragment
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

export const GET_PROJECT_PHOTOS = gql`
  ${PROJECT_PHOTO_FRAGMENT}
  query GetProjectPhotos($projectId: ID!, $limit: Int = 50) {
    projectPhotos(projectId: $projectId, limit: $limit) {
      ...ProjectPhotoFragment
    }
  }
`;

export const GET_PROJECT_TIMELINE = gql`
  ${PROJECT_TIMELINE_EVENT_FRAGMENT}
  query GetProjectTimeline($projectId: ID!, $limit: Int = 100) {
    projectTimeline(projectId: $projectId, limit: $limit) {
      ...ProjectTimelineEventFragment
    }
  }
`;

// Mutations
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

export const SYNC_PROJECT_PHOTOS = gql`
  ${PROJECT_PHOTO_FRAGMENT}
  mutation SyncProjectPhotos($projectId: ID!) {
    syncProjectPhotos(projectId: $projectId) {
      ...ProjectPhotoFragment
    }
  }
`;

export const ADD_PROJECT_TIMELINE_EVENT = gql`
  ${PROJECT_TIMELINE_EVENT_FRAGMENT}
  mutation AddProjectTimelineEvent($projectId: ID!, $input: TimelineEventInput!) {
    addProjectTimelineEvent(projectId: $projectId, input: $input) {
      ...ProjectTimelineEventFragment
    }
  }
`;

// Subscriptions
export const PROJECT_PROGRESS = gql`
  ${PROJECT_TIMELINE_EVENT_FRAGMENT}
  subscription ProjectProgress($projectId: ID!) {
    projectProgress(projectId: $projectId) {
      ...ProjectTimelineEventFragment
    }
  }
`;
