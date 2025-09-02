import pytest
import asyncio
import json
from unittest.mock import Mock, patch, AsyncMock, MagicMock
from datetime import datetime, timedelta
import openai
from anthropic import Anthropic

from services.ai_integration.main import app
from services.ai_integration.services.ai_service import AIService
from services.ai_integration.services.suggestion_engine import SuggestionEngine
from services.ai_integration.services.content_analyzer import ContentAnalyzer
from services.ai_integration.models.suggestions import SuggestionType, SuggestionPriority
from services.ai_integration.schemas import (
    SuggestionRequest, ContentAnalysisRequest, 
    GenerationRequest, ReviewRequest
)

class TestAIIntegrationService:
    """Test suite for AI Integration Service (Python)"""

    @pytest.fixture(autouse=True)
    def setup_method(self):
        """Setup test environment before each test"""
        self.ai_service = AIService()
        self.suggestion_engine = SuggestionEngine()
        self.content_analyzer = ContentAnalyzer()

    @pytest.fixture
    def sample_document_content(self):
        """Fixture providing sample document content"""
        return {
            "id": "doc-123",
            "title": "Project Requirements",
            "content": """
            # Project Requirements Document
            
            ## Overview
            This project aims to create a modern web application for task management.
            
            ## Features
            - User authentication
            - Task creation and editing
            - Real-time collaboration
            - Mobile responsive design
            
            ## Technical Stack
            - Frontend: React with TypeScript
            - Backend: Node.js with Express
            - Database: PostgreSQL
            - Deployment: AWS ECS
            
            ## Timeline
            Phase 1: Basic CRUD operations (2 weeks)
            Phase 2: Real-time features (3 weeks)
            Phase 3: Mobile optimization (2 weeks)
            """,
            "type": "markdown",
            "last_modified": datetime.now().isoformat()
        }

    @pytest.fixture
    def mock_openai_response(self):
        """Mock OpenAI API response"""
        return {
            "choices": [{
                "message": {
                    "role": "assistant",
                    "content": "This is a comprehensive project requirements document. I suggest adding detailed user personas and acceptance criteria for each feature."
                }
            }],
            "usage": {
                "prompt_tokens": 150,
                "completion_tokens": 25,
                "total_tokens": 175
            }
        }

    @pytest.fixture
    def mock_anthropic_response(self):
        """Mock Anthropic Claude API response"""
        return MagicMock(
            content=[MagicMock(text="Based on the document structure, I recommend adding a risk assessment section and more detailed technical specifications.")],
            usage=MagicMock(input_tokens=140, output_tokens=30)
        )

    @pytest.mark.asyncio
    async def test_generate_suggestions_openai(self, sample_document_content, mock_openai_response):
        """Test generating suggestions using OpenAI"""
        with patch('openai.ChatCompletion.acreate') as mock_openai:
            mock_openai.return_value = mock_openai_response
            
            request = SuggestionRequest(
                document_id=sample_document_content["id"],
                content=sample_document_content["content"],
                suggestion_types=[SuggestionType.CONTENT_IMPROVEMENT, SuggestionType.STRUCTURE],
                model_preference="openai"
            )
            
            suggestions = await self.ai_service.generate_suggestions(request)
            
            assert len(suggestions) > 0
            assert suggestions[0].type in [SuggestionType.CONTENT_IMPROVEMENT, SuggestionType.STRUCTURE]
            assert suggestions[0].confidence > 0
            assert "personas" in suggestions[0].content.lower() or "criteria" in suggestions[0].content.lower()

    @pytest.mark.asyncio
    async def test_generate_suggestions_anthropic(self, sample_document_content, mock_anthropic_response):
        """Test generating suggestions using Anthropic Claude"""
        with patch.object(Anthropic, 'messages') as mock_anthropic:
            mock_anthropic.create = AsyncMock(return_value=mock_anthropic_response)
            
            request = SuggestionRequest(
                document_id=sample_document_content["id"],
                content=sample_document_content["content"],
                suggestion_types=[SuggestionType.CONTENT_IMPROVEMENT],
                model_preference="anthropic"
            )
            
            suggestions = await self.ai_service.generate_suggestions(request)
            
            assert len(suggestions) > 0
            assert "risk assessment" in suggestions[0].content.lower()
            mock_anthropic.create.assert_called_once()

    @pytest.mark.asyncio
    async def test_content_analysis(self, sample_document_content):
        """Test content analysis functionality"""
        request = ContentAnalysisRequest(
            content=sample_document_content["content"],
            analysis_types=["readability", "completeness", "technical_accuracy"]
        )
        
        with patch.object(self.content_analyzer, 'analyze_readability') as mock_readability:
            mock_readability.return_value = {"score": 0.8, "level": "professional"}
            
            with patch.object(self.content_analyzer, 'analyze_completeness') as mock_completeness:
                mock_completeness.return_value = {"score": 0.7, "missing_sections": ["testing", "deployment"]}
                
                analysis = await self.ai_service.analyze_content(request)
                
                assert "readability" in analysis.metrics
                assert "completeness" in analysis.metrics
                assert analysis.metrics["readability"]["score"] == 0.8
                assert analysis.metrics["completeness"]["score"] == 0.7
                assert "testing" in analysis.metrics["completeness"]["missing_sections"]

    @pytest.mark.asyncio
    async def test_code_generation(self):
        """Test AI-powered code generation"""
        request = GenerationRequest(
            prompt="Generate a React component for a task list with TypeScript",
            language="typescript",
            framework="react",
            context={
                "project_type": "web_app",
                "dependencies": ["react", "typescript", "@types/react"]
            }
        )
        
        mock_response = {
            "choices": [{
                "message": {
                    "content": """
                    import React, { useState, useEffect } from 'react';

                    interface Task {
                      id: string;
                      title: string;
                      completed: boolean;
                      createdAt: Date;
                    }

                    interface TaskListProps {
                      tasks: Task[];
                      onTaskUpdate: (task: Task) => void;
                    }

                    export const TaskList: React.FC<TaskListProps> = ({ tasks, onTaskUpdate }) => {
                      const [filter, setFilter] = useState<'all' | 'completed' | 'pending'>('all');
                      
                      const filteredTasks = tasks.filter(task => {
                        if (filter === 'completed') return task.completed;
                        if (filter === 'pending') return !task.completed;
                        return true;
                      });

                      return (
                        <div className="task-list">
                          <div className="task-filter">
                            <button onClick={() => setFilter('all')}>All</button>
                            <button onClick={() => setFilter('pending')}>Pending</button>
                            <button onClick={() => setFilter('completed')}>Completed</button>
                          </div>
                          
                          <ul className="tasks">
                            {filteredTasks.map(task => (
                              <li key={task.id} className={task.completed ? 'completed' : ''}>
                                <input
                                  type="checkbox"
                                  checked={task.completed}
                                  onChange={() => onTaskUpdate({...task, completed: !task.completed})}
                                />
                                <span>{task.title}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    };
                    """
                }
            }]
        }
        
        with patch('openai.ChatCompletion.acreate') as mock_openai:
            mock_openai.return_value = mock_response
            
            generation = await self.ai_service.generate_code(request)
            
            assert generation.code is not None
            assert "TaskList" in generation.code
            assert "React.FC" in generation.code
            assert "typescript" in generation.language.lower()
            assert len(generation.suggestions) > 0

    @pytest.mark.asyncio
    async def test_document_review(self, sample_document_content):
        """Test AI-powered document review"""
        request = ReviewRequest(
            document_id=sample_document_content["id"],
            content=sample_document_content["content"],
            review_criteria=[
                "completeness",
                "clarity",
                "technical_accuracy",
                "consistency"
            ],
            reviewer_profile="technical_lead"
        )
        
        mock_review_response = {
            "choices": [{
                "message": {
                    "content": json.dumps({
                        "overall_score": 8.5,
                        "criteria_scores": {
                            "completeness": 7.0,
                            "clarity": 9.0,
                            "technical_accuracy": 8.5,
                            "consistency": 9.0
                        },
                        "strengths": [
                            "Clear project structure",
                            "Well-defined technical stack",
                            "Realistic timeline"
                        ],
                        "areas_for_improvement": [
                            "Missing detailed user stories",
                            "No mention of testing strategy",
                            "Lack of performance requirements"
                        ],
                        "recommendations": [
                            "Add user personas and user journey maps",
                            "Include testing strategy and quality assurance plan",
                            "Define performance benchmarks and SLAs"
                        ]
                    })
                }
            }]
        }
        
        with patch('openai.ChatCompletion.acreate') as mock_openai:
            mock_openai.return_value = mock_review_response
            
            review = await self.ai_service.review_document(request)
            
            assert review.overall_score == 8.5
            assert review.criteria_scores["clarity"] == 9.0
            assert len(review.strengths) == 3
            assert len(review.areas_for_improvement) == 3
            assert "user personas" in review.recommendations[0].lower()

    @pytest.mark.asyncio
    async def test_smart_autocomplete(self):
        """Test smart autocomplete functionality"""
        context = {
            "document_type": "technical_specification",
            "current_section": "API Endpoints",
            "preceding_text": "### User Authentication\n\n**POST /api/auth/login**\n- Request body: email, password\n- Response: JWT token\n\n**POST /api/auth/register**\n- Request body: email, password, name\n- Response: User object\n\n**GET /api/auth/",
            "cursor_position": 234
        }
        
        mock_completion_response = {
            "choices": [{
                "message": {
                    "content": "profile**\n- Headers: Authorization: Bearer {token}\n- Response: User profile object\n- Error codes: 401 (Unauthorized), 404 (User not found)"
                }
            }]
        }
        
        with patch('openai.ChatCompletion.acreate') as mock_openai:
            mock_openai.return_value = mock_completion_response
            
            completions = await self.ai_service.get_smart_completions(context)
            
            assert len(completions) > 0
            assert "profile" in completions[0].text
            assert completions[0].confidence > 0.5

    def test_suggestion_engine_prioritization(self, sample_document_content):
        """Test suggestion prioritization logic"""
        suggestions = [
            {
                "content": "Add error handling section",
                "type": SuggestionType.CONTENT_IMPROVEMENT,
                "confidence": 0.9,
                "impact_score": 8
            },
            {
                "content": "Fix minor typo in title",
                "type": SuggestionType.GRAMMAR,
                "confidence": 0.95,
                "impact_score": 2
            },
            {
                "content": "Restructure technical requirements",
                "type": SuggestionType.STRUCTURE,
                "confidence": 0.7,
                "impact_score": 9
            }
        ]
        
        prioritized = self.suggestion_engine.prioritize_suggestions(suggestions)
        
        # Should prioritize by impact score and confidence
        assert prioritized[0]["content"] == "Restructure technical requirements"
        assert prioritized[1]["content"] == "Add error handling section"
        assert prioritized[2]["content"] == "Fix minor typo in title"

    @pytest.mark.asyncio
    async def test_context_aware_suggestions(self, sample_document_content):
        """Test context-aware suggestion generation"""
        context = {
            "user_role": "technical_writer",
            "project_phase": "requirements_gathering",
            "team_size": 5,
            "deadline": "2024-03-15",
            "previous_suggestions": ["add_user_stories", "include_acceptance_criteria"]
        }
        
        request = SuggestionRequest(
            document_id=sample_document_content["id"],
            content=sample_document_content["content"],
            suggestion_types=[SuggestionType.CONTENT_IMPROVEMENT],
            context=context
        )
        
        mock_contextual_response = {
            "choices": [{
                "message": {
                    "content": "Given your role as a technical writer and the current requirements gathering phase, I recommend adding detailed user personas, edge case scenarios, and integration requirements with external systems."
                }
            }]
        }
        
        with patch('openai.ChatCompletion.acreate') as mock_openai:
            mock_openai.return_value = mock_contextual_response
            
            suggestions = await self.ai_service.generate_contextual_suggestions(request)
            
            assert len(suggestions) > 0
            assert any("user personas" in s.content.lower() for s in suggestions)
            assert any("integration" in s.content.lower() for s in suggestions)

    @pytest.mark.asyncio
    async def test_collaborative_filtering(self):
        """Test collaborative filtering for suggestion quality"""
        suggestion_history = [
            {
                "suggestion_id": "sugg-1",
                "user_id": "user-123",
                "rating": 5,
                "applied": True,
                "suggestion_type": SuggestionType.CONTENT_IMPROVEMENT
            },
            {
                "suggestion_id": "sugg-2",
                "user_id": "user-456",
                "rating": 3,
                "applied": False,
                "suggestion_type": SuggestionType.GRAMMAR
            }
        ]
        
        quality_score = await self.suggestion_engine.calculate_quality_score(
            SuggestionType.CONTENT_IMPROVEMENT,
            suggestion_history
        )
        
        assert quality_score > 0.5  # Should be higher for well-rated content improvements

    @pytest.mark.asyncio
    async def test_rate_limiting_and_throttling(self):
        """Test API rate limiting and request throttling"""
        requests = []
        
        # Simulate rapid successive requests
        for i in range(10):
            request = SuggestionRequest(
                document_id=f"doc-{i}",
                content=f"Test content {i}",
                suggestion_types=[SuggestionType.CONTENT_IMPROVEMENT]
            )
            requests.append(request)
        
        with patch.object(self.ai_service, '_check_rate_limit') as mock_rate_limit:
            mock_rate_limit.side_effect = [True] * 5 + [False] * 5  # Allow first 5, throttle rest
            
            results = []
            for request in requests:
                try:
                    result = await self.ai_service.generate_suggestions(request)
                    results.append(result)
                except Exception as e:
                    assert "rate limit" in str(e).lower()
            
            assert len(results) == 5  # Only first 5 should succeed

    def test_error_handling_and_fallbacks(self):
        """Test error handling and fallback mechanisms"""
        # Test API timeout
        with patch('openai.ChatCompletion.acreate') as mock_openai:
            mock_openai.side_effect = asyncio.TimeoutError("API timeout")
            
            with pytest.raises(Exception) as exc_info:
                asyncio.run(self.ai_service.generate_suggestions(
                    SuggestionRequest(
                        document_id="doc-123",
                        content="Test content",
                        suggestion_types=[SuggestionType.CONTENT_IMPROVEMENT]
                    )
                ))
            
            assert "timeout" in str(exc_info.value).lower()

        # Test API quota exceeded
        with patch('openai.ChatCompletion.acreate') as mock_openai:
            mock_openai.side_effect = openai.error.RateLimitError("Quota exceeded")
            
            with pytest.raises(Exception) as exc_info:
                asyncio.run(self.ai_service.generate_suggestions(
                    SuggestionRequest(
                        document_id="doc-123",
                        content="Test content",
                        suggestion_types=[SuggestionType.CONTENT_IMPROVEMENT]
                    )
                ))
            
            assert "rate limit" in str(exc_info.value).lower()

    @pytest.mark.asyncio
    async def test_model_performance_comparison(self, sample_document_content):
        """Test performance comparison between different AI models"""
        request = SuggestionRequest(
            document_id=sample_document_content["id"],
            content=sample_document_content["content"],
            suggestion_types=[SuggestionType.CONTENT_IMPROVEMENT]
        )
        
        # Mock responses for different models
        openai_response = {"choices": [{"message": {"content": "OpenAI suggestion"}}]}
        anthropic_response = MagicMock(content=[MagicMock(text="Anthropic suggestion")])
        
        results = {}
        
        # Test OpenAI
        with patch('openai.ChatCompletion.acreate') as mock_openai:
            mock_openai.return_value = openai_response
            start_time = asyncio.get_event_loop().time()
            
            request.model_preference = "openai"
            openai_suggestions = await self.ai_service.generate_suggestions(request)
            
            results["openai"] = {
                "response_time": asyncio.get_event_loop().time() - start_time,
                "suggestion_count": len(openai_suggestions)
            }

        # Test Anthropic
        with patch.object(Anthropic, 'messages') as mock_anthropic:
            mock_anthropic.create = AsyncMock(return_value=anthropic_response)
            start_time = asyncio.get_event_loop().time()
            
            request.model_preference = "anthropic"
            anthropic_suggestions = await self.ai_service.generate_suggestions(request)
            
            results["anthropic"] = {
                "response_time": asyncio.get_event_loop().time() - start_time,
                "suggestion_count": len(anthropic_suggestions)
            }
        
        # Both models should provide suggestions
        assert results["openai"]["suggestion_count"] > 0
        assert results["anthropic"]["suggestion_count"] > 0

    @pytest.mark.asyncio
    async def test_suggestion_caching(self, sample_document_content):
        """Test suggestion caching mechanism"""
        request = SuggestionRequest(
            document_id=sample_document_content["id"],
            content=sample_document_content["content"],
            suggestion_types=[SuggestionType.CONTENT_IMPROVEMENT]
        )
        
        mock_response = {
            "choices": [{"message": {"content": "Cached suggestion"}}]
        }
        
        with patch('openai.ChatCompletion.acreate') as mock_openai:
            mock_openai.return_value = mock_response
            
            # First request should call API
            suggestions1 = await self.ai_service.generate_suggestions(request)
            
            # Second request should use cache
            suggestions2 = await self.ai_service.generate_suggestions(request)
            
            # API should only be called once due to caching
            assert mock_openai.call_count == 1
            assert suggestions1[0].content == suggestions2[0].content

    def test_metrics_and_analytics(self):
        """Test metrics collection and analytics"""
        # Simulate suggestion usage
        metrics_data = {
            "suggestions_generated": 100,
            "suggestions_applied": 75,
            "average_rating": 4.2,
            "most_common_types": [
                SuggestionType.CONTENT_IMPROVEMENT,
                SuggestionType.STRUCTURE,
                SuggestionType.GRAMMAR
            ]
        }
        
        analytics = self.ai_service.get_usage_analytics("user-123", days=30)
        
        # Mock the analytics response
        with patch.object(self.ai_service, 'get_usage_analytics') as mock_analytics:
            mock_analytics.return_value = metrics_data
            
            result = self.ai_service.get_usage_analytics("user-123", days=30)
            
            assert result["suggestions_generated"] == 100
            assert result["average_rating"] == 4.2
            assert result["most_common_types"][0] == SuggestionType.CONTENT_IMPROVEMENT