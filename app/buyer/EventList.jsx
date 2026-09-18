import {
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  RefreshControl,
  useWindowDimensions,
  Platform,
} from "react-native";
import React, { useState, useEffect, useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { StoreCardSkeleton } from "../../components/SkeletonLoader";
import COLORS from "../constants/color";
import config from "../constants/config";
import storeIcon from "../../assets/images/store.png";

const FILTER_CATEGORIES = [
  { key: "semua", label: "Semua", icon: null },
  { key: "makanan", label: "Makanan", icon: "restaurant-outline" },
  { key: "minuman", label: "Minuman", icon: "cafe-outline" },
  { key: "snack", label: "Snack", icon: "fast-food-outline" },
];

const EventList = () => {
  const router = useRouter();
  const { eventId } = useLocalSearchParams();
  const { width: SCREEN_WIDTH } = useWindowDimensions();

  const [event, setEvent] = useState(null);
  const [eventLoading, setEventLoading] = useState(true);

  const [sellers, setSellers] = useState([]);
  const [filteredSellers, setFilteredSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("semua");

  const isWeb = Platform.OS === 'web';
  const isTablet = isWeb && SCREEN_WIDTH >= 768 && SCREEN_WIDTH < 1024;
  const isDesktop = isWeb && SCREEN_WIDTH >= 1024;
  const numColumns = isDesktop ? 4 : isTablet ? 3 : 2;
  const contentMaxWidth = 1200;

  const GRID_GAP = 10;
  const effectiveGridWidth = Math.min(SCREEN_WIDTH, contentMaxWidth) - 32;
  const cardWidthOverride = (isTablet || isDesktop)
    ? { width: (effectiveGridWidth - GRID_GAP * (numColumns - 1)) / numColumns }
    : null;

  // Ambil detail event (buat header banner: logo, background, tagline, lokasi, tanggal)
  const fetchEvent = useCallback(async () => {
    try {
      const res = await fetch(`${config.API_URL}/events/active`);
      const data = await res.json();
      if (data.success && data.event) setEvent(data.event);
    } catch (e) {
      // Diam-diam — kalau gagal, header banner cukup nggak render
    } finally {
      setEventLoading(false);
    }
  }, []);

  // Ambil mitra yang ikut event ini
  const fetchSellers = useCallback(async () => {
    if (!eventId) return;
    try {
      setLoading(true);
      const res = await fetch(`${config.API_URL}/events/${eventId}/sellers`);
      const data = await res.json();
      if (res.ok && data.sellers) {
        setSellers(data.sellers);
        setFilteredSellers(data.sellers);
      }
    } catch (e) {
      // Biarkan list kosong, empty state akan handle
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  useEffect(() => {
    fetchSellers();
  }, [fetchSellers]);

  const applyFilters = useCallback((query, category, list) => {
    let result = list;
    if (category !== "semua") {
      result = result.filter((s) => Array.isArray(s.eventCategory) && s.eventCategory.includes(category));
    }
    if (query.trim() !== "") {
      result = result.filter((s) =>
        s.name.toLowerCase().includes(query.toLowerCase())
      );
    }
    setFilteredSellers(result);
  }, []);

  const handleSearch = (query) => {
    setSearchQuery(query);
    applyFilters(query, activeCategory, sellers);
  };

  const handleCategoryChange = (category) => {
    setActiveCategory(category);
    applyFilters(searchQuery, category, sellers);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchSellers();
  }, [fetchSellers]);

  const formatDateRange = (start, end) => {
    if (!start || !end) return "";
    const startDate = new Date(start);
    const endDate = new Date(end);
    const startDay = startDate.toLocaleDateString('id-ID', { day: 'numeric' });
    const endStr = endDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    return `${startDay}–${endStr}`;
  };

  const SellerCard = ({ seller }) => (
    <TouchableOpacity
      style={[styles.card, cardWidthOverride]}
      onPress={() => router.push(`/buyer/CateringDetail?sellerid=${seller.id}`)}
      activeOpacity={0.85}
    >
      <View style={styles.cardImageWrapper}>
        <Image source={seller.logo ? { uri: seller.logo } : storeIcon} style={styles.cardImage} />
        <View style={styles.eventBadge}>
          <Text style={styles.eventBadgeText}>EVENT</Text>
        </View>
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardName} numberOfLines={1}>{seller.name}</Text>
        <Text style={styles.cardDesc} numberOfLines={1}>{seller.eventDescription || '-'}</Text>
        <View style={styles.cardFooterRow}>
          {!!seller.standNumber && (
            <View style={styles.standBadge}>
              <Text style={styles.standBadgeText}>Stand {seller.standNumber}</Text>
            </View>
          )}
          <Text style={styles.ratingText}>⭐ {seller.rating || '-'}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderSkeletonLoading = () => (
    <View style={styles.grid}>
      {Array.from({ length: 6 }).map((_, index) => (
        <StoreCardSkeleton key={index} />
      ))}
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="storefront-outline" size={56} color={COLORS.TEXTSECONDARY} />
      <Text style={styles.emptyTitle}>Belum Ada Mitra</Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery || activeCategory !== "semua"
          ? "Tidak ada mitra yang cocok dengan pencarian ini"
          : "Belum ada mitra yang terdaftar untuk event ini"}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Kembali">
          <MaterialIcons name="chevron-left" size={26} color={COLORS.PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Event</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={isWeb ? { width: '100%', maxWidth: contentMaxWidth, alignSelf: 'center' } : { flex: 1 }}>

          {/* Banner event: background image + overlay + logo + info */}
          {!eventLoading && event && (
            <View style={styles.banner}>
              <Image source={{ uri: event.backgroundImageUrl }} style={styles.bannerBg} />
              <View style={styles.bannerOverlay} />
              <View style={styles.bannerContent}>
                <View style={styles.bannerBadgeRow}>
                  <View style={styles.bannerBadge}>
                    <MaterialIcons name="event" size={11} color="#fff" />
                    <Text style={styles.bannerBadgeText}>{event.name}</Text>
                  </View>
                  <View style={styles.bannerBadge}>
                    <Text style={styles.bannerBadgeText}>
                      {formatDateRange(event.startDate, event.endDate)}
                    </Text>
                  </View>
                </View>

                {event.logoImageUrl ? (
                  <Image
                    source={{ uri: event.logoImageUrl }}
                    style={styles.eventLogo}
                    resizeMode="contain"
                  />
                ) : (
                  <Text style={styles.bannerFallbackTitle}>{event.name}</Text>
                )}

                <Text style={styles.bannerTagline}>{event.tagline}</Text>
                <View style={styles.bannerLocationRow}>
                  <MaterialIcons name="location-on" size={12} color="rgba(255,255,255,0.85)" />
                  <Text style={styles.bannerLocationText}>{event.location}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Search bar */}
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Ionicons name="search-outline" size={20} color={COLORS.TEXTSECONDARY} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder={`Cari mitra di ${event?.shortName || 'event ini'}...`}
                value={searchQuery}
                onChangeText={handleSearch}
                placeholderTextColor={COLORS.TEXTSECONDARY}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => handleSearch("")}>
                  <Ionicons name="close-circle" size={20} color={COLORS.TEXTSECONDARY} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Filter pills kategori */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {FILTER_CATEGORIES.map((cat) => {
              const active = activeCategory === cat.key;
              return (
                <TouchableOpacity
                  key={cat.key}
                  style={[styles.filterPill, active && styles.filterPillActive]}
                  onPress={() => handleCategoryChange(cat.key)}
                >
                  {cat.icon && (
                    <Ionicons
                      name={cat.icon}
                      size={13}
                      color={active ? "#fff" : COLORS.PRIMARY}
                      style={{ marginRight: 4 }}
                    />
                  )}
                  <Text style={[styles.filterPillText, active && styles.filterPillTextActive]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Grid mitra — langsung, tanpa section header */}
          {loading ? (
            renderSkeletonLoading()
          ) : filteredSellers.length === 0 ? (
            renderEmptyState()
          ) : (
            <View style={styles.grid}>
              {filteredSellers.map((seller) => (
                <SellerCard key={seller.id} seller={seller} />
              ))}
              {(isTablet || isDesktop) &&
                Array.from({
                  length: (numColumns - (filteredSellers.length % numColumns)) % numColumns,
                }).map((_, i) => (
                  <View key={`filler-${i}`} style={cardWidthOverride} />
                ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default EventList;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },

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

  scrollView: { flex: 1 },
  scrollContainer: { paddingBottom: 20 },

  // ---- Banner ----
  banner: {
    margin: 16,
    marginBottom: 8,
    borderRadius: 18,
    overflow: 'hidden',
    height: 170,
    backgroundColor: COLORS.PRIMARY,
  },
  bannerBg: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    opacity: 0.55,
  },
  bannerOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.PRIMARY,
    opacity: 0.55,
  },
  bannerContent: {
    padding: 16,
  },
  bannerBadgeRow: {
    flexDirection: 'row',
    gap: 6,
  },
  bannerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 20,
  },
  bannerBadgeText: {
    color: '#fff',
    fontSize: 9.5,
    fontWeight: '600',
  },
  eventLogo: {
    width: '80%',
    height: 60,
    marginTop: 10,
  },
  bannerFallbackTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 10,
  },
  bannerTagline: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 11.5,
    marginTop: 6,
  },
  bannerLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
  },
  bannerLocationText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 10.5,
  },

  // ---- Search ----
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
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
  searchIcon: { marginRight: 12 },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: "#2c3e50",
  },

  // ---- Filter pills ----
  filterRow: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 8,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  filterPillActive: {
    backgroundColor: COLORS.PRIMARY,
    borderColor: COLORS.PRIMARY,
  },
  filterPillText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: COLORS.PRIMARY,
  },
  filterPillTextActive: {
    color: '#fff',
  },

  // ---- Grid & card ----
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    gap: 0,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    marginBottom: 12,
    width: "48%",
    borderWidth: 1,
    borderColor: "#f0f0f0",
    overflow: "hidden",
  },
  cardImageWrapper: {
    position: 'relative',
    width: '100%',
    height: 90,
    backgroundColor: '#f6f7fb',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  eventBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  eventBadgeText: {
    color: '#fff',
    fontSize: 8.5,
    fontWeight: '700',
  },
  cardContent: {
    padding: 9,
  },
  cardName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1f2937',
  },
  cardDesc: {
    fontSize: 10,
    color: COLORS.TEXTSECONDARY,
    marginTop: 1,
  },
  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  standBadge: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 7,
  },
  standBadgeText: {
    fontSize: 9,
    color: '#555',
    fontWeight: '600',
  },
  ratingText: {
    fontSize: 10.5,
    color: '#B26A00',
    fontWeight: '600',
  },

  emptyContainer: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#374151",
    marginTop: 14,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.TEXTSECONDARY,
    textAlign: "center",
    lineHeight: 19,
  },
});