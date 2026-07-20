import {
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  Alert,
  RefreshControl,
  Modal,
  TouchableWithoutFeedback,
} from "react-native";
import React, { useState, useEffect, useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { StoreCardSkeleton } from "../../components/SkeletonLoader";
import OutletStatusBadge from "../../components/OutletStatusBadge";
import { getOutletStatus } from "../services/OutletStatusService";
import COLORS from "../constants/color";
import config from "../constants/config";
import storeIcon from "../../assets/images/store.png";

const CateringList = () => {
  const router = useRouter();
  const [stores, setStores] = useState([]);
  const [filteredStores, setFilteredStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [buyerLocation, setBuyerLocation] = useState(undefined); // undefined = not loaded yet, null = no location saved
  const [sortType, setSortType] = useState("distance"); // "distance" | "rating" | "halal"
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Load buyer location from storage
  useEffect(() => {
    const loadBuyerLocation = async () => {
      try {
        console.log("Loading buyer location from AsyncStorage...");
        const pinPointString = await AsyncStorage.getItem("pinPoint");
        if (pinPointString) {
          const pinPoint = JSON.parse(pinPointString);
          console.log("Buyer location loaded from pinPoint:", pinPoint);
          setBuyerLocation(pinPoint);
        } else {
          console.log("No pinPoint found in AsyncStorage");
          setBuyerLocation(null);
        }
      } catch (error) {
        console.error("Error loading buyer location:", error);
        setBuyerLocation(null);
      }
    };
    loadBuyerLocation();
  }, []);

  // Fetch sellers with categories from API
  const fetchSellers = useCallback(async () => {
    try {
      setLoading(true);

      // Construct API URL with buyer location if available
      let apiUrl = `${config.API_URL}/seller/list`;
      if (buyerLocation) {
        apiUrl += `?buyerLat=${buyerLocation.lat}&buyerLng=${buyerLocation.lng}`;
      }

      console.log("Fetching from:", apiUrl);
      const response = await fetch(apiUrl);
      const data = await response.json();

      if (response.ok && data.sellers) {
        console.log("Total sellers received:", data.sellers.length);

        // Filter sellers that have categories data with at least one menu item
        const sellersWithCategories = data.sellers.filter((seller) => {
          const hasCategories =
            seller.categories &&
            Array.isArray(seller.categories) &&
            seller.categories.length > 0 &&
            seller.categories.some(
              (category) =>
                category.items &&
                Array.isArray(category.items) &&
                category.items.length > 0
            );

          return hasCategories;
        });

        console.log(
          "Sellers with categories and menu items:",
          sellersWithCategories.length
        );

        const formattedStores = sellersWithCategories.map((seller) => {
          // Handle distance formatting
          let distance = "N/A";

          if (
            seller.distance !== null &&
            seller.distance !== undefined &&
            typeof seller.distance === "number" &&
            !isNaN(seller.distance)
          ) {
            distance = seller.distance.toFixed(1);
          }

          return {
            id: seller.id,
            StoreName: seller.name || seller.outletName || "Unnamed Store",
            Logo: seller.logo ? { uri: seller.logo } : storeIcon,
            Rating: seller.rating ? seller.rating.toString() : "4.5",
            Distance: distance,
            kelurahan: seller.kelurahan || "",
            categories: seller.categories || [],
            openTime: seller.openTime || null,
            closeTime: seller.closeTime || null,
            isManuallyClosed: seller.isManuallyClosed || false,
          };
        });

        setStores(formattedStores);
        applySorting(formattedStores, sortType);
      } else {
        console.error("API Error:", data);
        Alert.alert("Error", "Failed to load catering data");
      }
    } catch (error) {
      console.error("Fetch error:", error);
      Alert.alert("Error", "Failed to connect to server");
    } finally {
      setLoading(false);
      if (refreshing) setRefreshing(false);
    }
  }, [buyerLocation, refreshing, sortType, applySorting]);

  // Initial fetch - trigger once buyerLocation state is initialized (even if null)
  useEffect(() => {
    // Only fetch when buyerLocation has been loaded from AsyncStorage (not undefined)
    if (buyerLocation !== undefined) {
      fetchSellers();
    }
  }, [buyerLocation, fetchSellers]);

  // Handle refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchSellers();
  }, [fetchSellers]);

  // Handle search
  const handleSearch = useCallback(
    (query) => {
      setSearchQuery(query);
      if (query.trim() === "") {
        applySorting(stores, sortType);
      } else {
        const filtered = stores.filter(
          (store) =>
            store.StoreName.toLowerCase().includes(query.toLowerCase()) ||
            store.kelurahan.toLowerCase().includes(query.toLowerCase())
        );
        applySorting(filtered, sortType);
      }
    },
    [stores, sortType, applySorting]
  );

  // Apply sorting to stores
  // NOTE: "halal" belum ada logic-nya karena data seller belum punya field halal
  // dari API. Untuk sementara dipilih tapi tidak mengubah urutan (aman, tidak
  // menyentuh data/fetch apapun). Tinggal ditambah case-nya kalau backend sudah
  // mengirim field halal per seller.
  const applySorting = useCallback((storeList, type) => {
    const sorted = [...storeList].sort((a, b) => {
      if (type === "distance") {
        // Handle distance sorting - put N/A at the end
        if (a.Distance === "N/A" && b.Distance === "N/A") return 0;
        if (a.Distance === "N/A") return 1;
        if (b.Distance === "N/A") return -1;
        return parseFloat(a.Distance) - parseFloat(b.Distance);
      } else if (type === "rating") {
        // Handle rating sorting - highest first
        return parseFloat(b.Rating) - parseFloat(a.Rating);
      }
      return 0;
    });
    setFilteredStores(sorted);
  }, []);

  // Handle sort type change
  const handleSortChange = useCallback(
    (newSortType) => {
      setSortType(newSortType);
      const currentStores = searchQuery.trim() === "" ? stores : filteredStores;
      applySorting(currentStores, newSortType);
      setShowFilterModal(false);
    },
    [stores, filteredStores, searchQuery, applySorting]
  );

  // Clear search
  const clearSearch = () => {
    setSearchQuery("");
    applySorting(stores, sortType);
  };

  // Store card component
  const StoreCard = ({ StoreName, Rating, Distance, Logo, storeId, seller }) => {
    const handlePress = () => {
      // Navigate to catering detail page
      router.push(`/buyer/CateringDetail?sellerid=${storeId}`);
    };

    return (
      <TouchableOpacity style={styles.storeCard} onPress={handlePress}>
        <View style={styles.storeLogoWrapperFull}>
          <Image source={Logo} style={styles.storeLogoFull} />
          <View style={styles.ratingBadgeFull}>
            <Text style={styles.ratingBadgeText}>⭐ {Rating}</Text>
          </View>
          <View style={styles.outletStatusBadgeWrap}>
            <OutletStatusBadge seller={seller} />
          </View>
        </View>
        <View style={styles.storeCardContent}>
          <Text style={styles.storeName} numberOfLines={2}>
            {StoreName}
          </Text>
          <View style={styles.storeInfoRow}>
            <Ionicons
              name="location-outline"
              size={14}
              color={COLORS.PRIMARY}
            />
            <Text style={styles.distanceText}>
              {Distance !== "N/A" ? `${Distance} km` : "Distance unavailable"}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Render skeleton loading
  const renderSkeletonLoading = () => (
    <View style={styles.storeGrid}>
      {Array.from({ length: 6 }).map((_, index) => (
        <StoreCardSkeleton key={index} />
      ))}
    </View>
  );

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons
        name="restaurant-outline"
        size={64}
        color={COLORS.TEXTSECONDARY}
      />
      <Text style={styles.emptyTitle}>No Catering Found</Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery
          ? "Try adjusting your search terms"
          : "No catering services with available menus in your area"}
      </Text>
      {searchQuery && (
        <TouchableOpacity style={styles.clearButton} onPress={clearSearch}>
          <Text style={styles.clearButtonText}>Clear Search</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const FILTER_OPTIONS = [
    { key: "distance", label: "Jarak" },
    { key: "rating", label: "Rating" },
    { key: "halal", label: "Halal" },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header selaras dengan halaman lain */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Kembali">
          <MaterialIcons name="chevron-left" size={26} color={COLORS.PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Catering</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Search bar + tombol filter di ujung kanan */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons
              name="search-outline"
              size={20}
              color={COLORS.TEXTSECONDARY}
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Temukan Catering..."
              value={searchQuery}
              onChangeText={handleSearch}
              placeholderTextColor={COLORS.TEXTSECONDARY}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={clearSearch} style={styles.clearIcon}>
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={COLORS.TEXTSECONDARY}
                />
              </TouchableOpacity>
            )}
            <View style={styles.searchDivider} />
            <TouchableOpacity
              onPress={() => setShowFilterModal(true)}
              style={styles.filterIconBtn}
              accessibilityLabel="Filter & urutkan"
            >
              <Ionicons name="options-outline" size={20} color={COLORS.PRIMARY} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Results Header */}
        {!loading && (
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsText}>
              {filteredStores.length} catering
              {filteredStores.length !== 1 ? "s" : ""} found
            </Text>
          </View>
        )}

        {/* Content */}
        {loading ? (
          renderSkeletonLoading()
        ) : filteredStores.length === 0 ? (
          renderEmptyState()
        ) : (
          <View style={styles.storeGrid}>
            {filteredStores.map((store) => (
              <StoreCard
                key={store.id}
                storeId={store.id}
                StoreName={store.StoreName}
                Logo={store.Logo}
                Rating={store.Rating}
                Distance={store.Distance}
                seller={store}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Popup filter: Jarak / Rating / Halal */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowFilterModal(false)}>
          <View style={styles.filterOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.filterCard}>
                {FILTER_OPTIONS.map((option) => {
                  const isSelected = sortType === option.key;
                  return (
                    <TouchableOpacity
                      key={option.key}
                      style={styles.filterOption}
                      onPress={() => handleSortChange(option.key)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                        {isSelected && <View style={styles.radioDot} />}
                      </View>
                      <Text style={styles.filterOptionLabel}>{option.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
};
export default CateringList;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },

  // ---- Header (selaras dengan halaman lain) ----
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backBtn: { width: 26 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: COLORS.PRIMARY },
  // ------------------------------------------------

  scrollView: {
    flex: 1,
  },
  scrollContainer: {
    paddingBottom: 20,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e1e5e9",
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: "#2c3e50",
  },
  clearIcon: {
    marginLeft: 8,
    padding: 4,
  },
  searchDivider: {
    width: 1,
    height: 22,
    backgroundColor: "#e1e5e9",
    marginLeft: 4,
    marginRight: 6,
  },
  filterIconBtn: {
    paddingVertical: 10,
    paddingLeft: 4,
    paddingRight: 2,
  },
  resultsHeader: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  resultsText: {
    fontSize: 14,
    color: COLORS.TEXTSECONDARY,
    fontWeight: "500",
  },
  storeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  storeCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 20,
    width: "48%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    overflow: "hidden",
  },
  storeLogoWrapperFull: {
    position: "relative",
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#f6f7fb",
  },
  storeLogoFull: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  ratingBadgeFull: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: COLORS.GREEN3 || "#4ade80",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  ratingBadgeText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
  },
   outletStatusBadgeWrap: {
   position: "absolute",
   top: 8,
   left: 8,
   zIndex: 2,
 },
  storeCardContent: {
    padding: 12,
  },
  storeName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 8,
    lineHeight: 20,
  },
  storeInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  distanceText: {
    fontSize: 13,
    color: COLORS.PRIMARY,
    fontWeight: "600",
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#374151",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.TEXTSECONDARY,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  clearButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  clearButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },

  // ---- Filter popup ----
  filterOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.15)",
    alignItems: "flex-end",
    paddingTop: 108,
    paddingRight: 20,
  },
  filterCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 18,
    width: 170,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  filterOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: "#d9c3cc",
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  radioCircleSelected: {
    borderColor: COLORS.PRIMARY,
  },
  radioDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: COLORS.PRIMARY,
  },
  filterOptionLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.PRIMARY,
  },
});