import React, { useState } from 'react';
import { Modal, View, Text, Image, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import config from '../app/constants/config';
import COLORS from '../app/constants/color';
import qrisImage from '../assets/images/qris-static.png'; // ganti sesuai path gambar QRIS kalian

const QRISPaymentModal = ({ visible, order, onClose, onUploadSuccess }) => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [uploading, setUploading] = useState(false);

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6,
      base64: true,
    });

    if (!result.canceled && result.assets?.[0]) {
      setSelectedImage(result.assets[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedImage) return;
    setUploading(true);
    try {
      const token = await AsyncStorage.getItem('buyerToken');
      await axios.post(
        `${config.API_URL}/buyer/orders/${order.id}/upload-proof`,
        { imageBase64: `data:image/jpeg;base64,${selectedImage.base64}` },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSelectedImage(null);
      onUploadSuccess();
      onClose();
    } catch (e) {
      console.error('Upload proof error:', e);
    } finally {
      setUploading(false);
    }
  };

  if (!order) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Pembayaran QRIS</Text>
          <TouchableOpacity onPress={onClose}>
            <MaterialIcons name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        <Text style={styles.amount}>Rp {order.totalAmount?.toLocaleString('id-ID')}</Text>
        <Text style={styles.subtitle}>Scan QRIS di bawah untuk membayar</Text>

        <Image source={qrisImage} style={styles.qrisImage} resizeMode="contain" />

        <View style={styles.instructionBox}>
          <Text style={styles.instructionText}>
            1. Screenshot atau simpan QRIS di atas{'\n'}
            2. Buka aplikasi e-wallet / m-banking{'\n'}
            3. Scan QRIS dan bayar sesuai nominal{'\n'}
            4. Upload bukti transfer di bawah ini
          </Text>
        </View>

        {selectedImage ? (
          <Image source={{ uri: selectedImage.uri }} style={styles.previewImage} resizeMode="contain" />
        ) : (
          <TouchableOpacity style={styles.pickButton} onPress={pickImage}>
            <MaterialIcons name="add-a-photo" size={22} color={COLORS.PRIMARY} />
            <Text style={styles.pickButtonText}>Pilih Bukti Transfer</Text>
          </TouchableOpacity>
        )}

        {selectedImage && (
          <TouchableOpacity style={styles.pickButton} onPress={pickImage}>
            <Text style={styles.pickButtonText}>Ganti Gambar</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.submitButton, (!selectedImage || uploading) && { opacity: 0.5 }]}
          onPress={handleUpload}
          disabled={!selectedImage || uploading}
        >
          {uploading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Kirim Bukti Pembayaran</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.PRIMARY },
  amount: { fontSize: 24, fontWeight: '700', color: '#23272f', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#888', textAlign: 'center', marginBottom: 20 },
  qrisImage: { width: '100%', height: 280, marginBottom: 20 },
  instructionBox: { backgroundColor: '#F7EAEF', borderRadius: 12, padding: 14, marginBottom: 20 },
  instructionText: { fontSize: 13, color: '#555', lineHeight: 20 },
  pickButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderColor: COLORS.PRIMARY, borderStyle: 'dashed',
    borderRadius: 12, paddingVertical: 14, marginBottom: 12,
  },
  pickButtonText: { color: COLORS.PRIMARY, fontWeight: '600', fontSize: 14 },
  previewImage: { width: '100%', height: 220, borderRadius: 12, marginBottom: 12, backgroundColor: '#f5f5f5' },
  submitButton: { backgroundColor: COLORS.PRIMARY, borderRadius: 30, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
  submitButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

export default QRISPaymentModal;