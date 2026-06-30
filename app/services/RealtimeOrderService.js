import { getFirestore, doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { app as firebaseApp } from '../../firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationService } from './NotificationService';

// Initialize Firebase Firestore
const db = getFirestore(firebaseApp);

// Module-level state
const listeners = new Map();
const orderStatusCache = new Map();

// Subscribe to real-time order updates
const subscribeToOrder = (orderId, callback) => {
  if (listeners.has(orderId)) {
    unsubscribeFromOrder(orderId);
  }

  const orderRef = doc(db, 'orders', orderId);
  
  const unsubscribe = onSnapshot(orderRef, (docSnapshot) => {
    if (docSnapshot.exists()) {
      const orderData = { id: docSnapshot.id, ...docSnapshot.data() };
      
      // Check if status changed to send local notification
      handleStatusChange(orderId, orderData);
      
      // Call the callback with updated data
      callback(orderData);
    } else {
      callback(null);
    }
  }, (error) => {
    console.error('Real-time order subscription error:', error);
    callback(null, error);
  });

  listeners.set(orderId, unsubscribe);
  return unsubscribe;
};

// Unsubscribe from order updates
const unsubscribeFromOrder = (orderId) => {
  const unsubscribe = listeners.get(orderId);
  if (unsubscribe) {
    unsubscribe();
    listeners.delete(orderId);
  }
};

// Subscribe to all user orders
const subscribeToUserOrders = async (callback) => {
  try {
    const token = await AsyncStorage.getItem('buyerToken');
    if (!token) return null;

    // Decode token to get user ID
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonPayload);
    const userId = payload.buyerId || payload.id;

    const { collection, query, where, orderBy, onSnapshot: fsOnSnapshot } = await import('firebase/firestore');
    
    const ordersRef = collection(db, 'orders');
    const q = query(
      ordersRef,
      where('buyerId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = fsOnSnapshot(q, (snapshot) => {
      const orders = [];
      snapshot.forEach((doc) => {
        const orderData = { id: doc.id, ...doc.data() };
        orders.push(orderData);
        
        // Handle individual order status changes
        handleStatusChange(doc.id, orderData);
      });
      callback(orders);
    }, (error) => {
      console.error('Real-time orders subscription error:', error);
      callback([], error);
    });

    return unsubscribe;
  } catch (error) {
    console.error('Error subscribing to user orders:', error);
    return null;
  }
};

// Handle status changes and send notifications
const handleStatusChange = (orderId, orderData) => {
  const cachedStatus = orderStatusCache.get(orderId);
  const currentStatus = orderData.statusProgress || orderData.status;

  if (cachedStatus && cachedStatus !== currentStatus) {
    // Status changed, send notification
    sendStatusChangeNotification(orderData, cachedStatus, currentStatus);
  }

  // Update cache
  orderStatusCache.set(orderId, currentStatus);
};

// Send status change notification
const sendStatusChangeNotification = async (orderData, oldStatus, newStatus) => {
  const statusMessages = {
    'waiting_approval': 'Menunggu persetujuan penjual',
    'processing': 'Pesanan sedang diproses',
    'delivery': 'Pesanan dalam perjalanan',
    'completed': 'Pesanan telah selesai',
    'cancelled': 'Pesanan dibatalkan'
  };

  const title = 'Update Pesanan';
  const body = statusMessages[newStatus] || `Status pesanan berubah menjadi ${newStatus}`;

  try {
    await notificationService.scheduleLocalNotification({
      title,
      body,
      data: {
        orderId: orderData.id,
        type: 'order_status_update',
        status: newStatus
      }
    });
  } catch (error) {
    console.error('Error sending status change notification:', error);
  }
};

// Update order status (for sellers)
const updateOrderStatus = async (orderId, status, statusProgress = null) => {
  try {
    const orderRef = doc(db, 'orders', orderId);
    const updateData = {
      status,
      updatedAt: serverTimestamp()
    };

    if (statusProgress) {
      updateData.statusProgress = statusProgress;
    }

    await updateDoc(orderRef, updateData);
    return true;
  } catch (error) {
    console.error('Error updating order status:', error);
    return false;
  }
};

// Update delivery tracking info
const updateDeliveryTracking = async (orderId, trackingData) => {
  try {
    const orderRef = doc(db, 'orders', orderId);
    await updateDoc(orderRef, {
      tracking: trackingData,
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error updating delivery tracking:', error);
    return false;
  }
};

// Cleanup all listeners
const cleanup = () => {
  listeners.forEach((unsubscribe) => {
    if (typeof unsubscribe === 'function') {
      unsubscribe();
    }
  });
  listeners.clear();
  orderStatusCache.clear();
};

// Get cached order status
const getCachedOrderStatus = (orderId) => {
  return orderStatusCache.get(orderId);
};

// Manually cache order status (useful for initial load)
const cacheOrderStatus = (orderId, status) => {
  orderStatusCache.set(orderId, status);
};

// Export the service object for backward compatibility
export const realtimeOrderService = {
  subscribeToOrder,
  unsubscribeFromOrder,
  subscribeToUserOrders,
  handleStatusChange,
  sendStatusChangeNotification,
  updateOrderStatus,
  updateDeliveryTracking,
  cleanup,
  getCachedOrderStatus,
  cacheOrderStatus
};

// Export individual functions
export {
  subscribeToOrder,
  unsubscribeFromOrder,
  subscribeToUserOrders,
  handleStatusChange,
  sendStatusChangeNotification,
  updateOrderStatus,
  updateDeliveryTracking,
  cleanup,
  getCachedOrderStatus,
  cacheOrderStatus
};

// Default export for backward compatibility
export default realtimeOrderService;
