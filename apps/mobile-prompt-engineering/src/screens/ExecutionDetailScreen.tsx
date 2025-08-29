import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Title, useTheme } from 'react-native-paper';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '@/types';

type ExecutionDetailScreenRouteProp = RouteProp<RootStackParamList, 'ExecutionDetail'>;

interface ExecutionDetailScreenProps {
  route: ExecutionDetailScreenRouteProp;
}

const ExecutionDetailScreen: React.FC<ExecutionDetailScreenProps> = ({ route }) => {
  const theme = useTheme();
  const { executionId } = route.params;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Title>Execution Details</Title>
      {/* TODO: Implement execution details view with:
        - Execution result display
        - Input/output comparison
        - Performance metrics
        - Error details (if any)
        - Model information
        - Cost breakdown
        - Share/export options
      */}
    </View>
  );
};

const styles = StyleSheet.S.create({
  container: {
    flex: 1,
    padding: 16,
  },
});

export default ExecutionDetailScreen;