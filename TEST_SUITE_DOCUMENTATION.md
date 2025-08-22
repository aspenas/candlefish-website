# RTPM Dashboard Test Suite Documentation

## Overview

This document describes the comprehensive test suite for the Real-time Agent Performance Monitoring Dashboard, covering both backend API endpoints and frontend components with extensive test coverage including unit tests, integration tests, E2E tests, performance tests, and load testing.

## Test Architecture

### Test Pyramid Implementation

```
    E2E Tests (Critical User Flows)
   /                                \
  Integration Tests (System Behavior)
 /                                    \
Unit Tests (Individual Components/Functions)
```

- **Unit Tests**: 80% - Fast, isolated tests for individual functions and components
- **Integration Tests**: 15% - Test component interactions and system integration  
- **E2E Tests**: 5% - Critical user flows and full system behavior

## Backend API Tests

### Location: `/apps/rtpm-api/tests/`

#### 1. Unit Tests (`test_api_endpoints.py`)

**Coverage**: All API endpoints with comprehensive edge cases

**Test Categories**:
- **Health Endpoints**: `/health`, `/metrics`, `/api/v1/status`
- **Agent Management**: CRUD operations for agents
- **Metrics Operations**: Current, real-time, historical, and aggregated metrics
- **Alert Management**: Alert configuration and management
- **Error Handling**: 404, 422, 500 error scenarios
- **Security**: Headers, CORS, input validation
- **Performance**: Response times and concurrent request handling

**Key Features**:
- Comprehensive input validation testing
- SQL injection and XSS protection verification
- Rate limiting and concurrent request handling
- Memory usage stability under load
- Response time benchmarking

#### 2. Integration Tests (`test_integration.py`)

**Coverage**: Database operations, external service integrations, and system behavior

**Test Categories**:
- **Database Integration**: CRUD operations, transactions, constraints
- **Redis Integration**: Caching, session management, expiration
- **External Services**: AWS Secrets Manager, monitoring services
- **End-to-End Workflows**: Complete user journeys
- **Data Consistency**: Concurrent operations and data integrity
- **Failure Scenarios**: Database/Redis failures, network issues

**Database Tests**:
- Schema creation and migration
- CRUD operations with validation
- Time-series queries and aggregations
- Performance with large datasets (10k+ records)
- Connection pooling and transaction handling

#### 3. WebSocket Tests (`test_websocket.py`)

**Coverage**: Real-time communication and connection management

**Test Categories**:
- **Connection Management**: Multiple simultaneous connections
- **Message Handling**: JSON validation, throughput testing
- **Error Scenarios**: Disconnections, malformed messages
- **Performance**: Connection scaling, message latency
- **Broadcasting**: Multi-client message delivery
- **Stress Testing**: 50+ concurrent connections

**Performance Metrics**:
- Connection establishment: <100ms average
- Message throughput: >1 message/second per connection
- Memory usage: <100MB for 50 connections
- Latency: <100ms average message delivery

#### 4. Performance Tests (`test_performance.py`)

**Coverage**: System performance with 1000+ agents and high load

**Test Categories**:
- **Load Testing**: 100+ concurrent requests
- **Throughput**: >100 requests/second
- **Memory Stability**: <50MB increase during load
- **Large Datasets**: 1000+ agents, 10k+ metrics
- **WebSocket Scaling**: 50+ concurrent connections
- **Database Performance**: Query optimization with large data

**Performance Targets**:
- API Response Time: <100ms average, <500ms max
- Database Queries: <1 second for aggregations
- Memory Usage: <100MB increase under load
- WebSocket Connections: 50+ simultaneous connections

### Test Configuration

**pytest.ini**:
- Coverage requirement: 80% minimum
- Timeout: 300 seconds for performance tests
- Markers for test categorization
- XML and HTML reporting
- Database and Redis integration

## Frontend Dashboard Tests

### Location: `/apps/nanda-dashboard/src/__tests__/`

#### 1. Component Tests

**Test Setup**: React Testing Library with Vitest

**Coverage**: All RTPM dashboard components

**Key Components Tested**:
- **RTPMDashboard**: Main dashboard layout and navigation
- **VirtualizedAgentGrid**: Performance with 1000+ agents
- **RealtimeCharts**: Live data visualization
- **HistoricalCharts**: Time-series data analysis
- **AlertConfiguration**: Alert management interface
- **ExportManager**: Data export functionality

**Test Categories**:
- **Rendering**: Component mounting and display
- **User Interactions**: Click, keyboard, form submissions
- **State Management**: Props, internal state, context
- **Performance**: Virtualization, large datasets
- **Accessibility**: ARIA labels, keyboard navigation
- **Error Handling**: Graceful degradation

#### 2. Component-Specific Tests

**RTPMDashboard** (`RTPMDashboard.test.tsx`):
- Navigation between views
- Sidebar collapse/expand
- Mobile responsive behavior
- WebSocket integration
- Real-time updates
- Error state handling

