import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import React, { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import config from '../constants/config';
import COLORS from '../constants/color';
import OutletStatusBadge from '../../components/OutletStatusBadge'; 

const SearchResult = () => {
  const { query, lat, lng } = useLocalSearchParams();
  const router = useRouter();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const baseUrl = config.API_URL.replace(/\/api\/v1\/?$/, '');
        let apiUrl = `${baseUrl}/api/search?q=${query}`;

        if (lat && lng) {
          apiUrl += `&buyerLat=${lat}&buyerLng=${lng}`;
        }

        const response = await fetch(apiUrl);
        const json = await response.json();
        
        if (json.results) {
          const groupedSellers = {};
          
          json.results.forEach(item => {
            if (item.type === 'seller') {
              if (!groupedSellers[item.id]) {
                groupedSellers[item.id] = { ...item, matchedMenus: [] };
              } else {
                groupedSellers[item.id] = { ...groupedSellers[item.id], ...item };
              }
            } else if (item.type === 'menu_item') {
              const sId = item.sellerId;
              if (!groupedSellers[sId]) {
                groupedSellers[sId] = {
                  id: sId,
                  name: item.sellerName,
                  address: item.sellerAddress,
                  distance: item.distance,
                  rating: "-", // Placeholder jika toko utamanya tidak ke-fetch duluan
                  storeIcon: item.sellerStoreIcon,
                  matchedMenus: []
                };
              }
              groupedSellers[sId].matchedMenus.push(item.name);
            }
          });

          const formattedResults = Object.values(groupedSellers).map(seller => ({
            id: seller.id,
            StoreName: seller.name || "-",
            storeKelurahan: seller.address || "",
            Logo: seller.storeIcon ? { uri: seller.storeIcon } : null,
            Rating: seller.rating || "-",
            Distance: seller.distance || "-",
            matchedMenus: [...new Set(seller.matchedMenus || [])],
            openTime: seller.openTime || null,
            closeTime: seller.closeTime || null,
            isManuallyClosed: seller.isManuallyClosed || false,
          }));

          setResults(formattedResults);
        }
      } catch (error) {
        console.error("Gagal fetch pencarian", error);
      } finally {
        setLoading(false);
      }
    };

    if (query) fetchResults();
  }, [query, lat, lng]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Back & Info Keyword */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <MaterialIcons name="chevron-left" size={28} color={COLORS.PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Hasil untuk "{query}"</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.PRIMARY} style={{ marginTop: 50 }} />
        ) : results.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="search-off" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Yah, "{query}" nggak ketemu di sekitar sini.</Text>
          </View>
        ) : (
          results.map((store) => (
            <View key={store.id} style={styles.cardWrapper}>
              
              {/* Card Utama Toko (Horizontal) */}
              <TouchableOpacity 
                style={styles.storeCard} 
                activeOpacity={0.85}
                onPress={() => {
                  router.push({
                    pathname: "buyer/CateringDetail", 
                    params: { sellerid: store.id },
                  });
                }}
              >
                <View style={styles.imageContainer}>
                  {store.Logo ? (
                    <Image source={store.Logo} style={styles.storeImage} />
                  ) : (
                    <View style={[styles.storeImage, styles.imagePlaceholder]}>
                      <MaterialIcons name="store" size={32} color="#ccc" />
                    </View>
                  )}
                  {store.Rating !== "-" && (
                    <View style={styles.ratingBadge}>
                      <Text style={styles.ratingText}>⭐ {store.Rating}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.storeInfo}>
                  <Text style={styles.storeName} numberOfLines={1}>
                    {store.StoreName}
                  </Text>
                  <Text style={styles.storeLocation} numberOfLines={1}>
                    {store.storeKelurahan}
                  </Text>
                  
                  <View style={styles.metaRow}>
                    <View style={styles.distanceWrap}>
                      <MaterialIcons name="location-on" size={14} color={COLORS.PRIMARY} />
                      <Text style={styles.distanceText}>
                        {store.Distance !== "-" ? `${store.Distance} km` : "Jarak tidak diketahui"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.badgeWrapper}>
                    <OutletStatusBadge seller={store} />
                  </View>
                </View>
              </TouchableOpacity>

              {/* Konteks Menu yang Cocok (Nempel di bawah card) */}
              {store.matchedMenus && store.matchedMenus.length > 0 && (
                <View style={styles.matchContext}>
                  <MaterialIcons name="restaurant-menu" size={14} color="#B26A00" style={{ marginTop: 2 }} />
                  <Text style={styles.matchText}>
                    <Text style={{ fontWeight: 'bold' }}>Menjual: </Text> 
                    {store.matchedMenus.join(', ')}
                  </Text>
                </View>
              )}

            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 12,
    paddingVertical: 14, 
    backgroundColor: '#fff',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    zIndex: 10
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#23272f', flex: 1, textAlign: 'center' },
  content: { padding: 16, paddingBottom: 40 },
  
  cardWrapper: {
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  storeCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    zIndex: 2, 
  },
  imageContainer: {
    position: 'relative',
    width: 86,
    height: 86,
    marginRight: 14,
  },
  storeImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingBadge: {
    position: 'absolute',
    bottom: -6,
    alignSelf: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  ratingText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  storeInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  storeName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#23272f',
    marginBottom: 2,
  },
  storeLocation: {
    fontSize: 12,
    color: '#888',
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  distanceWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distanceText: {
    fontSize: 12,
    color: COLORS.PRIMARY,
    fontWeight: '600',
    marginLeft: 4,
  },
  badgeWrapper: {
    alignSelf: 'flex-start',
  },
  
  matchContext: { 
    flexDirection: 'row', 
    alignItems: 'flex-start', 
    backgroundColor: '#FFF3E0', 
    paddingHorizontal: 14,
    paddingBottom: 12,
    borderBottomLeftRadius: 14, 
    borderBottomRightRadius: 14, 
    marginTop: -10, 
    paddingTop: 18, 
    zIndex: 1 
  },
  matchText: { 
    fontSize: 12, 
    color: '#B26A00', 
    marginLeft: 6, 
    flex: 1,
    lineHeight: 18
  },
  
  emptyState: { alignItems: 'center', marginTop: '40%' },
  emptyText: { color: '#888', marginTop: 12, fontSize: 14, fontWeight: '500' }
});

export default SearchResult;