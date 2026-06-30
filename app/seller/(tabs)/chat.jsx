import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform
} from "react-native";
import React, { useState, useEffect, useRef } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import COLORS from '../../constants/color';
import AntDesign from "@expo/vector-icons/AntDesign";
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { getFirestore, collection, query, where, onSnapshot, orderBy, addDoc, serverTimestamp } from "firebase/firestore";
import { app as firebaseApp } from "../../../firebase";
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import config from '../../constants/config';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { useRouter } from 'expo-router';

const ChatItem = ({ chat, onPress }) => (
  <TouchableOpacity style={styles.chatItem} onPress={onPress}>
    <View style={styles.avatarContainer}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{(chat.name ? chat.name.charAt(0).toUpperCase() : '?')}</Text>
      </View>
      {chat.unreadCount > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadText}>{chat.unreadCount}</Text>
        </View>
      )}
    </View>
    <View style={styles.chatContent}>
      <View style={styles.chatHeaderRow}>
        <Text style={styles.chatName} numberOfLines={1}>{chat.name || '-'}</Text>
        <Text style={styles.chatTime}>{chat.time || ''}</Text>
      </View>
      <Text style={styles.lastMessage} numberOfLines={1}>
        {chat.lastMessage || <Text style={{color:'#bbb',fontStyle:'italic'}}>Belum ada pesan</Text>}
      </Text>
    </View>
  </TouchableOpacity>
);

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

const ChatScreen = ({ selectedChat, onBack, messages, onSendMessage }) => {
  const [inputText, setInputText] = useState("");
  const router = useRouter();
  const flatListRef = useRef(null);

  const handleSend = () => {
    if (inputText.trim()) {
      onSendMessage(inputText.trim());
      setInputText("");
    }
  };

  const handleGoToOrderDetail = () => {
    // Navigate to seller's DetailOrder.jsx using expo-router
    router.push({
      pathname: "/seller/DetailOrder",
      params: {
        orderId: selectedChat.orderId || selectedChat.id,
        buyerId: selectedChat.buyerId,
        sellerId: selectedChat.sellerId,
      }
    });
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={30}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f5' }} edges={["bottom"]}>
        <View style={styles.chatHeader}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <AntDesign name="left" size={20} color={COLORS.TEXT} />
          </TouchableOpacity>
          <View style={styles.chatHeaderInfo}>
            {/* Always show initial capital if no sellerIcon */}
            <View style={styles.smallAvatar}>
              <Text style={styles.smallAvatarText}>{(selectedChat.buyerName ? selectedChat.buyerName.charAt(0).toUpperCase() : (selectedChat.name ? selectedChat.name.charAt(0).toUpperCase() : (selectedChat.buyerId ? selectedChat.buyerId.charAt(0).toUpperCase() : '?')))}</Text>
            </View>
            <View>
              <Text style={styles.chatHeaderName}>{selectedChat.buyerName || selectedChat.name || selectedChat.buyerId || '-'}</Text>
              <Text style={styles.chatHeaderStatus}>Online</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.moreButton} onPress={handleGoToOrderDetail}>
            <MaterialIcons name="receipt" size={24} color={COLORS.TEXT} />
          </TouchableOpacity>
        </View>
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MessageBubble message={item} isOwn={item.isOwn} />
          )}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />
        <View style={[styles.inputContainer, { position: 'absolute', left: 0, right: 0, bottom: -30, backgroundColor: '#fff' }]}> 
          <TextInput
            style={styles.textInput}
            placeholder="Type a message..."
            value={inputText}
            onChangeText={setInputText}
            multiline
            returnKeyType="send"
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
            <AntDesign name="arrowright" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

const db = getFirestore(firebaseApp);

