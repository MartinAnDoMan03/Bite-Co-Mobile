import React, { useState } from 'react';
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
import COLORS from '../../constants/color';

const AddBiteEcoItem = () => {
  const [title, setTitle] = useState('');
  const [quantity, setQuantity] = useState('');
  const [condition, setCondition] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const conditionOptions = [
    'Sangat Baik',
    'Baik',
    'Cukup Baik',
    'Perlu Pengolahan Segera'
  ];

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

  const handleAddItem = async () => {
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
    if (!image) {
      Alert.alert('Error', 'Gambar harus dipilih');
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
      formData.append('title', title.trim());
      formData.append('quantity', quantity.trim());
      formData.append('condition', condition);
      formData.append('description', description.trim());
      
      // Add image file
      if (image) {
        const imageUri = Platform.OS === 'ios' ? image.replace('file://', '') : image;
        formData.append('image', {
          uri: imageUri,
          type: 'image/jpeg',
          name: 'waste_item.jpg',
        });
      }

      const response = await fetch(`${config.API_URL}/seller/bite-eco`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to add waste item');
      }

      Alert.alert(
        'Berhasil',
        'Item Bite Eco berhasil ditambahkan',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error('Error adding waste item:', error);
      Alert.alert('Error', error.message || 'Gagal menambahkan item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <HeaderTitleBack title="Tambah Item Bite Eco" />
      
      <KeyboardAvoidingView 
        style={styles.keyboardAvoid} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            {/* Header Info */}
            <View style={styles.headerInfo}>
              <MaterialIcons name="eco" size={32} color={COLORS.GREEN4} />
              <View style={styles.headerText}>
                <Text style={styles.headerTitle}>Posting Limbah Makanan</Text>
                <Text style={styles.headerSubtitle}>
                  Isi informasi limbah makanan yang akan dijual
                </Text>
              </View>
            </View>

            {/* Image Upload */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Foto Item *</Text>
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
              onPress={handleAddItem}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Posting Item</Text>
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
    backgroundColor: COLORS.GREEN4,
    borderColor: COLORS.GREEN4,
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
    backgroundColor: COLORS.GREEN4,
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

export default AddBiteEcoItem;
