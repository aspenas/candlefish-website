# Real-Time Collaboration Service Implementations

## 1. Collaboration Service (TypeScript + Socket.io)

### Core WebSocket Handler
```typescript
// services/collaboration/src/websocket/collaborationHandler.ts
import { Server, Socket } from 'socket.io';
import { OperationalTransform } from '../ot/operationalTransform';
import { DocumentState } from '../types/document';
import { RedisAdapter } from '../adapters/redisAdapter';

export class CollaborationHandler {
  private io: Server;
  private ot: OperationalTransform;
  private redis: RedisAdapter;
  private activeDocuments = new Map<string, DocumentState>();

  constructor(io: Server, redisAdapter: RedisAdapter) {
    this.io = io;
    this.ot = new OperationalTransform();
    this.redis = redisAdapter;
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.io.on('connection', this.handleConnection.bind(this));
  }

  private async handleConnection(socket: Socket) {
    const userId = socket.handshake.auth.userId;
    const sessionId = socket.handshake.auth.sessionId;
    
    console.log(`User ${userId} connected with session ${sessionId}`);

    // Handle joining document collaboration
    socket.on('join-document', async (data: {
      documentId: string;
      currentVersion: number;
    }) => {
      await this.handleJoinDocument(socket, data);
    });

    // Handle document operations
    socket.on('document-operation', async (operation: DocumentOperation) => {
      await this.handleDocumentOperation(socket, operation);
    });

    // Handle cursor updates
    socket.on('cursor-update', async (cursor: CursorPosition) => {
      await this.handleCursorUpdate(socket, cursor);
    });

    // Handle presence updates
    socket.on('presence-update', async (presence: PresenceData) => {
      await this.handlePresenceUpdate(socket, presence);
    });

    socket.on('disconnect', async () => {
      await this.handleDisconnect(socket);
    });
  }

  private async handleJoinDocument(socket: Socket, data: {
    documentId: string;
    currentVersion: number;
  }) {
    const { documentId, currentVersion } = data;
    const userId = socket.handshake.auth.userId;

    // Verify permissions
    const hasPermission = await this.verifyDocumentPermission(
      userId, 
      documentId, 
      'read'
    );
    
    if (!hasPermission) {
      socket.emit('error', { message: 'Insufficient permissions' });
      return;
    }

    // Join document room
    await socket.join(`document:${documentId}`);

    // Get current document state
    let documentState = this.activeDocuments.get(documentId);
    if (!documentState) {
      documentState = await this.loadDocumentState(documentId);
      this.activeDocuments.set(documentId, documentState);
    }

    // Send current state and missing operations
    const missingOps = await this.getMissingOperations(
      documentId, 
      currentVersion
    );

    socket.emit('document-state', {
      documentId,
      currentState: documentState,
      missingOperations: missingOps,
      activeUsers: await this.getActiveUsers(documentId)
    });

    // Notify other users of new collaborator
    socket.to(`document:${documentId}`).emit('user-joined', {
      userId,
      timestamp: new Date().toISOString()
    });

    // Update presence
    await this.updateUserPresence(userId, documentId, 'active');
  }

  private async handleDocumentOperation(
    socket: Socket, 
    operation: DocumentOperation
  ) {
    const { documentId, operationType, operationData, clientSequence } = operation;
    const userId = socket.handshake.auth.userId;

    try {
      // Verify write permissions
      const canEdit = await this.verifyDocumentPermission(
        userId, 
        documentId, 
        'write'
      );
      
      if (!canEdit) {
        socket.emit('operation-error', { 
          message: 'Insufficient permissions',
          clientSequence 
        });
        return;
      }

      // Get current document state
      const documentState = this.activeDocuments.get(documentId);
      if (!documentState) {
        throw new Error('Document not loaded');
      }

      // Get concurrent operations since client's last known state
      const concurrentOps = await this.getConcurrentOperations(
        documentId, 
        clientSequence
      );

      // Transform operation against concurrent operations
      const transformedOp = this.ot.transformOperation(
        operation, 
        concurrentOps
      );

      // Apply operation to document state
      const newState = this.ot.applyOperation(documentState, transformedOp);
      this.activeDocuments.set(documentId, newState);

      // Persist operation to database
      const serverSequence = await this.persistOperation(
        documentId,
        userId,
        transformedOp
      );

      // Broadcast to all clients in document room
      socket.to(`document:${documentId}`).emit('operation-applied', {
        operation: transformedOp,
        serverSequence,
        userId,
        timestamp: new Date().toISOString()
      });

      // Confirm to sender
      socket.emit('operation-confirmed', {
        clientSequence,
        serverSequence,
        transformedOperation: transformedOp
      });

      // Trigger AI suggestions if applicable
      if (this.shouldTriggerAI(operation)) {
        this.triggerAISuggestions(documentId, userId, newState);
      }

    } catch (error) {
      console.error('Error processing operation:', error);
      socket.emit('operation-error', {
        message: 'Failed to process operation',
        clientSequence
      });
    }
  }

  private async handleCursorUpdate(socket: Socket, cursor: CursorPosition) {
    const userId = socket.handshake.auth.userId;
    const { documentId, position, selection } = cursor;

    // Broadcast cursor position to other users in document
    socket.to(`document:${documentId}`).emit('cursor-updated', {
      userId,
      position,
      selection,
      timestamp: new Date().toISOString()
    });

    // Update cursor position in Redis for persistence across reconnects
    await this.redis.set(
      `cursor:${documentId}:${userId}`,
      JSON.stringify({ position, selection, timestamp: Date.now() }),
      'EX',
      300 // 5 minutes TTL
    );
  }

  private async triggerAISuggestions(
    documentId: string,
    userId: string,
    documentState: DocumentState
  ) {
    // Trigger AI suggestion generation via HTTP call to AI service
    try {
      await fetch(`${process.env.AI_SERVICE_URL}/documents/${documentId}/ai/suggestions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SERVICE_TOKEN}`
        },
        body: JSON.stringify({
          suggestion_type: 'completion',
          context_range: documentState.currentContext,
          user_id: userId
        })
      });
    } catch (error) {
      console.error('Failed to trigger AI suggestions:', error);
    }
  }
}

// Operational Transform Implementation
export class OperationalTransform {
  transformOperation(
    operation: DocumentOperation,
    concurrentOps: DocumentOperation[]
  ): DocumentOperation {
    let transformed = { ...operation };
    
    for (const concurrentOp of concurrentOps) {
      transformed = this.transformPair(transformed, concurrentOp);
    }
    
    return transformed;
  }

  private transformPair(
    op1: DocumentOperation, 
    op2: DocumentOperation
  ): DocumentOperation {
    // Implement operational transform algorithm based on operation types
    switch (op1.operationType) {
      case 'insert':
        return this.transformInsert(op1, op2);
      case 'delete':
        return this.transformDelete(op1, op2);
      case 'format':
        return this.transformFormat(op1, op2);
      default:
        return op1;
    }
  }

  private transformInsert(
    insertOp: DocumentOperation,
    otherOp: DocumentOperation
  ): DocumentOperation {
    const insertPos = insertOp.operationData.position;
    const otherPos = otherOp.operationData.position;

    switch (otherOp.operationType) {
      case 'insert':
        if (otherPos <= insertPos) {
          // Other insert is before this insert, adjust position
          return {
            ...insertOp,
            operationData: {
              ...insertOp.operationData,
              position: insertPos + otherOp.operationData.content.length
            }
          };
        }
        return insertOp;

      case 'delete':
        if (otherPos < insertPos) {
          // Delete is before insert, adjust position
          return {
            ...insertOp,
            operationData: {
              ...insertOp.operationData,
              position: Math.max(otherPos, insertPos - otherOp.operationData.length)
            }
          };
        }
        return insertOp;

      default:
        return insertOp;
    }
  }

  applyOperation(
    state: DocumentState, 
    operation: DocumentOperation
  ): DocumentState {
    const newContent = { ...state.content };
    
    switch (operation.operationType) {
      case 'insert':
        return this.applyInsert(state, operation);
      case 'delete':
        return this.applyDelete(state, operation);
      case 'format':
        return this.applyFormat(state, operation);
      default:
        return state;
    }
  }
}
```

