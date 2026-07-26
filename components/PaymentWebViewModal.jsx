import React from 'react';
import { Modal, SafeAreaView, View, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
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
        {snapUrl ? (
          <WebView
            source={{ uri: snapUrl }}
            style={{ flex: 1 }}
            javaScriptEnabled
            domStorageEnabled
            startInLoadingState
            renderLoading={() => <ActivityIndicator size="large" color="#4CAF50" style={{ marginTop: 20 }} />}
            onNavigationStateChange={(navState) => {
              const url = navState.url;
              // FIX: sebelumnya deteksi pakai kata generik ('finish', 'success',
              // 'pending', 'status', 'complete') yang gampang ke-match URL
              // internal Midtrans/DANA di TENGAH proses pembayaran (misal saat
              // redirect ke app DANA), sehingga modal ini tertutup PREMATUR
              // sebelum pembayaran benar-benar selesai. Buyer jadi keluar dari
              // WebView di tengah jalan, dan link/sesi Midtrans yang tersisa
              // jadi rusak (countdown "Pay within" menampilkan angka ngaco
              // saat dibuka ulang).
              //
              // Sekarang cuma cocokkan ke path callback FINAL yang kita
              // definisikan sendiri di payment/route.js (finish/error/pending
              // -> /payment-success, /payment-error, /payment-pending). Cuma
              // URL itu yang menandakan buyer benar-benar sudah diarahkan
              // balik oleh Midtrans setelah proses pembayaran selesai.
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