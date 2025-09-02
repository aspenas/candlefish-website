import { gql } from '@apollo/client';

// Fragment definitions for reusability
export const USER_FRAGMENT = gql`
  fragment UserFragment on User {
    id
    email
    name
    avatar
    status
    lastSeen
    preferences {
      theme
      language
      timezone
    }
  }
`;

export const PROJECT_FRAGMENT = gql`
  fragment ProjectFragment on Project {
    id
    name
    description
    owner {
      ...UserFragment
    }
    visibility
    createdAt
    updatedAt
    settings {
      allowComments
      allowSuggestions
      autoSave
      collaborationMode
    }
  }
  ${USER_FRAGMENT}
`;

export const DOCUMENT_FRAGMENT = gql`
  fragment DocumentFragment on Document {
    id
    title
    content
    type
    status
    project {
      id
      name
    }
    author {
      ...UserFragment
    }
    createdAt
    updatedAt
    metadata {
      wordCount
      readTime
      lastEditedBy {
        ...UserFragment
      }
      tags
    }
  }
  ${USER_FRAGMENT}
`;

export const VERSION_FRAGMENT = gql`
  fragment VersionFragment on Version {
    id
    version
    name
    description
    author {
      ...UserFragment
    }
    changes {
      type
      position
      content
      length
    }
    createdAt
    isCurrent
  }
  ${USER_FRAGMENT}
`;

export const COMMENT_FRAGMENT = gql`
  fragment CommentFragment on Comment {
    id
    content
    author {
      ...UserFragment
    }
    position {
      blockId
      startOffset
      endOffset
    }
    thread {
      id
      subject
      status
    }
    replies {
      id
      content
      author {
        ...UserFragment
      }
      createdAt
    }
    reactions {
      type
      users {
        id
        name
        avatar
      }
    }
    status
    createdAt
    updatedAt
  }
  ${USER_FRAGMENT}
`;

export const AI_INSIGHT_FRAGMENT = gql`
  fragment AIInsightFragment on AIInsight {
    id
    type
    title
    description
    suggestion
    confidence
    position {
      blockId
      startOffset
      endOffset
    }
    metadata
    status
    createdAt
    appliedAt
  }
`;

export const COLLABORATION_SESSION_FRAGMENT = gql`
  fragment CollaborationSessionFragment on CollaborationSession {
    id
    documentId
    participants {
      user {
        ...UserFragment
      }
      role
      status
      presence {
        cursor {
          blockId
          offset
          x
          y
        }
        selection {
          start {
            blockId
            offset
          }
          end {
            blockId
            offset
          }
          text
        }
        isTyping
        currentAction
      }
      joinedAt
      lastSeen
    }
    startedAt
    isActive
  }
  ${USER_FRAGMENT}
`;

// Query operations
export const GET_PROJECTS = gql`
  query GetProjects($first: Int, $after: String, $filter: ProjectFilter) {
    projects(first: $first, after: $after, filter: $filter) {
      edges {
        node {
          ...ProjectFragment
          documentCount
          collaboratorCount
          lastActivity
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
  ${PROJECT_FRAGMENT}
`;

export const GET_PROJECT = gql`
  query GetProject($id: ID!) {
    project(id: $id) {
      ...ProjectFragment
      documents {
        edges {
          node {
            ...DocumentFragment
            collaboratorCount
            commentCount
            versionCount
          }
        }
      }
      collaborators {
        user {
          ...UserFragment
        }
        role
        permissions
        joinedAt
      }
      activity {
        edges {
          node {
            id
            type
            action
            description
            actor {
              ...UserFragment
            }
            target {
              type
              id
              name
            }
            timestamp
            impact {
              severity
              scope
            }
          }
        }
      }
    }
  }
  ${PROJECT_FRAGMENT}
  ${DOCUMENT_FRAGMENT}
  ${USER_FRAGMENT}
`;

