import React from 'react';
import { Modal, SafeAreaView, View, TouchableOpacity, Text, ActivityIndicator, Platform } from 'react-native';
import { WebView } from 'react-native-webview';

const PaymentWebViewModal = ({ visible, snapUrl, onClose }) => {
  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: '#4CAF50' }}>
          <TouchableOpacity onPress={onClose} style={{ padding: 10 }}>
            <Text style={{ color: 'white', fontWeight: 'bold' }}>Tutup</Text>
          </TouchableOpacity>
          <Text style={{ color: 'white', fontWeight: 'bold', flex: 1, textAlign: 'center' }}>Pembayaran</Text>
        </View>

        {Platform.OS === 'web' ? (
          // WebView has no web implementation, and even an <iframe> couldn't
          // replicate onNavigationStateChange here (cross-origin JS can't read
          // a Midtrans-hosted iframe's URL, and Snap pages likely block
          // framing outright anyway). So on web we open Snap in its own tab
          // and let the buyer confirm manually — the real status update still
          // comes from the Midtrans webhook on the backend either way.
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <Text style={{ fontSize: 15, textAlign: 'center', marginBottom: 20, color: '#333' }}>
              Halaman pembayaran dibuka di tab baru. Selesaikan pembayaran di
              sana, lalu kembali ke sini.
            </Text>
            <TouchableOpacity
              onPress={() => snapUrl && window.open(snapUrl, '_blank')}
              style={{ backgroundColor: '#4CAF50', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10, marginBottom: 12 }}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>Buka Halaman Pembayaran</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onClose}
              style={{ paddingVertical: 12, paddingHorizontal: 24 }}
            >
              <Text style={{ color: '#4CAF50', fontWeight: '700' }}>Saya Sudah Selesai Membayar</Text>
            </TouchableOpacity>
          </View>
        ) : snapUrl ? (
          <WebView
            source={{ uri: snapUrl }}
            style={{ flex: 1 }}
            javaScriptEnabled
            domStorageEnabled
            startInLoadingState
            renderLoading={() => <ActivityIndicator size="large" color="#4CAF50" style={{ marginTop: 20 }} />}
            onNavigationStateChange={(navState) => {
              const url = navState.url;
              if (
                url.includes('/payment-success') ||
                url.includes('/payment-error') ||
                url.includes('/payment-pending')
              ) {
                onClose();
              }
            }}
          />
        ) : (
          <ActivityIndicator size="large" color="#4CAF50" style={{ marginTop: 20 }} />
        )}
      </SafeAreaView>
    </Modal>
  );
};

export default PaymentWebViewModal;