import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { SecurityTheme } from '../../theme/SecurityTheme';

interface ErrorFallbackProps {
  error: Error;
  onRetry?: () => void;
  title?: string;
  message?: string;
  showErrorDetails?: boolean;
}

export default function ErrorFallback({
  error,
  onRetry,
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  showErrorDetails = __DEV__,
}: ErrorFallbackProps) {
  
  const [showDetails, setShowDetails] = React.useState(false);

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Error Icon */}
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons 
            name="alert-circle" 
            size={80} 
            color={SecurityTheme.colors.interactive.error} 
          />
        </View>

        {/* Error Title */}
        <Text style={styles.title}>{title}</Text>

        {/* Error Message */}
        <Text style={styles.message}>{message}</Text>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          {onRetry && (
            <Button
              mode="contained"
              onPress={onRetry}
              style={styles.retryButton}
              contentStyle={styles.buttonContent}
              labelStyle={styles.buttonLabel}
              icon="refresh"
            >
              Try Again
            </Button>
          )}

          {showErrorDetails && (
            <Button
              mode="outlined"
              onPress={() => setShowDetails(!showDetails)}
              style={styles.detailsButton}
              contentStyle={styles.buttonContent}
              labelStyle={styles.detailsButtonLabel}
              icon={showDetails ? "chevron-up" : "chevron-down"}
            >
              {showDetails ? 'Hide' : 'Show'} Details
            </Button>
          )}
        </View>

        {/* Error Details */}
        {showDetails && showErrorDetails && (
          <View style={styles.detailsContainer}>
            <Text style={styles.detailsTitle}>Error Details:</Text>
            <Text style={styles.errorName}>{error.name}</Text>
            <Text style={styles.errorMessage}>{error.message}</Text>
            
            {error.stack && (
              <>
                <Text style={styles.stackTitle}>Stack Trace:</Text>
                <ScrollView 
                  style={styles.stackContainer}
                  showsVerticalScrollIndicator={true}
                >
                  <Text style={styles.stackTrace}>{error.stack}</Text>
                </ScrollView>
              </>
            )}
          </View>
        )}

        {/* Help Text */}
        <View style={styles.helpContainer}>
          <Text style={styles.helpTitle}>Need Help?</Text>
          <Text style={styles.helpText}>
            If this problem persists, please contact your system administrator or IT support team.
          </Text>
          
          <View style={styles.troubleshootingContainer}>
            <Text style={styles.troubleshootingTitle}>Troubleshooting Tips:</Text>
            <View style={styles.tipContainer}>
              <MaterialCommunityIcons 
                name="circle-small" 
                size={16} 
                color={SecurityTheme.colors.text.secondary} 
              />
              <Text style={styles.tipText}>Check your internet connection</Text>
            </View>
            <View style={styles.tipContainer}>
              <MaterialCommunityIcons 
                name="circle-small" 
                size={16} 
                color={SecurityTheme.colors.text.secondary} 
              />
              <Text style={styles.tipText}>Restart the application</Text>
            </View>
            <View style={styles.tipContainer}>
              <MaterialCommunityIcons 
                name="circle-small" 
                size={16} 
                color={SecurityTheme.colors.text.secondary} 
              />
              <Text style={styles.tipText}>Clear app cache and data</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SecurityTheme.colors.background.primary,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SecurityTheme.spacing.lg,
  },
  iconContainer: {
    marginBottom: SecurityTheme.spacing.xl,
    padding: SecurityTheme.spacing.lg,
    borderRadius: SecurityTheme.borderRadius.full,
    backgroundColor: SecurityTheme.colors.background.secondary,
    ...SecurityTheme.shadows.lg,
  },
  title: {
    fontSize: SecurityTheme.typography.sizes['3xl'],
    fontWeight: SecurityTheme.typography.weights.bold,
    color: SecurityTheme.colors.text.primary,
    textAlign: 'center',
    marginBottom: SecurityTheme.spacing.md,
  },
  message: {
    fontSize: SecurityTheme.typography.sizes.lg,
    color: SecurityTheme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: SecurityTheme.typography.lineHeights.normal * SecurityTheme.typography.sizes.lg,
    marginBottom: SecurityTheme.spacing['2xl'],
    maxWidth: 300,
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 300,
    gap: SecurityTheme.spacing.md,
  },
  retryButton: {
    backgroundColor: SecurityTheme.colors.primary[500],
    borderRadius: SecurityTheme.borderRadius.md,
  },
  detailsButton: {
    borderColor: SecurityTheme.colors.border.primary,
    borderRadius: SecurityTheme.borderRadius.md,
  },
  buttonContent: {
    paddingVertical: SecurityTheme.spacing.sm,
  },
  buttonLabel: {
    fontSize: SecurityTheme.typography.sizes.base,
    fontWeight: SecurityTheme.typography.weights.medium,
    color: SecurityTheme.colors.text.primary,
  },
  detailsButtonLabel: {
    fontSize: SecurityTheme.typography.sizes.base,
    fontWeight: SecurityTheme.typography.weights.medium,
    color: SecurityTheme.colors.text.secondary,
  },
  detailsContainer: {
    width: '100%',
    marginTop: SecurityTheme.spacing.xl,
    padding: SecurityTheme.spacing.md,
    backgroundColor: SecurityTheme.colors.background.secondary,
    borderRadius: SecurityTheme.borderRadius.lg,
    borderWidth: 1,
    borderColor: SecurityTheme.colors.border.primary,
  },
  detailsTitle: {
    fontSize: SecurityTheme.typography.sizes.lg,
    fontWeight: SecurityTheme.typography.weights.semibold,
    color: SecurityTheme.colors.text.primary,
    marginBottom: SecurityTheme.spacing.sm,
  },
  errorName: {
    fontSize: SecurityTheme.typography.sizes.base,
    fontWeight: SecurityTheme.typography.weights.semibold,
    color: SecurityTheme.colors.interactive.error,
    marginBottom: SecurityTheme.spacing.xs,
    fontFamily: SecurityTheme.typography.fonts.mono,
  },
  errorMessage: {
    fontSize: SecurityTheme.typography.sizes.sm,
    color: SecurityTheme.colors.text.secondary,
    marginBottom: SecurityTheme.spacing.md,
    fontFamily: SecurityTheme.typography.fonts.mono,
  },
  stackTitle: {
    fontSize: SecurityTheme.typography.sizes.base,
    fontWeight: SecurityTheme.typography.weights.medium,
    color: SecurityTheme.colors.text.primary,
    marginBottom: SecurityTheme.spacing.xs,
  },
  stackContainer: {
    maxHeight: 200,
    backgroundColor: SecurityTheme.colors.background.primary,
    borderRadius: SecurityTheme.borderRadius.sm,
    padding: SecurityTheme.spacing.sm,
    borderWidth: 1,
    borderColor: SecurityTheme.colors.border.primary,
  },
  stackTrace: {
    fontSize: SecurityTheme.typography.sizes.xs,
    color: SecurityTheme.colors.text.tertiary,
    fontFamily: SecurityTheme.typography.fonts.mono,
    lineHeight: SecurityTheme.typography.lineHeights.tight * SecurityTheme.typography.sizes.xs,
  },
  helpContainer: {
    width: '100%',
    marginTop: SecurityTheme.spacing.xl,
    padding: SecurityTheme.spacing.lg,
    backgroundColor: SecurityTheme.colors.background.secondary,
    borderRadius: SecurityTheme.borderRadius.lg,
    borderLeftWidth: 4,
    borderLeftColor: SecurityTheme.colors.interactive.accent,
  },
  helpTitle: {
    fontSize: SecurityTheme.typography.sizes.lg,
    fontWeight: SecurityTheme.typography.weights.semibold,
    color: SecurityTheme.colors.text.primary,
    marginBottom: SecurityTheme.spacing.sm,
  },
  helpText: {
    fontSize: SecurityTheme.typography.sizes.base,
    color: SecurityTheme.colors.text.secondary,
    lineHeight: SecurityTheme.typography.lineHeights.normal * SecurityTheme.typography.sizes.base,
    marginBottom: SecurityTheme.spacing.lg,
  },
  troubleshootingContainer: {
    marginTop: SecurityTheme.spacing.md,
  },
  troubleshootingTitle: {
    fontSize: SecurityTheme.typography.sizes.base,
    fontWeight: SecurityTheme.typography.weights.medium,
    color: SecurityTheme.colors.text.primary,
    marginBottom: SecurityTheme.spacing.sm,
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SecurityTheme.spacing.xs,
  },
  tipText: {
    fontSize: SecurityTheme.typography.sizes.sm,
    color: SecurityTheme.colors.text.secondary,
    marginLeft: SecurityTheme.spacing.xs,
    flex: 1,
  },
});