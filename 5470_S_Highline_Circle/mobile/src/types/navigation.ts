import { StackNavigationProp } from '@react-navigation/stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { RouteProp } from '@react-navigation/native';

// Stack Navigator Types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  ItemDetail: {
    itemId: string;
    itemName?: string;
  };
  Settings: undefined;
  CameraCapture: {
    itemId?: string;
    mode: 'valuation' | 'documentation';
  };
  Scanner: {
    mode: 'item_lookup' | 'qr_label';
  };
  ValuationDetail: {
    valuationId: string;
    itemId: string;
  };
  MarketComparisons: {
    valuationId: string;
    itemName: string;
  };
  PriceHistory: {
    itemId: string;
    itemName: string;
  };
  PriceAlerts: {
    itemId?: string;
  };
};

// Tab Navigator Types
export type TabParamList = {
  Dashboard: undefined;
  Valuations: undefined;
  Camera: undefined;
  Scanner: undefined;
  Inventory: undefined;
};

// Navigation Prop Types
export type RootStackNavigationProp = StackNavigationProp<RootStackParamList>;
export type TabNavigationProp = BottomTabNavigationProp<TabParamList>;

// Route Prop Types
export type ItemDetailRouteProp = RouteProp<RootStackParamList, 'ItemDetail'>;
export type CameraCaptureRouteProp = RouteProp<RootStackParamList, 'CameraCapture'>;
export type ScannerRouteProp = RouteProp<RootStackParamList, 'Scanner'>;
export type ValuationDetailRouteProp = RouteProp<RootStackParamList, 'ValuationDetail'>;
export type MarketComparisonsRouteProp = RouteProp<RootStackParamList, 'MarketComparisons'>;
export type PriceHistoryRouteProp = RouteProp<RootStackParamList, 'PriceHistory'>;
export type PriceAlertsRouteProp = RouteProp<RootStackParamList, 'PriceAlerts'>;

// Combined Navigation Prop Types for components
export type NavigationProps = {
  navigation: RootStackNavigationProp;
};

export type TabNavigationProps = {
  navigation: TabNavigationProp;
};

// Screen Props (combines navigation and route)
export type ItemDetailScreenProps = {
  navigation: RootStackNavigationProp;
  route: ItemDetailRouteProp;
};

export type CameraCaptureScreenProps = {
  navigation: RootStackNavigationProp;
  route: CameraCaptureRouteProp;
};

export type ScannerScreenProps = {
  navigation: RootStackNavigationProp;
  route: ScannerRouteProp;
};

export type ValuationDetailScreenProps = {
  navigation: RootStackNavigationProp;
  route: ValuationDetailRouteProp;
};

export type MarketComparisonsScreenProps = {
  navigation: RootStackNavigationProp;
  route: MarketComparisonsRouteProp;
};

export type PriceHistoryScreenProps = {
  navigation: RootStackNavigationProp;
  route: PriceHistoryRouteProp;
};

export type PriceAlertsScreenProps = {
  navigation: RootStackNavigationProp;
  route: PriceAlertsRouteProp;
};