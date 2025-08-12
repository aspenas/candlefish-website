import { gql } from '@apollo/client';

// Fragments
export const NOTIFICATION_FRAGMENT = gql`
  fragment NotificationDetails on Notification {
    id
    title
    message
    type
    priority
    category
    isRead
    readAt
    data
    createdAt
    expiresAt
    organization {
      id
      name
    }
    user {
      id
      firstName
      lastName
    }
    dashboard {
      id
      name
    }
    alert {
      id
      name
      severity
    }
    actionButtons {
      id
      label
      action
      url
      style
    }
  }
`;

export const NOTIFICATION_SETTINGS_FRAGMENT = gql`
  fragment NotificationSettingsDetails on NotificationSettings {
    id
    pushNotifications {
      enabled
      alerts
      dashboardUpdates
      systemUpdates
      marketing
      quietHours {
        enabled
        startTime
        endTime
        timezone
      }
    }
    emailNotifications {
      enabled
      alerts
      dashboardUpdates
      systemUpdates
      marketing
      frequency
      digest {
        enabled
        frequency
        time
        timezone
      }
    }
    smsNotifications {
      enabled
      alerts
      emergencyOnly
    }
    webNotifications {
      enabled
      alerts
      dashboardUpdates
      systemUpdates
    }
    preferences {
      language
      timezone
      dateFormat
      soundEnabled
      vibrationEnabled
    }
    updatedAt
  }
`;

// Queries
export const GET_NOTIFICATIONS_QUERY = gql`
  query GetNotifications($limit: Int, $offset: Int, $filters: NotificationFilters) {
    notifications(limit: $limit, offset: $offset, filters: $filters) {
      items {
        ...NotificationDetails
      }
      totalCount
      unreadCount
      hasNextPage
      hasPreviousPage
    }
  }
  ${NOTIFICATION_FRAGMENT}
`;

export const GET_NOTIFICATION_QUERY = gql`
  query GetNotification($notificationId: UUID!) {
    notification(id: $notificationId) {
      ...NotificationDetails
    }
  }
  ${NOTIFICATION_FRAGMENT}
`;

export const GET_NOTIFICATION_SETTINGS_QUERY = gql`
  query GetNotificationSettings {
    notificationSettings {
      ...NotificationSettingsDetails
    }
  }
  ${NOTIFICATION_SETTINGS_FRAGMENT}
`;

export const GET_UNREAD_COUNT_QUERY = gql`
  query GetUnreadNotificationCount {
    notificationStats {
      unreadCount
      totalCount
      categories {
        category
        count
        unreadCount
      }
    }
  }
`;

// Mutations
export const REGISTER_PUSH_TOKEN_MUTATION = gql`
  mutation RegisterPushToken($input: RegisterPushTokenInput!) {
    registerPushToken(input: $input) {
      success
      deviceId
    }
  }
`;

export const UNREGISTER_PUSH_TOKEN_MUTATION = gql`
  mutation UnregisterPushToken($token: String!, $deviceId: String) {
    unregisterPushToken(token: $token, deviceId: $deviceId) {
      success
    }
  }
`;

export const MARK_NOTIFICATION_READ_MUTATION = gql`
  mutation MarkNotificationRead($notificationId: UUID!) {
    markNotificationRead(notificationId: $notificationId) {
      ...NotificationDetails
    }
  }
  ${NOTIFICATION_FRAGMENT}
`;

export const MARK_NOTIFICATIONS_READ_MUTATION = gql`
  mutation MarkNotificationsRead($notificationIds: [UUID!]!) {
    markNotificationsRead(notificationIds: $notificationIds) {
      success
      updatedCount
    }
  }
`;

export const MARK_ALL_NOTIFICATIONS_READ_MUTATION = gql`
  mutation MarkAllNotificationsRead($filters: NotificationFilters) {
    markAllNotificationsRead(filters: $filters) {
      success
      updatedCount
    }
  }
`;

export const DELETE_NOTIFICATION_MUTATION = gql`
  mutation DeleteNotification($notificationId: UUID!) {
    deleteNotification(notificationId: $notificationId) {
      success
    }
  }
`;

export const DELETE_NOTIFICATIONS_MUTATION = gql`
  mutation DeleteNotifications($notificationIds: [UUID!]!) {
    deleteNotifications(notificationIds: $notificationIds) {
      success
      deletedCount
    }
  }
`;

export const UPDATE_NOTIFICATION_SETTINGS_MUTATION = gql`
  mutation UpdateNotificationSettings($input: UpdateNotificationSettingsInput!) {
    updateNotificationSettings(input: $input) {
      ...NotificationSettingsDetails
    }
  }
  ${NOTIFICATION_SETTINGS_FRAGMENT}
`;

export const TEST_NOTIFICATION_MUTATION = gql`
  mutation TestNotification($type: NotificationType!, $target: String) {
    testNotification(type: $type, target: $target) {
      success
      message
      testId
    }
  }
`;

