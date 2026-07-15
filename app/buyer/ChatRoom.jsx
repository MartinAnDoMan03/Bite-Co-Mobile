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
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import config from '../constants/config';
import COLORS from '../constants/color';
import { useLanguage } from '../contexts/LanguageContext';

const db = getFirestore(firebaseApp);

// Simple MessageBubble component
const MessageBubble = ({ message, isOwn, showAvatar, sellerIcon, sellerName }) => (
  <View style={[styles.messageRow, isOwn ? styles.ownMessageRow : styles.otherMessageRow]}>
    {!isOwn && (
      <View style={styles.bubbleAvatarSlot}>
        {showAvatar ? (
          sellerIcon ? (
            <Image source={{ uri: sellerIcon }} style={styles.bubbleAvatarImg} />
          ) : (
            <View style={styles.bubbleAvatar}>
              <Text style={styles.bubbleAvatarText}>
                {(sellerName && sellerName.trim() ? sellerName.trim().charAt(0).toUpperCase() : '?')}
              </Text>
            </View>
          )
        ) : null}
      </View>
    )}
    <View style={[styles.messageContainer, isOwn ? styles.ownMessage : styles.otherMessage]}>
      <View style={[styles.messageBubble, isOwn ? styles.ownBubble : styles.otherBubble]}>
        <Text style={[styles.messageText, isOwn ? styles.ownText : styles.otherText]}>
          {message.text}
        </Text>
      </View>
      <Text style={[styles.messageTime, isOwn ? styles.ownMessageTime : styles.otherMessageTime]}>
        {message.time}
      </Text>
    </View>
  </View>
);