export const GET_DOCUMENT = gql`
  query GetDocument($id: ID!) {
    document(id: $id) {
      ...DocumentFragment
      versions {
        edges {
          node {
            ...VersionFragment
          }
        }
      }
      comments {
        edges {
          node {
            ...CommentFragment
          }
        }
      }
      collaborators {
        user {
          ...UserFragment
        }
        role
        permissions
        status
        presence {
          cursor {
            blockId
            offset
            x
            y
          }
          selection {
            start {
              blockId
              offset
            }
            end {
              blockId
              offset
            }
            text
          }
          isTyping
          currentAction
        }
        joinedAt
        lastSeen
      }
      aiInsights {
        edges {
          node {
            ...AIInsightFragment
          }
        }
      }
    }
  }
  ${DOCUMENT_FRAGMENT}
  ${VERSION_FRAGMENT}
  ${COMMENT_FRAGMENT}
  ${AI_INSIGHT_FRAGMENT}
  ${USER_FRAGMENT}
`;

export const GET_DOCUMENT_VERSIONS = gql`
  query GetDocumentVersions($documentId: ID!, $first: Int, $after: String) {
    document(id: $documentId) {
      id
      versions(first: $first, after: $after) {
        edges {
          node {
            ...VersionFragment
            compareUrl
            downloadUrl
          }
          cursor
        }
        pageInfo {
          hasNextPage
          hasPreviousPage
          startCursor
          endCursor
        }
      }
    }
  }
  ${VERSION_FRAGMENT}
`;

export const GET_COLLABORATION_SESSION = gql`
  query GetCollaborationSession($documentId: ID!) {
    collaborationSession(documentId: $documentId) {
      ...CollaborationSessionFragment
    }
  }
  ${COLLABORATION_SESSION_FRAGMENT}
`;

// Mutation operations
export const CREATE_PROJECT = gql`
  mutation CreateProject($input: CreateProjectInput!) {
    createProject(input: $input) {
      project {
        ...ProjectFragment
      }
      errors {
        field
        message
      }
    }
  }
  ${PROJECT_FRAGMENT}
`;

export const UPDATE_PROJECT = gql`
  mutation UpdateProject($id: ID!, $input: UpdateProjectInput!) {
    updateProject(id: $id, input: $input) {
      project {
        ...ProjectFragment
      }
      errors {
        field
        message
      }
    }
  }
  ${PROJECT_FRAGMENT}
`;

export const DELETE_PROJECT = gql`
  mutation DeleteProject($id: ID!) {
    deleteProject(id: $id) {
      success
      errors {
        field
        message
      }
    }
  }
`;

export const CREATE_DOCUMENT = gql`
  mutation CreateDocument($input: CreateDocumentInput!) {
    createDocument(input: $input) {
      document {
        ...DocumentFragment
      }
      errors {
        field
        message
      }
    }
  }
  ${DOCUMENT_FRAGMENT}
`;

export const UPDATE_DOCUMENT = gql`
  mutation UpdateDocument($id: ID!, $input: UpdateDocumentInput!) {
    updateDocument(id: $id, input: $input) {
      document {
        ...DocumentFragment
      }
      errors {
        field
        message
      }
    }
  }
  ${DOCUMENT_FRAGMENT}
`;

export const APPLY_DOCUMENT_OPERATION = gql`
  mutation ApplyDocumentOperation($documentId: ID!, $operation: DocumentOperationInput!) {
    applyDocumentOperation(documentId: $documentId, operation: $operation) {
      success
      version
      conflicts {
        type
        localChange
        remoteChange
        suggestedResolution
      }
      errors {
        field
        message
      }
    }
  }
`;

export const CREATE_COMMENT = gql`
  mutation CreateComment($input: CreateCommentInput!) {
    createComment(input: $input) {
      comment {
        ...CommentFragment
      }
      errors {
        field
        message
      }
    }
  }
  ${COMMENT_FRAGMENT}
`;

