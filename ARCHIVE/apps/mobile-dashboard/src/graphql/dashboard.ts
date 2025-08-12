import { gql } from '@apollo/client';

// Fragments
export const WIDGET_FRAGMENT = gql`
  fragment WidgetDetails on Widget {
    id
    name
    description
    type
    position {
      x
      y
      row
      col
    }
    size {
      width
      height
      minWidth
      minHeight
      maxWidth
      maxHeight
    }
    config {
      title {
        text
        fontSize
        color
        alignment
        visible
      }
      legend {
        visible
        position
        alignment
        fontSize
        maxWidth
      }
      colors
      animation {
        enabled
        duration
        easing
        delay
      }
      tooltip {
        enabled
        format
        backgroundColor
        borderColor
        fontSize
      }
      responsive
      customOptions
    }
    style {
      backgroundColor
      borderColor
      borderWidth
      borderRadius
      shadow {
        enabled
        color
        blur
        offsetX
        offsetY
      }
      opacity
    }
    status
    error
    tags
    cacheTimeout
    lastUpdated
    loadTime
    createdBy {
      id
      firstName
      lastName
    }
    createdAt
    updatedAt
  }
`;

export const WIDGET_DATA_FRAGMENT = gql`
  fragment WidgetDataDetails on WidgetData {
    series {
      name
      data {
        x
        y
        label
        color
        metadata
      }
      color
      type
    }
    summary {
      total
      average
      min
      max
      count
      trend
      changePercent
    }
    lastUpdated
    rowCount
    executionTime
  }
`;

export const DASHBOARD_FILTER_FRAGMENT = gql`
  fragment DashboardFilterDetails on DashboardFilter {
    id
    name
    field
    type
    operator
    defaultValue
    options {
      value
      label
      description
    }
    required
    visible
  }
`;

export const DASHBOARD_FRAGMENT = gql`
  fragment DashboardDetails on Dashboard {
    id
    name
    description
    layout
    visibility
    isPublic
    publicToken
    settings {
      allowExport
      allowShare
      allowEdit
      allowClone
      requireAuth
      watermark
      customCSS
    }
    theme {
      id
      name
      colors {
        primary
        secondary
        accent
        background
        surface
        text
        textSecondary
        border
        success
        warning
        error
        info
      }
      fonts {
        primary
        secondary
        monospace
        sizes {
          xs
          sm
          md
          lg
          xl
          xxl
        }
      }
      spacing {
        xs
        sm
        md
        lg
        xl
      }
      customCSS
    }
    autoRefresh
    refreshInterval
    lastViewed
    viewCount
    avgLoadTime
    tags
    category
    isFavorite
    isTemplate
    createdBy {
      id
      firstName
      lastName
      email
    }
    updatedBy {
      id
      firstName
      lastName
    }
    createdAt
    updatedAt
    widgets {
      ...WidgetDetails
    }
    filters {
      ...DashboardFilterDetails
    }
  }
  ${WIDGET_FRAGMENT}
  ${DASHBOARD_FILTER_FRAGMENT}
`;

// Queries
export const GET_DASHBOARDS_QUERY = gql`
  query GetDashboards($organizationId: UUID!) {
    dashboards(organizationId: $organizationId) {
      id
      name
      description
      layout
      visibility
      isPublic
      autoRefresh
      refreshInterval
      lastViewed
      viewCount
      avgLoadTime
      tags
      category
      isFavorite
      isTemplate
      createdBy {
        id
        firstName
        lastName
      }
      createdAt
      updatedAt
      widgets {
        id
        name
        type
        status
      }
    }
  }
`;

export const GET_DASHBOARD_QUERY = gql`
  query GetDashboard($dashboardId: UUID!) {
    dashboard(id: $dashboardId) {
      ...DashboardDetails
    }
  }
  ${DASHBOARD_FRAGMENT}
`;

export const GET_WIDGET_DATA_QUERY = gql`
  query GetWidgetData($widgetId: UUID!, $filters: JSON) {
    widget(id: $widgetId) {
      id
      name
      type
      data(filters: $filters) {
        ...WidgetDataDetails
      }
    }
  }
  ${WIDGET_DATA_FRAGMENT}
`;

