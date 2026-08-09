import { Stack, useRouter } from "expo-router";
import { ToastProvider } from '../components/ToastProvider';
import ErrorBoundary from '../components/ErrorBoundary';
import { notificationService } from './services/NotificationService';
import { useEffect, useState } from 'react';
import { AppState, StatusBar, Platform, Dimensions } from 'react-native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import AnimatedSplash from '../components/AnimatedSplash';
import { LanguageProvider } from './contexts/LanguageContext';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
  const [appIsReady, setAppIsReady] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [appState, setAppState] = useState(AppState.currentState);

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
      if (!data?.orderId) return;

      // Route to the right order screen depending on who's logged in.
      // Seller push payloads use { orderId }, buyer ones use
      // { orderId, type: 'order_status_update' }.
      if (data.type === 'order_status_update') {
        router.push(`/buyer/DetailOrder?orderId=${data.orderId}`);
      } else {
        router.push(`/seller/DetailOrder?orderId=${data.orderId}`);
      }
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
            <Stack.Screen name="buyer/Notifikasi" options={{ headerShown: false }} />
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