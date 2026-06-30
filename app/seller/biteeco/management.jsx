import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import HeaderTitleBack from '../../../components/HeaderTitleBack';
import COLORS from '../../constants/color';
import config from '../../constants/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BiteEcoManagement = () => {
  const [wasteItems, setWasteItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const fetchWasteItems = useCallback(async () => {
    try {
      if (!refreshing) setLoading(true);
      const token = await AsyncStorage.getItem('sellerToken');
      
      if (!token) {
        Alert.alert('Error', 'Silakan login terlebih dahulu');
        return;
      }

      const response = await fetch(`${config.API_URL}/seller/bite-eco`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        
        // If authentication failed, show a more helpful error
        if (response.status === 401) {
          Alert.alert(
            'Authentication Error', 
            'Token tidak valid. Silakan logout dan login kembali.',
            [
              { text: 'OK' },
              { text: 'Logout', onPress: () => {
                AsyncStorage.removeItem('sellerToken');
                router.replace('/seller/SellerIndex');
              }}
            ]
          );
          return;
        }
        
        throw new Error(`Failed to fetch waste items: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        const items = result.wasteItems || [];
        setWasteItems(items);
      } else {
        Alert.alert('Error', result.message || 'Gagal memuat data');
      }
      
    } catch (error) {
      console.error('Error fetching waste items:', error);
      Alert.alert('Error', `Gagal memuat data Bite Eco: ${error.message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing, router]);

  useFocusEffect(
    useCallback(() => {
      fetchWasteItems();
    }, [fetchWasteItems])
  );

  const handleDeleteItem = async (itemId) => {
    Alert.alert(
      'Konfirmasi Hapus',
      'Apakah Anda yakin ingin menghapus item ini?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('sellerToken');
              const response = await fetch(`${config.API_URL}/seller/bite-eco`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ itemId }),
              });

              if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to delete item: ${response.status}`);
              }

              const result = await response.json();

              if (result.success) {
                Alert.alert('Berhasil', 'Item berhasil dihapus');
                fetchWasteItems(); // Refresh the list
              } else {
                Alert.alert('Error', result.message || 'Gagal menghapus item');
              }
            } catch (error) {
              console.error('Error deleting item:', error);
              Alert.alert('Error', `Gagal menghapus item: ${error.message}`);
            }
          },
        },
      ]
    );
  };

  const WasteItemCard = ({ item }) => (
    <View style={styles.wasteCard}>
      <View style={styles.cardHeader}>
        <Image 
          source={{ uri: item.image || 'https://via.placeholder.com/80' }} 
          style={styles.wasteImage} 
        />
        <View style={styles.wasteInfo}>
          <Text style={styles.wasteTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.wasteQuantity}>Kuantitas: {item.quantity}</Text>
          <Text style={styles.wasteCondition}>Kondisi: {item.condition}</Text>
          <Text style={styles.wasteDescription} numberOfLines={2}>{item.description}</Text>
        </View>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => router.push({
            pathname: '/seller/biteeco/edit',
            params: { 
              itemId: item.id,
              itemData: JSON.stringify(item)
            }
          })}
        >
          <MaterialIcons name="edit" size={18} color="#fff" />
          <Text style={styles.actionButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteItem(item.id)}
        >
          <MaterialIcons name="delete" size={18} color="#fff" />
          <Text style={styles.actionButtonText}>Hapus</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <HeaderTitleBack title="Bite Eco Management" />
      
      <View style={styles.content}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.headerInfo}>
            <MaterialIcons name="eco" size={32} color={COLORS.GREEN4} />
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>Kelola Limbah Makanan</Text>
              <Text style={styles.headerSubtitle}>
                Posting limbah makanan untuk dijual kepada pembeli
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/seller/biteeco/add')}
          >
            <MaterialIcons name="add" size={24} color="#fff" />
            <Text style={styles.addButtonText}>Tambah Item</Text>
          </TouchableOpacity>
        </View>

        {/* Items List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.PRIMARY} />
            <Text style={styles.loadingText}>Memuat data...</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.itemsList}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  fetchWasteItems();
                }}
                colors={[COLORS.PRIMARY]}
              />
            }
          >
            {wasteItems.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialIcons name="eco" size={64} color="#ccc" />
                <Text style={styles.emptyTitle}>Belum Ada Item Bite Eco</Text>
                <Text style={styles.emptySubtitle}>
                  Mulai posting limbah makanan untuk dijual kepada pembeli
                </Text>
                
                <TouchableOpacity
                  style={styles.emptyButton}
                  onPress={() => router.push('/seller/biteeco/add')}
                >
                  <Text style={styles.emptyButtonText}>Tambah Item Pertama</Text>
                </TouchableOpacity>
              </View>
            ) : (
              wasteItems.map((item) => (
                <WasteItemCard key={item.id} item={item} />
              ))
            )}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f7fb',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerText: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#23272f',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  addButton: {
    backgroundColor: COLORS.GREEN4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  itemsList: {
    flex: 1,
  },
  wasteCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  wasteImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  wasteInfo: {
    flex: 1,
    marginLeft: 12,
  },
  wasteTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#23272f',
    marginBottom: 4,
  },
  wasteQuantity: {
    fontSize: 14,
    color: COLORS.PRIMARY,
    fontWeight: '500',
    marginBottom: 2,
  },
  wasteCondition: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  wasteDescription: {
    fontSize: 14,
    color: '#666',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  editButton: {
    backgroundColor: COLORS.PRIMARY,
  },
  deleteButton: {
    backgroundColor: '#F44336',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#23272f',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: COLORS.GREEN4,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default BiteEcoManagement;
