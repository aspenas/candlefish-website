/**
 * Mobile App Performance Optimization for Inventory Management
 * React Native optimizations for 60fps scrolling and efficient image handling
 */

import React, { memo, useCallback, useMemo, useRef, useState, useEffect } from 'react';
import {
  FlatList,
  Image,
  View,
  Text,
  StyleSheet,
  Dimensions,
  Platform,
  InteractionManager,
  PixelRatio,
  ActivityIndicator,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import { RecyclerListView, DataProvider, LayoutProvider } from 'recyclerlistview';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PIXEL_RATIO = PixelRatio.get();

/**
 * Optimized Image Component with progressive loading
 */
export const OptimizedMobileImage = memo<{
  source: string;
  style?: any;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
  placeholder?: string;
  priority?: 'low' | 'normal' | 'high';
}>(({ source, style, resizeMode = 'cover', placeholder, priority = 'normal' }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  // Calculate optimal image size based on screen density
  const getOptimizedUrl = useCallback((url: string) => {
    const imageWidth = style?.width || SCREEN_WIDTH;
    const imageHeight = style?.height || 200;
    const optimalWidth = Math.round(imageWidth * PIXEL_RATIO);
    const optimalHeight = Math.round(imageHeight * PIXEL_RATIO);

    // Append size parameters for server-side resizing
    return `${url}?w=${optimalWidth}&h=${optimalHeight}&q=80&format=webp`;
  }, [style]);

  return (
    <View style={[style, styles.imageContainer]}>
      {isLoading && placeholder && (
        <Image
          source={{ uri: placeholder }}
          style={[StyleSheet.absoluteFill, style]}
          blurRadius={20}
        />
      )}

      <FastImage
        style={[StyleSheet.absoluteFill, style]}
        source={{
          uri: getOptimizedUrl(source),
          priority: FastImage.priority[priority],
          cache: FastImage.cacheControl.immutable,
        }}
        resizeMode={FastImage.resizeMode[resizeMode]}
        onLoadStart={() => setIsLoading(true)}
        onLoadEnd={() => setIsLoading(false)}
        onError={() => {
          setError(true);
          setIsLoading(false);
        }}
      />

      {isLoading && (
        <View style={[StyleSheet.absoluteFill, styles.loadingOverlay]}>
          <ActivityIndicator size="small" color="#0000ff" />
        </View>
      )}

      {error && (
        <View style={[StyleSheet.absoluteFill, styles.errorOverlay]}>
          <Text style={styles.errorText}>Failed to load image</Text>
        </View>
      )}
    </View>
  );
});

/**
 * Optimized FlatList for inventory items with virtualization
 */
export const OptimizedInventoryList = memo<{
  data: any[];
  onEndReached?: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
}>(({ data, onEndReached, onRefresh, refreshing = false }) => {
  const flatListRef = useRef<FlatList>(null);

  // Memoize item key extractor
  const keyExtractor = useCallback((item: any) => item.id, []);

  // Optimize getItemLayout for fixed height items
  const getItemLayout = useCallback(
    (data: any, index: number) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    []
  );

  // Render item with optimization
  const renderItem = useCallback(({ item, index }: any) => {
    return <OptimizedInventoryItem item={item} index={index} />;
  }, []);

  // Optimize scrolling performance
  const onScrollBeginDrag = useCallback(() => {
    // Pause expensive operations during scroll
    InteractionManager.runAfterInteractions(() => {
      // Resume operations after scroll
    });
  }, []);

  return (
    <FlatList
      ref={flatListRef}
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      getItemLayout={getItemLayout}
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      updateCellsBatchingPeriod={100}
      initialNumToRender={10}
      windowSize={21}
      onEndReachedThreshold={0.5}
      onEndReached={onEndReached}
      onRefresh={onRefresh}
      refreshing={refreshing}
      onScrollBeginDrag={onScrollBeginDrag}
      // iOS specific optimizations
      scrollEventThrottle={16}
      decelerationRate="fast"
      // Android specific optimizations
      overScrollMode="never"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.listContainer}
    />
  );
});

/**
 * Optimized inventory item component
 */
const ITEM_HEIGHT = 120;

const OptimizedInventoryItem = memo<{
  item: any;
  index: number;
}>(({ item, index }) => {
  const [imageLoaded, setImageLoaded] = useState(false);

  // Delay rendering of images for items not immediately visible
  useEffect(() => {
    if (index < 10) {
      setImageLoaded(true);
    } else {
      const timer = setTimeout(() => setImageLoaded(true), index * 10);
      return () => clearTimeout(timer);
    }
  }, [index]);

  return (
    <View style={styles.itemContainer}>
      {imageLoaded && item.photo_url && (
        <OptimizedMobileImage
          source={item.photo_url}
          style={styles.itemImage}
          priority={index < 5 ? 'high' : 'normal'}
        />
      )}

      <View style={styles.itemContent}>
        <Text style={styles.itemTitle} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.itemCategory} numberOfLines={1}>
          {item.category} • {item.room_name}
        </Text>
        <View style={styles.itemPriceContainer}>
          <Text style={styles.itemPrice}>
            ${item.purchase_price}
          </Text>
          {item.asking_price && (
            <Text style={styles.itemAskingPrice}>
              Ask: ${item.asking_price}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.itemDecision}>
        <Text style={[styles.decisionText, getDecisionStyle(item.decision)]}>
          {item.decision}
        </Text>
      </View>
    </View>
  );
});

