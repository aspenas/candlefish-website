import { LinkingOptions } from '@react-navigation/native';
import * as Linking from 'expo-linking';

export const linking: LinkingOptions<any> = {
  prefixes: [
    Linking.createURL('/'),
    'https://maturity.candlefish.ai',
    'candlefish-maturity://',
  ],
  config: {
    screens: {
      Auth: {
        screens: {
          Login: 'login',
          Register: 'register',
          ForgotPassword: 'forgot-password',
        },
      },
      Onboarding: {
        screens: {
          Welcome: 'welcome',
          Permissions: 'permissions',
          NotificationPermission: 'notifications',
          BiometricSetup: 'biometric-setup',
          Completion: 'onboarding-complete',
        },
      },
      Main: {
        screens: {
          Dashboard: {
            screens: {
              DashboardMain: 'dashboard',
              AssessmentDetail: 'assessment/:id',
              Report: 'report/:id',
            },
          },
          Assessments: {
            screens: {
              AssessmentsMain: 'assessments',
              CreateAssessment: 'assessments/new',
              AssessmentWizard: 'assessments/wizard/:id',
              QuestionFlow: 'assessments/questions/:id',
              AssessmentDetail: 'assessments/:id',
              Report: 'assessments/:id/report',
            },
          },
          Documents: {
            screens: {
              DocumentsMain: 'documents',
              DocumentCapture: 'documents/capture',
              DocumentViewer: 'documents/:id',
            },
          },
          Settings: {
            screens: {
              SettingsMain: 'settings',
              Profile: 'settings/profile',
            },
          },
        },
      },
    },
  },
};