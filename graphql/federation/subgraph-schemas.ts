import { buildSubgraphSchema } from '@apollo/subgraph';
import { gql } from 'apollo-server-express';

// Auth Service Subgraph Schema
export const authSubgraphTypeDefs = gql`
  # Directives
  extend schema @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key", "@shareable", "@provides", "@requires", "@external", "@tag", "@override", "@inaccessible"])

  # User entity (owned by auth service)
  type User @key(fields: "id") {
    id: UUID!
    email: EmailAddress!
    firstName: NonEmptyString!
    lastName: NonEmptyString!
    avatar: URL
    role: UserRole!
    status: UserStatus!
    preferences: UserPreferences
    createdAt: DateTime!
    updatedAt: DateTime!
    lastLoginAt: DateTime
    timezone: String
    locale: String
  }

  type UserPreferences {
    theme: Theme!
    language: String!
    timezone: String!
    dateFormat: String!
    currency: Currency!
    dashboardLayout: DashboardLayout!
    emailNotifications: Boolean!
    pushNotifications: Boolean!
    analyticsPreferences: AnalyticsPreferences
  }

  # Auth-specific queries and mutations
  extend type Query {
    me: User
    validateToken(token: String!): TokenValidation!
  }

  extend type Mutation {
    login(input: LoginInput!): AuthPayload!
    register(input: RegisterInput!): AuthPayload!
    logout: Boolean!
    refreshToken(refreshToken: String!): AuthPayload!
    updateProfile(input: UpdateProfileInput!): User!
    updateUserPreferences(input: UpdateUserPreferencesInput!): UserPreferences!
  }

  # Auth-specific types
  type TokenValidation {
    valid: Boolean!
    user: User
    expiresAt: DateTime
  }

  type AuthPayload {
    accessToken: String!
    refreshToken: String!
    user: User!
    expiresIn: Int!
  }

  input LoginInput {
    email: EmailAddress!
    password: String!
    remember: Boolean = false
  }

  input RegisterInput {
    email: EmailAddress!
    password: String!
    firstName: NonEmptyString!
    lastName: NonEmptyString!
    organizationName: String
  }
`;

// Organization Service Subgraph Schema
export const organizationSubgraphTypeDefs = gql`
  extend schema @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key", "@shareable", "@provides", "@requires", "@external", "@tag", "@override", "@inaccessible"])

  # User reference (external entity)
  type User @key(fields: "id") @external {
    id: UUID! @external
  }

  # Organization entity (owned by organization service)
  type Organization @key(fields: "id") {
    id: UUID!
    name: NonEmptyString!
    slug: NonEmptyString!
    logo: URL
    website: URL
    description: String
    industry: Industry
    size: OrganizationSize!
    status: OrganizationStatus!
    subscription: Subscription!
    settings: OrganizationSettings!
    branding: BrandingSettings
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type OrganizationMembership @key(fields: "id") {
    id: UUID!
    user: User!
    organization: Organization!
    role: OrganizationRole!
    permissions: [Permission!]!
    invitedBy: User
    joinedAt: DateTime!
    isActive: Boolean!
  }

  # Extend User to include organization relationships
  extend type User @key(fields: "id") {
    id: UUID! @external
    organizations: [OrganizationMembership!]!
  }

  extend type Query {
    organization(id: UUID!): Organization
    organizations(filter: OrganizationFilter, pagination: PaginationInput): OrganizationConnection!
    organizationSettings: OrganizationSettings!
  }

  extend type Mutation {
    createOrganization(input: CreateOrganizationInput!): Organization!
    updateOrganization(input: UpdateOrganizationInput!): Organization!
    updateOrganizationSettings(input: UpdateOrganizationSettingsInput!): OrganizationSettings!
    inviteUser(input: InviteUserInput!): Invitation!
    acceptInvitation(token: NonEmptyString!): OrganizationMembership!
    updateMemberRole(input: UpdateMemberRoleInput!): OrganizationMembership!
    removeMember(userId: UUID!): Boolean!
  }

  extend type Subscription {
    organizationMemberAdded: OrganizationMemberUpdate!
    organizationMemberRemoved: OrganizationMemberUpdate!
    organizationSettingsChanged: OrganizationSettingsUpdate!
  }
`;