/**
 * RecyclerListView for ultra-high performance scrolling
 */
export const UltraOptimizedList = memo<{
  data: any[];
  onEndReached?: () => void;
}>(({ data, onEndReached }) => {
  const [dataProvider, setDataProvider] = useState(
    new DataProvider((r1, r2) => r1.id !== r2.id).cloneWithRows(data)
  );

  useEffect(() => {
    setDataProvider(prevProvider => prevProvider.cloneWithRows(data));
  }, [data]);

  const layoutProvider = useMemo(
    () =>
      new LayoutProvider(
        index => {
          // Return type based on data
          return data[index].photo_url ? 'WITH_IMAGE' : 'TEXT_ONLY';
        },
        (type, dim) => {
          switch (type) {
            case 'WITH_IMAGE':
              dim.width = SCREEN_WIDTH;
              dim.height = 140;
              break;
            case 'TEXT_ONLY':
              dim.width = SCREEN_WIDTH;
              dim.height = 80;
              break;
            default:
              dim.width = SCREEN_WIDTH;
              dim.height = 100;
          }
        }
      ),
    [data]
  );

  const rowRenderer = useCallback((type: string, data: any, index: number) => {
    return <OptimizedInventoryItem item={data} index={index} />;
  }, []);

  return (
    <RecyclerListView
      layoutProvider={layoutProvider}
      dataProvider={dataProvider}
      rowRenderer={rowRenderer}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      renderAheadOffset={SCREEN_HEIGHT * 2}
      optimizeForInsertDeleteAnimations={true}
      scrollViewProps={{
        showsVerticalScrollIndicator: false,
        scrollEventThrottle: 16,
      }}
    />
  );
});

/**
 * Image cache preloading
 */
export const preloadImages = async (urls: string[]) => {
  const preloadPromises = urls.map(url =>
    FastImage.preload([
      {
        uri: url,
        cache: FastImage.cacheControl.immutable,
      },
    ])
  );

  await Promise.all(preloadPromises);
};

/**
 * Clear image cache when needed
 */
export const clearImageCache = async () => {
  await FastImage.clearMemoryCache();
  await FastImage.clearDiskCache();
};

/**
 * Lazy loading wrapper for screens
 */
export const LazyScreen = memo<{
  component: React.ComponentType;
  fallback?: React.ReactNode;
}>(({ component: Component, fallback }) => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    InteractionManager.runAfterInteractions(() => {
      setIsReady(true);
    });
  }, []);

  if (!isReady) {
    return (
      fallback || (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
        </View>
      )
    );
  }

  return <Component />;
});

/**
 * Optimized styles
 */
const styles = StyleSheet.create({
  listContainer: {
    paddingBottom: 20,
  },
  itemContainer: {
    flexDirection: 'row',
    height: ITEM_HEIGHT,
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    padding: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  itemImage: {
    width: 96,
    height: 96,
    borderRadius: 8,
    marginRight: 12,
  },
  itemContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  itemCategory: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  itemPriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginRight: 12,
  },
  itemAskingPrice: {
    fontSize: 14,
    color: '#666666',
  },
  itemDecision: {
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  decisionText: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    overflow: 'hidden',
  },
  imageContainer: {
    backgroundColor: '#f5f5f5',
    overflow: 'hidden',
  },
  loadingOverlay: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorOverlay: {
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 12,
    color: '#999999',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

/**
 * Decision style helper
 */
const getDecisionStyle = (decision: string) => {
  switch (decision) {
    case 'Keep':
      return { backgroundColor: '#e3f2fd', color: '#1976d2' };
    case 'Sell':
      return { backgroundColor: '#fff3e0', color: '#f57c00' };
    case 'Donate':
      return { backgroundColor: '#f3e5f5', color: '#7b1fa2' };
    case 'Unsure':
      return { backgroundColor: '#f5f5f5', color: '#616161' };
    default:
      return { backgroundColor: '#f5f5f5', color: '#616161' };
  }
};

/**
 * Performance monitoring HOC
 */
export const withPerformanceMonitoring = (Component: React.ComponentType) => {
  return memo((props: any) => {
    const renderStartTime = useRef(Date.now());

    useEffect(() => {
      const renderTime = Date.now() - renderStartTime.current;

      // Log slow renders
      if (renderTime > 16) { // More than one frame (60fps)
        console.warn(`Slow render detected: ${Component.displayName || 'Component'} took ${renderTime}ms`);
      }

      // Report to monitoring service
      if (global.performanceMonitor) {
        global.performanceMonitor.recordRenderTime(Component.displayName || 'Component', renderTime);
      }
    });

    return <Component {...props} />;
  });
};

/**
 * React Native performance configuration
 */
export const performanceConfig = {
  // Enable Hermes for Android
  android: {
    enableHermes: true,
    enableProguardInReleaseBuilds: true,
    enableSeparateBuildPerCPUArchitecture: true,
  },

  // iOS optimizations
  ios: {
    useFrameworks: 'static',
    enableBitcode: false,
  },

  // Metro bundler optimizations
  metro: {
    transformer: {
      minifierPath: 'metro-minify-terser',
      minifierConfig: {
        keep_fnames: false,
        mangle: true,
        compress: {
          drop_console: true,
          drop_debugger: true,
        },
      },
    },
  },

  // RAM bundle for faster startup
  bundleCommand: 'ram-bundle',

  // Asset optimization
  assetPlugins: ['expo-asset/tools/hashAssetFiles'],
};
