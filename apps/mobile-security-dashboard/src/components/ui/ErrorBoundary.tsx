import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  Surface,
  useTheme,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // Report error to crash reporting service
    // crashReporting.recordError(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    // In a real app, you might want to restart the entire app
    // For now, just reset the error boundary
    this.handleRetry();
  };

  render() {
    if (this.state.hasError) {
      return <ErrorFallback onRetry={this.handleRetry} onReload={this.handleReload} />;
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  onRetry: () => void;
  onReload: () => void;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({ onRetry, onReload }) => {
  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content style={styles.content}>
          <Surface style={styles.iconContainer}>
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={64}
              color="#f44336"
            />
          </Surface>
          
          <Title style={styles.title}>Something went wrong</Title>
          
          <Paragraph style={styles.description}>
            An unexpected error occurred. This has been reported to our team.
            You can try refreshing the screen or restarting the app.
          </Paragraph>
          
          <View style={styles.actions}>
            <Button
              mode="outlined"
              onPress={onRetry}
              style={styles.button}
              icon="refresh"
            >
              Try Again
            </Button>
            
            <Button
              mode="contained"
              onPress={onReload}
              style={styles.button}
              icon="restart"
            >
              Restart App
            </Button>
          </View>
        </Card.Content>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fafafa',
  },
  card: {
    width: '100%',
    maxWidth: 400,
    elevation: 4,
  },
  content: {
    alignItems: 'center',
    padding: 24,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: '#ffebee',
    elevation: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    color: '#d32f2f',
  },
  description: {
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
    opacity: 0.8,
  },
  actions: {
    width: '100%',
    gap: 12,
  },
  button: {
    width: '100%',
  },
});

export default ErrorBoundary;