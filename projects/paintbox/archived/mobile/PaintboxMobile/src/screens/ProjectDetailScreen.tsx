import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ProjectDetailScreenProps } from '../types/navigation';

const ProjectDetailScreen: React.FC<ProjectDetailScreenProps> = ({ navigation, route }) => {
  const { projectId, projectName } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Project Detail</Text>
      <Text style={styles.subtitle}>Project ID: {projectId}</Text>
      {projectName && <Text style={styles.subtitle}>Name: {projectName}</Text>}
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

export default ProjectDetailScreen;
