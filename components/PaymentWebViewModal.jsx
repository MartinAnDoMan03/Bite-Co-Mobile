import React, { useState } from 'react';
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
              if (
                url.includes('finish') ||
                url.includes('success') ||
                url.includes('pending') ||
                url.includes('status') ||
                url.includes('complete')
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