## 2. Document Service (Go)

### Document Management Service
```go
// services/document/internal/handlers/document_handler.go
package handlers

import (
    "encoding/json"
    "net/http"
    "strconv"
    "time"

    "github.com/gin-gonic/gin"
    "github.com/google/uuid"
    "github.com/candlefish-ai/collaboration/internal/models"
    "github.com/candlefish-ai/collaboration/internal/services"
)

type DocumentHandler struct {
    documentService *services.DocumentService
    versionService  *services.VersionService
    authService     *services.AuthService
}

func NewDocumentHandler(
    docSvc *services.DocumentService,
    verSvc *services.VersionService,
    authSvc *services.AuthService,
) *DocumentHandler {
    return &DocumentHandler{
        documentService: docSvc,
        versionService:  verSvc,
        authService:     authSvc,
    }
}

// GetDocument retrieves a document with its current content
func (h *DocumentHandler) GetDocument(c *gin.Context) {
    documentID := c.Param("documentId")
    userID := c.GetString("user_id") // From JWT middleware

    // Parse UUID
    docUUID, err := uuid.Parse(documentID)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid document ID"})
        return
    }

    // Check permissions
    hasPermission, err := h.authService.CheckDocumentPermission(
        userID, 
        documentID, 
        "read",
    )
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Permission check failed"})
        return
    }
    if !hasPermission {
        c.JSON(http.StatusForbidden, gin.H{"error": "Insufficient permissions"})
        return
    }

    // Get document
    document, err := h.documentService.GetByID(docUUID)
    if err != nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "Document not found"})
        return
    }

    // Check if we should include operations log
    includeOps := c.Query("include_operations") == "true"
    var operations []models.DocumentOperation
    
    if includeOps {
        operations, err = h.documentService.GetRecentOperations(
            docUUID, 
            100, // limit
        )
        if err != nil {
            // Log error but don't fail the request
            operations = []models.DocumentOperation{}
        }
    }

    // Get current collaborators
    collaborators, err := h.documentService.GetActiveCollaborators(docUUID)
    if err != nil {
        collaborators = []models.User{} // Don't fail on this error
    }

    response := gin.H{
        "document":      document,
        "collaborators": collaborators,
    }
    
    if includeOps {
        response["recent_operations"] = operations
    }

    c.JSON(http.StatusOK, response)
}

// CreateDocument creates a new document
func (h *DocumentHandler) CreateDocument(c *gin.Context) {
    var req models.CreateDocumentRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    userID := c.GetString("user_id")
    projectID := c.Param("projectId")

    // Verify project permissions
    canCreate, err := h.authService.CheckProjectPermission(
        userID,
        projectID,
        "create_document",
    )
    if err != nil || !canCreate {
        c.JSON(http.StatusForbidden, gin.H{"error": "Cannot create document in this project"})
        return
    }

    // Create document
    document := &models.Document{
        ID:          uuid.New(),
        ProjectID:   uuid.MustParse(projectID),
        Title:       req.Title,
        DocumentType: req.DocumentType,
        Content:     req.Content,
        ParentFolderID: req.ParentFolderID,
        CreatedBy:   uuid.MustParse(userID),
        CreatedAt:   time.Now(),
        UpdatedAt:   time.Now(),
    }

    if err := h.documentService.Create(document); err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create document"})
        return
    }

    // Create initial version
    version := &models.DocumentVersion{
        ID:            uuid.New(),
        DocumentID:    document.ID,
        VersionNumber: 1,
        Content:       req.Content,
        CreatedBy:     uuid.MustParse(userID),
        CreatedAt:     time.Now(),
        CommitMessage: "Initial version",
    }

    if err := h.versionService.CreateVersion(version); err != nil {
        // Log error but don't fail document creation
        // TODO: Implement compensation transaction
    }

    c.JSON(http.StatusCreated, document)
}

// ApplyOperation applies a document operation
func (h *DocumentHandler) ApplyOperation(c *gin.Context) {
    documentID := c.Param("documentId")
    userID := c.GetString("user_id")

    var req models.ApplyOperationRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    docUUID, err := uuid.Parse(documentID)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid document ID"})
        return
    }

    // Check write permissions
    canWrite, err := h.authService.CheckDocumentPermission(
        userID,
        documentID,
        "write",
    )
    if err != nil || !canWrite {
        c.JSON(http.StatusForbidden, gin.H{"error": "Cannot edit this document"})
        return
    }

    // Apply operation through document service
    result, err := h.documentService.ApplyOperation(
        docUUID,
        uuid.MustParse(userID),
        &models.DocumentOperation{
            OperationType: req.OperationType,
            OperationData: req.OperationData,
            SessionID:     req.SessionID,
        },
    )
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to apply operation"})
        return
    }

    c.JSON(http.StatusOK, gin.H{
        "transformed_operation": result.TransformedOperation,
        "sequence_number":      result.SequenceNumber,
        "document_state":       result.NewDocumentState,
    })
}
```

