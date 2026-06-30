import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  FlatList,
  Modal,
  ActivityIndicator,
  Image,
  Animated,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import COLORS from '../constants/color';
import config from '../constants/config';
import { useToast } from '../../components/ToastProvider';
import { StoreCardSkeleton } from '../../components/SkeletonLoader';

const { width } = Dimensions.get('window');

const SEARCH_FILTERS = {
  ALL: 'all',
  CATERING: 'catering',
  RANTANGAN: 'rantangan',
  NEARBY: 'nearby',
  POPULAR: 'popular',
  PROMO: 'promo',
  AVAILABLE: 'available',
};

const SORT_OPTIONS = {
  RELEVANCE: 'relevance',
  DISTANCE: 'distance',
  RATING: 'rating',
  PRICE_LOW: 'price_low',
  PRICE_HIGH: 'price_high',
  NEWEST: 'newest',
  POPULAR: 'popular',
};

const PRICE_RANGES = {
  ALL: { min: 0, max: 999999, label: 'Semua Harga' },
  BUDGET: { min: 0, max: 25000, label: 'Di bawah 25k' },
  MEDIUM: { min: 25000, max: 50000, label: '25k - 50k' },
  PREMIUM: { min: 50000, max: 100000, label: '50k - 100k' },
  LUXURY: { min: 100000, max: 999999, label: 'Di atas 100k' },
};