const ChatRoom = (props) => {
  const { t } = useLanguage();
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
  const insets = useSafeAreaInsets();

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
   Alert.alert(type === 'error' ? t('common.error') : t('common.info'), message);
  }, [t]);

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
        showToast(t('buyerChatRoom.toast.loadMessagesFailed'), 'error');
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
      showToast(t('buyerChatRoom.toast.noChatroomId'), 'error');
      return;
    }
    if (!buyerId) {
      showToast(t('buyerChatRoom.toast.noUserInfo'), 'error');
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
          buyerName: buyerName || t('buyerChatRoom.defaultBuyerName'),
          sellerName: sellerName || t('buyerChatRoom.defaultSellerName'),
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
        senderName: buyerName || t('buyerChatRoom.defaultBuyerName'),
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
      showToast(t('buyerChatRoom.toast.sendFailed') + error.message, 'error');
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
        showToast(t('buyerChatRoom.toast.navigationUnavailable'), 'error');
      }
    } else {
      showToast(t('buyerChatRoom.toast.orderDetailUnavailable'), 'warning');
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

  const statusInfo = {
    connected: { label: t('buyerChatRoom.status.online'), color: '#2FB768' },
    error: { label: t('buyerChatRoom.status.offline'), color: '#E24C4C' },
    connecting: { label: t('buyerChatRoom.status.connecting'), color: '#B0B0B0' },
    disconnected: { label: t('buyerChatRoom.status.connecting'), color: '#B0B0B0' },
    }[connectionStatus] || { label: t('buyerChatRoom.status.connecting'), color: '#B0B0B0' };

  // Show loading screen
 if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back-ios-new" size={16} color={COLORS.PRIMARY} />
          </TouchableOpacity>
           <Text style={styles.chatHeaderName}>{t('buyerChatRoom.header.title')}</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY} />
          <Text style={styles.loadingText}>{t('buyerChatRoom.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
        {/* Enhanced Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back-ios-new" size={16} color={COLORS.PRIMARY} />
          </TouchableOpacity>
          <View style={styles.chatHeaderInfo}>
            <View style={styles.avatarWrap}>
              {sellerIcon ? (
                <Image source={{ uri: sellerIcon }} style={styles.smallAvatarImg} />
              ) : (
                <View style={styles.smallAvatar}>
                  <Text style={styles.smallAvatarText}>
                    {(sellerName && sellerName.trim() ? sellerName.trim().charAt(0).toUpperCase() : '?')}
                  </Text>
                </View>
              )}
              {connectionStatus === 'connected' && <View style={styles.onlineDot} />}
            </View>
            <View>
            <Text style={styles.chatHeaderName} numberOfLines={1}>{sellerName || t('buyerChatRoom.defaultSellerName')}</Text>
              <View style={styles.statusRow}>
                <View style={[styles.statusDot, { backgroundColor: statusInfo.color }]} />
                <Text style={[styles.chatHeaderStatus, { color: statusInfo.color }]}>
                  {statusInfo.label}
                </Text>
              </View>
            </View>
          </View>
          {orderId && (
            <TouchableOpacity style={styles.moreButton} onPress={goToOrderDetail}>
              <MaterialIcons name="receipt-long" size={20} color={COLORS.PRIMARY} />
            </TouchableOpacity>
          )}
        </View>

        {/* Everything below the header shifts together when the keyboard opens */}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={0}
        >
          {/* Messages List */}
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={({ item, index }) => {
              const prev = messages[index - 1];
              const showAvatar = !item.isOwn && (!prev || prev.isOwn || prev.senderId !== item.senderId);
              return (
                <MessageBubble
                  message={item}
                  isOwn={item.isOwn}
                  showAvatar={showAvatar}
                  sellerIcon={sellerIcon}
                  sellerName={sellerName}
                />
              );
            }}
            keyExtractor={(item) => item.id}
            style={styles.messagesList}
            contentContainerStyle={[
              styles.messagesContent,
              messages.length === 0 && styles.emptyMessagesContent
            ]}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconWrap}>
                  <MaterialIcons name="chat-bubble-outline" size={32} color={COLORS.PRIMARY} />
                </View>
               <Text style={styles.emptyText}>{t('buyerChatRoom.empty.title')}</Text>
               <Text style={styles.emptySubtext}>{t('buyerChatRoom.empty.subtitle')}</Text>
              </View>
            }
          />

          {/* Enhanced Input Container */}
          <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <TextInput
              style={[styles.textInput, sending && styles.textInputDisabled]}
              value={input}
              onChangeText={setInput}
               placeholder={t('buyerChatRoom.inputPlaceholder')}
              placeholderTextColor="#A0A0A0"
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
                <MaterialIcons name="send" size={18} color="#fff" />
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
    backgroundColor: "#FAFAFA",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(0,0,0,0.04)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  chatHeaderInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  avatarWrap: {
    marginRight: 12,
  },
  smallAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.PRIMARY,
    justifyContent: "center",
    alignItems: "center",
  },
  smallAvatarImg: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.PRIMARY,
  },
  smallAvatarText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  onlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#2FB768",
    borderWidth: 2,
    borderColor: "#fff",
  },
  chatHeaderName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  chatHeaderStatus: {
    fontSize: 11,
    fontWeight: "600",
  },
  moreButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(0,0,0,0.04)",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#888',
  },
  messagesList: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  messagesContent: {
    paddingVertical: 16,
    paddingHorizontal: 4,
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
    gap: 4,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(0,0,0,0.04)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  emptySubtext: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginHorizontal: 16,
    marginVertical: 3,
  },
  ownMessageRow: {
    justifyContent: "flex-end",
  },
  otherMessageRow: {
    justifyContent: "flex-start",
  },
  bubbleAvatarSlot: {
    width: 26,
    marginRight: 6,
  },
  bubbleAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.PRIMARY,
    alignItems: "center",
    justifyContent: "center",
  },
  bubbleAvatarImg: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  bubbleAvatarText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  messageContainer: {
    maxWidth: "78%",
  },
  ownMessage: {
    alignItems: "flex-end",
  },
  otherMessage: {
    alignItems: "flex-start",
  },
  messageBubble: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 18,
  },
  ownBubble: {
    backgroundColor: COLORS.PRIMARY,
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: "#fff",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 19,
  },
  ownText: {
    color: "#fff",
  },
  otherText: {
    color: "#2A2A2A",
  },
  messageTime: {
    fontSize: 10,
    color: "#AAA",
    marginTop: 3,
  },
  ownMessageTime: {
    marginRight: 4,
  },
  otherMessageTime: {
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#EEE",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 10,
    maxHeight: 100,
    fontSize: 14,
    backgroundColor: '#F7F7F7',
    color: "#1A1A1A",
  },
  textInputDisabled: {
    opacity: 0.7,
  },
  sendButton: {
    backgroundColor: COLORS.PRIMARY,
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.PRIMARY,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  sendButtonDisabled: {
    backgroundColor: "#D5D5D5",
    shadowOpacity: 0,
    elevation: 0,
  },
});

export default ChatRoom;