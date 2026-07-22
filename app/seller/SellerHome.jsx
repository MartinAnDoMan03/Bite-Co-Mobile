import { StyleSheet, Text, View } from 'react-native'
import React, { useEffect } from 'react'
import { setupListeners } from '../services/NotificationService';
import ExpendableMenu from './(tabs)/index';

const SellerHome = () => {
useEffect(() => {
  const subscription = setupListeners((notification) => {
    console.log('Notification receiverd:', notification);
  });
  
  return () => subscription.remove();
}, []);

return (
  <View style={styles.container}>
    {/* Tampilkan ExpendableMenu */}
    <ExpendableMenu/>
    </View>
);
}

export default SellerHome

const styles = StyleSheet.create({
  contaiuner: {
    flex: 1,
    backgroundColor: '#f8f9fa'
  }
});