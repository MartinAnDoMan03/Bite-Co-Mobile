import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import config from '../../constants/config';
import COLORS from '../../constants/color';
import { useLanguage } from '../../contexts/LanguageContext';

const ALERT_TYPE_STYLES = {
  info: { icon: 'info', color: COLORS.PRIMARY, bg: '#F7EAEF' },
  success: { icon: 'check-circle', color: '#2E7D32', bg: '#E8F5E9' },
  error: { icon: 'error', color: '#C62828', bg: '#FFEBEE' },
  warning: { icon: 'warning', color: '#B26A00', bg: '#FFF3E0' },
};

const CustomAlert = ({ visible, title, message, buttons, type = 'info', onClose }) => {
  const typeStyle = ALERT_TYPE_STYLES[type] || ALERT_TYPE_STYLES.info;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.alertOverlay}>
        <View style={styles.alertContent}>
          <View style={[styles.alertIconCircle, { backgroundColor: typeStyle.bg }]}>
            <MaterialIcons name={typeStyle.icon} size={26} color={typeStyle.color} />
          </View>
          <Text style={styles.alertTitle}>{title}</Text>
          {!!message && <Text style={styles.alertMessage}>{message}</Text>}
          <View style={styles.alertButtons}>
            {buttons.map((btn, index) => {
              const isCancel = btn.style === 'cancel';
              return (
                <TouchableOpacity
                  key={index}
                  style={[styles.alertButton, isCancel ? styles.alertButtonOutline : styles.alertButtonSolid]}
                  onPress={() => {
                    onClose();
                    btn.onPress && btn.onPress();
                  }}
                >
                  <Text style={[styles.alertButtonText, isCancel ? styles.alertButtonTextOutline : styles.alertButtonTextSolid]}>
                    {btn.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const AddMenuPage = () => {
  const { t } = useLanguage();
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [menuName, setMenuName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [customAlert, setCustomAlert] = useState({ visible: false, title: '', message: '', buttons: [], type: 'info' });
  const router = useRouter();

  const showAlert = (title, message, buttons = [{ text: 'OK' }], type = 'info') => {
    setCustomAlert({ visible: true, title, message, buttons, type });
  };
  const closeAlert = () => setCustomAlert((prev) => ({ ...prev, visible: false }));

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true);
      const token = await AsyncStorage.getItem('sellerToken');
      if (!token) {
        showAlert(t('common.error'), t('addMenu.alerts.noToken'), [{ text: t('common.ok') }], 'error');
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
      showAlert(t('common.error'), t('addMenu.alerts.fetchCategoriesFailed'), [{ text: t('common.ok') }], 'error');
    } finally {
      setCategoriesLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      // Request permission
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permissionResult.granted === false) {
        showAlert(t('common.warning'), t('addMenu.alerts.permissionRequired'), [{ text: t('common.ok') }], 'warning');
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
        // Resize to a sane max width for a menu photo (1080px is plenty —
        // this is what actually controls file size, not the quality param
        // above, which only affects compression artifacts at whatever
        // resolution the photo already is).
        const manipulated = await ImageManipulator.manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width: 1080, height: 1080 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );

        // Heads-up for the rare case a photo is still large after resize
        // (e.g. an extremely detailed/large source image) — Vercel's
        // request body limit is ~4.5MB, so warn before it silently fails.
        if (manipulated.uri) {
          const fileInfo = await fetch(manipulated.uri);
          const blob = await fileInfo.blob();
          if (blob.size > 4 * 1024 * 1024) {
            showAlert(
              t('common.warning'),
              'Foto ini masih terlalu besar. Coba pilih foto lain atau ambil ulang dengan size yang lebih kecil.',
              [{ text: t('common.ok') }],
              'warning'
            );
            return;
          }
        }

        setImage(manipulated.uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      showAlert(t('common.error'), t('addMenu.alerts.pickImageFailed'), [{ text: t('common.ok') }], 'error');
    }
  };

  const handleAddMenu = async () => {
    // Validation
    if (!menuName.trim()) {
      showAlert(t('common.error'), t('addMenu.alerts.validation.name'), [{ text: t('common.ok') }], 'error');
      return;
    }
    if (!description.trim()) {
      showAlert(t('common.error'), t('addMenu.alerts.validation.description'), [{ text: t('common.ok') }], 'error');
      return;
    }
    if (!price.trim() || isNaN(Number(price)) || Number(price) <= 0) {
      showAlert(t('common.error'), t('addMenu.alerts.validation.price'), [{ text: t('common.ok') }], 'error');
      return;
    }
    if (!selectedCategory) {
      showAlert(t('common.error'), t('addMenu.alerts.validation.category'), [{ text: t('common.ok') }], 'error');
      return;
    }

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('sellerToken');
      if (!token) {
        showAlert(t('common.error'), t('addMenu.alerts.noToken'), [{ text: t('common.ok') }], 'error');
        return;
      }

      const formData = new FormData();
      formData.append('name', menuName.trim());
      formData.append('description', description.trim());
      formData.append('price', Number(price));
      formData.append('category_id', selectedCategory.id);

      if (image) {
        if (Platform.OS === 'web') {
          const imgResponse = await fetch(image);
          const blob = await imgResponse.blob();
          formData.append('image', blob, 'menu-image.jpg');
        } else {
          formData.append('image', { uri: image, type: 'image/jpeg', name: 'menu-image.jpg' });
        }
      }

      const response = await fetch(`${config.API_URL}/seller/menu`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to add menu');
      }

      showAlert(
        t('common.success'),
        t('addMenu.alerts.addSuccess'),
        [
          {
            text: t('common.ok'),
            onPress: () => router.back(),
          }
        ],
        'success'
      );

      // Reset form
      setMenuName('');
      setDescription('');
      setPrice('');
      setImage(null);

    } catch (error) {
      console.error('Error adding menu:', error);
      showAlert(t('common.error'), error.message || t('addMenu.alerts.addFailed'), [{ text: t('common.ok') }], 'error');
    } finally {
      setLoading(false);
    }
  };

  const CategorySelector = () => (
    <View style={styles.categorySection}>
      <Text style={styles.label}>{t('addMenu.category.label')}</Text>
      {categoriesLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={COLORS.PRIMARY} />
          <Text style={styles.loadingText}>{t('addMenu.category.loading')}</Text>
        </View>
      ) : categories.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{t('addMenu.category.empty')}</Text>
          <TouchableOpacity
            style={styles.createCategoryButton}
            onPress={() => {
              showAlert(t('common.info'), t('addMenu.category.emptyInfo'), [{ text: t('common.ok') }], 'info');
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.createCategoryText}>{t('addMenu.category.createButton')}</Text>
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
              activeOpacity={0.85}
            >
              <Text style={[
                styles.categoryText,
                selectedCategory?.id === category.id && styles.categoryTextSelected
              ]}>
                {category.name}
              </Text>
              <Text style={[
                styles.categoryCount,
                selectedCategory?.id === category.id && styles.categoryCountSelected
              ]}>
                {t('addMenu.category.itemCount', { count: category.items?.length ?? 0 })}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header selaras dengan halaman lain */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel={t('addMenu.accessibility.back')}>
          <MaterialIcons name="chevron-left" size={26} color={COLORS.PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('addMenu.header.title')}</Text>
        <View style={{ width: 26 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Category Selection */}
          <CategorySelector />

          {/* Menu Photo */}
          <View style={styles.section}>
            <Text style={styles.label}>{t('addMenu.photo.label')}</Text>
            <TouchableOpacity style={styles.imageContainer} onPress={pickImage} activeOpacity={0.8}>
              {image ? (
                <Image source={{ uri: image }} style={styles.menuImage} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <MaterialIcons name="add-a-photo" size={40} color="#ccc" />
                  <Text style={styles.imagePlaceholderText}>{t('addMenu.photo.placeholder')}</Text>
                </View>
              )}
            </TouchableOpacity>
            {image && (
              <TouchableOpacity style={styles.changeImageButton} onPress={pickImage}>
                <MaterialIcons name="edit" size={15} color={COLORS.PRIMARY} />
                <Text style={styles.changeImageText}>{t('addMenu.photo.changeButton')}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Menu Name */}
          <View style={styles.section}>
            <Text style={styles.label}>{t('addMenu.fields.name.label')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('addMenu.fields.name.placeholder')}
              placeholderTextColor="#aaa"
              value={menuName}
              onChangeText={setMenuName}
              maxLength={50}
            />
            <Text style={styles.charCount}>{menuName.length}/50</Text>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.label}>{t('addMenu.fields.description.label')}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder={t('addMenu.fields.description.placeholder')}
              placeholderTextColor="#aaa"
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
            <Text style={styles.label}>{t('addMenu.fields.price.label')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('addMenu.fields.price.placeholder')}
              placeholderTextColor="#aaa"
              value={price}
              onChangeText={setPrice}
              keyboardType="numeric"
              maxLength={10}
            />
            {price && !isNaN(Number(price)) && Number(price) > 0 && (
              <Text style={styles.pricePreview}>
                {t('addMenu.pricePreview', { price: Number(price).toLocaleString('id-ID') })}
              </Text>
            )}
          </View>

          {/* Tips Section */}
          <View style={styles.tipsSection}>
            <View style={styles.tipsHeader}>
              <MaterialIcons name="lightbulb" size={18} color="#B26A00" />
              <Text style={styles.tipsTitle}>{t('addMenu.tips.title')}</Text>
            </View>
            <Text style={styles.tipsText}>• {t('addMenu.tips.tip1')}</Text>
            <Text style={styles.tipsText}>• {t('addMenu.tips.tip2')}</Text>
            <Text style={styles.tipsText}>• {t('addMenu.tips.tip3')}</Text>
            <Text style={styles.tipsText}>• {t('addMenu.tips.tip4')}</Text>
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
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <MaterialIcons name="add" size={20} color="#fff" />
                <Text style={styles.submitButtonText}>{t('addMenu.submitButton')}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <CustomAlert
        visible={customAlert.visible}
        title={customAlert.title}
        message={customAlert.message}
        buttons={customAlert.buttons}
        type={customAlert.type}
        onClose={closeAlert}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backBtn: { width: 26 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.PRIMARY },

  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#23272f',
    marginBottom: 8,
  },
  categorySection: {
    marginBottom: 20,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  loadingText: {
    marginLeft: 8,
    color: '#888',
    fontSize: 13,
  },
  emptyContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: {
    color: '#888',
    fontSize: 13,
    marginBottom: 12,
  },
  createCategoryButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 20,
  },
  createCategoryText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  categoryScroll: {
    flexDirection: 'row',
  },
  categoryItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    minWidth: 100,
  },
  categoryItemSelected: {
    backgroundColor: COLORS.PRIMARY,
    borderColor: COLORS.PRIMARY,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#23272f',
    textAlign: 'center',
  },
  categoryTextSelected: {
    color: '#fff',
  },
  categoryCount: {
    fontSize: 11,
    color: '#888',
    textAlign: 'center',
    marginTop: 4,
  },
  categoryCountSelected: {
    color: 'rgba(255,255,255,0.85)',
  },
  imageContainer: {
    width: '100%',
    height: 180,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e5e5e5',
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
    color: '#ccc',
    fontSize: 13,
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
    color: COLORS.PRIMARY,
    fontWeight: '700',
    fontSize: 13,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    color: '#23272f',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 11,
    color: '#aaa',
    textAlign: 'right',
    marginTop: 4,
  },
  pricePreview: {
    fontSize: 13,
    color: COLORS.PRIMARY,
    fontWeight: '700',
    marginTop: 6,
  },
  tipsSection: {
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  tipsTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#23272f',
  },
  tipsText: {
    fontSize: 12.5,
    color: '#888',
    marginBottom: 4,
    lineHeight: 18,
  },
  bottomSpace: {
    height: 20,
  },
  submitContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  submitButton: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 30,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.PRIMARY,
    opacity: 0.45,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
    letterSpacing: 0.3,
  },

  alertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  alertContent: {
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 22,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  alertIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#23272f',
    textAlign: 'center',
    marginBottom: 6,
  },
  alertMessage: {
    fontSize: 13.5,
    color: '#777',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  alertButtons: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  alertButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 30,
    alignItems: 'center',
  },
  alertButtonSolid: {
    backgroundColor: COLORS.PRIMARY,
  },
  alertButtonOutline: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e5e5e5',
  },
  alertButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  alertButtonTextSolid: {
    color: '#fff',
  },
  alertButtonTextOutline: {
    color: '#777',
  },
});

export default AddMenuPage;