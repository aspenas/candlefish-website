import { gql } from '@apollo/client';

export const DOCUMENT_CONTENT_CHANGED = gql`
  subscription DocumentContentChanged($documentId: UUID!) {
    documentContentChanged(documentId: $documentId) {
      type
      documentId
      operations {
        id
        type
        position
        length
        content
        authorId
        timestamp
        applied
      }
      author {
        id
        name
        avatar
      }
      conflictsDetected {
        id
        type
        position {
          index
          offset
          length
          depth
        }
        localOperation {
          id
          type
          content
        }
        remoteOperation {
          id
          type
          content
        }
        autoResolved
        resolution
      }
      newCrdtState {
        state
        vectorClock {
          clocks
          version
        }
        mergeable
      }
      timestamp
    }
  }
`;

export const DOCUMENT_PRESENCE_CHANGED = gql`
  subscription DocumentPresenceChanged($documentId: UUID!) {
    documentPresenceChanged(documentId: $documentId) {
      type
      documentId
      session {
        id
        user {
          id
          name
          avatar
        }
        status
        joinedAt
        lastSeenAt
        cursor {
          blockId
          offset
          x
          y
          height
        }
        selection {
          start {
            blockId
            offset
            x
            y
          }
          end {
            blockId
            offset
            x
            y
          }
          text
          isCollapsed
        }
        viewport {
          scrollTop
          scrollLeft
          visibleBlocks
          zoom
        }
        isTyping
        isIdle
        currentAction
        device {
          type
          os
          browser
          screenResolution
          timezone
          locale
        }
        connectionQuality {
          latency
          bandwidth
          connectionType
          isStable
        }
        permissions
      }
      activeUserCount
      timestamp
    }
  }
`;

export const DOCUMENT_ACTIVITY_UPDATED = gql`
  subscription DocumentActivityUpdated($documentId: UUID!) {
    documentActivityUpdated(documentId: $documentId) {
      type
      documentId
      activity {
        id
        type
        action
        description
        actor {
          id
          name
          avatar
        }
        actorType
        targetType
        targetId
        target {
          ... on Document {
            id
            name
          }
          ... on Comment {
            id
            content {
              text
            }
          }
          ... on DocumentVersion {
            id
            version
            name
          }
          ... on User {
            id
            name
            avatar
          }
        }
        context
        metadata
        impact {
          severity
          scope
          affectedUsers {
            id
            name
            avatar
          }
          changesCount
        }
        timestamp
      }
      timestamp
    }
  }
`;
