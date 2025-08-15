import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { EstimateDetailScreenProps } from '../types/navigation';

const EstimateDetailScreen: React.FC<EstimateDetailScreenProps> = ({ navigation, route }) => {
  const { estimateId, projectId } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Estimate Detail</Text>
      <Text style={styles.subtitle}>Estimate ID: {estimateId}</Text>
      {projectId && <Text style={styles.subtitle}>Project ID: {projectId}</Text>}
      <Text style={styles.subtitle}>Coming soon...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 4,
    textAlign: 'center',
  },
});

export default EstimateDetailScreen;