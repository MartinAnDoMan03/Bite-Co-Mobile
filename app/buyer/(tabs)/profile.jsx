import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, ScrollView, Image, SafeAreaView, Alert, Modal, TextInput } from 'react-native';
import React, { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import COLORS from '../../constants/color';
import axios from 'axios';
import config from '../../constants/config';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import PinPointMapModal from '../../../components/PinPointMapModal';
import { MaterialIcons } from '@expo/vector-icons';
import { ProfileSkeleton } from '../../../components/SkeletonLoader';

const profile = () => {
  const router = useRouter();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [addressFields, setAddressFields] = useState({
    address: '',
    kelurahan: '',
    kecamatan: '',
    provinsi: '',
    kodepos: '',
    catatan: '',
  });
  const [pinPoint, setPinPoint] = useState({ lat: null, lng: null, address: '' });
  const [showPinPointModal, setShowPinPointModal] = useState(false);
  const [showEditAddressModal, setShowEditAddressModal] = useState(false);

  const fetchProfileData = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('buyerToken');
      if (!token) {
        setError('No token found');
        setLoading(false);
        return;
      }

      const response = await axios.get(`${config.API_URL}/buyer/profile`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setUserData(response.data);
      
      // Load address data from AsyncStorage
      await loadAddressData();
      
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch profile data');
      setLoading(false);
      console.error('Profile fetch error:', err);
    }
  }, []);

  const loadAddressData = async () => {
    try {
      const savedAddress = await AsyncStorage.getItem('addressFields');
      const savedPinPoint = await AsyncStorage.getItem('pinPoint');
      
      if (savedAddress) {
        setAddressFields(JSON.parse(savedAddress));
      }
      
      if (savedPinPoint) {
        setPinPoint(JSON.parse(savedPinPoint));
      }
    } catch (error) {
      console.error('Error loading address data:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchProfileData();
    }, [fetchProfileData])
  );

  const handleSignOut = async () => {
    try {
      await AsyncStorage.removeItem('buyerToken');
      router.push('/'); // Navigate to index.jsx (first screen)
      console.log('Signed out successfully');
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const handlePinPointSelect = (point) => {
    const newPinPoint = { 
      lat: point.latitude, 
      lng: point.longitude, 
      address: point.address 
    };
    setPinPoint(newPinPoint);
    AsyncStorage.setItem('pinPoint', JSON.stringify(newPinPoint));
    
    // Auto-fill address fields if address components are available
    if (point.addressComponents) {
      const newAddressFields = {
        address: point.addressComponents.address || point.address || '',
        kelurahan: point.addressComponents.kelurahan || '',
        kecamatan: point.addressComponents.kecamatan || '',
        provinsi: point.addressComponents.provinsi || '',
        kodepos: point.addressComponents.kodepos || '',
        catatan: addressFields.catatan, // Keep existing notes
      };
      
      setAddressFields(newAddressFields);
      AsyncStorage.setItem('addressFields', JSON.stringify(newAddressFields));
      
      // Show notification that address has been auto-filled
      Alert.alert(
        'Alamat Otomatis Terisi',
        'Alamat pengantaran telah diisi secara otomatis berdasarkan lokasi pin point. Anda dapat mengeditnya jika diperlukan.',
        [{ text: 'OK' }]
      );
    }
    
    setShowPinPointModal(false);
  };

  const openPinPointMap = () => {
    setShowPinPointModal(true);
  };

  const handleSaveAddress = async () => {
    try {
      await AsyncStorage.setItem('addressFields', JSON.stringify(addressFields));
      setShowEditAddressModal(false);
      Alert.alert('Berhasil', 'Alamat berhasil disimpan');
    } catch (error) {
      console.error('Error saving address:', error);
      Alert.alert('Error', 'Gagal menyimpan alamat');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <ProfileSkeleton />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={64} color="#ccc" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchProfileData}>
            <MaterialIcons name="refresh" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.retryButtonText}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f6f7fb' }}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.profileHeader}>
          <View style={styles.profileImageContainer}>
            <Image
              source={require('../../../assets/images/profile.png')}
              style={styles.profileImage}
            />
            <View style={styles.profileImageOverlay}>
              <MaterialIcons name="person" size={40} color="#fff" />
            </View>
          </View>
          <Text style={styles.headerText}>Profile Saya</Text>
          <Text style={styles.headerSubText}>Kelola informasi akun Anda</Text>
        </View>

        <View style={styles.profileInfo}>
          <Text style={styles.sectionTitle}>
            <MaterialIcons name="person-outline" size={20} color={COLORS.PRIMARY} />
            {" "}Informasi Personal
          </Text>
          <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
              <MaterialIcons name="badge" size={20} color="#666" />
              <Text style={styles.label}>Nama</Text>
            </View>
            <Text style={styles.value}>{userData.name}</Text>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
              <MaterialIcons name="email" size={20} color="#666" />
              <Text style={styles.label}>Email</Text>
            </View>
            <Text style={styles.value} numberOfLines={1}>{userData.email}</Text>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
              <MaterialIcons name="phone" size={20} color="#666" />
              <Text style={styles.label}>Telepon</Text>
            </View>
            <Text style={styles.value}>{userData.phone}</Text>
          </View>
        </View>

        {/* Address Detail Section */}
        <View style={styles.addressSection}>
          <Text style={styles.sectionTitle}>
            <MaterialIcons name="location-on" size={20} color={COLORS.PRIMARY} />
            {" "}Alamat Pengantaran
          </Text>
          
          <View style={styles.addressInfo}>
            <View style={styles.addressRow}>
              <MaterialIcons name="home" size={18} color="#666" />
              <View style={styles.addressContent}>
                <Text style={styles.addressLabel}>Alamat Lengkap</Text>
                <Text style={styles.addressValue}>
                  {addressFields.address || 'Belum diatur'}
                </Text>
              </View>
            </View>
            
            {addressFields.kelurahan && (
              <View style={styles.addressDetailRow}>
                <Text style={styles.addressSubLabel}>Kelurahan:</Text>
                <Text style={styles.addressSubValue}>{addressFields.kelurahan}</Text>
              </View>
            )}
            
            {addressFields.kecamatan && (
              <View style={styles.addressDetailRow}>
                <Text style={styles.addressSubLabel}>Kecamatan:</Text>
                <Text style={styles.addressSubValue}>{addressFields.kecamatan}</Text>
              </View>
            )}
            
            {addressFields.provinsi && (
              <View style={styles.addressDetailRow}>
                <Text style={styles.addressSubLabel}>Provinsi:</Text>
                <Text style={styles.addressSubValue}>{addressFields.provinsi}</Text>
              </View>
            )}
            
            {addressFields.kodepos && (
              <View style={styles.addressDetailRow}>
                <Text style={styles.addressSubLabel}>Kode Pos:</Text>
                <Text style={styles.addressSubValue}>{addressFields.kodepos}</Text>
              </View>
            )}
            
            {addressFields.catatan && (
              <View style={styles.addressDetailRow}>
                <Text style={styles.addressSubLabel}>Catatan:</Text>
                <Text style={styles.addressSubValue}>{addressFields.catatan}</Text>
              </View>
            )}
          </View>

          <View style={styles.pinPointSection}>
            <View style={styles.addressRow}>
              <MaterialIcons name="place" size={18} color="#666" />
              <View style={styles.addressContent}>
                <Text style={styles.addressLabel}>Pin Point Location</Text>
                <Text style={styles.addressValue}>
                  {pinPoint.address || 'Belum diatur'}
                </Text>
              </View>
            </View>
            
            {pinPoint.lat && pinPoint.lng && (
              <View style={styles.coordinateRow}>
                <MaterialIcons name="my-location" size={16} color="#888" />
                <Text style={styles.coordinateText}>
                  {pinPoint.lat.toFixed(6)}, {pinPoint.lng.toFixed(6)}
                </Text>
              </View>
            )}
            
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.primaryButton]} 
                onPress={openPinPointMap}
              >
                <MaterialIcons name="location-searching" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>
                  {pinPoint.lat && pinPoint.lng ? 'Update Pin Point' : 'Set Pin Point'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.secondaryButton]} 
                onPress={() => setShowEditAddressModal(true)}
              >
                <MaterialIcons name="edit-location" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Edit Alamat</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <MaterialIcons name="logout" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.signOutButtonText}>Keluar Akun</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* PinPoint Map Modal */}
      <PinPointMapModal
        visible={showPinPointModal}
        onClose={() => setShowPinPointModal(false)}
        onSelect={handlePinPointSelect}
        initialPin={pinPoint.lat && pinPoint.lng ? { 
          latitude: pinPoint.lat, 
          longitude: pinPoint.lng 
        } : null}
      />
      
      {/* Edit Address Modal */}
      <Modal
        visible={showEditAddressModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditAddressModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Edit Alamat Pengantaran</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Alamat lengkap..."
              value={addressFields.address}
              onChangeText={(text) => setAddressFields(prev => ({...prev, address: text}))}
              multiline
            />
            
            <TextInput
              style={styles.modalInput}
              placeholder="Kelurahan"
              value={addressFields.kelurahan}
              onChangeText={(text) => setAddressFields(prev => ({...prev, kelurahan: text}))}
            />
            
            <TextInput
              style={styles.modalInput}
              placeholder="Kecamatan"
              value={addressFields.kecamatan}
              onChangeText={(text) => setAddressFields(prev => ({...prev, kecamatan: text}))}
            />
            
            <TextInput
              style={styles.modalInput}
              placeholder="Provinsi"
              value={addressFields.provinsi}
              onChangeText={(text) => setAddressFields(prev => ({...prev, provinsi: text}))}
            />
            
            <TextInput
              style={styles.modalInput}
              placeholder="Kode Pos"
              value={addressFields.kodepos}
              onChangeText={(text) => setAddressFields(prev => ({...prev, kodepos: text}))}
              keyboardType="numeric"
            />
            
            <TextInput
              style={styles.modalInput}
              placeholder="Catatan (opsional)"
              value={addressFields.catatan}
              onChangeText={(text) => setAddressFields(prev => ({...prev, catatan: text}))}
              multiline
            />
            
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => setShowEditAddressModal(false)}
              >
                <Text style={styles.modalButtonText}>Batal</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton]} 
                onPress={handleSaveAddress}
              >
                <Text style={styles.modalButtonText}>Simpan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f6f7fb',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#f6f7fb',
  },
  errorText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: COLORS.PRIMARY,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 30,
    paddingVertical: 20,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f0f0',
  },
  profileImageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 50,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#23272f',
    marginBottom: 4,
  },
  headerSubText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  profileInfo: {
    marginBottom: 20,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#23272f',
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
    marginLeft: 12,
  },
  value: {
    fontSize: 16,
    color: '#23272f',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  value: {
    fontSize: 16,
    color: '#23272f',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  addressSection: {
    marginBottom: 30,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  addressInfo: {
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  addressContent: {
    flex: 1,
    marginLeft: 12,
  },
  addressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  addressValue: {
    fontSize: 16,
    color: '#23272f',
    fontWeight: '500',
    lineHeight: 22,
  },
  addressDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingLeft: 30,
  },
  addressSubLabel: {
    fontSize: 14,
    color: '#888',
    fontWeight: '500',
  },
  addressSubValue: {
    fontSize: 14,
    color: '#555',
    fontWeight: '500',
  },
  pinPointSection: {
    marginTop: 10,
  },
  coordinateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginLeft: 30,
  },
  coordinateText: {
    fontSize: 12,
    color: '#888',
    marginLeft: 6,
    fontFamily: 'monospace',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  primaryButton: {
    backgroundColor: COLORS.PRIMARY,
  },
  secondaryButton: {
    backgroundColor: '#6c757d',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  signOutButton: {
    backgroundColor: '#dc3545',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  signOutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  signOutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
    color: '#23272f',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
    color: '#23272f',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cancelButton: {
    backgroundColor: '#6c757d',
  },
  saveButton: {
    backgroundColor: COLORS.PRIMARY,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default profile;