export const SNOOZE_NOTIFICATION_MUTATION = gql`
  mutation SnoozeNotification($notificationId: UUID!, $snoozeUntil: DateTime!) {
    snoozeNotification(notificationId: $notificationId, snoozeUntil: $snoozeUntil) {
      ...NotificationDetails
    }
  }
  ${NOTIFICATION_FRAGMENT}
`;

export const ARCHIVE_NOTIFICATIONS_MUTATION = gql`
  mutation ArchiveNotifications($notificationIds: [UUID!]!) {
    archiveNotifications(notificationIds: $notificationIds) {
      success
      archivedCount
    }
  }
`;

// Subscriptions
export const NOTIFICATION_RECEIVED_SUBSCRIPTION = gql`
  subscription NotificationReceived($userId: UUID!) {
    notificationReceived(userId: $userId) {
      ...NotificationDetails
    }
  }
  ${NOTIFICATION_FRAGMENT}
`;

export const NOTIFICATION_UPDATED_SUBSCRIPTION = gql`
  subscription NotificationUpdated($userId: UUID!) {
    notificationUpdated(userId: $userId) {
      ...NotificationDetails
    }
  }
  ${NOTIFICATION_FRAGMENT}
`;

export const NOTIFICATION_COUNT_UPDATED_SUBSCRIPTION = gql`
  subscription NotificationCountUpdated($userId: UUID!) {
    notificationCountUpdated(userId: $userId) {
      unreadCount
      totalCount
      categories {
        category
        count
        unreadCount
      }
    }
  }
`;

// TypeScript Types
export interface NotificationFilters {
  isRead?: boolean;
  category?: string;
  type?: string;
  priority?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  organizationId?: string;
  dashboardId?: string;
  alertId?: string;
}

export interface RegisterPushTokenInput {
  token: string;
  platform: 'ios' | 'android' | 'web';
  deviceId?: string;
  deviceInfo?: {
    brand?: string;
    model?: string;
    osVersion?: string;
    appVersion?: string;
  };
  settings?: {
    alerts?: boolean;
    dashboardUpdates?: boolean;
    systemUpdates?: boolean;
  };
}

export interface UpdateNotificationSettingsInput {
  pushNotifications?: {
    enabled?: boolean;
    alerts?: boolean;
    dashboardUpdates?: boolean;
    systemUpdates?: boolean;
    marketing?: boolean;
    quietHours?: {
      enabled?: boolean;
      startTime?: string;
      endTime?: string;
      timezone?: string;
    };
  };
  emailNotifications?: {
    enabled?: boolean;
    alerts?: boolean;
    dashboardUpdates?: boolean;
    systemUpdates?: boolean;
    marketing?: boolean;
    frequency?: 'immediate' | 'daily' | 'weekly';
    digest?: {
      enabled?: boolean;
      frequency?: 'daily' | 'weekly' | 'monthly';
      time?: string;
      timezone?: string;
    };
  };
  smsNotifications?: {
    enabled?: boolean;
    alerts?: boolean;
    emergencyOnly?: boolean;
  };
  webNotifications?: {
    enabled?: boolean;
    alerts?: boolean;
    dashboardUpdates?: boolean;
    systemUpdates?: boolean;
  };
  preferences?: {
    language?: string;
    timezone?: string;
    dateFormat?: string;
    soundEnabled?: boolean;
    vibrationEnabled?: boolean;
  };
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'alert' | 'dashboard' | 'system' | 'user' | 'organization';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  isRead: boolean;
  readAt?: string;
  data?: any;
  createdAt: string;
  expiresAt?: string;
  organization?: {
    id: string;
    name: string;
  };
  user?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  dashboard?: {
    id: string;
    name: string;
  };
  alert?: {
    id: string;
    name: string;
    severity: string;
  };
  actionButtons?: Array<{
    id: string;
    label: string;
    action: string;
    url?: string;
    style: 'primary' | 'secondary' | 'danger';
  }>;
}

export interface NotificationSettings {
  id: string;
  pushNotifications: {
    enabled: boolean;
    alerts: boolean;
    dashboardUpdates: boolean;
    systemUpdates: boolean;
    marketing: boolean;
    quietHours: {
      enabled: boolean;
      startTime: string;
      endTime: string;
      timezone: string;
    };
  };
  emailNotifications: {
    enabled: boolean;
    alerts: boolean;
    dashboardUpdates: boolean;
    systemUpdates: boolean;
    marketing: boolean;
    frequency: 'immediate' | 'daily' | 'weekly';
    digest: {
      enabled: boolean;
      frequency: 'daily' | 'weekly' | 'monthly';
      time: string;
      timezone: string;
    };
  };
  smsNotifications: {
    enabled: boolean;
    alerts: boolean;
    emergencyOnly: boolean;
  };
  webNotifications: {
    enabled: boolean;
    alerts: boolean;
    dashboardUpdates: boolean;
    systemUpdates: boolean;
  };
  preferences: {
    language: string;
    timezone: string;
    dateFormat: string;
    soundEnabled: boolean;
    vibrationEnabled: boolean;
  };
  updatedAt: string;
}

export interface NotificationStats {
  unreadCount: number;
  totalCount: number;
  categories: Array<{
    category: string;
    count: number;
    unreadCount: number;
  }>;
}