const SearchScreen = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [popularSearches, setPopularSearches] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState(SEARCH_FILTERS.ALL);
  const [selectedPriceRange, setSelectedPriceRange] = useState('ALL');
  const [sortBy, setSortBy] = useState(SORT_OPTIONS.RELEVANCE);
  const [loading, setLoading] = useState(false);
  const [buyerLocation, setBuyerLocation] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [searchStats, setSearchStats] = useState({});
  const [isVoiceSearching, setIsVoiceSearching] = useState(false);
  
  const searchInputRef = useRef(null);
  const slideAnim = useRef(new Animated.Value(300)).current;
  
  const router = useRouter();
  const { showError, showSuccess } = useToast();

  useEffect(() => {
    loadRecentSearches();
    loadPopularSearches();
    loadBuyerLocation();
    loadSearchHistory();
    loadFavorites();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      // Show suggestions for partial queries
      if (searchQuery.length >= 2) {
        getSuggestions();
        setShowSuggestions(true);
      }
      
      // Perform actual search after delay
      const delayedSearch = setTimeout(() => {
        performSearch();
      }, 500); // Debounce search
      
      return () => clearTimeout(delayedSearch);
    } else {
      setSearchResults([]);
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [searchQuery, selectedFilter, sortBy, selectedPriceRange]);

  const loadBuyerLocation = async () => {
    try {
      const savedPinPoint = await AsyncStorage.getItem('pinPoint');
      if (savedPinPoint) {
        const pinPoint = JSON.parse(savedPinPoint);
        if (pinPoint.lat && pinPoint.lng) {
          setBuyerLocation(pinPoint);
        }
      }
    } catch (error) {
      console.error('Error loading buyer location:', error);
    }
  };

  const loadRecentSearches = async () => {
    try {
      const recent = await AsyncStorage.getItem('recentSearches');
      if (recent) {
        setRecentSearches(JSON.parse(recent));
      }
    } catch (error) {
      console.error('Error loading recent searches:', error);
    }
  };

  const loadSearchHistory = async () => {
    try {
      const history = await AsyncStorage.getItem('searchHistory');
      if (history) {
        setSearchHistory(JSON.parse(history));
      }
    } catch (error) {
      console.error('Error loading search history:', error);
    }
  };

  const loadFavorites = async () => {
    try {
      const favs = await AsyncStorage.getItem('favoriteStores');
      if (favs) {
        setFavorites(JSON.parse(favs));
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  };

  const getSuggestions = async () => {
    try {
      const response = await fetch(
        `${config.API_URL}/search/suggestions?q=${encodeURIComponent(searchQuery)}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions || []);
      }
    } catch (error) {
      console.log('Error loading suggestions:', error);
      // Set empty suggestions on error
      setSuggestions([]);
    }
  };

  const saveSearchHistory = async (query, results) => {
    try {
      const history = await AsyncStorage.getItem('searchHistory');
      let searches = history ? JSON.parse(history) : [];
      
      const searchEntry = {
        query,
        timestamp: Date.now(),
        resultCount: results.length,
        filters: { selectedFilter, selectedPriceRange, sortBy }
      };
      
      // Remove if already exists
      searches = searches.filter(item => item.query !== query);
      
      // Add to beginning
      searches.unshift(searchEntry);
      
      // Keep only last 50 searches
      searches = searches.slice(0, 50);
      
      await AsyncStorage.setItem('searchHistory', JSON.stringify(searches));
      setSearchHistory(searches);
    } catch (error) {
      console.error('Error saving search history:', error);
    }
  };

  const saveRecentSearch = async (query) => {
    try {
      const recent = await AsyncStorage.getItem('recentSearches');
      let searches = recent ? JSON.parse(recent) : [];
      
      // Remove if already exists
      searches = searches.filter(item => item !== query);
      
      // Add to beginning
      searches.unshift(query);
      
      // Keep only last 10 searches
      searches = searches.slice(0, 10);
      
      await AsyncStorage.setItem('recentSearches', JSON.stringify(searches));
      setRecentSearches(searches);
    } catch (error) {
      console.error('Error saving recent search:', error);
    }
  };

  const performSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      let apiUrl = `${config.API_URL}/search?q=${encodeURIComponent(searchQuery)}`;
      
      // Add location parameters for distance-based search
      if (buyerLocation) {
        apiUrl += `&buyerLat=${buyerLocation.lat}&buyerLng=${buyerLocation.lng}`;
      }
      
      // Add filter parameters
      if (selectedFilter !== SEARCH_FILTERS.ALL) {
        apiUrl += `&filter=${selectedFilter}`;
      }
      
      // Add sort parameters
      apiUrl += `&sort=${sortBy}`;
      
      const response = await fetch(apiUrl);
      
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.results || []);
        
        // Save search query to recent searches
        await saveRecentSearch(searchQuery);
      } else {
        showError('Gagal melakukan pencarian');
      }
    } catch (error) {
      console.error('Search error:', error);
      showError('Terjadi kesalahan saat mencari');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = () => {
    if (searchQuery.trim()) {
      performSearch();
    }
  };

  const handleFilterPress = (filter) => {
    setSelectedFilter(filter);
    setShowFilters(false);
  };

  const handleSortPress = (sort) => {
    setSortBy(sort);
  };

  const handleRecentSearchPress = (query) => {
    setSearchQuery(query);
  };

  const clearRecentSearches = async () => {
    try {
      await AsyncStorage.removeItem('recentSearches');
      setRecentSearches([]);
    } catch (error) {
      console.error('Error clearing recent searches:', error);
    }
  };

  const handleStorePress = (store) => {
    router.push({
      pathname: '/buyer/CateringDetail',
      params: { sellerid: store.id },
    });
  };

  const renderSearchSuggestions = () => (
    <View style={styles.suggestionsContainer}>
      {recentSearches.length > 0 && (
        <View style={styles.suggestionSection}>
          <View style={styles.suggestionHeader}>
            <Text style={styles.suggestionTitle}>Pencarian Terakhir</Text>
            <TouchableOpacity onPress={clearRecentSearches}>
              <Text style={styles.clearButton}>Hapus</Text>
            </TouchableOpacity>
          </View>
          {recentSearches.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.suggestionItem}
              onPress={() => handleRecentSearchPress(item)}
            >
              <MaterialIcons name="history" size={20} color="#666" />
              <Text style={styles.suggestionText}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      
      <View style={styles.suggestionSection}>
        <Text style={styles.suggestionTitle}>Pencarian Populer</Text>
        <View style={styles.popularTags}>
          {popularSearches.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.popularTag}
              onPress={() => handleRecentSearchPress(item)}
            >
              <Text style={styles.popularTagText}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  const renderSearchResult = ({ item }) => (
    <TouchableOpacity 
      style={styles.resultItem}
      onPress={() => handleStorePress(item)}
    >
      <View style={styles.resultImage}>
        <MaterialIcons name="store" size={40} color="#ccc" />
      </View>
      <View style={styles.resultInfo}>
        <Text style={styles.resultName}>{item.name}</Text>
        <Text style={styles.resultAddress}>{item.address}</Text>
        <View style={styles.resultMeta}>
          <View style={styles.ratingContainer}>
            <MaterialIcons name="star" size={16} color="#FFD700" />
            <Text style={styles.ratingText}>{item.rating || '4.5'}</Text>
          </View>
          {item.distance && (
            <Text style={styles.distanceText}>{item.distance} km</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Search Header */}
      <View style={styles.searchHeader}>
        <View style={styles.searchInputContainer}>
          <MaterialIcons name="search" size={24} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari makanan, resto, atau menu..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={styles.clearIcon}
            >
              <MaterialIcons name="clear" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
        
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(!showFilters)}
        >
          <MaterialIcons name="tune" size={24} color={COLORS.PRIMARY} />
        </TouchableOpacity>
      </View>

      {/* Filters */}
      {showFilters && (
        <View style={styles.filtersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {Object.entries(SEARCH_FILTERS).map(([key, value]) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.filterChip,
                  selectedFilter === value && styles.activeFilterChip
                ]}
                onPress={() => handleFilterPress(value)}
              >
                <Text style={[
                  styles.filterChipText,
                  selectedFilter === value && styles.activeFilterChipText
                ]}>
                  {key === 'ALL' && 'Semua'}
                  {key === 'CATERING' && 'Catering'}
                  {key === 'RANTANGAN' && 'Rantangan'}
                  {key === 'NEARBY' && 'Terdekat'}
                  {key === 'POPULAR' && 'Populer'}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Content */}
      <View style={styles.content}>
        {searchQuery.trim() === '' ? (
          renderSearchSuggestions()
        ) : (
          <View style={styles.resultsContainer}>
            {/* Sort Options */}
            <View style={styles.sortContainer}>
              <Text style={styles.resultCount}>
                {searchResults.length} hasil ditemukan
              </Text>
              <TouchableOpacity style={styles.sortButton}>
                <MaterialIcons name="sort" size={16} color="#666" />
                <Text style={styles.sortText}>Urutkan</Text>
              </TouchableOpacity>
            </View>
            
            {/* Results */}
            {loading ? (
              <View>
                {[1, 2, 3].map(i => <StoreCardSkeleton key={i} />)}
              </View>
            ) : (
              <FlatList
                data={searchResults}
                renderItem={renderSearchResult}
                keyExtractor={(item, index) => `${item.id || index}`}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <MaterialIcons name="search-off" size={60} color="#ccc" />
                    <Text style={styles.emptyText}>Tidak ada hasil ditemukan</Text>
                    <Text style={styles.emptySubtext}>
                      Coba gunakan kata kunci yang berbeda
                    </Text>
                  </View>
                }
              />
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 25,
    paddingHorizontal: 16,
    marginRight: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
    color: '#333',
  },
  clearIcon: {
    padding: 4,
  },
  filterButton: {
    padding: 8,
  },
  filtersContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filterChip: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  activeFilterChip: {
    backgroundColor: COLORS.PRIMARY,
  },
  filterChipText: {
    fontSize: 14,
    color: '#666',
  },
  activeFilterChipText: {
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  suggestionsContainer: {
    padding: 16,
  },
  suggestionSection: {
    marginBottom: 24,
  },
  suggestionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  suggestionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  clearButton: {
    fontSize: 14,
    color: COLORS.PRIMARY,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  suggestionText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 12,
  },
  popularTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  popularTag: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 8,
    marginBottom: 8,
  },
  popularTagText: {
    fontSize: 12,
    color: COLORS.PRIMARY,
  },
  resultsContainer: {
    flex: 1,
    padding: 16,
  },
  sortContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultCount: {
    fontSize: 14,
    color: '#666',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  resultItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resultImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  resultAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  resultMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  ratingText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 4,
  },
  distanceText: {
    fontSize: 14,
    color: COLORS.PRIMARY,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
});

export default SearchScreen;