export const UPDATE_COMMENT = gql`
  mutation UpdateComment($id: ID!, $input: UpdateCommentInput!) {
    updateComment(id: $id, input: $input) {
      comment {
        ...CommentFragment
      }
      errors {
        field
        message
      }
    }
  }
  ${COMMENT_FRAGMENT}
`;

export const RESOLVE_COMMENT = gql`
  mutation ResolveComment($id: ID!) {
    resolveComment(id: $id) {
      comment {
        ...CommentFragment
      }
      errors {
        field
        message
      }
    }
  }
  ${COMMENT_FRAGMENT}
`;

export const CREATE_VERSION = gql`
  mutation CreateVersion($input: CreateVersionInput!) {
    createVersion(input: $input) {
      version {
        ...VersionFragment
      }
      errors {
        field
        message
      }
    }
  }
  ${VERSION_FRAGMENT}
`;

export const JOIN_COLLABORATION = gql`
  mutation JoinCollaboration($documentId: ID!) {
    joinCollaboration(documentId: $documentId) {
      session {
        ...CollaborationSessionFragment
      }
      errors {
        field
        message
      }
    }
  }
  ${COLLABORATION_SESSION_FRAGMENT}
`;

export const LEAVE_COLLABORATION = gql`
  mutation LeaveCollaboration($documentId: ID!) {
    leaveCollaboration(documentId: $documentId) {
      success
      errors {
        field
        message
      }
    }
  }
`;

export const UPDATE_PRESENCE = gql`
  mutation UpdatePresence($documentId: ID!, $presence: PresenceInput!) {
    updatePresence(documentId: $documentId, presence: $presence) {
      success
      errors {
        field
        message
      }
    }
  }
`;

export const APPLY_AI_SUGGESTION = gql`
  mutation ApplyAISuggestion($id: ID!, $action: AISuggestionAction!) {
    applyAISuggestion(id: $id, action: $action) {
      success
      appliedChanges {
        type
        position
        content
      }
      errors {
        field
        message
      }
    }
  }
`;

// Subscription operations
export const DOCUMENT_CHANGED = gql`
  subscription DocumentChanged($documentId: ID!) {
    documentChanged(documentId: $documentId) {
      type
      documentId
      operation {
        type
        position
        content
        length
        userId
        timestamp
      }
      version
      author {
        ...UserFragment
      }
    }
  }
  ${USER_FRAGMENT}
`;

export const PRESENCE_UPDATED = gql`
  subscription PresenceUpdated($documentId: ID!) {
    presenceUpdated(documentId: $documentId) {
      userId
      user {
        ...UserFragment
      }
      presence {
        cursor {
          blockId
          offset
          x
          y
        }
        selection {
          start {
            blockId
            offset
          }
          end {
            blockId
            offset
          }
          text
        }
        isTyping
        currentAction
      }
      status
      timestamp
    }
  }
  ${USER_FRAGMENT}
`;

export const COMMENT_UPDATED = gql`
  subscription CommentUpdated($documentId: ID!) {
    commentUpdated(documentId: $documentId) {
      type
      comment {
        ...CommentFragment
      }
    }
  }
  ${COMMENT_FRAGMENT}
`;

export const AI_SUGGESTION_RECEIVED = gql`
  subscription AISuggestionReceived($documentId: ID!) {
    aiSuggestionReceived(documentId: $documentId) {
      insight {
        ...AIInsightFragment
      }
      priority
    }
  }
  ${AI_INSIGHT_FRAGMENT}
`;

export const COLLABORATION_SESSION_UPDATED = gql`
  subscription CollaborationSessionUpdated($documentId: ID!) {
    collaborationSessionUpdated(documentId: $documentId) {
      session {
        ...CollaborationSessionFragment
      }
      event {
        type
        userId
        timestamp
      }
    }
  }
  ${COLLABORATION_SESSION_FRAGMENT}
`;

export const VERSION_CREATED = gql`
  subscription VersionCreated($documentId: ID!) {
    versionCreated(documentId: $documentId) {
      version {
        ...VersionFragment
      }
    }
  }
  ${VERSION_FRAGMENT}
`;