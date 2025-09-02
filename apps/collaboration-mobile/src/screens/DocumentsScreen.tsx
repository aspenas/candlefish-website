/**
 * Documents Screen
 * Shows list of user's documents with search and organization features
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Alert,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useLazyQuery } from '@apollo/client';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming,
  FadeInUp,
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/Ionicons';

import { useTheme } from '@/contexts/ThemeContext';
import { useAuthContext } from '@/contexts/AuthContext';
import { Document, DocumentType, DocumentStatus } from '@/types';
import DocumentCard from '@/components/document/DocumentCard';
import EmptyState from '@/components/common/EmptyState';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import FilterBottomSheet from '@/components/document/FilterBottomSheet';
import SortModal from '@/components/document/SortModal';
import FloatingActionButton from '@/components/common/FloatingActionButton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface DocumentFilter {
  type?: DocumentType;
  status?: DocumentStatus;
  owner?: string;
  dateRange?: {
    start: string;
    end: string;
  };
}

interface DocumentSort {
  field: 'name' | 'updatedAt' | 'createdAt' | 'lastEditedAt';
  direction: 'ASC' | 'DESC';
}

const DocumentsScreen: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuthContext();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [searchText, setSearchText] = useState('');
  const [filter, setFilter] = useState<DocumentFilter>({});
  const [sort, setSort] = useState<DocumentSort>({ field: 'updatedAt', direction: 'DESC' });
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Animation values
  const searchBarOpacity = useSharedValue(1);
  const fabScale = useSharedValue(1);

  // GraphQL queries
  const { data, loading, error, refetch, fetchMore } = useQuery(GET_DOCUMENTS_QUERY, {
    variables: {
      filter: {
        ...filter,
        ownerId: user?.id,
      },
      sort,
      pagination: {
        first: 20,
      },
    },
    errorPolicy: 'all',
    notifyOnNetworkStatusChange: true,
  });

  const [searchDocuments, { data: searchData, loading: searchLoading }] = useLazyQuery(
    SEARCH_DOCUMENTS_QUERY,
    {
      errorPolicy: 'all',
    }
  );

  const documents = useMemo(() => {
    if (searchText.trim() && searchData?.searchDocuments) {
      return searchData.searchDocuments;
    }
    return data?.documents?.nodes || [];
  }, [data?.documents?.nodes, searchData?.searchDocuments, searchText]);

  const hasMore = data?.documents?.pageInfo?.hasNextPage;
  const totalCount = data?.documents?.totalCount || 0;

  useEffect(() => {
    // Debounced search
    if (searchText.trim()) {
      const timeoutId = setTimeout(() => {
        searchDocuments({
          variables: {
            query: searchText,
            filter: {
              ...filter,
              ownerId: user?.id,
            },
          },
        });
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  }, [searchText, filter, user?.id, searchDocuments]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const handleLoadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchMore({
        variables: {
          pagination: {
            first: 20,
            after: data?.documents?.pageInfo?.endCursor,
          },
        },
      });
    }
  }, [loading, hasMore, fetchMore, data?.documents?.pageInfo?.endCursor]);

  const handleDocumentPress = useCallback((document: Document) => {
    navigation.navigate('Document' as any, {
      screen: 'DocumentViewer',
      params: { documentId: document.id },
    });
  }, [navigation]);

  const handleDocumentEdit = useCallback((document: Document) => {
    navigation.navigate('Document' as any, {
      screen: 'DocumentEditor',
      params: { documentId: document.id },
    });
  }, [navigation]);

  const handleDocumentShare = useCallback((document: Document) => {
    navigation.navigate('Document' as any, {
      screen: 'DocumentShare',
      params: { documentId: document.id },
    });
  }, [navigation]);

  const handleDocumentDelete = useCallback((document: Document) => {
    Alert.alert(
      'Delete Document',
      `Are you sure you want to delete "${document.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // Implement delete mutation
            console.log('Delete document:', document.id);
          },
        },
      ]
    );
  }, []);

  const handleCreateDocument = useCallback(() => {
    // Show document type selection or create default document
    Alert.alert(
      'Create Document',
      'Choose document type',
      [
        { text: 'Text Document', onPress: () => createDocument(DocumentType.TEXT) },
        { text: 'Rich Text', onPress: () => createDocument(DocumentType.RICH_TEXT) },
        { text: 'Markdown', onPress: () => createDocument(DocumentType.MARKDOWN) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }, []);

  const createDocument = useCallback((type: DocumentType) => {
    // Implement create document mutation
    console.log('Create document of type:', type);
  }, []);

  const handleScroll = useCallback((event: any) => {
    const { contentOffset } = event.nativeEvent;
    const opacity = Math.max(0.3, Math.min(1, 1 - contentOffset.y / 200));
    searchBarOpacity.value = withTiming(opacity);
    
    // Hide FAB when scrolling down
    const scrollY = contentOffset.y;
    fabScale.value = withTiming(scrollY > 100 ? 0.8 : 1);
  }, [searchBarOpacity, fabScale]);

  const searchBarStyle = useAnimatedStyle(() => ({
    opacity: searchBarOpacity.value,
  }));

  const fabStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabScale.value }],
  }));

  const renderDocumentItem = useCallback(({ item, index }: { item: Document; index: number }) => (
    <Animated.View entering={FadeInUp.delay(index * 100).springify()}>
      <DocumentCard
        document={item}
        onPress={() => handleDocumentPress(item)}
        onEdit={() => handleDocumentEdit(item)}
        onShare={() => handleDocumentShare(item)}
        onDelete={() => handleDocumentDelete(item)}
      />
    </Animated.View>
  ), [handleDocumentPress, handleDocumentEdit, handleDocumentShare, handleDocumentDelete]);

  const renderListHeader = useCallback(() => (
    <View style={styles.listHeader}>
      {/* Search and filter controls */}
      <Animated.View style={[styles.searchContainer, searchBarStyle]}>
        <View style={[styles.searchBar, { backgroundColor: theme.colors.surface }]}>
          <Icon 
            name="search" 
            size={20} 
            color={theme.colors.textSecondary} 
            style={styles.searchIcon}
          />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder="Search documents..."
            placeholderTextColor={theme.colors.textSecondary}
            value={searchText}
            onChangeText={setSearchText}
            returnKeyType="search"
          />
          {searchText.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchText('')}
              style={styles.clearButton}
            >
              <Icon name="close" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        
        <View style={styles.filterControls}>
          <TouchableOpacity
            style={[styles.filterButton, { backgroundColor: theme.colors.surface }]}
            onPress={() => setShowFilterSheet(true)}
          >
            <Icon name="filter" size={18} color={theme.colors.text} />
            <Text style={[styles.filterButtonText, { color: theme.colors.text }]}>
              Filter
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.filterButton, { backgroundColor: theme.colors.surface }]}
            onPress={() => setShowSortModal(true)}
          >
            <Icon name="swap-vertical" size={18} color={theme.colors.text} />
            <Text style={[styles.filterButtonText, { color: theme.colors.text }]}>
              Sort
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Results count */}
      <View style={styles.resultsHeader}>
        <Text style={[styles.resultsCount, { color: theme.colors.textSecondary }]}>
          {searchText.trim() ? `${documents.length} results` : `${totalCount} documents`}
        </Text>
      </View>
    </View>
  ), [
    theme,
    searchText,
    documents.length,
    totalCount,
    searchBarStyle,
  ]);

  const renderEmptyState = useCallback(() => {
    if (searchText.trim() && !searchLoading) {
      return (
        <EmptyState
          icon="search"
          title="No results found"
          description={`No documents match "${searchText}"`}
          action={{
            label: 'Clear search',
            onPress: () => setSearchText(''),
          }}
        />
      );
    }

    if (!loading && documents.length === 0) {
      return (
        <EmptyState
          icon="document-text"
          title="No documents yet"
          description="Create your first document to get started"
          action={{
            label: 'Create Document',
            onPress: handleCreateDocument,
          }}
        />
      );
    }

    return null;
  }, [searchText, searchLoading, loading, documents.length, handleCreateDocument]);

  if (loading && !data) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <LoadingSpinner message="Loading documents..." />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={documents}
        renderItem={renderDocumentItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderListHeader}
        ListEmptyComponent={renderEmptyState}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 80 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
            progressBackgroundColor={theme.colors.surface}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={10}
        removeClippedSubviews={true}
      />

      {/* Floating Action Button */}
      <Animated.View style={[styles.fab, fabStyle]}>
        <FloatingActionButton
          icon="add"
          onPress={handleCreateDocument}
          color={theme.colors.primary}
        />
      </Animated.View>

      {/* Filter Bottom Sheet */}
      <FilterBottomSheet
        visible={showFilterSheet}
        onClose={() => setShowFilterSheet(false)}
        filter={filter}
        onFilterChange={setFilter}
      />

      {/* Sort Modal */}
      <SortModal
        visible={showSortModal}
        onClose={() => setShowSortModal(false)}
        sort={sort}
        onSortChange={setSort}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
  },
  listHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 20,
  },
  clearButton: {
    padding: 4,
  },
  filterControls: {
    flexDirection: 'row',
    gap: 12,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  resultsHeader: {
    marginBottom: 16,
  },
  resultsCount: {
    fontSize: 14,
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
  },
});

// GraphQL queries (would be imported from generated types)
const GET_DOCUMENTS_QUERY = `
  query GetDocuments($filter: DocumentFilter, $sort: DocumentSort, $pagination: PaginationInput) {
    documents(filter: $filter, sort: $sort, pagination: $pagination) {
      nodes {
        id
        name
        description
        type
        status
        owner {
          id
          name
          avatar
        }
        presenceInfo {
          activeUsers
          totalUsers
        }
        metrics {
          totalViews
          totalComments
          lastActivityAt
        }
        createdAt
        updatedAt
        lastEditedAt
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      totalCount
    }
  }
`;

const SEARCH_DOCUMENTS_QUERY = `
  query SearchDocuments($query: String!, $filter: DocumentFilter) {
    searchDocuments(query: $query, filter: $filter) {
      id
      name
      description
      type
      status
      owner {
        id
        name
        avatar
      }
      content {
        plainText
      }
      highlights {
        field
        fragments
      }
      score
      createdAt
      updatedAt
    }
  }
`;

export default DocumentsScreen;