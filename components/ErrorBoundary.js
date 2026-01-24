import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

/**
 * ErrorBoundary - Catches JavaScript errors in child components
 * and displays a fallback UI instead of crashing
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error);
    console.error('Error info:', errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.content}>
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.subtitle}>The app encountered an error</Text>

            <ScrollView style={styles.errorBox}>
              <Text style={styles.errorText}>
                {this.state.error?.toString() || 'Unknown error'}
              </Text>
              {this.state.errorInfo?.componentStack && (
                <Text style={styles.stackText}>
                  {this.state.errorInfo.componentStack}
                </Text>
              )}
            </ScrollView>

            <TouchableOpacity style={styles.button} onPress={this.handleReset}>
              <Text style={styles.buttonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a1628',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  title: {
    color: '#ff6b6b',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    color: '#ffffff',
    fontSize: 16,
    marginBottom: 20,
    opacity: 0.7,
  },
  errorBox: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    maxHeight: 300,
    marginBottom: 20,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 14,
    fontFamily: 'monospace',
  },
  stackText: {
    color: '#888',
    fontSize: 12,
    fontFamily: 'monospace',
    marginTop: 12,
  },
  button: {
    backgroundColor: '#00d4ff',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
  },
  buttonText: {
    color: '#0a1628',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ErrorBoundary;
export { ErrorBoundary };
