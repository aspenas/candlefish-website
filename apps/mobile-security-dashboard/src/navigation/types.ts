// Navigation Types for Security Dashboard Mobile App
export type RootStackParamList = {
  // Auth flow
  AuthFlow: undefined;
  Login: undefined;
  BiometricSetup: undefined;

  // Main app flow
  MainTabs: undefined;

  // Modal screens
  AlertDetails: { alertId: string };
  VulnerabilityDetails: { vulnerabilityId: string };
  AssetDetails: { assetId: string };
  IncidentDetails: { incidentId: string };

  // Action screens
  AcknowledgeAlert: { alertId: string };
  ResolveAlert: { alertId: string };
  EscalateIncident: { incidentId: string };

  // Kong specific
  KongSecurityFix: { statusData: any };

  // Settings and profile
  Settings: undefined;
  Profile: undefined;
  NotificationSettings: undefined;

  // Search and filters
  SearchResults: { query: string; type?: string };
  FilterScreen: { filterType: string };
};

export type MainTabParamList = {
  Overview: undefined;
  Alerts: undefined;
  Vulnerabilities: undefined;
  Assets: undefined;
  Incidents: undefined;
};

export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  BiometricAuth: undefined;
  ForgotPassword: undefined;
  ResetPassword: { token: string };
};

export type AlertsStackParamList = {
  AlertsList: undefined;
  AlertDetails: { alertId: string };
  AlertFilters: undefined;
  BulkActions: { selectedAlerts: string[] };
};

export type VulnerabilitiesStackParamList = {
  VulnerabilitiesList: undefined;
  VulnerabilityDetails: { vulnerabilityId: string };
  VulnerabilityFilters: undefined;
  CVEDetails: { cveId: string };
};

export type AssetsStackParamList = {
  AssetsList: undefined;
  AssetDetails: { assetId: string };
  AssetFilters: undefined;
  AssetScan: { assetId: string };
};

export type IncidentsStackParamList = {
  IncidentsList: undefined;
  IncidentDetails: { incidentId: string };
  CreateIncident: undefined;
  IncidentTimeline: { incidentId: string };
};

export type OverviewStackParamList = {
  Dashboard: undefined;
  KongMonitoring: undefined;
  SecurityMetrics: undefined;
  ThreatIntelligence: undefined;
};

// Navigation context types
export interface NavigationState {
  currentRoute: string;
  previousRoute?: string;
  params?: Record<string, any>;
  deepLinkData?: any;
}

// Deep linking types
export interface DeepLinkData {
  screen: string;
  params?: Record<string, any>;
  action?: string;
}

// Navigation analytics
export interface NavigationAnalytics {
  screenName: string;
  timeSpent: number;
  entryPoint: string;
  exitPoint?: string;
  actions: string[];
}

export default RootStackParamList;
