import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import HeaderTitleBack from '../../../components/HeaderTitleBack';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useLocalSearchParams } from 'expo-router';
import config from '../../constants/config';
import COLORS from '../../constants/color';

const EditBiteEcoItem = () => {
  const { itemId, itemData } = useLocalSearchParams();
  const [title, setTitle] = useState('');
  const [quantity, setQuantity] = useState('');
  const [condition, setCondition] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const router = useRouter();

  const conditionOptions = [
    'Sangat Baik',
    'Baik',
    'Cukup Baik',
    'Perlu Pengolahan Segera'
  ];

  useEffect(() => {
    if (itemData) {
      loadItemData();
    } else if (itemId) {
      // Fallback: fetch from API if no item data is passed
      fetchItemData();
    }
  }, [itemId, itemData]);

  const loadItemData = () => {
    try {
      const item = JSON.parse(itemData);
      
      setTitle(item.title || '');
      setQuantity(item.quantity || '');
      setCondition(item.condition || '');
      setDescription(item.description || '');
      setImage(item.image || null);
      setInitialLoading(false);
    } catch (error) {
      console.error('Error parsing item data:', error);
      // Fallback to API fetch
      fetchItemData();
    }
  };

  const fetchItemData = async () => {
    try {
      const token = await AsyncStorage.getItem('sellerToken');
      if (!token) {
        Alert.alert('Error', 'Token tidak ditemukan');
        return;
      }

      // Get all waste items and find the one we want to edit
      const response = await fetch(`${config.API_URL}/seller/bite-eco`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch waste items');
      }

      const result = await response.json();
      
      if (result.success && result.wasteItems) {
        const item = result.wasteItems.find(item => item.id === itemId);
        
        if (item) {
          setTitle(item.title || '');
          setQuantity(item.quantity || '');
          setCondition(item.condition || '');
          setDescription(item.description || '');
          setImage(item.image || null);
        } else {
          Alert.alert('Error', 'Item tidak ditemukan');
          router.back();
        }
      } else {
        Alert.alert('Error', 'Gagal memuat data items');
        router.back();
      }
    } catch (error) {
      console.error('Error fetching item data:', error);
      Alert.alert('Error', 'Gagal memuat data item');
      router.back();
    } finally {
      setInitialLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      // Request permission
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Izin akses galeri diperlukan untuk menambah foto');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Gagal memilih gambar');
    }
  };

  const handleUpdateItem = async () => {
    // Validation
    if (!title.trim()) {
      Alert.alert('Error', 'Judul harus diisi');
      return;
    }
    if (!quantity.trim()) {
      Alert.alert('Error', 'Kuantitas harus diisi');
      return;
    }
    if (!condition) {
      Alert.alert('Error', 'Kondisi saat ini harus dipilih');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Error', 'Deskripsi harus diisi');
      return;
    }

    setLoading(true);

    try {
      const token = await AsyncStorage.getItem('sellerToken');
      if (!token) {
        Alert.alert('Error', 'Token tidak ditemukan');
        setLoading(false);
        return;
      }

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('itemId', itemId); // Add itemId to FormData
      formData.append('title', title.trim());
      formData.append('quantity', quantity.trim());
      formData.append('condition', condition);
      formData.append('description', description.trim());
      
      // Add image file if it's a new image (local URI)
      if (image && image.startsWith('file://')) {
        const imageUri = Platform.OS === 'ios' ? image.replace('file://', '') : image;
        formData.append('image', {
          uri: imageUri,
          type: 'image/jpeg',
          name: 'waste_item.jpg',
        });
      }

      const response = await fetch(`${config.API_URL}/seller/bite-eco`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          // Don't set Content-Type manually for FormData - let browser set it with boundary
        },
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || `Failed to update waste item: ${response.status}`);
      }

      if (result.success) {
        Alert.alert(
          'Berhasil',
          'Item Bite Eco berhasil diperbarui',
          [
            {
              text: 'OK',
              onPress: () => router.back(),
            },
          ]
        );
      } else {
        Alert.alert('Error', result.message || 'Gagal memperbarui item');
      }
    } catch (error) {
      console.error('Error updating waste item:', error);
      Alert.alert('Error', error.message || 'Gagal memperbarui item');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <HeaderTitleBack title="Edit Item Bite Eco" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY} />
          <Text style={styles.loadingText}>Memuat data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <HeaderTitleBack title="Edit Item Bite Eco" />
      
      <KeyboardAvoidingView 
        style={styles.keyboardAvoid} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            {/* Header Info */}
            <View style={styles.headerInfo}>
              <MaterialIcons name="edit" size={32} color={COLORS.PRIMARY} />
              <View style={styles.headerText}>
                <Text style={styles.headerTitle}>Edit Item Bite Eco</Text>
                <Text style={styles.headerSubtitle}>
                  Perbarui informasi limbah makanan
                </Text>
              </View>
            </View>

            {/* Image Upload */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Foto Item</Text>
              <TouchableOpacity style={styles.imageUploadContainer} onPress={pickImage}>
                {image ? (
                  <Image source={{ uri: image }} style={styles.uploadedImage} />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <MaterialIcons name="add-a-photo" size={40} color="#ccc" />
                    <Text style={styles.imagePlaceholderText}>Tap untuk pilih foto</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Title */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Judul *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Contoh: Kulit Buah Jeruk, Ampas Tahu, dll"
                value={title}
                onChangeText={setTitle}
                maxLength={100}
              />
              <Text style={styles.charCount}>{title.length}/100</Text>
            </View>

            {/* Quantity */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Kuantitas *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Contoh: 2 kg, 1 karung, 5 liter, dll"
                value={quantity}
                onChangeText={setQuantity}
                maxLength={50}
              />
              <Text style={styles.charCount}>{quantity.length}/50</Text>
            </View>

            {/* Condition */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Kondisi Saat Ini *</Text>
              <View style={styles.conditionOptions}>
                {conditionOptions.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.conditionOption,
                      condition === option && styles.selectedCondition
                    ]}
                    onPress={() => setCondition(option)}
                  >
                    <Text style={[
                      styles.conditionText,
                      condition === option && styles.selectedConditionText
                    ]}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Description */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Deskripsi *</Text>
              <TextInput
                style={[styles.textInput, styles.descriptionInput]}
                placeholder="Jelaskan kondisi detail, asal limbah, cara pengolahan yang disarankan, dll"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                maxLength={500}
              />
              <Text style={styles.charCount}>{description.length}/500</Text>
            </View>

            {/* Info Box */}
            <View style={styles.infoBox}>
              <MaterialIcons name="info" size={20} color={COLORS.PRIMARY} />
              <Text style={styles.infoText}>
                Pastikan limbah makanan masih dalam kondisi yang aman dan bisa diolah kembali
              </Text>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.disabledButton]}
              onPress={handleUpdateItem}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Perbarui Item</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f7fb',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#23272f',
    marginBottom: 8,
  },
  imageUploadContainer: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderText: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 8,
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  textInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 4,
  },
  charCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
  },
  descriptionInput: {
    height: 100,
  },
  conditionOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  conditionOption: {
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedCondition: {
    backgroundColor: COLORS.PRIMARY,
    borderColor: COLORS.PRIMARY,
  },
  conditionText: {
    fontSize: 14,
    color: '#666',
  },
  selectedConditionText: {
    color: '#fff',
    fontWeight: '500',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  submitButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  disabledButton: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});

export default EditBiteEcoItem;
