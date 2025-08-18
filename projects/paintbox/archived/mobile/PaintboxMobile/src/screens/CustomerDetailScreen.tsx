import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CustomerDetailScreenProps } from '../types/navigation';

const CustomerDetailScreen: React.FC<CustomerDetailScreenProps> = ({ navigation, route }) => {
  const { customerId, customerName } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Customer Detail</Text>
      <Text style={styles.subtitle}>Customer ID: {customerId}</Text>
      {customerName && <Text style={styles.subtitle}>Name: {customerName}</Text>}
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

export default CustomerDetailScreen;
