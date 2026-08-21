import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import config from './constants/config';
import COLORS from './constants/color';

export default function Index() {
  const [checking, setChecking] = useState(true);
  const [destination, setDestination] = useState('/started');

  useEffect(() => {
    const checkSession = async () => {
      try {
        const buyerToken = await AsyncStorage.getItem('buyerToken');
        if (buyerToken) {
          const res = await fetch(`${config.API_URL}/buyer/profile`, {
            headers: { Authorization: `Bearer ${buyerToken}` },
          });
          if (res.ok) {
            setDestination('/buyer/(tabs)');
            return;
          }
          await AsyncStorage.removeItem('buyerToken');
        }

        const sellerToken = await AsyncStorage.getItem('sellerToken');
        if (sellerToken) {
          const res = await fetch(`${config.API_URL}/seller/profile`, {
            headers: { Authorization: `Bearer ${sellerToken}` },
          });
          if (res.ok) {
            setDestination('/seller/(tabs)');
            return;
          }
          await AsyncStorage.removeItem('sellerToken');
        }

        setDestination('/started');
      } catch (error) {
        console.error('Session check error:', error);
        setDestination('/started');
      } finally {
        setChecking(false);
      }
    };

    checkSession();
  }, []);

  if (checking) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.PRIMARY, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return <Redirect href={destination} />;
}