### Document Service Implementation
```go
// services/document/internal/services/document_service.go
package services

import (
    "database/sql/driver"
    "encoding/json"
    "fmt"
    "time"

    "github.com/google/uuid"
    "github.com/candlefish-ai/collaboration/internal/models"
    "github.com/candlefish-ai/collaboration/internal/repositories"
    "gorm.io/gorm"
)

type DocumentService struct {
    repo           *repositories.DocumentRepository
    versionRepo    *repositories.VersionRepository
    operationRepo  *repositories.OperationRepository
    cacheService   *CacheService
    eventPublisher *EventPublisher
}

func NewDocumentService(
    repo *repositories.DocumentRepository,
    versionRepo *repositories.VersionRepository,
    operationRepo *repositories.OperationRepository,
    cache *CacheService,
    publisher *EventPublisher,
) *DocumentService {
    return &DocumentService{
        repo:           repo,
        versionRepo:    versionRepo,
        operationRepo:  operationRepo,
        cacheService:   cache,
        eventPublisher: publisher,
    }
}

type ApplyOperationResult struct {
    TransformedOperation *models.DocumentOperation `json:"transformed_operation"`
    SequenceNumber      int64                     `json:"sequence_number"`
    NewDocumentState    *models.DocumentState     `json:"new_document_state"`
}

func (s *DocumentService) ApplyOperation(
    documentID uuid.UUID,
    userID uuid.UUID,
    operation *models.DocumentOperation,
) (*ApplyOperationResult, error) {
    // Start transaction for consistency
    tx := s.repo.BeginTx()
    defer tx.Rollback()

    // Get current document state with row lock
    document, err := s.repo.GetForUpdate(tx, documentID)
    if err != nil {
        return nil, fmt.Errorf("failed to get document: %w", err)
    }

    // Get operations since client's sequence number for transformation
    concurrentOps, err := s.operationRepo.GetSince(
        tx,
        documentID,
        operation.ClientSequenceNumber,
    )
    if err != nil {
        return nil, fmt.Errorf("failed to get concurrent operations: %w", err)
    }

    // Transform operation against concurrent operations
    transformedOp := s.transformOperation(operation, concurrentOps)

    // Apply operation to document content
    newContent, err := s.applyOperationToContent(
        document.Content,
        transformedOp,
    )
    if err != nil {
        return nil, fmt.Errorf("failed to apply operation: %w", err)
    }

    // Update document content
    document.Content = newContent
    document.UpdatedAt = time.Now()
    document.LastModifiedBy = &userID

    if err := s.repo.Update(tx, document); err != nil {
        return nil, fmt.Errorf("failed to update document: %w", err)
    }

    // Persist operation with server sequence number
    transformedOp.ID = uuid.New()
    transformedOp.DocumentID = documentID
    transformedOp.UserID = userID
    transformedOp.AppliedAt = time.Now()

    serverSequence, err := s.operationRepo.Create(tx, transformedOp)
    if err != nil {
        return nil, fmt.Errorf("failed to persist operation: %w", err)
    }

    // Commit transaction
    if err := tx.Commit(); err != nil {
        return nil, fmt.Errorf("failed to commit transaction: %w", err)
    }

    // Invalidate cache
    s.cacheService.InvalidateDocument(documentID)

    // Publish event for real-time synchronization
    event := &models.DocumentOperationEvent{
        DocumentID:       documentID,
        UserID:          userID,
        Operation:       transformedOp,
        SequenceNumber:  serverSequence,
        Timestamp:       time.Now(),
    }
    
    if err := s.eventPublisher.PublishDocumentOperation(event); err != nil {
        // Log but don't fail the operation
        // Real-time clients will get the operation via polling if event fails
    }

    return &ApplyOperationResult{
        TransformedOperation: transformedOp,
        SequenceNumber:      serverSequence,
        NewDocumentState: &models.DocumentState{
            Content:   newContent,
            Version:   document.Version + 1,
            UpdatedAt: document.UpdatedAt,
        },
    }, nil
}

func (s *DocumentService) transformOperation(
    operation *models.DocumentOperation,
    concurrentOps []*models.DocumentOperation,
) *models.DocumentOperation {
    transformed := &models.DocumentOperation{
        OperationType: operation.OperationType,
        OperationData: operation.OperationData,
        SessionID:     operation.SessionID,
    }

    // Apply operational transform algorithm
    for _, concurrentOp := range concurrentOps {
        transformed = s.transformPair(transformed, concurrentOp)
    }

    return transformed
}

func (s *DocumentService) transformPair(
    op1, op2 *models.DocumentOperation,
) *models.DocumentOperation {
    // Implement operational transform logic based on operation types
    // This is a simplified version - production would need more sophisticated OT
    
    switch op1.OperationType {
    case "insert":
        return s.transformInsert(op1, op2)
    case "delete":
        return s.transformDelete(op1, op2)
    case "format":
        return s.transformFormat(op1, op2)
    default:
        return op1
    }
}

func (s *DocumentService) applyOperationToContent(
    content map[string]interface{},
    operation *models.DocumentOperation,
) (map[string]interface{}, error) {
    // Apply operation to document content
    // This would contain the actual document transformation logic
    newContent := make(map[string]interface{})
    for k, v := range content {
        newContent[k] = v
    }

    switch operation.OperationType {
    case "insert":
        return s.applyInsert(newContent, operation)
    case "delete":
        return s.applyDelete(newContent, operation)
    case "format":
        return s.applyFormat(newContent, operation)
    default:
        return newContent, nil
    }
}
```

