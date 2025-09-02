import pytest
import asyncio
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, AsyncMock
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from services.project_service.main import app
from services.project_service.database import Base, get_db
from services.project_service.models import Project, ProjectMember, Activity
from services.project_service.services.project_service import ProjectService
from services.project_service.services.websocket_manager import WebSocketManager
from services.project_service.schemas import ProjectCreate, ProjectUpdate

# Test database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

class TestProjectService:
    """Test suite for Project Service (Python/FastAPI)"""

    @pytest.fixture(autouse=True)
    def setup_method(self):
        """Setup test environment before each test"""
        Base.metadata.create_all(bind=engine)
        self.client = TestClient(app)
        self.db = TestingSessionLocal()
        self.project_service = ProjectService(self.db)
        yield
        self.db.close()
        Base.metadata.drop_all(bind=engine)

    @pytest.fixture
    def sample_project_data(self):
        """Fixture providing sample project data"""
        return {
            "name": "Test Project",
            "description": "A test project for collaboration",
            "owner_id": "user-123",
            "status": "active",
            "visibility": "private",
            "settings": {
                "allow_comments": True,
                "auto_save": True,
                "version_limit": 50
            }
        }

    @pytest.fixture
    def sample_project(self, sample_project_data):
        """Fixture providing a sample project instance"""
        project_create = ProjectCreate(**sample_project_data)
        return self.project_service.create_project(project_create, "user-123")

    def test_create_project_success(self, sample_project_data):
        """Test successful project creation"""
        response = self.client.post(
            "/api/v1/projects/",
            json=sample_project_data,
            headers={"Authorization": "Bearer test-token"}
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == sample_project_data["name"]
        assert data["description"] == sample_project_data["description"]
        assert data["owner_id"] == sample_project_data["owner_id"]
        assert "id" in data
        assert "created_at" in data

    def test_create_project_validation_error(self):
        """Test project creation with invalid data"""
        invalid_data = {
            "name": "",  # Empty name should fail validation
            "owner_id": "user-123"
        }
        
        response = self.client.post(
            "/api/v1/projects/",
            json=invalid_data,
            headers={"Authorization": "Bearer test-token"}
        )
        
        assert response.status_code == 422
        assert "validation error" in response.json()["detail"][0]["type"]

    def test_get_project_success(self, sample_project):
        """Test successful project retrieval"""
        response = self.client.get(
            f"/api/v1/projects/{sample_project.id}",
            headers={"Authorization": "Bearer test-token"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == sample_project.id
        assert data["name"] == sample_project.name

    def test_get_project_not_found(self):
        """Test project retrieval with non-existent ID"""
        response = self.client.get(
            "/api/v1/projects/99999",
            headers={"Authorization": "Bearer test-token"}
        )
        
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    def test_update_project_success(self, sample_project):
        """Test successful project update"""
        update_data = {
            "name": "Updated Project Name",
            "description": "Updated description"
        }
        
        response = self.client.put(
            f"/api/v1/projects/{sample_project.id}",
            json=update_data,
            headers={"Authorization": "Bearer test-token"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == update_data["name"]
        assert data["description"] == update_data["description"]

    def test_delete_project_success(self, sample_project):
        """Test successful project deletion"""
        response = self.client.delete(
            f"/api/v1/projects/{sample_project.id}",
            headers={"Authorization": "Bearer test-token"}
        )
        
        assert response.status_code == 204

        # Verify project is deleted
        get_response = self.client.get(
            f"/api/v1/projects/{sample_project.id}",
            headers={"Authorization": "Bearer test-token"}
        )
        assert get_response.status_code == 404

    def test_list_projects_success(self):
        """Test successful project listing with pagination"""
        # Create multiple projects
        for i in range(5):
            project_data = {
                "name": f"Test Project {i}",
                "description": f"Description {i}",
                "owner_id": "user-123",
                "status": "active"
            }
            self.client.post(
                "/api/v1/projects/",
                json=project_data,
                headers={"Authorization": "Bearer test-token"}
            )

        response = self.client.get(
            "/api/v1/projects/?limit=3&offset=0",
            headers={"Authorization": "Bearer test-token"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 3
        assert data["total"] == 5
        assert "next" in data
        assert "previous" in data

    def test_add_project_member_success(self, sample_project):
        """Test adding member to project"""
        member_data = {
            "user_id": "user-456",
            "role": "editor"
        }
        
        response = self.client.post(
            f"/api/v1/projects/{sample_project.id}/members",
            json=member_data,
            headers={"Authorization": "Bearer test-token"}
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["user_id"] == member_data["user_id"]
        assert data["role"] == member_data["role"]

    def test_remove_project_member_success(self, sample_project):
        """Test removing member from project"""
        # First add a member
        member_data = {"user_id": "user-456", "role": "viewer"}
        self.client.post(
            f"/api/v1/projects/{sample_project.id}/members",
            json=member_data,
            headers={"Authorization": "Bearer test-token"}
        )

        # Then remove the member
        response = self.client.delete(
            f"/api/v1/projects/{sample_project.id}/members/user-456",
            headers={"Authorization": "Bearer test-token"}
        )
        
        assert response.status_code == 204

    def test_get_project_activity_success(self, sample_project):
        """Test retrieving project activity feed"""
        # Create some activity
        activity = Activity(
            project_id=sample_project.id,
            user_id="user-123",
            action="created",
            details={"resource": "document", "name": "test.md"}
        )
        self.db.add(activity)
        self.db.commit()

        response = self.client.get(
            f"/api/v1/projects/{sample_project.id}/activity",
            headers={"Authorization": "Bearer test-token"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) > 0
        assert data[0]["action"] == "created"

    @pytest.mark.asyncio
    async def test_project_service_create_project(self):
        """Test ProjectService create_project method"""
        project_data = ProjectCreate(
            name="Service Test Project",
            description="Testing service layer",
            owner_id="user-789"
        )
        
        project = self.project_service.create_project(project_data, "user-789")
        
        assert project.name == project_data.name
        assert project.description == project_data.description
        assert project.owner_id == project_data.owner_id
        assert project.id is not None

    @pytest.mark.asyncio
    async def test_project_service_update_project(self, sample_project):
        """Test ProjectService update_project method"""
        update_data = ProjectUpdate(
            name="Updated via Service",
            description="Updated description"
        )
        
        updated_project = self.project_service.update_project(
            sample_project.id, update_data, "user-123"
        )
        
        assert updated_project.name == update_data.name
        assert updated_project.description == update_data.description

    def test_project_permissions(self, sample_project):
        """Test project permission system"""
        # Test owner access
        response = self.client.get(
            f"/api/v1/projects/{sample_project.id}",
            headers={"Authorization": "Bearer test-token", "User-ID": "user-123"}
        )
        assert response.status_code == 200

        # Test non-member access (should be forbidden for private project)
        response = self.client.get(
            f"/api/v1/projects/{sample_project.id}",
            headers={"Authorization": "Bearer test-token", "User-ID": "user-999"}
        )
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_websocket_project_notifications(self):
        """Test WebSocket notifications for project events"""
        websocket_manager = WebSocketManager()
        mock_websocket = AsyncMock()
        
        # Simulate user connection
        await websocket_manager.connect(mock_websocket, "user-123")
        
        # Simulate project event
        await websocket_manager.broadcast_to_project(
            "project-456",
            {
                "type": "project_updated",
                "project_id": "project-456",
                "user_id": "user-123",
                "timestamp": datetime.now().isoformat()
            }
        )
        
        # Verify notification was sent
        mock_websocket.send_text.assert_called()

    def test_project_search(self):
        """Test project search functionality"""
        # Create projects with different names
        projects = [
            {"name": "React Project", "owner_id": "user-123", "description": "Frontend app"},
            {"name": "Python Backend", "owner_id": "user-123", "description": "API service"},
            {"name": "Data Analysis", "owner_id": "user-123", "description": "Python scripts"}
        ]
        
        for project in projects:
            self.client.post(
                "/api/v1/projects/",
                json=project,
                headers={"Authorization": "Bearer test-token"}
            )

        # Search for Python projects
        response = self.client.get(
            "/api/v1/projects/search?q=python",
            headers={"Authorization": "Bearer test-token"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["results"]) == 2  # Should find 2 Python-related projects

    def test_bulk_project_operations(self):
        """Test bulk operations on projects"""
        project_ids = []
        
        # Create multiple projects
        for i in range(3):
            project_data = {
                "name": f"Bulk Test Project {i}",
                "owner_id": "user-123"
            }
            response = self.client.post(
                "/api/v1/projects/",
                json=project_data,
                headers={"Authorization": "Bearer test-token"}
            )
            project_ids.append(response.json()["id"])

        # Bulk status update
        bulk_update_data = {
            "project_ids": project_ids,
            "status": "archived"
        }
        
        response = self.client.put(
            "/api/v1/projects/bulk-update",
            json=bulk_update_data,
            headers={"Authorization": "Bearer test-token"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["updated_count"] == 3

    def test_project_analytics(self, sample_project):
        """Test project analytics endpoint"""
        response = self.client.get(
            f"/api/v1/projects/{sample_project.id}/analytics",
            headers={"Authorization": "Bearer test-token"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "member_count" in data
        assert "document_count" in data
        assert "activity_count" in data
        assert "last_activity" in data

    def test_concurrent_project_updates(self, sample_project):
        """Test handling concurrent project updates"""
        import threading
        import time
        
        results = []
        errors = []

        def update_project(name_suffix):
            try:
                update_data = {
                    "name": f"Concurrent Update {name_suffix}",
                    "description": f"Updated by thread {name_suffix}"
                }
                
                response = self.client.put(
                    f"/api/v1/projects/{sample_project.id}",
                    json=update_data,
                    headers={"Authorization": "Bearer test-token"}
                )
                results.append(response.status_code)
            except Exception as e:
                errors.append(str(e))

        # Start concurrent updates
        threads = []
        for i in range(5):
            thread = threading.Thread(target=update_project, args=(i,))
            threads.append(thread)
            thread.start()

        # Wait for all threads to complete
        for thread in threads:
            thread.join()

        # At least some updates should succeed
        assert len([r for r in results if r == 200]) > 0
        assert len(errors) == 0

    @pytest.mark.asyncio
    async def test_project_backup_restore(self, sample_project):
        """Test project backup and restore functionality"""
        # Create backup
        response = self.client.post(
            f"/api/v1/projects/{sample_project.id}/backup",
            headers={"Authorization": "Bearer test-token"}
        )
        
        assert response.status_code == 201
        backup_data = response.json()
        assert "backup_id" in backup_data
        assert "download_url" in backup_data

        # Test restore (mock scenario)
        restore_data = {
            "backup_id": backup_data["backup_id"],
            "restore_name": "Restored Project"
        }
        
        response = self.client.post(
            "/api/v1/projects/restore",
            json=restore_data,
            headers={"Authorization": "Bearer test-token"}
        )
        
        assert response.status_code == 201
        restored_project = response.json()
        assert restored_project["name"] == "Restored Project"

    def test_project_templates(self):
        """Test project template functionality"""
        # Get available templates
        response = self.client.get(
            "/api/v1/projects/templates",
            headers={"Authorization": "Bearer test-token"}
        )
        
        assert response.status_code == 200
        templates = response.json()
        assert len(templates) > 0
        assert "name" in templates[0]
        assert "description" in templates[0]

        # Create project from template
        template_data = {
            "template_id": templates[0]["id"],
            "name": "Project from Template",
            "owner_id": "user-123"
        }
        
        response = self.client.post(
            "/api/v1/projects/from-template",
            json=template_data,
            headers={"Authorization": "Bearer test-token"}
        )
        
        assert response.status_code == 201
        project = response.json()
        assert project["name"] == "Project from Template"

    def test_error_handling_and_validation(self):
        """Test comprehensive error handling"""
        # Test missing authorization
        response = self.client.get("/api/v1/projects/")
        assert response.status_code == 401

        # Test invalid JSON
        response = self.client.post(
            "/api/v1/projects/",
            data="invalid json",
            headers={"Authorization": "Bearer test-token", "Content-Type": "application/json"}
        )
        assert response.status_code == 422

        # Test SQL injection attempt
        malicious_data = {
            "name": "Test'; DROP TABLE projects; --",
            "owner_id": "user-123"
        }
        
        response = self.client.post(
            "/api/v1/projects/",
            json=malicious_data,
            headers={"Authorization": "Bearer test-token"}
        )
        
        # Should handle gracefully without SQL injection
        assert response.status_code in [201, 422]  # Either creates safely or validates

    @pytest.mark.performance
    def test_performance_benchmarks(self):
        """Test performance benchmarks for project operations"""
        import time
        
        # Benchmark project creation
        start_time = time.time()
        
        for i in range(100):
            project_data = {
                "name": f"Performance Test Project {i}",
                "owner_id": "user-123"
            }
            response = self.client.post(
                "/api/v1/projects/",
                json=project_data,
                headers={"Authorization": "Bearer test-token"}
            )
            assert response.status_code == 201

        creation_time = time.time() - start_time
        assert creation_time < 10.0  # Should create 100 projects in under 10 seconds

        # Benchmark project listing
        start_time = time.time()
        
        response = self.client.get(
            "/api/v1/projects/?limit=100",
            headers={"Authorization": "Bearer test-token"}
        )
        
        listing_time = time.time() - start_time
        assert response.status_code == 200
        assert listing_time < 1.0  # Should list 100 projects in under 1 second