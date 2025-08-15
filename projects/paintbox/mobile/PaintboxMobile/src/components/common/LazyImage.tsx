import React, { useState, useCallback, memo } from 'react';
import {
  Image,
  View,
  ActivityIndicator,
  Text,
  StyleSheet,
  ImageProps,
  ViewStyle,
} from 'react-native';

interface LazyImageProps extends Omit<ImageProps, 'source'> {
  uri: string;
  thumbnailUri?: string;
  width?: number;
  height?: number;
  placeholder?: React.ReactNode;
  style?: ViewStyle;
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
  onError?: (error: any) => void;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
}

const LazyImage: React.FC<LazyImageProps> = memo(({
  uri,
  thumbnailUri,
  width,
  height,
  placeholder,
  style,
  onLoadStart,
  onLoadEnd,
  onError,
  resizeMode = 'cover',
  ...otherProps
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleLoadStart = useCallback(() => {
    setLoading(true);
    setError(false);
    onLoadStart?.();
  }, [onLoadStart]);

  const handleLoadEnd = useCallback(() => {
    setLoading(false);
    setImageLoaded(true);
    onLoadEnd?.();
  }, [onLoadEnd]);

  const handleError = useCallback((e: any) => {
    setLoading(false);
    setError(true);
    onError?.(e);
  }, [onError]);

  const containerStyle = [
    styles.container,
    style,
    width && { width },
    height && { height },
  ];

  return (
    <View style={containerStyle}>
      {/* Thumbnail image for fast loading */}
      {thumbnailUri && !imageLoaded && (
        <Image
          source={{ uri: thumbnailUri }}
          style={[
            styles.image,
            { width: width || '100%', height: height || '100%' },
          ]}
          resizeMode={resizeMode}
          blurRadius={2}
        />
      )}

      {/* Main image */}
      <Image
        source={{ uri }}
        style={[
          styles.image,
          { width: width || '100%', height: height || '100%' },
          !imageLoaded && styles.hiddenImage,
        ]}
        resizeMode={resizeMode}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        {...otherProps}
      />

      {/* Loading indicator */}
      {loading && !error && (
        <View style={styles.loadingContainer}>
          {placeholder || (
            <>
              <ActivityIndicator size="small" color="#666" />
              <Text style={styles.loadingText}>Loading...</Text>
            </>
          )}
        </View>
      )}

      {/* Error state */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load image</Text>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  hiddenImage: {
    opacity: 0,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 12,
    color: '#666',
  },
  errorContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0f0',
  },
  errorText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});

LazyImage.displayName = 'LazyImage';

export default LazyImage;