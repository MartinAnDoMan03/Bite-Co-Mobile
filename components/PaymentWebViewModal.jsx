import React, { useState } from 'react';
import { Modal, SafeAreaView, View, TouchableOpacity, Text, ActivityIndicator, Platform, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { MaterialIcons } from '@expo/vector-icons';

const BURGUNDY = '#711330';

const STATUS_STYLES = {
  success: { icon: 'check-circle', color: '#2E7D32', bg: '#E8F5E9' },
  error: { icon: 'error', color: '#C62828', bg: '#FFEBEE' },
  pending: { icon: 'schedule', color: '#B26A00', bg: '#FFF3E0' },
};

// URL yang menandakan Snap sudah selesai (redirect ke finish_redirect_url),
// dicek dari path/query, BUKAN dibiarkan ke-render dulu di WebView
const matchResultType = (url) => {
  if (url.includes('/payment-success') || url.includes('transaction_status=settlement') || url.includes('transaction_status=capture')) {
    return 'success';
  }
  if (url.includes('/payment-error') || url.includes('transaction_status=deny') || url.includes('transaction_status=cancel') || url.includes('transaction_status=expire')) {
    return 'error';
  }
  if (url.includes('/payment-pending') || url.includes('transaction_status=pending')) {
    return 'pending';
  }
  return null;
};

const RESULT_COPY = {
  success: {
    title: 'Pembayaran Berhasil',
    message: 'Terima kasih! Pesananmu sedang diproses oleh penjual.',
    buttonText: 'Selesai',
  },
  error: {
    title: 'Pembayaran Gagal',
    message: 'Pembayaran tidak dapat diproses. Silakan coba lagi.',
    buttonText: 'Tutup',
  },
  pending: {
    title: 'Menunggu Pembayaran',
    message: 'Pembayaranmu masih diproses. Kami akan mengabari begitu selesai.',
    buttonText: 'Tutup',
  },
};

const ResultScreen = ({ type, onClose }) => {
  const style = STATUS_STYLES[type];
  const copy = RESULT_COPY[type];
  return (
    <View style={styles.resultContainer}>
      <View style={[styles.resultIconCircle, { backgroundColor: style.bg }]}>
        <MaterialIcons name={style.icon} size={40} color={style.color} />
      </View>
      <Text style={styles.resultTitle}>{copy.title}</Text>
      <Text style={styles.resultMessage}>{copy.message}</Text>
      <TouchableOpacity style={styles.primaryButton} onPress={onClose} activeOpacity={0.85}>
        <Text style={styles.primaryButtonText}>{copy.buttonText}</Text>
      </TouchableOpacity>
    </View>
  );
};

const PaymentWebViewModal = ({ visible, snapUrl, onClose, onPaymentResult }) => {
  const [resultType, setResultType] = useState(null); // null | 'success' | 'error' | 'pending'

  const handleClose = () => {
    setResultType(null);
    onClose();
  };

  const handleResultDetected = (type) => {
    setResultType(type);
    if (onPaymentResult) onPaymentResult(type);
  };

  // Native: cegat request SEBELUM WebView sempat load halaman finish_redirect
  // Midtrans (yang sering default ke example.com kalau belum di-custom di backend)
  const handleShouldStartLoad = (request) => {
    const type = matchResultType(request.url);
    if (type) {
      handleResultDetected(type);
      return false; // batalkan navigasi, jangan biarkan WebView render halaman itu
    }
    return true;
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.backBtn} accessibilityLabel="Tutup">
            <MaterialIcons name="close" size={24} color={BURGUNDY} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Pembayaran</Text>
          <View style={{ width: 24 }} />
        </View>

        {resultType ? (
          <ResultScreen type={resultType} onClose={handleClose} />
        ) : Platform.OS === 'web' ? (
          // WebView tidak punya implementasi di web, dan cross-origin iframe pun
          // tidak bisa dibaca URL-nya (dan Snap kemungkinan besar block framing).
          // Jadi di web, Snap dibuka di tab baru dan buyer konfirmasi manual --
          // status order sebenarnya tetap datang dari webhook Midtrans di backend.
          <View style={styles.webContainer}>
            <View style={styles.webIconCircle}>
              <MaterialIcons name="open-in-new" size={32} color={BURGUNDY} />
            </View>
            <Text style={styles.webText}>
              Halaman pembayaran akan dibuka di tab baru. Selesaikan pembayaran di sana, lalu kembali ke sini.
            </Text>
            <TouchableOpacity
              onPress={() => snapUrl && window.open(snapUrl, '_blank')}
              style={styles.primaryButton}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryButtonText}>Buka Halaman Pembayaran</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleClose} style={styles.secondaryButton} activeOpacity={0.85}>
              <Text style={styles.secondaryButtonText}>Saya Sudah Selesai Membayar</Text>
            </TouchableOpacity>
          </View>
        ) : snapUrl ? (
          <WebView
            source={{ uri: snapUrl }}
            style={{ flex: 1 }}
            javaScriptEnabled
            domStorageEnabled
            startInLoadingState
            renderLoading={() => (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color={BURGUNDY} />
              </View>
            )}
            onShouldStartLoadWithRequest={handleShouldStartLoad}
            onNavigationStateChange={(navState) => {
              // Jaring pengaman kalau onShouldStartLoadWithRequest tidak sempat
              // menangkap (mis. redirect lewat JS, bukan lewat request baru)
              const type = matchResultType(navState.url);
              if (type) handleResultDetected(type);
            }}
          />
        ) : (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={BURGUNDY} />
          </View>
        )}
      </SafeAreaView>
    </Modal>
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
  backBtn: { width: 24 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: BURGUNDY },

  loadingOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F6FA',
  },

  // Layar hasil (sukses/gagal/pending) -- native, dalam app, bukan halaman web asing
  resultContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  resultIconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  resultTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#23272f',
    marginBottom: 8,
    textAlign: 'center',
  },
  resultMessage: {
    fontSize: 13.5,
    color: '#777',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },

  // Layar khusus web (buka tab baru)
  webContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  webIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F7EAEF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  webText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    color: '#777',
    lineHeight: 20,
  },

  primaryButton: {
    backgroundColor: BURGUNDY,
    borderRadius: 30,
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 12,
    shadowColor: BURGUNDY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  secondaryButtonText: {
    color: BURGUNDY,
    fontWeight: '700',
    fontSize: 13.5,
  },
});

export default PaymentWebViewModal;