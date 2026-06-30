// Minimal CateringList for web testing - no maps dependencies
import { Text, View, StyleSheet, Alert } from "react-native";
import React, { useState, useEffect, useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import config from '../constants/config';

const CateringListMinimal = () => {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buyerLocation, setBuyerLocation] = useState(undefined);

  // Load buyer location from storage
  useEffect(() => {
    const loadBuyerLocation = async () => {
      try {
        console.log("Loading buyer location from AsyncStorage...");
        const locationString = await AsyncStorage.getItem("buyerLocation");
        if (locationString) {
          const location = JSON.parse(locationString);
          console.log("Buyer location loaded:", location);
          setBuyerLocation(location);
        } else {
          console.log("No buyer location found in AsyncStorage");
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
      
      let apiUrl = `${config.API_URL}/seller/list`;
      if (buyerLocation) {
        apiUrl += `?buyerLat=${buyerLocation.lat}&buyerLng=${buyerLocation.lng}`;
      }

      console.log("=== FETCHING DATA ===");
      console.log("Fetching from:", apiUrl);
      const response = await fetch(apiUrl);
      const data = await response.json();

      console.log("=== RAW API RESPONSE ===");
      console.log("Response status:", response.status);
      console.log("Response ok:", response.ok);
      console.log("Data keys:", Object.keys(data));
      if (data.sellers && data.sellers.length > 0) {
        console.log("First seller raw data:", JSON.stringify(data.sellers[0], null, 2));
      }

      if (response.ok && data.sellers) {
        console.log("Total sellers received:", data.sellers.length);
        
        // Test distance processing
        data.sellers.forEach((seller, index) => {
          console.log(`\n=== SELLER ${index + 1}: ${seller.name} ===`);
          console.log(`- Raw distance: ${seller.distance}`);
          console.log(`- Distance type: ${typeof seller.distance}`);
          console.log(`- Distance JSON: ${JSON.stringify(seller.distance)}`);
          console.log(`- Distance != null: ${seller.distance != null}`);
          console.log(`- Distance !== null: ${seller.distance !== null}`);
          console.log(`- Distance !== undefined: ${seller.distance !== undefined}`);
          
          // Test our formatting
          let formattedDistance = "-";
          if (seller.distance != null) {
            formattedDistance = String(seller.distance);
          }
          console.log(`- Formatted distance: "${formattedDistance}"`);
          
          // Test categories
          console.log(`- Has categories: ${!!(seller.categories && seller.categories.length > 0)}`);
          if (seller.categories) {
            console.log(`- Categories count: ${seller.categories.length}`);
          }
        });

        setStores(data.sellers);
      } else {
        console.error("API Error:", data);
        Alert.alert("Error", "Failed to load catering data");
      }
    } catch (error) {
      console.error("Fetch error:", error);
      Alert.alert("Error", "Failed to connect to server");
    } finally {
      setLoading(false);
    }
  }, [buyerLocation]);

  useEffect(() => {
    console.log("useEffect triggered, buyerLocation:", buyerLocation);
    if (buyerLocation !== undefined) {
      console.log("Triggering fetchSellers...");
      fetchSellers();
    }
  }, [buyerLocation, fetchSellers]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Catering List Debug</Text>
      </View>
      <View style={styles.content}>
        {loading ? (
          <Text>Loading...</Text>
        ) : (
          <View>
            <Text>Found {stores.length} sellers</Text>
            {stores.slice(0, 3).map((store, index) => (
              <View key={index} style={styles.storeItem}>
                <Text>Name: {store.name}</Text>
                <Text>Distance: {store.distance} ({typeof store.distance})</Text>
                <Text>Categories: {store.categories ? store.categories.length : 0}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  storeItem: {
    padding: 10,
    marginVertical: 5,
    backgroundColor: '#f5f5f5',
    borderRadius: 5,
  },
});

export default CateringListMinimal;