**VirtualizedAgentGrid** (`VirtualizedAgentGrid.test.tsx`):
- Performance with 1000+ agents
- Virtualization efficiency
- Agent selection and filtering
- Keyboard navigation
- Sorting and search
- Memory usage optimization

#### 3. Mock Setup

**MSW (Mock Service Worker)**: Comprehensive API mocking

**Mock Services**:
- Complete API endpoint simulation
- WebSocket connection mocking
- Error scenario simulation
- Performance testing data
- Real-time data streaming

**Mock Data Generators**:
- Agent datasets (50-1000+ agents)
- Metrics time series (24h+ historical data)
- Alert configurations
- Real-time streaming data

### Frontend Test Configuration

**vitest.config.ts**:
- Coverage requirement: 80% (branches, functions, lines, statements)
- JSDOM environment for React testing
- Path aliases for clean imports
- MSW integration for API mocking
- Coverage exclusions for test files

## End-to-End Tests

### Location: `/apps/nanda-dashboard/e2e/`

#### 1. Playwright Configuration

**Multi-Browser Testing**:
- Chromium (Desktop)
- Firefox (Desktop)  
- WebKit/Safari (Desktop)
- Mobile Chrome (Pixel 5)
- Mobile Safari (iPhone 12)

**Test Scenarios**:
- **Dashboard Navigation** (`dashboard-navigation.spec.ts`)
- **Agent Management** (`agent-management.spec.ts`)
- **Real-time Updates** (WebSocket integration)
- **Responsive Design** (Mobile/tablet/desktop)
- **Performance** (Load times, interactions)

#### 2. Critical User Flows

**Dashboard Navigation**:
- Initial dashboard load and display
- Navigation between all views (Overview, Real-time, Historical, Agents, Alerts)
- Sidebar collapse/expand functionality
- Mobile menu navigation
- Keyboard accessibility

**Agent Management**:
- Agent grid display and virtualization
- Agent selection and filtering
- Scrolling performance with large datasets
- Search and sort functionality
- Agent details display

**Performance Requirements**:
- Initial load: <3 seconds
- Navigation: <500ms per interaction
- Scroll performance: 60fps with 1000+ agents
- Memory usage: Stable during extended use

## Load Testing

### Location: `/apps/rtpm-api/tests/load_testing/`

#### 1. K6 Load Testing Scripts

**Test Scenarios**:
- **Baseline Load**: 10 VUs for 2 minutes
- **Stress Test**: Gradual increase to 100 VUs
- **Spike Test**: Sudden traffic spike (10→200 VUs)
- **Soak Test**: Extended duration (20 VUs for 10 minutes)
- **WebSocket Load**: 50 concurrent connections

**Performance Thresholds**:
- 95% of requests: <500ms response time
- Error rate: <1%
- WebSocket connections: Stable for test duration
- Memory usage: <500MB under load

#### 2. Load Test Execution

**Script**: `run_load_tests.sh`
- Automated test execution
- Results collection and reporting
- Performance analysis
- HTML report generation
- Cleanup of old results

**Test Types**:
- API endpoints only
- WebSocket connections only
- Mixed workload simulation
- Metrics ingestion load
- Historical data queries

## Test Data Management

### Mock Data Generators

**Agent Data**:
- Configurable agent count (1-1000+)
- Realistic status distribution
- Geographic distribution
- Platform variety (OpenAI, Anthropic, Google)
- Version and capability simulation

**Metrics Data**:
- Time-series generation (5-minute intervals)
- Realistic value ranges and trends
- Multi-agent correlation
- Historical data spanning 24+ hours
- Real-time streaming simulation

**Alert Data**:
- Various alert types and severities
- Historical alert occurrences
- Alert configuration templates
- Notification action simulation

### Database Fixtures

**Test Database Setup**:
- Isolated test databases (PostgreSQL)
- Automated schema creation
- Test data seeding
- Transaction rollback after tests
- Connection pooling for performance

**Redis Test Setup**:
- Separate test Redis instance
- Key expiration testing
- Cache invalidation scenarios
- Session management testing

## CI/CD Integration

### GitHub Actions Pipeline

**Workflow**: `.github/workflows/rtpm-test-pipeline.yml`

**Test Stages**:
1. **Setup**: Project validation and test matrix configuration
2. **API Tests**: Unit, integration, WebSocket, and performance tests
3. **Dashboard Tests**: Component tests, type checking, linting
4. **E2E Tests**: Playwright tests across multiple browsers
5. **Load Tests**: K6 performance and load testing
6. **Security Tests**: Vulnerability scanning and CodeQL analysis
7. **Report Generation**: Combined test reporting and coverage

**Test Matrix Strategy**:
- **Unit**: Fast feedback for all PRs
- **Integration**: Standard for develop branch
- **E2E**: Full testing for main branch
- **Performance**: Scheduled and on-demand
- **Full**: Complete test suite for releases

**Parallel Execution**:
- Independent job execution
- Artifact sharing between jobs
- Combined coverage reporting
- Performance trending

### Coverage Requirements

**Backend API**: 80% minimum coverage
- Line coverage: 80%
- Branch coverage: 80%
- Function coverage: 80%

