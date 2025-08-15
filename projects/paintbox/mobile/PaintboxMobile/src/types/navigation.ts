import type { RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

// Stack Navigator Parameter Lists
export type RootStackParamList = {
  TabNavigator: undefined;
  ProjectDetail: {
    projectId: string;
    projectName?: string;
  };
  EstimateDetail: {
    estimateId: string;
    projectId?: string;
  };
  CustomerDetail: {
    customerId: string;
    customerName?: string;
  };
  MeasurementDetail: {
    estimateId: string;
    measurementId?: string;
  };
  PhotoViewer: {
    photos: string[];
    initialIndex: number;
  };
  CameraCapture: {
    projectId: string;
    category?: string;
  };
  PhotoAnnotation: {
    photoId: string;
    photoUri: string;
  };
};

// Tab Navigator Parameter List
export type TabParamList = {
  DashboardTab: undefined;
  ProjectsTab: undefined;
  MeasurementsTab: undefined;
  CameraTab: undefined;
  ManagerTab: undefined;
};

// Stack Navigator Parameter Lists for Each Tab
export type DashboardStackParamList = {
  Dashboard: undefined;
};

export type ProjectsStackParamList = {
  Projects: undefined;
  ProjectDetail: {
    projectId: string;
    projectName?: string;
  };
  EstimateDetail: {
    estimateId: string;
    projectId?: string;
  };
  CustomerDetail: {
    customerId: string;
    customerName?: string;
  };
};

export type MeasurementsStackParamList = {
  Measurements: undefined;
  MeasurementDetail: {
    estimateId: string;
    measurementId?: string;
  };
};

export type CameraStackParamList = {
  Camera: undefined;
  CameraCapture: {
    projectId: string;
    category?: string;
  };
  PhotoAnnotation: {
    photoId: string;
    photoUri: string;
  };
};

export type ManagerStackParamList = {
  Manager: undefined;
  ApprovalDetail: {
    estimateId: string;
    approvalType: 'discount' | 'pricing' | 'change_order';
  };
};

// Navigation Prop Types
export type DashboardScreenNavigationProp = StackNavigationProp<
  DashboardStackParamList,
  'Dashboard'
>;

export type ProjectsScreenNavigationProp = StackNavigationProp<
  ProjectsStackParamList,
  'Projects'
>;

export type ProjectDetailScreenNavigationProp = StackNavigationProp<
  ProjectsStackParamList,
  'ProjectDetail'
>;

export type EstimateDetailScreenNavigationProp = StackNavigationProp<
  ProjectsStackParamList,
  'EstimateDetail'
>;

export type CustomerDetailScreenNavigationProp = StackNavigationProp<
  ProjectsStackParamList,
  'CustomerDetail'
>;

export type MeasurementsScreenNavigationProp = StackNavigationProp<
  MeasurementsStackParamList,
  'Measurements'
>;

export type MeasurementDetailScreenNavigationProp = StackNavigationProp<
  MeasurementsStackParamList,
  'MeasurementDetail'
>;

export type CameraScreenNavigationProp = StackNavigationProp<
  CameraStackParamList,
  'Camera'
>;

export type CameraCaptureScreenNavigationProp = StackNavigationProp<
  CameraStackParamList,
  'CameraCapture'
>;

export type PhotoAnnotationScreenNavigationProp = StackNavigationProp<
  CameraStackParamList,
  'PhotoAnnotation'
>;

export type ManagerScreenNavigationProp = StackNavigationProp<
  ManagerStackParamList,
  'Manager'
>;

// Route Prop Types
export type DashboardScreenRouteProp = RouteProp<
  DashboardStackParamList,
  'Dashboard'
>;

export type ProjectsScreenRouteProp = RouteProp<
  ProjectsStackParamList,
  'Projects'
>;

export type ProjectDetailScreenRouteProp = RouteProp<
  ProjectsStackParamList,
  'ProjectDetail'
>;

export type EstimateDetailScreenRouteProp = RouteProp<
  ProjectsStackParamList,
  'EstimateDetail'
>;

export type CustomerDetailScreenRouteProp = RouteProp<
  ProjectsStackParamList,
  'CustomerDetail'
>;

export type MeasurementsScreenRouteProp = RouteProp<
  MeasurementsStackParamList,
  'Measurements'
>;

export type MeasurementDetailScreenRouteProp = RouteProp<
  MeasurementsStackParamList,
  'MeasurementDetail'
>;

export type CameraScreenRouteProp = RouteProp<
  CameraStackParamList,
  'Camera'
>;

export type CameraCaptureScreenRouteProp = RouteProp<
  CameraStackParamList,
  'CameraCapture'
>;

export type PhotoAnnotationScreenRouteProp = RouteProp<
  CameraStackParamList,
  'PhotoAnnotation'
>;

export type ManagerScreenRouteProp = RouteProp<
  ManagerStackParamList,
  'Manager'
>;

// Combined Props Types for Screen Components
export interface DashboardScreenProps {
  navigation: DashboardScreenNavigationProp;
  route: DashboardScreenRouteProp;
}

export interface ProjectsScreenProps {
  navigation: ProjectsScreenNavigationProp;
  route: ProjectsScreenRouteProp;
}

export interface ProjectDetailScreenProps {
  navigation: ProjectDetailScreenNavigationProp;
  route: ProjectDetailScreenRouteProp;
}

export interface EstimateDetailScreenProps {
  navigation: EstimateDetailScreenNavigationProp;
  route: EstimateDetailScreenRouteProp;
}

export interface CustomerDetailScreenProps {
  navigation: CustomerDetailScreenNavigationProp;
  route: CustomerDetailScreenRouteProp;
}

export interface MeasurementsScreenProps {
  navigation: MeasurementsScreenNavigationProp;
  route: MeasurementsScreenRouteProp;
}

export interface MeasurementDetailScreenProps {
  navigation: MeasurementDetailScreenNavigationProp;
  route: MeasurementDetailScreenRouteProp;
}

export interface CameraScreenProps {
  navigation: CameraScreenNavigationProp;
  route: CameraScreenRouteProp;
}

export interface CameraCaptureScreenProps {
  navigation: CameraCaptureScreenNavigationProp;
  route: CameraCaptureScreenRouteProp;
}

export interface PhotoAnnotationScreenProps {
  navigation: PhotoAnnotationScreenNavigationProp;
  route: PhotoAnnotationScreenRouteProp;
}

export interface ManagerScreenProps {
  navigation: ManagerScreenNavigationProp;
  route: ManagerScreenRouteProp;
}