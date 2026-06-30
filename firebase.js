// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { Platform } from 'react-native';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDnuqf_vlk9eit4bMUb6rw9ccYPlC01lVQ",
  authDomain: "biteandco-a2591.firebaseapp.com",
  projectId: "biteandco-a2591",
  storageBucket: "biteandco-a2591.appspot.com",
  messagingSenderId: "142048686691",
  appId: "1:142048686691:web:ba57a6565d6a24c0657e56",
  measurementId: "G-1TJQNK1ER8"
};

// Initialize Firebase App
export const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth for production
let auth = null;

// Check if we're in a development build or production build (not Expo Go)
const isNativeBuild = !__DEV__ || (typeof global !== 'undefined' && !global.__expo?.modules);

try {
  if (Platform.OS === 'web') {
    // Web implementation
    const { getAuth } = require("firebase/auth");
    auth = getAuth(app);
  } else if (isNativeBuild) {
    // Native app build (development build or production build)
    const ReactNativeAsyncStorage = require('@react-native-async-storage/async-storage').default;
    const { initializeAuth, getReactNativePersistence } = require("firebase/auth");
    
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(ReactNativeAsyncStorage)
    });
    
  } else {
    // Expo Go fallback - basic auth without persistence
    const { getAuth } = require("firebase/auth");
    auth = getAuth(app);
  }
} catch (error) {
  console.warn('Firebase Auth initialization warning:', error.message);
  auth = null;
}

// Export auth (will be null in Expo Go)
export { auth };

// Export a helper to check if Firebase Auth is available
export const isFirebaseAuthAvailable = () => auth !== null;