// Analytics Service Subgraph Schema
export const analyticsSubgraphTypeDefs = gql`
  extend schema @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key", "@shareable", "@provides", "@requires", "@external", "@tag", "@override", "@inaccessible"])

  # External entities
  type User @key(fields: "id") @external {
    id: UUID! @external
  }

  type Organization @key(fields: "id") @external {
    id: UUID! @external
  }

  # Analytics entities (owned by analytics service)
  type DataSource @key(fields: "id") {
    id: UUID!
    name: NonEmptyString!
    type: DataSourceType!
    status: DataSourceStatus!
    connection: DataSourceConnection!
    config: DataSourceConfig!
    schema: DataSourceSchema
    tables: [DataTable!]!
    lastSyncAt: DateTime
    syncStatus: SyncStatus!
    queryCount: NonNegativeInt!
    avgQueryTime: Decimal
    errorRate: Decimal
    description: String
    tags: [String!]
    createdBy: User!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Metric @key(fields: "id") {
    id: UUID!
    name: NonEmptyString!
    description: String
    type: MetricType!
    query: MetricQuery!
    dataSource: DataSource!
    aggregation: AggregationType!
    dimensions: [Dimension!]
    filters: [Filter!]
    format: MetricFormat!
    unit: String
    precision: NonNegativeInt
    lastCalculated: DateTime
    calculationTime: Decimal
    cacheTimeout: PositiveInt
    tags: [String!]
    category: MetricCategory
    isCustom: Boolean!
    createdBy: User!
    createdAt: DateTime!
    updatedAt: DateTime!
    usageCount: NonNegativeInt!
    history: [MetricValue!]!
  }

  type Alert @key(fields: "id") {
    id: UUID!
    name: NonEmptyString!
    description: String
    metric: Metric!
    condition: AlertCondition!
    threshold: Decimal!
    operator: ComparisonOperator!
    frequency: Duration!
    enabled: Boolean!
    severity: AlertSeverity!
    channels: [NotificationChannel!]!
    lastTriggered: DateTime
    status: AlertStatus!
    createdBy: User!
    createdAt: DateTime!
    updatedAt: DateTime!
    history: [AlertExecution!]!
  }

  # Extend Organization with analytics relationships
  extend type Organization @key(fields: "id") {
    id: UUID! @external
    dataSources: [DataSource!]!
    metrics: [Metric!]!
    usage: OrganizationUsage!
    limits: OrganizationLimits!
  }

  extend type Query {
    dataSource(id: UUID!): DataSource
    dataSources(filter: DataSourceFilter, pagination: PaginationInput): DataSourceConnection!
    testDataSourceConnection(input: DataSourceConnectionInput!): DataSourceConnectionTest!
    metric(id: UUID!): Metric
    metrics(filter: MetricFilter, pagination: PaginationInput): MetricConnection!
    executeMetric(id: UUID!, parameters: JSON, timeRange: TimeRangeInput, filters: [FilterInput!]): MetricResult!
    alert(id: UUID!): Alert
    alerts(filter: AlertFilter, pagination: PaginationInput): AlertConnection!
    analyticsOverview(timeRange: TimeRangeInput): AnalyticsOverview!
    usageAnalytics(timeRange: TimeRangeInput, granularity: TimeGranularity): UsageAnalytics!
    performanceMetrics(timeRange: TimeRangeInput, resources: [ResourceType!]): PerformanceMetrics!
  }

  extend type Mutation {
    createDataSource(input: CreateDataSourceInput!): DataSource!
    updateDataSource(input: UpdateDataSourceInput!): DataSource!
    deleteDataSource(id: UUID!): Boolean!
    syncDataSource(id: UUID!): DataSource!
    createMetric(input: CreateMetricInput!): Metric!
    updateMetric(input: UpdateMetricInput!): Metric!
    deleteMetric(id: UUID!): Boolean!
    calculateMetric(id: UUID!, parameters: JSON): MetricResult!
    createAlert(input: CreateAlertInput!): Alert!
    updateAlert(input: UpdateAlertInput!): Alert!
    deleteAlert(id: UUID!): Boolean!
    enableAlert(id: UUID!): Alert!
    disableAlert(id: UUID!): Alert!
    testAlert(id: UUID!): AlertTestResult!
  }

  extend type Subscription {
    dataSourceSyncCompleted(dataSourceId: UUID!): DataSourceSyncUpdate!
    dataSourceStatusChanged(dataSourceId: UUID!): DataSourceStatusUpdate!
    metricCalculated(metricId: UUID!): MetricUpdate!
    metricThresholdBreached(metricIds: [UUID!]): MetricThresholdAlert!
    alertTriggered: AlertNotification!
    alertStatusChanged(alertId: UUID!): AlertStatusUpdate!
  }
`;

