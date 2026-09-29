import { Stack, useRouter } from "expo-router";
import { ToastProvider } from '../components/ToastProvider';
import ErrorBoundary from '../components/ErrorBoundary';
import { notificationService } from './services/NotificationService';
import { useEffect, useState } from 'react';
import { AppState, StatusBar, Platform, Dimensions, Modal, Text, View, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import AnimatedSplash from '../components/AnimatedSplash';
import { LanguageProvider } from './contexts/LanguageContext';
import { getBuyerNotificationRoute, getSellerNotificationRoute } from './utils/notificationRouting';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';
import config from './constants/config';
import COLORS from './constants/color';

const compareVersions = (a, b) => {
  const pa = String(a).split('.').map(Number);
  const pb = String(b).split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na !== nb) return na - nb;
  }
  return 0;
};

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
  const [appIsReady, setAppIsReady] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [appState, setAppState] = useState(AppState.currentState);
    const [updateInfo, setUpdateInfo] = useState(null); // { latestVersion, storeUrl } or null

  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Configure system UI and window properties
  useEffect(() => {
    const configureWindow = async () => {
      try {
        if (Platform.OS === 'android') {
          // Set system UI colors for Android
          await SystemUI.setBackgroundColorAsync('#ffffff');
        }
        
        // Configure status bar for iOS
        if (Platform.OS === 'ios') {
          await SystemUI.setBackgroundColorAsync('#ffffff');
        }
        
      } catch (error) {
        console.warn('Failed to configure window properties:', error);
      }
    };

    configureWindow();
  }, []);

  // Handle window dimension changes for responsive design
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window, screen }) => {
      // Window dimensions changed - could be used for responsive design
    });
    
    return () => subscription?.remove();
  }, []);

  // Initialize app services
  useEffect(() => {
    async function initializeApp() {
      try {
        // Initialize services directly without AppConfigManager

        // Initialize notification service
        await notificationService.initialize();
        await notificationService.setupNotificationCategories();

        setAppIsReady(true);
      } catch (error) {
        console.error('❌ Error initializing app services:', error);
        // Still mark app as ready to prevent infinite loading
        setAppIsReady(true);
      }
    }

    if (loaded) {
      initializeApp();
    }
  }, [loaded]);

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        // Clear notification badge
        notificationService.clearBadge();
      }
      
      setAppState(nextAppState);
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [appState]);

  // Setup notification listeners
  useEffect(() => {
    const handleNotificationReceived = (notification) => {
      // Notification arrived while app was foregrounded — the OS handler
      // (shouldShowAlert/shouldPlaySound above) already surfaces it.
    };

    const handleNotificationTapped = (response) => {
      const data = notificationService.handleNotificationAction(response);
      if (!data) return;

      const isSellerNotification = data.recipientRole
        ? data.recipientRole === 'seller'
        : !!data.buyerId;

      const route = isSellerNotification
        ? getSellerNotificationRoute(data)
        : getBuyerNotificationRoute(data);
      if (route) router.push(route);
    };

    const subscriptions = notificationService.setupListeners(
      handleNotificationReceived,
      handleNotificationTapped
    );

    return () => {
      notificationService.removeListeners(subscriptions);
    };
  }, []);

  // Hide splash screen when app is ready
  useEffect(() => {
    if (appIsReady) {
      SplashScreen.hideAsync();
    }
  }, [appIsReady]);

    // Check for app updates once the app is ready. Soft, dismissible nudge only
  // — never blocks usage, and never throws if the check fails.
  useEffect(() => {
    if (!appIsReady) return;

    const checkForUpdate = async () => {
      try {
        const currentVersion = Constants.expoConfig?.version || '0.0.0';
        const res = await axios.get(`${config.API_URL}/app-version`, { timeout: 5000 });
        if (!res.data?.success) return;

        const { latestVersion, storeUrl } = res.data;
        if (!latestVersion || compareVersions(currentVersion, latestVersion) >= 0) return;

        // Don't nag again after it's been dismissed for this version —
        // only re-prompt once a newer version ships.
        const dismissedVersion = await AsyncStorage.getItem('dismissedUpdateVersion');
        if (dismissedVersion === latestVersion) return;

        setUpdateInfo({ latestVersion, storeUrl });
      } catch (error) {
        // Network hiccup or endpoint down — fail silently, never disrupt the app.
      }
    };

    checkForUpdate();
  }, [appIsReady]);

  const dismissUpdateModal = async () => {
    if (updateInfo?.latestVersion) {
      await AsyncStorage.setItem('dismissedUpdateVersion', updateInfo.latestVersion).catch(() => {});
    }
    setUpdateInfo(null);
  };

  const handleUpdatePress = () => {
    const url = Platform.OS === 'ios' ? updateInfo?.storeUrl?.ios : updateInfo?.storeUrl?.android;
    if (url) Linking.openURL(url).catch(() => {});
    dismissUpdateModal();
  };

  if (!appIsReady || showSplash) {
  return (
    <AnimatedSplash
      onFinish={() => setShowSplash(false)}
    />
  );
}

  return (
    <LanguageProvider>
      <ErrorBoundary>
        <ToastProvider>
          <ExpoStatusBar style="dark" backgroundColor="#ffffff" />
                    <Modal visible={!!updateInfo} transparent animationType="fade" onRequestClose={dismissUpdateModal}>
            <View style={styles.updateOverlay}>
              <View style={styles.updateContent}>
                <View style={styles.updateIconCircle}>
                  <MaterialIcons name="system-update" size={26} color={COLORS.PRIMARY} />
                </View>
                <Text style={styles.updateTitle}>Update Tersedia</Text>
                <Text style={styles.updateMessage}>
                  Versi baru Bite&Co (v{updateInfo?.latestVersion}) sudah tersedia. Update sekarang untuk mendapatkan fitur dan perbaikan terbaru.
                </Text>
                <View style={styles.updateButtons}>
                  <TouchableOpacity style={[styles.updateButton, styles.updateButtonOutline]} onPress={dismissUpdateModal}>
                    <Text style={[styles.updateButtonText, styles.updateButtonTextOutline]}>Nanti</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.updateButton, styles.updateButtonSolid]} onPress={handleUpdatePress}>
                    <Text style={[styles.updateButtonText, styles.updateButtonTextSolid]}>Update Sekarang</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'slide_from_right',
              gestureEnabled: true,
              gestureDirection: 'horizontal',
              contentStyle: { backgroundColor: '#ffffff' },
              ...(Platform.OS === 'android' && {
                statusBarStyle: 'dark',
                statusBarBackgroundColor: '#ffffff',
              }),
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="started" options={{ headerShown: false }} />
            
            {/* Seller Routes */}
            <Stack.Screen name="seller/SellerIndex" options={{ headerShown: false }} />
            <Stack.Screen name="seller/DetailUsaha" options={{ headerShown: false }} />
            <Stack.Screen name="seller/(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="seller/pelanggan" options={{ headerShown: false }} />
            <Stack.Screen name="seller/pelangganDetails" options={{ headerShown: false }} />
            <Stack.Screen name="seller/notifikasi" options={{ headerShown: false }} />
            <Stack.Screen name="seller/menu" options={{ headerShown: false }} />
            <Stack.Screen name="seller/menu/add" options={{ headerShown: false }} />
            <Stack.Screen name="seller/daftarmenu" options={{ headerShown: false }} />
            <Stack.Screen name="seller/Laporan" options={{ headerShown: false }} />
            <Stack.Screen name="seller/riwayat" options={{ headerShown: false }} />
            <Stack.Screen name="seller/gizipro" options={{ headerShown: false }} />
            
            {/* Bite Eco Routes */}
            <Stack.Screen name="seller/biteeco" options={{ headerShown: false }} />
            <Stack.Screen name="seller/biteeco/management" options={{ headerShown: false }} />
            <Stack.Screen name="seller/biteeco/add" options={{ headerShown: false }} />
            <Stack.Screen name="seller/biteeco/edit" options={{ headerShown: false }} />
            
            <Stack.Screen name="seller/ulasan" options={{ headerShown: false }} />
            <Stack.Screen name="seller/bantuan" options={{ headerShown: false }} />
            <Stack.Screen name="seller/settings" options={{ headerShown: false }} />
            <Stack.Screen name="seller/JadwalPengantaran" options={{ headerShown: false }} />
            <Stack.Screen name="seller/DetailPengantaran" options={{ headerShown: false }} />
            <Stack.Screen name="seller/DetailOrder" options={{ headerShown: false }} />
            <Stack.Screen name="seller/Pengantaran" options={{ headerShown: false }} />
            
            {/* Buyer Routes */}
            <Stack.Screen name="buyer/BuyerIndex" options={{ headerShown: false }} />
            <Stack.Screen name="buyer/notifikasi" options={{ headerShown: false }} />
            <Stack.Screen name="buyer/BuyerRegister" options={{ headerShown: false }} />
            <Stack.Screen name="buyer/BuyerOTPVerification" options={{ headerShown: false }} />
            <Stack.Screen name="buyer/(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="buyer/CateringList" options={{ headerShown: false }} />
            <Stack.Screen name="buyer/StatusOrder" options={{ headerShown: false }} />
            <Stack.Screen name="buyer/DetailOrder" options={{ headerShown: false }} />
            <Stack.Screen name="buyer/CateringDetail" options={{ headerShown: false }} />
            <Stack.Screen name="buyer/Pembayaran" options={{ headerShown: false }} />
            <Stack.Screen name="buyer/RiwayatDetail" options={{ headerShown: false }} />
            <Stack.Screen name="buyer/ChatRoom" options={{ headerShown: false }} />
            <Stack.Screen name="buyer/SearchScreen" options={{ headerShown: false }} />
            <Stack.Screen name="buyer/OrderTrackingScreen" options={{ headerShown: false }} />
            <Stack.Screen name="buyer/RantanganDetail" options={{ headerShown: false }} />
            <Stack.Screen name="buyer/GiziPro" options={{ headerShown: false }} />
            <Stack.Screen name="buyer/BiteEco" options={{ headerShown: false }} />
          </Stack>
        </ToastProvider>
      </ErrorBoundary>
    </LanguageProvider>
  );
}
const styles = StyleSheet.create({
  updateOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  updateContent: {
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 22,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  updateIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    backgroundColor: '#F7EAEF',
  },
  updateTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#23272f',
    textAlign: 'center',
    marginBottom: 6,
  },
  updateMessage: {
    fontSize: 13.5,
    color: '#777',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  updateButtons: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  updateButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 30,
    alignItems: 'center',
  },
  updateButtonSolid: {
    backgroundColor: COLORS.PRIMARY,
  },
  updateButtonOutline: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e5e5e5',
  },
  updateButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  updateButtonTextSolid: {
    color: '#fff',
  },
  updateButtonTextOutline: {
    color: '#777',
  },
});