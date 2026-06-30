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
import { useRouter } from 'expo-router';
import config from '../../constants/config';

const AddMenuPage = () => {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [menuName, setMenuName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true);
      const token = await AsyncStorage.getItem('sellerToken');
      if (!token) {
        Alert.alert('Error', 'Token tidak ditemukan');
        return;
      }

      const response = await fetch(`${config.API_URL}/seller/menu`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }

      const result = await response.json();
      setCategories(result.data || []);
      
      if (result.data && result.data.length > 0) {
        setSelectedCategory(result.data[0]);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      Alert.alert('Error', 'Gagal memuat kategori menu');
    } finally {
      setCategoriesLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      // Request permission
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Izin akses galeri diperlukan untuk menambah foto menu');
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

  const handleAddMenu = async () => {
    // Validation
    if (!menuName.trim()) {
      Alert.alert('Error', 'Nama menu tidak boleh kosong');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Error', 'Deskripsi menu tidak boleh kosong');
      return;
    }
    if (!price.trim() || isNaN(Number(price)) || Number(price) <= 0) {
      Alert.alert('Error', 'Harga menu harus berupa angka yang valid');
      return;
    }
    if (!selectedCategory) {
      Alert.alert('Error', 'Pilih kategori menu');
      return;
    }

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('sellerToken');
      if (!token) {
        Alert.alert('Error', 'Token tidak ditemukan');
        return;
      }

      const formData = new FormData();
      formData.append('name', menuName.trim());
      formData.append('description', description.trim());
      formData.append('price', Number(price));
      formData.append('category_id', selectedCategory.id);

      if (image) {
        formData.append('image', {
          uri: image,
          type: 'image/jpeg',
          name: 'menu-image.jpg',
        });
      }

      const response = await fetch(`${config.API_URL}/seller/menu`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to add menu');
      }

      Alert.alert(
        'Berhasil',
        'Menu berhasil ditambahkan',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          }
        ]
      );

      // Reset form
      setMenuName('');
      setDescription('');
      setPrice('');
      setImage(null);

    } catch (error) {
      console.error('Error adding menu:', error);
      Alert.alert('Error', error.message || 'Gagal menambahkan menu');
    } finally {
      setLoading(false);
    }
  };

  const CategorySelector = () => (
    <View style={styles.categorySection}>
      <Text style={styles.label}>Kategori Menu</Text>
      {categoriesLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#FF6B35" />
          <Text style={styles.loadingText}>Memuat kategori...</Text>
        </View>
      ) : categories.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Tidak ada kategori tersedia</Text>
          <TouchableOpacity
            style={styles.createCategoryButton}
            onPress={() => {
              Alert.alert('Info', 'Buat kategori terlebih dahulu di menu Daftar Menu');
            }}
          >
            <Text style={styles.createCategoryText}>Buat Kategori</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryItem,
                selectedCategory?.id === category.id && styles.categoryItemSelected
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text style={[
                styles.categoryText,
                selectedCategory?.id === category.id && styles.categoryTextSelected
              ]}>
                {category.name}
              </Text>
              <Text style={styles.categoryCount}>
                {category.items?.length || 0} item
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <HeaderTitleBack title="Tambah Menu Baru" />
      
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Category Selection */}
          <CategorySelector />

          {/* Menu Photo */}
          <View style={styles.section}>
            <Text style={styles.label}>Foto Menu</Text>
            <TouchableOpacity style={styles.imageContainer} onPress={pickImage}>
              {image ? (
                <Image source={{ uri: image }} style={styles.menuImage} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <MaterialIcons name="add-a-photo" size={48} color="#ccc" />
                  <Text style={styles.imagePlaceholderText}>Tambah Foto Menu</Text>
                </View>
              )}
            </TouchableOpacity>
            {image && (
              <TouchableOpacity style={styles.changeImageButton} onPress={pickImage}>
                <MaterialIcons name="edit" size={16} color="#FF6B35" />
                <Text style={styles.changeImageText}>Ubah Foto</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Menu Name */}
          <View style={styles.section}>
            <Text style={styles.label}>Nama Menu *</Text>
            <TextInput
              style={styles.input}
              placeholder="Masukkan nama menu..."
              value={menuName}
              onChangeText={setMenuName}
              maxLength={50}
            />
            <Text style={styles.charCount}>{menuName.length}/50</Text>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.label}>Deskripsi Menu *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Masukkan deskripsi menu..."
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              maxLength={200}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{description.length}/200</Text>
          </View>

          {/* Price */}
          <View style={styles.section}>
            <Text style={styles.label}>Harga Menu (Rp) *</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              value={price}
              onChangeText={setPrice}
              keyboardType="numeric"
              maxLength={10}
            />
            {price && !isNaN(Number(price)) && Number(price) > 0 && (
              <Text style={styles.pricePreview}>
                Rp {Number(price).toLocaleString('id-ID')}
              </Text>
            )}
          </View>

          {/* Tips Section */}
          <View style={styles.tipsSection}>
            <View style={styles.tipsHeader}>
              <MaterialIcons name="lightbulb" size={20} color="#FFA726" />
              <Text style={styles.tipsTitle}>Tips Foto Menu yang Menarik</Text>
            </View>
            <Text style={styles.tipsText}>• Gunakan pencahayaan yang cukup</Text>
            <Text style={styles.tipsText}>• Foto dari sudut yang menarik</Text>
            <Text style={styles.tipsText}>• Pastikan makanan terlihat fresh</Text>
            <Text style={styles.tipsText}>• Hindari background yang ramai</Text>
          </View>

          <View style={styles.bottomSpace} />
        </ScrollView>

        {/* Submit Button */}
        <View style={styles.submitContainer}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              (!menuName || !description || !price || !selectedCategory || loading) && styles.submitButtonDisabled
            ]}
            onPress={handleAddMenu}
            disabled={!menuName || !description || !price || !selectedCategory || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <MaterialIcons name="add" size={20} color="white" />
                <Text style={styles.submitButtonText}>Tambah Menu</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  categorySection: {
    marginBottom: 24,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 8,
  },
  loadingText: {
    marginLeft: 8,
    color: '#666',
  },
  emptyContainer: {
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    alignItems: 'center',
  },
  emptyText: {
    color: '#666',
    marginBottom: 12,
  },
  createCategoryButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  createCategoryText: {
    color: 'white',
    fontWeight: '600',
  },
  categoryScroll: {
    flexDirection: 'row',
  },
  categoryItem: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minWidth: 100,
  },
  categoryItemSelected: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  categoryTextSelected: {
    color: 'white',
  },
  categoryCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  imageContainer: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  menuImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    marginTop: 8,
    color: '#666',
    fontSize: 16,
  },
  changeImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    padding: 8,
  },
  changeImageText: {
    marginLeft: 4,
    color: '#FF6B35',
    fontWeight: '600',
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 4,
  },
  pricePreview: {
    fontSize: 14,
    color: '#FF6B35',
    fontWeight: '600',
    marginTop: 4,
  },
  tipsSection: {
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  tipsText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  bottomSpace: {
    height: 100,
  },
  submitContainer: {
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  submitButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default AddMenuPage;