// Dashboard Service Subgraph Schema
export const dashboardSubgraphTypeDefs = gql`
  extend schema @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key", "@shareable", "@provides", "@requires", "@external", "@tag", "@override", "@inaccessible"])

  # External entities
  type User @key(fields: "id") @external {
    id: UUID! @external
  }

  type Organization @key(fields: "id") @external {
    id: UUID! @external
  }

  type DataSource @key(fields: "id") @external {
    id: UUID! @external
  }

  type Metric @key(fields: "id") @external {
    id: UUID! @external
  }

  type Alert @key(fields: "id") @external {
    id: UUID! @external
  }

  # Dashboard entities (owned by dashboard service)
  type Dashboard @key(fields: "id") {
    id: UUID!
    name: NonEmptyString!
    description: String
    layout: DashboardLayout!
    widgets: [Widget!]!
    filters: [DashboardFilter!]
    visibility: Visibility!
    isPublic: Boolean!
    publicToken: String
    sharedWith: [DashboardShare!]
    settings: DashboardSettings!
    theme: DashboardTheme
    autoRefresh: Boolean!
    refreshInterval: PositiveInt
    lastViewed: DateTime
    viewCount: NonNegativeInt!
    avgLoadTime: Decimal
    tags: [String!]
    category: DashboardCategory
    isFavorite: Boolean!
    isTemplate: Boolean!
    templateSource: Dashboard
    createdBy: User!
    updatedBy: User
    createdAt: DateTime!
    updatedAt: DateTime!
    dataSources: [DataSource!]!
    alerts: [Alert!]!
    snapshots: [DashboardSnapshot!]!
  }

  type Widget @key(fields: "id") {
    id: UUID!
    name: NonEmptyString!
    description: String
    type: WidgetType!
    metric: Metric!
    query: WidgetQuery
    dataSource: DataSource!
    position: WidgetPosition!
    size: WidgetSize!
    config: WidgetConfig!
    style: WidgetStyle
    drillDown: DrillDownConfig
    filters: [WidgetFilter!]
    actions: [WidgetAction!]
    cacheTimeout: PositiveInt
    lastUpdated: DateTime
    loadTime: Decimal
    status: WidgetStatus!
    error: String
    tags: [String!]
    createdBy: User!
    createdAt: DateTime!
    updatedAt: DateTime!
    data: WidgetData
  }

  # Extend User with dashboard relationships
  extend type User @key(fields: "id") {
    id: UUID! @external
    dashboards: [Dashboard!]!
    widgets: [Widget!]!
  }

  # Extend Organization with dashboard relationships
  extend type Organization @key(fields: "id") {
    id: UUID! @external
    dashboards: [Dashboard!]!
  }

  # Extend DataSource with dashboard relationships
  extend type DataSource @key(fields: "id") {
    id: UUID! @external
    dashboards: [Dashboard!]!
  }

  # Extend Metric with dashboard relationships
  extend type Metric @key(fields: "id") {
    id: UUID! @external
    dashboards: [Dashboard!]!
  }

  # Extend Alert with dashboard relationships
  extend type Alert @key(fields: "id") {
    id: UUID! @external
    dashboards: [Dashboard!]!
  }

  extend type Query {
    dashboard(id: UUID!): Dashboard
    dashboards(filter: DashboardFilter, pagination: PaginationInput): DashboardConnection!
    myDashboards(filter: DashboardFilter, pagination: PaginationInput): DashboardConnection!
    publicDashboards(filter: PublicDashboardFilter, pagination: PaginationInput): DashboardConnection!
    widget(id: UUID!): Widget
    widgets(filter: WidgetFilter, pagination: PaginationInput): WidgetConnection!
  }

  extend type Mutation {
    createDashboard(input: CreateDashboardInput!): Dashboard!
    updateDashboard(input: UpdateDashboardInput!): Dashboard!
    cloneDashboard(input: CloneDashboardInput!): Dashboard!
    deleteDashboard(id: UUID!): Boolean!
    shareDashboard(input: ShareDashboardInput!): DashboardShare!
    unshareDashboard(shareId: UUID!): Boolean!
    favoriteDashboard(id: UUID!): Dashboard!
    unfavoriteDashboard(id: UUID!): Dashboard!
    createWidget(input: CreateWidgetInput!): Widget!
    updateWidget(input: UpdateWidgetInput!): Widget!
    updateWidgetPosition(input: UpdateWidgetPositionInput!): Widget!
    deleteWidget(id: UUID!): Boolean!
    refreshWidget(id: UUID!): Widget!
    bulkUpdateWidgetPositions(input: BulkUpdateWidgetPositionsInput!): [Widget!]!
  }

  extend type Subscription {
    dashboardUpdated(dashboardId: UUID!): DashboardUpdate!
    dashboardShared(dashboardId: UUID!): DashboardShareUpdate!
    dashboardDeleted: UUID!
    widgetUpdated(widgetId: UUID!): WidgetUpdate!
    widgetDataChanged(widgetId: UUID!): WidgetDataUpdate!
    widgetPositionChanged(dashboardId: UUID!): WidgetPositionUpdate!
    userActivity(dashboardId: UUID!): UserActivityUpdate!
    dashboardCollaboration(dashboardId: UUID!): CollaborationUpdate!
  }
`;

