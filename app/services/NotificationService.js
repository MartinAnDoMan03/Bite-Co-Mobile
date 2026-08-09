import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import config from '../constants/config';

let notificationAvailable = false;
let NotificationsModule = null;

// Check if notifications are available on this platform and device
let notificationsReadyPromise = Promise.resolve();

if (Platform.OS !== 'web' && Device.isDevice) {
  notificationAvailable = true;
  notificationsReadyPromise = import('expo-notifications').then(Notifications => {
    NotificationsModule = Notifications;
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    // Android requires an explicit notification channel or notifications
    // won't show a heads-up alert/sound on Android 8+.
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#711330',
      });
    }
  }).catch(error => {
    console.error('Error loading expo-notifications:', error);
    notificationAvailable = false;
  });
}

// Function to get expo push token
export const getExpoPushToken = async () => {
  await notificationsReadyPromise;
  if (!notificationAvailable || !NotificationsModule) return null;
  if (!Device.isDevice) {
    console.log('Must use physical device for push notifications');
    return null;
  }

  const { status: existingStatus } = await NotificationsModule.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await NotificationsModule.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Failed to get push token permission');
    return null;
  }

  try {
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ||
      Constants?.easConfig?.projectId;
    const token = (await NotificationsModule.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    )).data;
    await AsyncStorage.setItem('expoPushToken', token);
    return token;
  } catch (error) {
    console.error('Error getting Expo push token:', error);
    return null;
  }
};

// State management for the service
let pushToken = null;
let isInitialized = false;

// Initialize notifications
const initialize = async () => {
  try {
    await notificationsReadyPromise;
    isInitialized = true;
    console.log('NotificationService initialized', { notificationAvailable });
    return null;
  } catch (error) {
    console.error('Error initializing notification service:', error);
    return null;
  }
};

// function for registering push token
const registerPushToken = async (userType, userId, authToken, token = null) => {
  try {
    const expoPushToken = token || await getExpoPushToken();
    if (!expoPushToken) return false;

    pushToken = expoPushToken;

    const headers = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    const response = await fetch(`${config.API_URL}/${userType}/register-push-token`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ pushToken: expoPushToken, userId }),
    });

    if (!response.ok) {
      console.error('Failed to register push token, status:', response.status);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error registering push token:', error);
    return false;
  }
};

// function for setting up listeners
const setupListeners = (onNotificationReceived, onNotificationTapped) => {
  if (!notificationAvailable || !NotificationsModule) return null;

  const receivedSubscription = NotificationsModule.addNotificationReceivedListener((notification) => {
    onNotificationReceived?.(notification);
  });

  const responseSubscription = onNotificationTapped
    ? NotificationsModule.addNotificationResponseReceivedListener((response) => {
        onNotificationTapped?.(response);
      })
    : null;

  return { receivedSubscription, responseSubscription };
};

// function for removing listeners
const removeListeners = (subscriptions) => {
  if (!subscriptions) return;
  subscriptions.receivedSubscription?.remove?.();
  subscriptions.responseSubscription?.remove?.();
};

// function for scheduling local notification
const scheduleLocalNotification = async (notificationData) => {
  try {
    await notificationsReadyPromise;
    if (!notificationAvailable || !NotificationsModule) return null;

    const { title, body, data = {}, trigger = null } = notificationData;

    const id = await NotificationsModule.scheduleNotificationAsync({
      content: { title, body, data, sound: 'default' },
      trigger,
    });
    return id;
  } catch (error) {
    console.error('Error scheduling notification:', error);
    return null;
  }
};

// function for cancelling notification
const cancelNotification = async (notificationId) => {
  try {
    if (!notificationAvailable || !NotificationsModule) return false;
    await NotificationsModule.cancelScheduledNotificationAsync(notificationId);
    return true;
  } catch (error) {
    console.error('Error cancelling notification:', error);
    return false;
  }
};

// function for cancelling all notifications
const cancelAllNotifications = async () => {
  try {
    if (!notificationAvailable || !NotificationsModule) return false;
    await NotificationsModule.cancelAllScheduledNotificationsAsync();
    return true;
  } catch (error) {
    console.error('Error cancelling all notifications:', error);
    return false;
  }
};

// function for setting badge count
const setBadgeCount = async (count) => {
  try {
    if (!notificationAvailable || !NotificationsModule) return false;
    await NotificationsModule.setBadgeCountAsync(count);
    return true;
  } catch (error) {
    console.error('Error setting badge count:', error);
    return false;
  }
};

// function for clearing badge
const clearBadge = async () => {
  return await setBadgeCount(0);
};

// function for handling notification action (tap)
const handleNotificationAction = (response) => {
  try {
    const data = response?.notification?.request?.content?.data;
    return data || null;
  } catch (error) {
    console.error('Error handling notification action:', error);
    return null;
  }
};

// function for setting up notification categories
const setupNotificationCategories = async () => {
  try {
    await notificationsReadyPromise;
    if (!notificationAvailable || !NotificationsModule) return false;
    // No custom action categories yet — placeholder kept for future
    // order-action buttons (e.g. Accept / Reject directly from a notification).
    return true;
  } catch (error) {
    console.error('Error setting up notification categories:', error);
    return false;
  }
};

// function for getting notification settings
const getNotificationSettings = async () => {
  try {
    await notificationsReadyPromise;
    if (!notificationAvailable || !NotificationsModule) {
      return { granted: false, ios: null, android: null };
    }
    const settings = await NotificationsModule.getPermissionsAsync();
    return {
      granted: settings.status === 'granted',
      ios: settings.ios || null,
      android: settings.android || null,
    };
  } catch (error) {
    console.error('Error getting notification settings:', error);
    return null;
  }
};

// function for getting stored token
const getStoredToken = async () => {
  try {
    return await AsyncStorage.getItem('expoPushToken');
  } catch (error) {
    console.error('Error getting stored token:', error);
    return null;
  }
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
};

// Default export for backward compatibility
export default notificationService;