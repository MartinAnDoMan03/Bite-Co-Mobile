import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { setupListeners } from '../services/NotificationService'

userEffectt(() => {
  const subscription = setupListeners((notification) => {
    console.log('Notification receiverd:', notification);
  });
  
  return () => subscription.remove();
}, []);

const SellerHome = () => {
  return (
    <View>
      <Text>SellerHome</Text>
    </View>
  )
}

export default SellerHome

const styles = StyleSheet.create({})