**Frontend Dashboard**: 80% minimum coverage
- Statements: 80%
- Branches: 80%
- Functions: 80%
- Lines: 80%

**Coverage Reporting**:
- Codecov integration
- HTML reports for detailed analysis
- XML reports for CI integration
- Coverage trending and alerts

## Test Execution

### Local Development

**Backend Tests**:
```bash
# Unit tests
pytest tests/test_api_endpoints.py -v

# Integration tests  
pytest tests/test_integration.py -v

# WebSocket tests
pytest tests/test_websocket.py -v

# Performance tests
pytest tests/test_performance.py -v

# All tests with coverage
pytest --cov=src --cov-report=html
```

**Frontend Tests**:
```bash
# Unit tests
pnpm test

# Coverage report
pnpm test:coverage

# Watch mode
pnpm test:watch

# E2E tests
pnpm e2e

# E2E with UI
pnpm e2e:ui
```

**Load Tests**:
```bash
# All load test scenarios
cd apps/rtpm-api/tests/load_testing
./run_load_tests.sh

# Specific test type
K6_TEST_TYPE=api_only k6 run k6_load_tests.js

# With soak test
./run_load_tests.sh --soak
```

### Continuous Integration

**Automated Triggers**:
- Push to main/develop branches
- Pull request creation
- Scheduled nightly runs
- Manual workflow dispatch

**Test Selection**:
- PR: Unit + Integration tests
- Main branch: Full test suite
- Scheduled: Performance + Load tests
- Manual: Configurable test level

**Artifact Collection**:
- Test results (JUnit XML)
- Coverage reports (HTML/XML)
- Performance reports
- E2E screenshots/videos
- Load test results

## Performance Benchmarks

### API Performance Targets

**Response Times**:
- Health check: <50ms
- Simple queries: <100ms
- Complex aggregations: <500ms
- Metrics ingestion: <100ms

**Throughput**:
- Health endpoints: >500 req/sec
- Metrics ingestion: >100 req/sec
- WebSocket connections: 50+ concurrent
- Database queries: <1sec for large datasets

**Resource Usage**:
- Memory: <500MB under load
- CPU: <80% average during stress
- Database connections: Efficient pooling
- File descriptors: No leaks

### Frontend Performance Targets

**Rendering Performance**:
- Initial load: <3 seconds
- View transitions: <500ms
- Agent grid (1000+ items): 60fps scrolling
- Chart updates: <100ms refresh

**Memory Usage**:
- Initial load: <100MB
- After 1000 agents: <200MB
- Extended use: Stable (no leaks)
- Chart data: Efficient cleanup

**User Experience**:
- Interaction responsiveness: <100ms
- Search/filter: <300ms
- Real-time updates: <1 second latency
- Error recovery: Graceful degradation

## Monitoring and Alerts

### Test Health Monitoring

**Coverage Tracking**:
- Minimum 80% coverage enforcement
- Coverage trend analysis
- Critical path coverage priority
- Uncovered code identification

**Performance Monitoring**:
- Test execution time tracking
- Resource usage monitoring
- Flaky test identification
- Performance regression detection

**Quality Metrics**:
- Pass/fail rate trending
- Test stability scoring
- Bug escape rate
- Test maintenance overhead

### Alert Configuration

**Test Failures**:
- Immediate alerts for main branch failures
- Slack/email notifications
- Detailed failure reports
- Automatic issue creation

**Performance Degradation**:
- Response time threshold alerts
- Memory usage alerts
- Coverage drop alerts
- Load test failure notifications

**Maintenance Alerts**:
- Dependency updates
- Test environment issues
- Infrastructure problems
- Security vulnerabilities

## Best Practices

### Test Design Principles

**Unit Tests**:
- Test behavior, not implementation
- Arrange-Act-Assert pattern
- Single responsibility per test
- Deterministic and fast execution
- Comprehensive edge case coverage

**Integration Tests**:
- Test component interactions
- Use realistic test data
- Verify system contracts
- Test failure scenarios
- Database transaction handling

**E2E Tests**:
- Focus on critical user journeys
- Page Object Model pattern
- Stable selectors (test IDs)
- Independent test execution
- Comprehensive error scenarios

### Performance Testing

**Load Test Strategy**:
- Realistic traffic patterns
- Gradual load increase
- Extended duration testing
- Resource monitoring
- Threshold enforcement

**Data Management**:
- Realistic test datasets
- Data cleanup procedures
- Isolation between tests
- Performance data tracking
- Historical comparisons

### Maintenance Strategy

**Test Maintenance**:
- Regular test review and cleanup
- Flaky test investigation
- Performance baseline updates
- Documentation maintenance
- Tool and dependency updates

**Continuous Improvement**:
- Test effectiveness analysis
- Coverage gap identification
- Performance optimization
- Feedback incorporation
- Best practice evolution

This comprehensive test suite ensures the Real-time Agent Performance Monitoring Dashboard maintains high quality, performance, and reliability across all components and user interactions.