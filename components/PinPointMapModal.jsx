import React, { useState, useRef, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Dimensions, TextInput, ActivityIndicator } from 'react-native';
import { Platform } from 'react-native';

let MapView, Marker;
if (Platform.OS !== 'web') {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
}
import * as Location from 'expo-location';
import { MaterialIcons } from '@expo/vector-icons';
import config from '../app/constants/config';

const { width, height } = Dimensions.get('window');

const PinPointMapModal = ({ visible, onClose, onSelect, initialPin }) => {
  const [region, setRegion] = useState(null);
  const [marker, setMarker] = useState(initialPin || null);
  const [address, setAddress] = useState({ formatted: '', components: [] });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const mapRef = useRef(null);

  // Get current location on open
  useEffect(() => {
    if (visible && !marker) {
      (async () => {
        setLoading(true);
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLoading(false);
          return;
        }
        let location = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = location.coords;
        setRegion({ latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 });
        setMarker({ latitude, longitude });
        fetchAddress(latitude, longitude);
        setLoading(false);
      })();
    } else if (visible && marker) {
      setRegion({
        latitude: marker.latitude,
        longitude: marker.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      fetchAddress(marker.latitude, marker.longitude);
    }
  }, [visible]);

  // Fetch address from lat/lng and extract address components
  const fetchAddress = async (lat, lng) => {
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${config.GOOGLE_MAPS_API_KEY}`
      );
      const data = await res.json();
      if (data.results && data.results[0]) {
        const result = data.results[0];
        // Store the full result for address component extraction
        setAddress({
          formatted: result.formatted_address,
          components: result.address_components || []
        });
      } else {
        setAddress({ formatted: '', components: [] });
      }
    } catch {
      setAddress({ formatted: '', components: [] });
    }
  };

  // Search address
  const handleSearch = async () => {
    if (!search) return;
    setLoading(true);
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(search)}&key=${config.GOOGLE_MAPS_API_KEY}`
      );
      const data = await res.json();
      if (data.results && data.results[0]) {
        const loc = data.results[0].geometry.location;
        setRegion({
          latitude: loc.lat,
          longitude: loc.lng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
        setMarker({ latitude: loc.lat, longitude: loc.lng });
        setAddress({
          formatted: data.results[0].formatted_address,
          components: data.results[0].address_components || []
        });
        if (mapRef.current) {
          mapRef.current.animateToRegion({
            latitude: loc.lat,
            longitude: loc.lng,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          });
        }
      }
    } catch {}
    setLoading(false);
  };

  // Helper function to extract address components
  const extractAddressComponents = (components) => {
    const addressData = {
      address: '',
      kelurahan: '',
      kecamatan: '',
      provinsi: '',
      kodepos: ''
    };

    if (!components || !Array.isArray(components)) {
      return addressData;
    }

    // Build street address from street components
    let streetNumber = '';
    let route = '';

    for (const component of components) {
      const types = component.types || [];
      const longName = component.long_name;

      // Street components
      if (types.includes('street_number')) {
        streetNumber = longName;
      } else if (types.includes('route')) {
        route = longName;
      } 
      // Administrative levels for Indonesian structure
      else if (types.includes('administrative_area_level_4') || types.includes('sublocality_level_1')) {
        // Kelurahan/Village
        addressData.kelurahan = longName;
      } else if (types.includes('administrative_area_level_3') || types.includes('locality')) {
        // Kecamatan/District  
        addressData.kecamatan = longName;
      } else if (types.includes('administrative_area_level_2')) {
        // Kabupaten/Kota - could be used as fallback for kecamatan
        if (!addressData.kecamatan) {
          addressData.kecamatan = longName;
        }
      } else if (types.includes('administrative_area_level_1')) {
        // Provinsi/State
        addressData.provinsi = longName;
      } else if (types.includes('postal_code')) {
        // Kode Pos
        addressData.kodepos = longName;
      }
      // Additional fallbacks for Indonesian locations
      else if (types.includes('sublocality_level_2') && !addressData.kelurahan) {
        addressData.kelurahan = longName;
      } else if (types.includes('sublocality') && !addressData.kecamatan) {
        addressData.kecamatan = longName;
      }
    }

    // Construct full street address
    if (streetNumber && route) {
      addressData.address = `${route} ${streetNumber}`;
    } else if (route) {
      addressData.address = route;
    } else if (streetNumber) {
      addressData.address = streetNumber;
    }

    // If no specific street address found, use the first part of formatted address
    if (!addressData.address && address.formatted) {
      const parts = address.formatted.split(',');
      if (parts.length > 0) {
        addressData.address = parts[0].trim();
      }
    }

    return addressData;
  };

  // Move marker and fetch address
  const onDragEnd = (e) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setMarker({ latitude, longitude });
    fetchAddress(latitude, longitude);
  };

  // Tap on map to move marker
  const onMapPress = (e) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setMarker({ latitude, longitude });
    fetchAddress(latitude, longitude);
  };

  // Get current location
  const getCurrentLocation = async () => {
    try {
      setLocationLoading(true);
      
      // Request permissions
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Location permission denied');
        alert('Permission to access location was denied');
        return;
      }

      // Get current position with better options
      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeout: 15000,
        maximumAge: 10000,
      });
      
      const { latitude, longitude } = location.coords;
      console.log('Got location:', latitude, longitude);
      
      const newRegion = { latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 };
      
      setRegion(newRegion);
      setMarker({ latitude, longitude });
      fetchAddress(latitude, longitude);
      
      // Animate to new location
      if (mapRef.current) {
        mapRef.current.animateToRegion(newRegion, 1000);
      }
      
    } catch (error) {
      console.error('Error getting current location:', error);
      alert('Unable to get current location. Please try again.');
    } finally {
      setLocationLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Pilih Lokasi Pin Poin</Text>
          <TouchableOpacity onPress={onClose}>
            <MaterialIcons name="close" size={28} color="#333" />
          </TouchableOpacity>
        </View>
        <View style={styles.searchRow}>
          <TextInput
            style={styles.input}
            placeholder="Cari alamat..."
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
            <MaterialIcons name="search" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.locBtn, locationLoading && styles.locBtnDisabled]} 
            onPress={getCurrentLocation}
            disabled={locationLoading}
          >
            {locationLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <MaterialIcons name="my-location" size={22} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
        <View style={styles.mapContainer}>
          {region ? (
            <MapView
              ref={mapRef}
              style={styles.map}
              initialRegion={region}
              region={region}
              onRegionChangeComplete={setRegion}
              showsUserLocation
              showsMyLocationButton={false}
              onPress={onMapPress} // <-- Add this line
            >
              {marker && (
                <Marker
                  coordinate={marker}
                  draggable
                  onDragEnd={onDragEnd}
                />
              )}
            </MapView>
          ) : (
            <ActivityIndicator size="large" color="#2196F3" style={{ flex: 1 }} />
          )}
        </View>
        <View style={styles.addressBox}>
          <Text style={styles.addressLabel}>Alamat:</Text>
          <Text style={styles.addressText}>{address.formatted || '-'}</Text>
        </View>
        <TouchableOpacity
          style={styles.saveBtn}
          onPress={() => {
            if (marker) {
              const addressComponents = extractAddressComponents(address.components || []);
              onSelect({ 
                ...marker, 
                address: address.formatted,
                addressComponents: addressComponents
              });
            }
            onClose();
          }}
          disabled={!marker}
        >
          <Text style={styles.saveBtnText}>Simpan Lokasi</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#23272f',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 8,
    gap: 6,
  },
  input: {
    flex: 1,
    backgroundColor: '#f6f7fb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchBtn: {
    backgroundColor: '#2196F3',
    padding: 8,
    borderRadius: 8,
    marginLeft: 4,
  },
  locBtn: {
    backgroundColor: '#4CAF50',
    padding: 8,
    borderRadius: 8,
    marginLeft: 4,
  },
  locBtnDisabled: {
    backgroundColor: '#A5D6A7',
    opacity: 0.7,
  },
  mapContainer: {
    width: width,
    height: height * 0.45,
    backgroundColor: '#eee',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  addressBox: {
    padding: 14,
    backgroundColor: '#f6f7fb',
    borderRadius: 10,
    margin: 16,
    marginTop: 10,
  },
  addressLabel: {
    fontWeight: 'bold',
    color: '#23272f',
    marginBottom: 2,
  },
  addressText: {
    color: '#23272f',
    fontSize: 15,
  },
  saveBtn: {
    backgroundColor: '#2196F3',
    marginHorizontal: 18,
    marginBottom: 24,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default PinPointMapModal;
