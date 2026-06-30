import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRoute, useNavigation, useFocusEffect } from "@react-navigation/native";
import {
  getFirestore,
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  setDoc,
  getDoc,
  where,
  updateDoc,
  getDocs,
} from "firebase/firestore";
import { app as firebaseApp } from "../../firebase";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import config from '../constants/config';
import COLORS from '../constants/color';

const db = getFirestore(firebaseApp);

// Simple MessageBubble component
const MessageBubble = ({ message, isOwn }) => (
  <View style={[styles.messageContainer, isOwn ? styles.ownMessage : styles.otherMessage]}>
    <View style={[styles.messageBubble, isOwn ? styles.ownBubble : styles.otherBubble]}>
      <Text style={[styles.messageText, isOwn ? styles.ownText : styles.otherText]}>
        {message.text}
      </Text>
    </View>
    <Text style={styles.messageTime}>{message.time}</Text>
  </View>
);

const ChatRoom = (props) => {
  // Try to get params from both route.params and useLocalSearchParams
  let params = {};
  if (props.route && props.route.params) {
    params = props.route.params;
  } else {
    // fallback for expo-router
    params = useLocalSearchParams();
  }
  // Convert params (URLSearchParams) to plain object if needed
  if (typeof params.get === 'function') {
    const obj = {};
    for (const key of params.keys()) {
      obj[key] = params.get(key);
    }
    params = obj;
  }
  const { chatroomId, buyerId, sellerId, buyerName, sellerName, sellerIcon, orderId } = params;
  
  // Create unique chatroom ID based on order ID if provided, otherwise use the passed chatroomId
  const actualChatroomId = orderId ? `order_${orderId}_chat` : chatroomId;
  
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [buyerProfile, setBuyerProfile] = useState(null);
  const flatListRef = useRef(null);
  const navigation = props.navigation || useNavigation();
  const router = useRouter();
  const connectionTimeoutRef = useRef(null);

  console.log('[ChatRoom] Using chatroom ID:', actualChatroomId, 'for order:', orderId);

  // Clean up connection timeout on unmount
  useEffect(() => {
    return () => {
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
      }
    };
  }, []);

  // Toast function for showing messages - memoized to prevent recreations
  const showToast = useCallback((message, type = 'info') => {
    Alert.alert(type === 'error' ? 'Error' : 'Info', message);
  }, []);

  // Load buyer info
  const loadBuyerInfo = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('buyerToken');
      if (!token) return;
      
      const response = await axios.get(`${config.API_URL}/buyer/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setBuyerProfile({
        name: response.data.name,
        id: response.data.id || response.data.buyerId || response.data._id || null,
      });
    } catch (error) {
      console.error('Error loading buyer info:', error);
    }
  }, []);

  // Mark messages as read
  const markMessagesAsRead = useCallback(async () => {
    if (!actualChatroomId || !sellerId) return;
    
    try {
      const messagesRef = collection(db, "chatrooms", actualChatroomId, "messages");
      const unreadQuery = query(
        messagesRef,
        where("senderId", "==", sellerId),
        where("readByBuyer", "==", false)
      );
      
      const unreadSnap = await getDocs(unreadQuery);
      const updatePromises = unreadSnap.docs.map(docSnap =>
        updateDoc(docSnap.ref, { readByBuyer: true })
      );
      
      await Promise.all(updatePromises);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }, [actualChatroomId, sellerId]);

  // Load buyer info on focus - only once
  useFocusEffect(
    useCallback(() => {
      if (!buyerProfile) {
        console.log('[ChatRoom] Loading buyer info on focus');
        loadBuyerInfo();
      }
    }, [buyerProfile])
  );

  // Enhanced message listener with error handling
  useEffect(() => {
    if (!actualChatroomId) {
      setLoading(false);
      return;
    }

    console.log('[ChatRoom] Setting up message listener for chatroom:', actualChatroomId);
    setConnectionStatus('connecting');
    
    // Set a timeout to avoid stuck in connecting state
    connectionTimeoutRef.current = setTimeout(() => {
      console.log('[ChatRoom] Connection timeout, setting to connected anyway');
      setConnectionStatus('connected');
      setLoading(false);
    }, 5000);

    const q = query(
      collection(db, "chatrooms", actualChatroomId, "messages"),
      orderBy("timestamp", "asc")
    );
    
    const unsubscribe = onSnapshot(q, 
      (querySnapshot) => {
        console.log('[ChatRoom] Received messages:', querySnapshot.size);
        
        // Clear the connection timeout since we got data
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }
        
        const msgs = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          msgs.push({
            id: doc.id,
            text: data.text,
            senderId: data.senderId,
            senderName: data.senderName,
            timestamp: data.timestamp,
            isOwn: data.senderId === buyerId,
            time: data.timestamp && data.timestamp.toDate 
              ? data.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          });
        });
        
        setMessages(msgs);
        setLoading(false);
        setConnectionStatus('connected');
      }, 
      (error) => {
        console.error('Firestore onSnapshot error:', error);
        
        // Clear the connection timeout
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }
        
        setLoading(false);
        setConnectionStatus('error');
        showToast('Gagal memuat pesan', 'error');
      }
    );
    
    return () => {
      console.log('[ChatRoom] Cleaning up message listener');
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
      unsubscribe();
    };
  }, [actualChatroomId, buyerId, showToast]); // Use actualChatroomId instead of chatroomId

  // Separate effect for marking messages as read when messages change
  useEffect(() => {
    if (messages.length > 0 && actualChatroomId && sellerId) {
      const timer = setTimeout(() => {
        markMessagesAsRead();
      }, 1000); // Debounce to avoid excessive calls
      
      return () => clearTimeout(timer);
    }
  }, [messages.length, actualChatroomId, sellerId]); // Use actualChatroomId instead of chatroomId

  // Enhanced sendMessage with better error handling and performance tracking
  const sendMessage = useCallback(async () => {
    if (!input.trim()) return;
    if (!actualChatroomId) {
      showToast('ID ruang chat tidak tersedia', 'error');
      return;
    }
    if (!buyerId) {
      showToast('Informasi pengguna tidak tersedia', 'error');
      return;
    }
    if (sending) return;

    setSending(true);

    try {
      // Ensure chatroom document exists before adding a message
      const chatroomDoc = doc(db, "chatrooms", actualChatroomId);
      const chatroomSnap = await getDoc(chatroomDoc);
      
      if (!chatroomSnap.exists()) {
        console.log('[ChatRoom] Creating new chatroom for order:', orderId);
        await setDoc(chatroomDoc, {
          buyerId,
          sellerId,
          buyerName: buyerName || 'Pembeli',
          sellerName: sellerName || 'Penjual',
          orderId: orderId || null,
          chatroomType: orderId ? 'order_specific' : 'general', // Mark if this is order-specific
          createdAt: serverTimestamp(),
          lastActivity: serverTimestamp(),
        });
      }

      // Send message to Firestore
      await addDoc(collection(db, "chatrooms", actualChatroomId, "messages"), {
        text: input.trim(),
        senderId: buyerId,
        senderName: buyerName || 'Pembeli',
        timestamp: serverTimestamp(),
        readByBuyer: true, // Buyer sending, so mark as read by buyer
        readBySeller: false, // Mark as unread for seller
        orderId: orderId || null, // Associate message with order
      });

      // Update chatroom last activity
      await updateDoc(chatroomDoc, {
        lastActivity: serverTimestamp(),
        lastMessage: input.trim(),
        lastMessageSender: buyerId,
      });

      setInput("");
      console.log('[ChatRoom] Message sent successfully to order-specific chatroom');
    } catch (error) {
      console.error('Send message error:', error);
      showToast('Gagal mengirim pesan: ' + error.message, 'error');
    } finally {
      setSending(false);
    }
  }, [input, actualChatroomId, buyerId, sellerId, buyerName, sellerName, orderId, sending, showToast]);

  // Enhanced goToOrderDetail with router support - memoized to prevent recreations
  const goToOrderDetail = useCallback(() => {
    if (orderId) {
      console.log('[ChatRoom] Navigating to order detail:', orderId);
      // Try router first, then navigation as fallback
      if (router && router.push) {
        router.push({
          pathname: '/buyer/RiwayatDetail',
          params: { orderId }
        });
      } else if (navigation) {
        navigation.navigate('DetailOrder', { orderId });
      } else {
        showToast('Navigasi tidak tersedia', 'error');
      }
    } else {
      showToast('Detail pesanan tidak tersedia', 'warning');
    }
  }, [orderId, router, navigation, showToast]);

  // Auto-scroll to bottom when messages change - debounced to prevent excessive calls
  useEffect(() => {
    if (flatListRef.current && messages && messages.length > 0) {
      const timer = setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [messages.length]); // Only depend on message count, not the full messages array

  // Debug connection status changes
  useEffect(() => {
    console.log('[ChatRoom] Connection status changed to:', connectionStatus);
  }, [connectionStatus]);

  // Show loading screen
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={20} color={COLORS.TEXT || "#23272f"} />
          </TouchableOpacity>
          <Text style={styles.chatHeaderName}>Chat</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY || COLORS.GREEN3} />
          <Text style={styles.loadingText}>Memuat percakapan...</Text>
        </View>
      </SafeAreaView>
    );
  }

    return (
    <View style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
        {/* Enhanced Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={20} color={COLORS.TEXT || "#23272f"} />
          </TouchableOpacity>
          <View style={styles.chatHeaderInfo}>
            {sellerIcon ? (
              <Image source={{ uri: sellerIcon }} style={styles.smallAvatarImg} />
            ) : (
              <View style={styles.smallAvatar}>
                <Text style={styles.smallAvatarText}>
                  {(sellerName && sellerName.trim() ? sellerName.trim().charAt(0).toUpperCase() : '?')}
                </Text>
              </View>
            )}
            <View>
              <Text style={styles.chatHeaderName}>{sellerName || 'Penjual'}</Text>
              <Text style={[styles.chatHeaderStatus, { 
                color: connectionStatus === 'connected' ? COLORS.GREEN3 : 
                       connectionStatus === 'error' ? '#ff4444' : '#999'
              }]}>
                {connectionStatus === 'connected' ? 'Online' : 
                 connectionStatus === 'error' ? 'Offline' : 'Menghubungkan...'}
              </Text>
            </View>
          </View>
          {orderId && (
            <TouchableOpacity style={styles.moreButton} onPress={goToOrderDetail}>
              <MaterialIcons name="receipt" size={20} color={COLORS.TEXT || "#23272f"} />
            </TouchableOpacity>
          )}
        </View>

        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={({ item }) => (
            <MessageBubble message={item} isOwn={item.isOwn} />
          )}
          keyExtractor={(item) => item.id}
          style={styles.messagesList}
          contentContainerStyle={[
            styles.messagesContent,
            messages.length === 0 && styles.emptyMessagesContent
          ]}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="chat-bubble-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>Belum ada pesan</Text>
              <Text style={styles.emptySubtext}>Mulai percakapan dengan penjual</Text>
            </View>
          }
        />

        {/* Enhanced Input Container */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        >
          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.textInput, sending && styles.textInputDisabled]}
              value={input}
              onChangeText={setInput}
              placeholder="Ketik pesan..."
              placeholderTextColor="#999"
              onSubmitEditing={sendMessage}
              returnKeyType="send"
              multiline
              maxLength={1000}
              editable={!sending}
            />
            <TouchableOpacity 
              style={[
                styles.sendButton, 
                (!input.trim() || sending) && styles.sendButtonDisabled
              ]} 
              onPress={sendMessage}
              disabled={!input.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <MaterialIcons name="send" size={20} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

// Enhanced StyleSheet with improved styling
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  chatHeaderInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  smallAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.GREEN3,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  smallAvatarImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: COLORS.GREEN3,
  },
  smallAvatarText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  chatHeaderName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  chatHeaderStatus: {
    fontSize: 12,
    color: COLORS.GREEN3,
  },
  moreButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  messagesList: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  messagesContent: {
    paddingVertical: 16,
  },
  emptyMessagesContent: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  messageContainer: {
    marginHorizontal: 16,
    marginVertical: 4,
  },
  ownMessage: {
    alignItems: "flex-end",
  },
  otherMessage: {
    alignItems: "flex-start",
  },
  messageBubble: {
    maxWidth: "80%",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  ownBubble: {
    backgroundColor: COLORS.GREEN3,
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: "#fff",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  ownText: {
    color: "#fff",
  },
  otherText: {
    color: "#333",
  },
  messageTime: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
    marginHorizontal: 16,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    maxHeight: 100,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  textInputDisabled: {
    opacity: 0.7,
  },
  sendButton: {
    backgroundColor: COLORS.GREEN3,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});

export default ChatRoom;