// Notification Service Subgraph Schema
export const notificationSubgraphTypeDefs = gql`
  extend schema @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key", "@shareable", "@provides", "@requires", "@external", "@tag", "@override", "@inaccessible"])

  # External entities
  type User @key(fields: "id") @external {
    id: UUID! @external
  }

  # Notification entities (owned by notification service)
  type Notification @key(fields: "id") {
    id: UUID!
    type: NotificationType!
    title: NonEmptyString!
    message: String!
    user: User!
    data: JSON
    actions: [NotificationAction!]
    read: Boolean!
    readAt: DateTime
    priority: NotificationPriority!
    category: NotificationCategory
    createdAt: DateTime!
    expiresAt: DateTime
    channels: [NotificationDelivery!]!
  }

  # Extend User with notification relationships
  extend type User @key(fields: "id") {
    id: UUID! @external
    notifications: [Notification!]!
    notificationSettings: NotificationSettings
  }

  extend type Query {
    notifications(filter: NotificationFilter, pagination: PaginationInput): NotificationConnection!
    unreadNotificationCount: NonNegativeInt!
  }

  extend type Mutation {
    markNotificationRead(id: UUID!): Notification!
    markAllNotificationsRead: Int!
    deleteNotification(id: UUID!): Boolean!
    updateNotificationSettings(input: UpdateNotificationSettingsInput!): NotificationSettings!
  }

  extend type Subscription {
    notificationReceived: Notification!
    notificationRead: NotificationReadUpdate!
  }
`;

// Export Service Subgraph Schema
export const exportSubgraphTypeDefs = gql`
  extend schema @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key", "@shareable", "@provides", "@requires", "@external", "@tag", "@override", "@inaccessible"])

  # External entities
  type User @key(fields: "id") @external {
    id: UUID! @external
  }

  type Dashboard @key(fields: "id") @external {
    id: UUID! @external
  }

  # Export entities (owned by export service)
  type Export @key(fields: "id") {
    id: UUID!
    dashboard: Dashboard!
    format: ExportFormat!
    status: ExportStatus!
    filters: JSON
    dateRange: DateRange
    options: ExportOptions
    url: URL
    fileSize: BigInt
    requestedBy: User!
    requestedAt: DateTime!
    completedAt: DateTime
    expiresAt: DateTime!
    downloadCount: NonNegativeInt!
  }

  # Extend Dashboard with export relationships
  extend type Dashboard @key(fields: "id") {
    id: UUID! @external
    exports: [Export!]!
  }

  extend type Query {
    export(id: UUID!): Export
    exports(filter: ExportFilter, pagination: PaginationInput): ExportConnection!
  }

  extend type Mutation {
    createExport(input: CreateExportInput!): Export!
    cancelExport(id: UUID!): Boolean!
  }

  extend type Subscription {
    exportStatusChanged(exportId: UUID!): ExportStatusUpdate!
    exportCompleted: ExportCompletedUpdate!
  }
`;

