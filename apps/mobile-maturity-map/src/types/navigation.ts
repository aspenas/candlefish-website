import type { NavigatorScreenParams } from '@react-navigation/native';

export type MainTabParamList = {
  Dashboard: NavigatorScreenParams<DashboardStackParamList>;
  Assessments: NavigatorScreenParams<AssessmentsStackParamList>;
  Documents: NavigatorScreenParams<DocumentsStackParamList>;
  Settings: NavigatorScreenParams<SettingsStackParamList>;
};

export type DashboardStackParamList = {
  DashboardMain: undefined;
  AssessmentDetail: {
    id: string;
    title?: string;
  };
  Report: {
    id: string;
    assessmentId: string;
  };
};

export type AssessmentsStackParamList = {
  AssessmentsMain: undefined;
  CreateAssessment: undefined;
  AssessmentWizard: {
    id: string;
  };
  QuestionFlow: {
    id: string;
    currentSection?: number;
  };
  AssessmentDetail: {
    id: string;
    title?: string;
  };
  Report: {
    id: string;
    assessmentId: string;
  };
};

export type DocumentsStackParamList = {
  DocumentsMain: undefined;
  DocumentCapture: {
    assessmentId?: string;
    mode?: 'camera' | 'library' | 'files';
  };
  DocumentViewer: {
    id: string;
    title?: string;
  };
};

export type SettingsStackParamList = {
  SettingsMain: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Onboarding: NavigatorScreenParams<OnboardingStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
  // Modal screens
  AssessmentDetail: {
    id: string;
    title?: string;
  };
  CreateAssessment: undefined;
  AssessmentWizard: {
    id: string;
  };
  QuestionFlow: {
    id: string;
    currentSection?: number;
  };
  DocumentCapture: {
    assessmentId?: string;
    mode?: 'camera' | 'library' | 'files';
  };
  DocumentViewer: {
    id: string;
    title?: string;
  };
  Report: {
    id: string;
    assessmentId: string;
  };
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  BiometricSetup: {
    email: string;
    skipable?: boolean;
  };
};

export type OnboardingStackParamList = {
  Welcome: undefined;
  Permissions: undefined;
  NotificationPermission: undefined;
  BiometricSetup: {
    email: string;
    skipable: boolean;
  };
  Completion: undefined;
};