const Chat = () => {
  const [selectedChat, setSelectedChat] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [chats, setChats] = useState([]);
  const [sellerId, setSellerId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true); // <-- add loading state
  const isFocused = useIsFocused();

  useEffect(() => {
    // Get sellerId from JWT token in AsyncStorage
    const getSellerId = async () => {
      try {
        const token = await AsyncStorage.getItem('sellerToken');
        if (token) {
          // JWT decode (without external lib):
          const base64Url = token.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(
            atob(base64)
              .split('')
              .map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
              })
              .join('')
          );
          const payload = JSON.parse(jsonPayload);
          setSellerId(payload.id || payload.sellerId);
          console.log('[DEBUG] Decoded sellerId from JWT:', payload.id || payload.sellerId);
        }
      } catch (e) {
        console.log('[DEBUG] Failed to get sellerId from token:', e);
      }
    };
    getSellerId();
  }, []);

  useEffect(() => {
    if (!sellerId) return;
    if (!isFocused) return;
    setLoading(true);
    // Listen to all chatrooms for this seller
    const q = query(collection(db, "chatrooms"), where("sellerId", "==", sellerId));
    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      const chatrooms = [];
      let unsubMsgListeners = [];
      for (const docSnap of querySnapshot.docs) {
        const data = docSnap.data();
        let buyerName = data.buyerName;
        if (data.buyerId) {
          try {
            const res = await axios.get(`${config.API_URL || ''}/buyer/profile/${data.buyerId}`);
            buyerName = res.data?.name || data.buyerId;
          } catch (e) {
            buyerName = data.buyerId;
          }
        }
        // Listen for latest message and unread count
        let lastMessage = "";
        let lastMessageTime = "";
        let unreadCount = 0;
        const messagesCol = collection(db, "chatrooms", docSnap.id, "messages");
        const { onSnapshot: onMsgSnapshot, query: fsQuery, orderBy: fsOrderBy, where: fsWhere, limit: fsLimit } = await import('firebase/firestore');
        // Listen for latest message (real-time)
        const lastMsgQuery = fsQuery(messagesCol, fsOrderBy("timestamp", "desc"), fsLimit(1));
        const unsubLastMsg = onMsgSnapshot(lastMsgQuery, (lastMsgDocs) => {
          if (!lastMsgDocs.empty) {
            const lastMsg = lastMsgDocs.docs[0].data();
            lastMessage = lastMsg.text || "";
            lastMessageTime = lastMsg.timestamp && lastMsg.timestamp.toDate ? lastMsg.timestamp.toDate().toLocaleDateString() : "";
          } else {
            lastMessage = "";
            lastMessageTime = "";
          }
          // Update chatrooms state for this chatroom (latest message)
          setChats((prev) => {
            const updated = prev.map((c) => c.id === docSnap.id ? { ...c, lastMessage, lastMessageTime } : c);
            return updated;
          });
        });
        unsubMsgListeners.push(unsubLastMsg);
        // Listen for unread count (real-time)
        const unreadQuery = fsQuery(
          messagesCol,
          fsWhere("senderId", "==", data.buyerId),
          fsWhere("readBySeller", "==", false)
        );
        const unsubUnread = onMsgSnapshot(unreadQuery, (unreadSnap) => {
          unreadCount = unreadSnap.size;
          setChats((prev) => {
            const updated = prev.map((c) => c.id === docSnap.id ? { ...c, unreadCount } : c);
            return updated;
          });
        });
        unsubMsgListeners.push(unsubUnread);
        chatrooms.push({
          id: docSnap.id,
          ...data,
          buyerName,
          lastMessage,
          lastMessageTime,
          unreadCount,
        });
      }
      setChats(chatrooms);
      setLoading(false);
      // Clean up all message listeners on unmount
      return () => { unsubMsgListeners.forEach(unsub => unsub && unsub()); };
    }, (error) => {
      console.log("[DEBUG] Firestore query error:", error);
      let indexLink = null;
      if (error.message && error.message.includes('index')) {
        const match = error.message.match(/https?:\/\/[^\s]+/);
        if (match) {
          indexLink = match[0];
          console.log("[DEBUG] Firestore index link:", indexLink);
        }
      }
      let msg = error.message;
      if (indexLink) msg += "\n\nCreate index: " + indexLink;
      if (__DEV__) alert(msg);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [sellerId, isFocused]);

  // Fetch messages for selected chatroom
  useEffect(() => {
    if (!selectedChat) return;
    if (!selectedChat.id) return;
    const q = query(
      collection(db, "chatrooms", selectedChat.id, "messages"),
      orderBy("timestamp", "asc")
    );
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const msgs = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        msgs.push({
          id: doc.id,
          text: data.text,
          senderId: data.senderId,
          senderName: data.senderName,
          timestamp: data.timestamp,
          isOwn: data.senderId === sellerId,
          time: data.timestamp && data.timestamp.toDate ?
            data.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
        });
      });
      setMessages(msgs);
      console.log('[DEBUG] Messages for chatroom', selectedChat.id, msgs);
    });
    return () => unsubscribe();
  }, [selectedChat, sellerId]);

  // Mark all unread buyer messages as read when chat is opened
  useEffect(() => {
    if (!selectedChat || !selectedChat.id || !sellerId) return;
    // Mark all unread messages from buyer as read
    (async () => {
      try {
        const { getDocs, updateDoc, doc, query: fsQuery, where: fsWhere, collection: fsCollection } = await import('firebase/firestore');
        const messagesCol = fsCollection(db, "chatrooms", selectedChat.id, "messages");
        const unreadQuery = fsQuery(
          messagesCol,
          fsWhere("senderId", "==", selectedChat.buyerId),
          fsWhere("readBySeller", "==", false)
        );
        const unreadSnap = await getDocs(unreadQuery);
        for (const msgDoc of unreadSnap.docs) {
          await updateDoc(msgDoc.ref, { readBySeller: true });
        }
      } catch (e) {
        console.log('[DEBUG] Failed to mark messages as read:', e);
      }
    })();
  }, [selectedChat, sellerId]);

  // Send message to Firestore
  const handleSendMessage = async (text) => {
    if (!selectedChat || !selectedChat.id) return;
    try {
      await addDoc(collection(db, "chatrooms", selectedChat.id, "messages"), {
        text,
        senderId: sellerId,
        senderName: "Penjual", // Optionally use seller name
        timestamp: serverTimestamp(),
        readBySeller: true, // Mark as read by seller since seller is sending
      });
    } catch (e) {
      alert('Gagal mengirim pesan: ' + e.message);
    }
  };

  const filteredChats = chats.filter(chat =>
    chat.buyerName && chat.buyerName.toLowerCase().includes(searchText.toLowerCase())
  );

  // DEBUG: Show all chats if search is empty, otherwise filter
  const displayChats = searchText.trim() === '' ? chats : filteredChats;

  if (selectedChat) {
    return (
      <SafeAreaView style={styles.container}>
        <ChatScreen
          selectedChat={selectedChat}
          onBack={() => setSelectedChat(null)}
          messages={messages}
          onSendMessage={handleSendMessage}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chat</Text>
        <TouchableOpacity style={styles.searchButton}>
          <AntDesign name="search1" size={20} color={COLORS.TEXT} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <AntDesign name="search1" size={16} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Cari percakapan..."
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      {console.log("[DEBUG] Displaying chats:", displayChats)}
      {loading ? (
        <Text style={{textAlign:'center',marginTop:40,color:'#888'}}>Sedang memuat percakapan...</Text>
      ) : (
        <FlatList
          data={displayChats}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <ChatItem
              chat={{
                ...item,
                name: item.buyerName || item.buyerId || '-',
                lastMessage: item.lastMessage || "",
                time: item.lastMessageTime || (item.createdAt && item.createdAt.toDate ? item.createdAt.toDate().toLocaleDateString() : ""),
                unreadCount: item.unreadCount || 0,
              }}
              onPress={() => setSelectedChat(item)}
            />
          )}
          style={styles.chatList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<Text style={{textAlign:'center',marginTop:40,color:'#888'}}>Tidak ada chat ditemukan</Text>}
        />
      )}
    </SafeAreaView>
  );
};

export default Chat;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
  },
  searchButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginVertical: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "#eee",
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  chatList: {
    flex: 1,
  },
  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    borderRadius: 12,
    marginHorizontal: 8,
    marginVertical: 4,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  avatarContainer: {
    position: "relative",
    marginRight: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.GREEN3,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  avatarText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },
  unreadBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#ff4444",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  unreadText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  chatContent: {
    flex: 1,
    minWidth: 0,
  },
  chatHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  chatName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#23272f",
    flex: 1,
    marginRight: 8,
  },
  chatTime: {
    fontSize: 12,
    color: "#aaa",
    minWidth: 60,
    textAlign: 'right',
  },
  lastMessage: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
    flexShrink: 1,
  },
  // Chat Screen Styles
  chatScreen: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
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
  messagesList: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  messagesContent: {
    paddingVertical: 16,
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
  },
  ownBubble: {
    backgroundColor: COLORS.GREEN3,
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: "#fff",
    borderBottomLeftRadius: 4,
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
  },
  sendButton: {
    backgroundColor: COLORS.GREEN3,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
});
