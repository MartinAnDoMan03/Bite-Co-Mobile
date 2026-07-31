import React, { useState } from 'react';
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

// Value yang dikirim ke backend TETAP bahasa Indonesia (jangan diubah),
// biar data condition di server konsisten apapun bahasa UI yang aktif.
// labelKey dipakai buat nampilin teks yang sudah diterjemahkan ke user.
const CONDITION_OPTIONS = [
  { value: 'Sangat Baik', labelKey: 'veryGood' },
  { value: 'Baik', labelKey: 'good' },
  { value: 'Cukup Baik', labelKey: 'fair' },
  { value: 'Perlu Pengolahan Segera', labelKey: 'needsUrgentProcessing' },
];

const AddBiteEcoItem = () => {
  const { t } = useLanguage();
  const [title, setTitle] = useState('');
  const [quantity, setQuantity] = useState('');
  const [condition, setCondition] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [customAlert, setCustomAlert] = useState({ visible: false, title: '', message: '', buttons: [], type: 'info' });
  const router = useRouter();

  const showAlert = (title, message, buttons = [{ text: t('common.ok') }], type = 'info') => {
    setCustomAlert({ visible: true, title, message, buttons, type });
  };
  const closeAlert = () => setCustomAlert((prev) => ({ ...prev, visible: false }));

  const pickImage = async () => {
    try {
      // Request permission
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permissionResult.granted === false) {
        showAlert(t('addBiteEcoItem.alerts.permissionRequired.title'), t('addBiteEcoItem.alerts.permissionRequired.message'), [{ text: t('common.ok') }], 'warning');
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
      showAlert(t('common.error'), t('addBiteEcoItem.alerts.pickImageFailed'), [{ text: t('common.ok') }], 'error');
    }
  };

  const handleAddItem = async () => {
    // Validation
    if (!title.trim()) {
      showAlert(t('common.error'), t('addBiteEcoItem.alerts.validation.title'), [{ text: t('common.ok') }], 'error');
      return;
    }
    if (!quantity.trim()) {
      showAlert(t('common.error'), t('addBiteEcoItem.alerts.validation.quantity'), [{ text: t('common.ok') }], 'error');
      return;
    }
    if (!condition) {
      showAlert(t('common.error'), t('addBiteEcoItem.alerts.validation.condition'), [{ text: t('common.ok') }], 'error');
      return;
    }
    if (!description.trim()) {
      showAlert(t('common.error'), t('addBiteEcoItem.alerts.validation.description'), [{ text: t('common.ok') }], 'error');
      return;
    }
    if (!image) {
      showAlert(t('common.error'), t('addBiteEcoItem.alerts.validation.image'), [{ text: t('common.ok') }], 'error');
      return;
    }

    setLoading(true);

    try {
      const token = await AsyncStorage.getItem('sellerToken');
      if (!token) {
        showAlert(t('common.error'), t('addBiteEcoItem.alerts.noToken'), [{ text: t('common.ok') }], 'error');
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
        if (Platform.OS === 'web') {
          const imgResponse = await fetch(image);
          const blob = await imgResponse.blob();
          formData.append('image', blob, 'waste_item.jpg');
        } else {
          const imageUri = Platform.OS === 'ios' ? image.replace('file://', '') : image;
          formData.append('image', { uri: imageUri, type: 'image/jpeg', name: 'waste_item.jpg' });
        }
      }

      const response = await fetch(`${config.API_URL}/seller/bite-eco`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to add waste item');
      }

      showAlert(
        t('addBiteEcoItem.alerts.success.title'),
        t('addBiteEcoItem.alerts.success.message'),
        [
          {
            text: t('common.ok'),
            onPress: () => router.back(),
          },
        ],
        'success'
      );
    } catch (error) {
      console.error('Error adding waste item:', error);
      showAlert(t('common.error'), error.message || t('addBiteEcoItem.alerts.addFailed'), [{ text: t('common.ok') }], 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header selaras dengan halaman lain */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel={t('addBiteEcoItem.accessibility.back')}>
          <MaterialIcons name="chevron-left" size={26} color={COLORS.PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('addBiteEcoItem.header.title')}</Text>
        <View style={{ width: 26 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            {/* Header Info */}
            <View style={[styles.introCard, styles.shadow]}>
              <View style={styles.introIconBox}>
                <MaterialIcons name="eco" size={24} color={COLORS.GREEN4} />
              </View>
              <View style={styles.headerText}>
                <Text style={styles.introTitle}>{t('addBiteEcoItem.intro.title')}</Text>
                <Text style={styles.introSubtitle}>
                  {t('addBiteEcoItem.intro.subtitle')}
                </Text>
              </View>
            </View>

            {/* Image Upload */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('addBiteEcoItem.fields.photo.label')}</Text>
              <TouchableOpacity style={styles.imageUploadContainer} onPress={pickImage} activeOpacity={0.8}>
                {image ? (
                  <Image source={{ uri: image }} style={styles.uploadedImage} />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <MaterialIcons name="add-a-photo" size={32} color="#ccc" />
                    <Text style={styles.imagePlaceholderText}>{t('addBiteEcoItem.fields.photo.placeholder')}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Title */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('addBiteEcoItem.fields.title.label')}</Text>
              <TextInput
                style={styles.textInput}
                placeholder={t('addBiteEcoItem.fields.title.placeholder')}
                placeholderTextColor="#aaa"
                value={title}
                onChangeText={setTitle}
                maxLength={100}
              />
              <Text style={styles.charCount}>{title.length}/100</Text>
            </View>

            {/* Quantity */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('addBiteEcoItem.fields.quantity.label')}</Text>
              <TextInput
                style={styles.textInput}
                placeholder={t('addBiteEcoItem.fields.quantity.placeholder')}
                placeholderTextColor="#aaa"
                value={quantity}
                onChangeText={setQuantity}
                maxLength={50}
              />
              <Text style={styles.charCount}>{quantity.length}/50</Text>
            </View>

            {/* Condition */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('addBiteEcoItem.fields.condition.label')}</Text>
              <View style={styles.conditionOptions}>
                {CONDITION_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.conditionOption,
                      condition === option.value && styles.selectedCondition
                    ]}
                    onPress={() => setCondition(option.value)}
                  >
                    <Text style={[
                      styles.conditionText,
                      condition === option.value && styles.selectedConditionText
                    ]}>
                      {t(`addBiteEcoItem.conditionOptions.${option.labelKey}`)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Description */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('addBiteEcoItem.fields.description.label')}</Text>
              <TextInput
                style={[styles.textInput, styles.descriptionInput]}
                placeholder={t('addBiteEcoItem.fields.description.placeholder')}
                placeholderTextColor="#aaa"
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
              <MaterialIcons name="info" size={18} color={COLORS.PRIMARY} />
              <Text style={styles.infoText}>
                {t('addBiteEcoItem.infoText')}
              </Text>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.disabledButton]}
              onPress={handleAddItem}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>{t('addBiteEcoItem.submitButton')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
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
  // Header
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

  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
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
  introCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 14,
    marginBottom: 18,
    gap: 12,
  },
  introIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#E9F5EA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
  },
  introTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#23272f',
    marginBottom: 3,
  },
  introSubtitle: {
    fontSize: 12,
    color: '#888',
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#23272f',
    marginBottom: 8,
  },
  imageUploadContainer: {
    height: 180,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e5e5e5',
    borderStyle: 'dashed',
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderText: {
    fontSize: 13,
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
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    marginBottom: 4,
    color: '#23272f',
  },
  charCount: {
    fontSize: 11,
    color: '#aaa',
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
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  selectedCondition: {
    backgroundColor: COLORS.GREEN4,
    borderColor: COLORS.GREEN4,
  },
  conditionText: {
    fontSize: 12.5,
    color: '#777',
  },
  selectedConditionText: {
    color: '#fff',
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F7EAEF',
    padding: 12,
    borderRadius: 10,
    marginBottom: 22,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12.5,
    color: '#666',
    lineHeight: 18,
  },
  submitButton: {
    backgroundColor: COLORS.GREEN4,
    paddingVertical: 15,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },

  // CustomAlert
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

export default AddBiteEcoItem;