// Ingestion Service Subgraph Schema
export const ingestionSubgraphTypeDefs = gql`
  extend schema @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key", "@shareable", "@provides", "@requires", "@external", "@tag", "@override", "@inaccessible"])

  # External entities
  type User @key(fields: "id") @external {
    id: UUID! @external
  }

  type Organization @key(fields: "id") @external {
    id: UUID! @external
  }

  # Activity Log entity (owned by ingestion service)
  type ActivityLog @key(fields: "id") {
    id: UUID!
    user: User!
    action: ActivityAction!
    resource: String
    resourceId: UUID
    metadata: JSON
    ipAddress: String
    userAgent: String
    createdAt: DateTime!
  }

  type AuditLog @key(fields: "id") {
    id: UUID!
    user: User
    action: AuditAction!
    resource: Resource!
    resourceId: UUID
    oldValues: JSON
    newValues: JSON
    metadata: JSON
    ipAddress: String
    userAgent: String
    createdAt: DateTime!
  }

  # Extend User with activity relationships
  extend type User @key(fields: "id") {
    id: UUID! @external
    activityLogs: [ActivityLog!]!
  }

  # Extend Organization with audit relationships
  extend type Organization @key(fields: "id") {
    id: UUID! @external
    auditLogs: [AuditLog!]!
  }

  extend type Query {
    activityLog(filter: ActivityLogFilter, pagination: PaginationInput): ActivityLogConnection!
    auditLog(filter: AuditLogFilter, pagination: PaginationInput): AuditLogConnection!
    search(query: NonEmptyString!, types: [SearchableType!], filters: JSON, pagination: PaginationInput): SearchResults!
    suggestions(input: NonEmptyString!, type: SuggestionType!, limit: PositiveInt): [Suggestion!]!
  }

  extend type Mutation {
    migrateData(input: MigrateDataInput!): MigrationResult!
    purgeOldData(input: PurgeOldDataInput!): PurgeResult!
    rebuildCache(type: CacheType!): Boolean!
    bulkDeleteDashboards(ids: [UUID!]!): Int!
    bulkShareDashboards(input: BulkShareDashboardsInput!): [DashboardShare!]!
  }

  extend type Subscription {
    systemHealth: SystemHealthUpdate!
    systemMaintenance: SystemMaintenanceUpdate!
    systemAlert: SystemAlertUpdate!
    liveQueryResult(queryId: UUID!): LiveQueryUpdate!
    bulkOperationProgress(operationId: UUID!): BulkOperationProgress!
  }
`;

// Helper function to create subgraph schemas
export const createSubgraphSchemas = () => {
  return {
    authService: buildSubgraphSchema({ typeDefs: authSubgraphTypeDefs }),
    organizationService: buildSubgraphSchema({ typeDefs: organizationSubgraphTypeDefs }),
    analyticsService: buildSubgraphSchema({ typeDefs: analyticsSubgraphTypeDefs }),
    dashboardService: buildSubgraphSchema({ typeDefs: dashboardSubgraphTypeDefs }),
    notificationService: buildSubgraphSchema({ typeDefs: notificationSubgraphTypeDefs }),
    exportService: buildSubgraphSchema({ typeDefs: exportSubgraphTypeDefs }),
    ingestionService: buildSubgraphSchema({ typeDefs: ingestionSubgraphTypeDefs }),
  };
};

export {
  authSubgraphTypeDefs,
  organizationSubgraphTypeDefs,
  analyticsSubgraphTypeDefs,
  dashboardSubgraphTypeDefs,
  notificationSubgraphTypeDefs,
  exportSubgraphTypeDefs,
  ingestionSubgraphTypeDefs,
};