export const GET_DASHBOARD_ANALYTICS_QUERY = gql`
  query GetDashboardAnalytics($dashboardId: UUID!, $timeRange: TimeRange!) {
    dashboardAnalytics(dashboardId: $dashboardId, timeRange: $timeRange) {
      viewCount
      uniqueViewers
      avgSessionDuration
      topWidgets {
        widgetId
        widgetName
        interactionCount
      }
      performanceMetrics {
        avgLoadTime
        slowestWidget {
          id
          name
          loadTime
        }
        errorRate
      }
    }
  }
`;

// Mutations
export const CREATE_DASHBOARD_MUTATION = gql`
  mutation CreateDashboard($organizationId: UUID!, $input: CreateDashboardInput!) {
    createDashboard(organizationId: $organizationId, input: $input) {
      ...DashboardDetails
    }
  }
  ${DASHBOARD_FRAGMENT}
`;

export const UPDATE_DASHBOARD_MUTATION = gql`
  mutation UpdateDashboard($dashboardId: UUID!, $input: UpdateDashboardInput!) {
    updateDashboard(id: $dashboardId, input: $input) {
      ...DashboardDetails
    }
  }
  ${DASHBOARD_FRAGMENT}
`;

export const DELETE_DASHBOARD_MUTATION = gql`
  mutation DeleteDashboard($dashboardId: UUID!) {
    deleteDashboard(id: $dashboardId) {
      success
    }
  }
`;

export const DUPLICATE_DASHBOARD_MUTATION = gql`
  mutation DuplicateDashboard($dashboardId: UUID!, $name: String) {
    duplicateDashboard(dashboardId: $dashboardId, name: $name) {
      ...DashboardDetails
    }
  }
  ${DASHBOARD_FRAGMENT}
`;

export const SHARE_DASHBOARD_MUTATION = gql`
  mutation ShareDashboard($dashboardId: UUID!, $config: ShareDashboardInput!) {
    shareDashboard(dashboardId: $dashboardId, config: $config) {
      shareUrl
      shareToken
      expiresAt
    }
  }
`;

export const EXPORT_DASHBOARD_MUTATION = gql`
  mutation ExportDashboard($dashboardId: UUID!, $format: ExportFormat!, $options: ExportOptionsInput) {
    exportDashboard(dashboardId: $dashboardId, format: $format, options: $options) {
      exportId
      status
      downloadUrl
      estimatedTime
    }
  }
`;

export const UPDATE_WIDGET_MUTATION = gql`
  mutation UpdateWidget($widgetId: UUID!, $input: UpdateWidgetInput!) {
    updateWidget(id: $widgetId, input: $input) {
      ...WidgetDetails
    }
  }
  ${WIDGET_FRAGMENT}
`;

export const CREATE_WIDGET_MUTATION = gql`
  mutation CreateWidget($dashboardId: UUID!, $input: CreateWidgetInput!) {
    createWidget(dashboardId: $dashboardId, input: $input) {
      ...WidgetDetails
    }
  }
  ${WIDGET_FRAGMENT}
`;

export const DELETE_WIDGET_MUTATION = gql`
  mutation DeleteWidget($widgetId: UUID!) {
    deleteWidget(id: $widgetId) {
      success
    }
  }
`;

export const REORDER_WIDGETS_MUTATION = gql`
  mutation ReorderWidgets($dashboardId: UUID!, $widgets: [WidgetPositionInput!]!) {
    reorderWidgets(dashboardId: $dashboardId, widgets: $widgets) {
      ...DashboardDetails
    }
  }
  ${DASHBOARD_FRAGMENT}
`;

// Subscriptions
export const DASHBOARD_UPDATED_SUBSCRIPTION = gql`
  subscription DashboardUpdated($dashboardId: UUID!) {
    dashboardUpdated(dashboardId: $dashboardId) {
      ...DashboardDetails
    }
  }
  ${DASHBOARD_FRAGMENT}
`;

export const WIDGET_DATA_UPDATED_SUBSCRIPTION = gql`
  subscription WidgetDataUpdated($widgetId: UUID!) {
    widgetDataUpdated(widgetId: $widgetId) {
      widgetId
      data {
        ...WidgetDataDetails
      }
    }
  }
  ${WIDGET_DATA_FRAGMENT}
`;

export const DASHBOARD_REAL_TIME_SUBSCRIPTION = gql`
  subscription DashboardRealTime($dashboardId: UUID!) {
    dashboardRealTime(dashboardId: $dashboardId) {
      type
      widgetId
      data
      timestamp
    }
  }
`;
