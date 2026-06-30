import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import config from '../constants/config';

export const useBuyerAuth = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [buyerToken, setBuyerToken] = useState(null);
  const [buyerProfile, setBuyerProfile] = useState(null);
  const router = useRouter();

  // Check if user is logged in
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('buyerToken');
      if (token) {
        setBuyerToken(token);
        await fetchBuyerProfile(token);
      }
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBuyerProfile = async (token) => {
    try {
      const response = await fetch(`${config.API_URL}/buyer/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message);
      }

      setBuyerProfile(result.profile);
    } catch (error) {
      console.error('Fetch profile error:', error);
      await logout();
    }
  };

  const login = async (token) => {
    try {
      await AsyncStorage.setItem('buyerToken', token);
      setBuyerToken(token);
      await fetchBuyerProfile(token);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('buyerToken');
      setBuyerToken(null);
      setBuyerProfile(null);
      router.replace('/buyer/BuyerIndex');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const updateProfile = async (updates) => {
    try {
      const response = await fetch(`${config.API_URL}/buyer/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${buyerToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message);
      }

      // Refresh profile after update
      await fetchBuyerProfile(buyerToken);
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  };

  return {
    isLoading,
    isAuthenticated: !!buyerToken,
    buyerProfile,
    login,
    logout,
    updateProfile,
    checkAuth,
  };
};

export default useBuyerAuth;
