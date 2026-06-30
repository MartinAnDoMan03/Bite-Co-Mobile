import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// State management for the service
let pushToken = null;
let isInitialized = false;

// Initialize notifications (simplified without expo-notifications)
const initialize = async () => {
  try {
    console.log('NotificationService initialized (expo-notifications removed)');
    isInitialized = true;
    return null; // No token since we removed expo-notifications
  } catch (error) {
    console.error('Error initializing notification service:', error);
    return null;
  }
};

// Mock function for registering push token
const registerPushToken = async (userType, userId, token = null) => {
  try {
    console.log('Push token registration disabled (expo-notifications removed)');
    return true;
  } catch (error) {
    console.error('Error registering push token:', error);
    return false;
  }
};

// Mock function for setting up listeners
const setupListeners = (onNotificationReceived, onNotificationTapped) => {
  console.log('Notification listeners disabled (expo-notifications removed)');
};

// Mock function for removing listeners
const removeListeners = () => {
  console.log('Notification listeners cleanup disabled (expo-notifications removed)');
};

// Mock function for scheduling local notification
const scheduleLocalNotification = async (notificationData) => {
  try {
    console.log('Local notification scheduling disabled (expo-notifications removed)');
    return null;
  } catch (error) {
    console.error('Error scheduling notification:', error);
    return null;
  }
};

// Mock function for cancelling notification
const cancelNotification = async (notificationId) => {
  try {
    console.log('Notification cancellation disabled (expo-notifications removed)');
    return true;
  } catch (error) {
    console.error('Error cancelling notification:', error);
    return false;
  }
};

// Mock function for cancelling all notifications
const cancelAllNotifications = async () => {
  try {
    console.log('Cancel all notifications disabled (expo-notifications removed)');
    return true;
  } catch (error) {
    console.error('Error cancelling all notifications:', error);
    return false;
  }
};

// Mock function for setting badge count
const setBadgeCount = async (count) => {
  try {
    console.log('Badge count setting disabled (expo-notifications removed)');
    return true;
  } catch (error) {
    console.error('Error setting badge count:', error);
    return false;
  }
};

// Mock function for clearing badge
const clearBadge = async () => {
  return await setBadgeCount(0);
};

// Mock function for handling notification action
const handleNotificationAction = (notification) => {
  try {
    console.log('Notification action handling disabled (expo-notifications removed)');
    return null;
  } catch (error) {
    console.error('Error handling notification action:', error);
    return null;
  }
};

// Mock function for setting up notification categories
const setupNotificationCategories = async () => {
  try {
    console.log('Notification categories setup disabled (expo-notifications removed)');
    return true;
  } catch (error) {
    console.error('Error setting up notification categories:', error);
    return false;
  }
};

// Mock function for getting notification settings
const getNotificationSettings = async () => {
  try {
    console.log('Notification settings disabled (expo-notifications removed)');
    return {
      granted: false,
      ios: null,
      android: null,
    };
  } catch (error) {
    console.error('Error getting notification settings:', error);
    return null;
  }
};

// Mock function for getting stored token
const getStoredToken = async () => {
  try {
    return await AsyncStorage.getItem('expoPushToken');
  } catch (error) {
    console.error('Error getting stored token:', error);
    return null;
  }
};

// Mock function for getting expo push token
const getExpoPushToken = async () => {
  console.log('Expo push token disabled (expo-notifications removed)');
  return null;
};

// Export the service functions
export const notificationService = {
  initialize,
  registerPushToken,
  setupListeners,
  removeListeners,
  scheduleLocalNotification,
  cancelNotification,
  cancelAllNotifications,
  setBadgeCount,
  clearBadge,
  handleNotificationAction,
  setupNotificationCategories,
  getNotificationSettings,
  getStoredToken,
  getExpoPushToken,
  get expoPushToken() { return pushToken; }
};

// Individual exports for named imports
export {
  initialize,
  registerPushToken,
  setupListeners,
  removeListeners,
  scheduleLocalNotification,
  cancelNotification,
  cancelAllNotifications,
  setBadgeCount,
  clearBadge,
  handleNotificationAction,
  setupNotificationCategories,
  getNotificationSettings,
  getStoredToken,
  getExpoPushToken
};

// Default export for backward compatibility
export default notificationService;