## 3. Project Service (Python/FastAPI)

### Project Management API
```python
# services/project/app/api/v1/projects.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from app.api.deps import get_current_user, get_db
from app.crud import crud_project, crud_project_member
from app.models import User, Project, ProjectMember
from app.schemas import ProjectCreate, ProjectUpdate, ProjectResponse, ProjectMemberCreate
from app.services.permission_service import PermissionService
from app.services.activity_service import ActivityService

router = APIRouter()

@router.get("/", response_model=List[ProjectResponse])
async def get_projects(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    organization_id: Optional[UUID] = Query(None),
    role: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, le=100)
):
    """Get user's projects with optional filtering"""
    
    projects = await crud_project.get_user_projects(
        db=db,
        user_id=current_user.id,
        organization_id=organization_id,
        role=role,
        skip=skip,
        limit=limit
    )
    
    return projects

@router.post("/", response_model=ProjectResponse)
async def create_project(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    project_in: ProjectCreate,
    permission_service: PermissionService = Depends(),
    activity_service: ActivityService = Depends()
):
    """Create a new project"""
    
    # Check organization permissions if specified
    if project_in.organization_id:
        can_create = await permission_service.check_organization_permission(
            user_id=current_user.id,
            organization_id=project_in.organization_id,
            permission="create_project"
        )
        if not can_create:
            raise HTTPException(
                status_code=403,
                detail="Insufficient permissions to create project in this organization"
            )
    
    # Create project
    project = await crud_project.create_with_owner(
        db=db,
        obj_in=project_in,
        owner_id=current_user.id
    )
    
    # Log activity
    await activity_service.log_activity(
        db=db,
        project_id=project.id,
        user_id=current_user.id,
        activity_type="project_created",
        activity_data={"project_name": project.name}
    )
    
    return project

@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    *,
    db: Session = Depends(get_db),
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    permission_service: PermissionService = Depends()
):
    """Get project details"""
    
    # Check read permissions
    can_read = await permission_service.check_project_permission(
        user_id=current_user.id,
        project_id=project_id,
        permission="read"
    )
    if not can_read:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    project = await crud_project.get_with_members(db=db, project_id=project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return project

@router.post("/{project_id}/members", response_model=dict)
async def add_project_member(
    *,
    db: Session = Depends(get_db),
    project_id: UUID,
    member_in: ProjectMemberCreate,
    current_user: User = Depends(get_current_user),
    permission_service: PermissionService = Depends(),
    activity_service: ActivityService = Depends()
):
    """Add member to project"""
    
    # Check admin permissions
    can_manage = await permission_service.check_project_permission(
        user_id=current_user.id,
        project_id=project_id,
        permission="manage_members"
    )
    if not can_manage:
        raise HTTPException(status_code=403, detail="Cannot manage project members")
    
    # Add member
    member = await crud_project_member.create(
        db=db,
        obj_in=ProjectMemberCreate(
            project_id=project_id,
            user_id=member_in.user_id,
            role=member_in.role,
            permissions=member_in.permissions or {}
        )
    )
    
    # Log activity
    await activity_service.log_activity(
        db=db,
        project_id=project_id,
        user_id=current_user.id,
        activity_type="member_added",
        activity_data={
            "added_user_id": str(member_in.user_id),
            "role": member_in.role
        }
    )
    
    return {"message": "Member added successfully"}

# Permission Service Implementation
# services/project/app/services/permission_service.py
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import Optional, Dict, Any
from uuid import UUID
import json

from app.models import ProjectMember, Project, Organization, OrganizationMember
from app.core.cache import cache_service

class PermissionService:
    def __init__(self):
        self.cache = cache_service

    async def check_project_permission(
        self,
        user_id: UUID,
        project_id: UUID,
        permission: str,
        db: Session
    ) -> bool:
        """Check if user has specific permission for a project"""
        
        # Check cache first
        cache_key = f"permission:{user_id}:{project_id}:{permission}"
        cached_result = await self.cache.get(cache_key)
        if cached_result is not None:
            return json.loads(cached_result)
        
        # Query user's project membership
        membership = db.query(ProjectMember).filter(
            and_(
                ProjectMember.project_id == project_id,
                ProjectMember.user_id == user_id
            )
        ).first()
        
        if not membership:
            await self.cache.setex(cache_key, 300, json.dumps(False))  # Cache for 5 minutes
            return False
        
        # Check role-based permissions
        has_permission = self._check_role_permission(membership.role, permission)
        
        # Check custom permissions if role doesn't grant access
        if not has_permission and membership.permissions:
            has_permission = membership.permissions.get(permission, False)
        
        # Cache result
        await self.cache.setex(cache_key, 300, json.dumps(has_permission))
        
        return has_permission

    def _check_role_permission(self, role: str, permission: str) -> bool:
        """Check if role grants specific permission"""
        
        role_permissions = {
            "owner": [
                "read", "write", "delete", "manage_members", 
                "manage_permissions", "create_document", "delete_document"
            ],
            "admin": [
                "read", "write", "manage_members", 
                "create_document", "delete_document"
            ],
            "editor": ["read", "write", "create_document"],
            "viewer": ["read"]
        }
        
        return permission in role_permissions.get(role, [])

    async def get_user_projects_with_permission(
        self,
        user_id: UUID,
        permission: str,
        db: Session,
        organization_id: Optional[UUID] = None
    ) -> List[Project]:
        """Get all projects where user has specific permission"""
        
        query = db.query(Project).join(ProjectMember).filter(
            ProjectMember.user_id == user_id
        )
        
        if organization_id:
            query = query.filter(Project.organization_id == organization_id)
        
        projects = query.all()
        
        # Filter by permission
        filtered_projects = []
        for project in projects:
            has_permission = await self.check_project_permission(
                user_id=user_id,
                project_id=project.id,
                permission=permission,
                db=db
            )
            if has_permission:
                filtered_projects.append(project)
        
        return filtered_projects

# Activity Service for audit trail
# services/project/app/services/activity_service.py
from sqlalchemy.orm import Session
from typing import Dict, Any, List
from uuid import UUID
from datetime import datetime

from app.models import CollaborationActivity
from app.schemas import CollaborationActivityCreate

class ActivityService:
    async def log_activity(
        self,
        db: Session,
        project_id: UUID,
        user_id: UUID,
        activity_type: str,
        activity_data: Dict[str, Any],
        document_id: Optional[UUID] = None
    ) -> CollaborationActivity:
        """Log user activity for audit trail"""
        
        activity = CollaborationActivity(
            project_id=project_id,
            document_id=document_id,
            user_id=user_id,
            activity_type=activity_type,
            activity_data=activity_data,
            occurred_at=datetime.utcnow()
        )
        
        db.add(activity)
        db.commit()
        db.refresh(activity)
        
        # TODO: Publish event for real-time activity feeds
        # await self.event_publisher.publish_activity_event(activity)
        
        return activity

    async def get_project_activity(
        self,
        db: Session,
        project_id: UUID,
        document_id: Optional[UUID] = None,
        activity_types: Optional[List[str]] = None,
        since: Optional[datetime] = None,
        limit: int = 50
    ) -> List[CollaborationActivity]:
        """Get project activity feed"""
        
        query = db.query(CollaborationActivity).filter(
            CollaborationActivity.project_id == project_id
        )
        
        if document_id:
            query = query.filter(CollaborationActivity.document_id == document_id)
        
        if activity_types:
            query = query.filter(CollaborationActivity.activity_type.in_(activity_types))
        
        if since:
            query = query.filter(CollaborationActivity.occurred_at >= since)
        
        activities = query.order_by(
            CollaborationActivity.occurred_at.desc()
        ).limit(limit).all()
        
        return activities
```

This implementation provides a solid foundation for the real-time collaboration platform with proper separation of concerns, robust error handling, and integration points for your existing Candlefish AI infrastructure. The services are designed to scale horizontally and integrate seamlessly with CLOS orchestration and NANDA agents.