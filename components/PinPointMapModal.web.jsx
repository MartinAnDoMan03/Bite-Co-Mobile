import React, { useState, useRef, useCallback } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Dimensions, TextInput, ActivityIndicator } from 'react-native';
import { GoogleMap, MarkerF, useJsApiLoader } from '@react-google-maps/api';
import { MaterialIcons } from '@expo/vector-icons';
import config from '../app/constants/config';

const { width, height } = Dimensions.get('window');

// Deteksi format Plus Code Google (mis. "8Q7X+HM67") supaya tidak ke-save
// sebagai alamat kalau reverse-geocode tidak nemu alamat presisi di titik itu.
const looksLikePlusCode = (str) =>
  /^[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,3}/.test(str || '');

const PinPointMapModal = ({ visible, onClose, onSelect, initialPin }) => {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: config.GOOGLE_MAPS_API_KEY,
  });

  const [center, setCenter] = useState(
    initialPin
      ? { lat: initialPin.latitude, lng: initialPin.longitude }
      : { lat: -6.2, lng: 106.816666 } // Jakarta fallback
  );
  const [marker, setMarker] = useState(initialPin ? { lat: initialPin.latitude, lng: initialPin.longitude } : null);
  const [address, setAddress] = useState({ formatted: '', components: [] });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const mapRef = useRef(null);

  // FIX: skip hasil yang cuma Plus Code (mis. "8Q7X+HM67 Medan"), cari hasil
  // yang beneran punya alamat jalan/tempat. Kalau semua hasil plus_code
  // (lokasi tanpa alamat presisi), fallback ke hasil pertama seperti biasa.
  const fetchAddress = async (lat, lng) => {
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${config.GOOGLE_MAPS_API_KEY}`
      );
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const properResult =
          data.results.find((r) => !(r.types || []).includes('plus_code')) ||
          data.results[0];
        setAddress({
          formatted: properResult.formatted_address,
          components: properResult.address_components || [],
        });
      } else {
        setAddress({ formatted: '', components: [] });
      }
    } catch {
      setAddress({ formatted: '', components: [] });
    }
  };

  React.useEffect(() => {
    if (visible && !marker) {
      setLocationLoading(true);
      navigator.geolocation?.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setCenter({ lat: latitude, lng: longitude });
          setMarker({ lat: latitude, lng: longitude });
          fetchAddress(latitude, longitude);
          setLocationLoading(false);
        },
        () => setLocationLoading(false)
      );
    } else if (visible && marker) {
      fetchAddress(marker.lat, marker.lng);
    }
  }, [visible]);

  // FIX: sama, skip hasil Plus Code kalau ada alternatif yang lebih baik
  const handleSearch = async () => {
    if (!search) return;
    setLoading(true);
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(search)}&key=${config.GOOGLE_MAPS_API_KEY}`
      );
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const properResult =
          data.results.find((r) => !(r.types || []).includes('plus_code')) ||
          data.results[0];
        const loc = properResult.geometry.location;
        setCenter({ lat: loc.lat, lng: loc.lng });
        setMarker({ lat: loc.lat, lng: loc.lng });
        setAddress({
          formatted: properResult.formatted_address,
          components: properResult.address_components || [],
        });
        mapRef.current?.panTo({ lat: loc.lat, lng: loc.lng });
      }
    } catch {}
    setLoading(false);
  };

  const extractAddressComponents = (components) => {
    const addressData = { address: '', kelurahan: '', kecamatan: '', provinsi: '', kodepos: '' };
    if (!components || !Array.isArray(components)) return addressData;
    let streetNumber = '';
    let route = '';
    for (const component of components) {
      const types = component.types || [];
      const longName = component.long_name;
      if (types.includes('street_number')) streetNumber = longName;
      else if (types.includes('route')) route = longName;
      else if (types.includes('administrative_area_level_4') || types.includes('sublocality_level_1')) addressData.kelurahan = longName;
      else if (types.includes('administrative_area_level_3') || types.includes('locality')) addressData.kecamatan = longName;
      else if (types.includes('administrative_area_level_2')) { if (!addressData.kecamatan) addressData.kecamatan = longName; }
      else if (types.includes('administrative_area_level_1')) addressData.provinsi = longName;
      else if (types.includes('postal_code')) addressData.kodepos = longName;
      else if (types.includes('sublocality_level_2') && !addressData.kelurahan) addressData.kelurahan = longName;
      else if (types.includes('sublocality') && !addressData.kecamatan) addressData.kecamatan = longName;
    }
    if (streetNumber && route) addressData.address = `${route} ${streetNumber}`;
    else if (route) addressData.address = route;
    else if (streetNumber) addressData.address = streetNumber;

    // FIX: kalau fallback ke formatted_address, cek dulu apakah potongan
    // pertamanya Plus Code — kalau iya, jangan dipakai (biarkan kosong,
    // biar user isi manual lewat modal edit alamat).
    if (!addressData.address && address.formatted) {
      const parts = address.formatted.split(',');
      if (parts.length > 0) {
        const firstPart = parts[0].trim();
        addressData.address = looksLikePlusCode(firstPart) ? '' : firstPart;
      }
    }
    return addressData;
  };

  const onMapClick = useCallback((e) => {
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setMarker({ lat, lng });
    fetchAddress(lat, lng);
  }, []);

  const onMarkerDragEnd = useCallback((e) => {
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setMarker({ lat, lng });
    fetchAddress(lat, lng);
  }, []);

  const getCurrentLocation = () => {
    setLocationLoading(true);
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCenter({ lat: latitude, lng: longitude });
        setMarker({ lat: latitude, lng: longitude });
        fetchAddress(latitude, longitude);
        mapRef.current?.panTo({ lat: latitude, lng: longitude });
        setLocationLoading(false);
      },
      () => {
        alert('Unable to get current location. Please try again.');
        setLocationLoading(false);
      }
    );
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
            {locationLoading ? <ActivityIndicator size="small" color="#fff" /> : <MaterialIcons name="my-location" size={22} color="#fff" />}
          </TouchableOpacity>
        </View>
        <View style={styles.mapContainer}>
          {isLoaded ? (
            <GoogleMap
              onLoad={(map) => (mapRef.current = map)}
              mapContainerStyle={{ width: '100%', height: '100%' }}
              center={center}
              zoom={16}
              onClick={onMapClick}
            >
              {marker && <MarkerF position={marker} draggable onDragEnd={onMarkerDragEnd} />}
            </GoogleMap>
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
              onSelect({ latitude: marker.lat, longitude: marker.lng, address: address.formatted, addressComponents });
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
  container: { flex: 1, backgroundColor: '#fff', paddingTop: 60 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, marginBottom: 8 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#23272f' },
  searchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, marginBottom: 8, gap: 6 },
  input: { flex: 1, backgroundColor: '#f6f7fb', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 15, borderWidth: 1, borderColor: '#e0e0e0' },
  searchBtn: { backgroundColor: '#2196F3', padding: 8, borderRadius: 8, marginLeft: 4 },
  locBtn: { backgroundColor: '#4CAF50', padding: 8, borderRadius: 8, marginLeft: 4 },
  locBtnDisabled: { backgroundColor: '#A5D6A7', opacity: 0.7 },
  mapContainer: { width: width, height: height * 0.45, backgroundColor: '#eee' },
  addressBox: { padding: 14, backgroundColor: '#f6f7fb', borderRadius: 10, margin: 16, marginTop: 10 },
  addressLabel: { fontWeight: 'bold', color: '#23272f', marginBottom: 2 },
  addressText: { color: '#23272f', fontSize: 15 },
  saveBtn: { backgroundColor: '#2196F3', marginHorizontal: 18, marginBottom: 24, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});

export default PinPointMapModal;