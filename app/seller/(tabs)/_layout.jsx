import { Tabs } from 'expo-router';
import React from 'react';
import { Image } from 'react-native'; // Added this import
import HapticTab from '../../../components/HapticTab';
import COLOR from '../../constants/color';
import { MaterialCommunityIcons } from '@expo/vector-icons'; // Added for third-party icon

// Fixed image paths
import homeIcon from '../../../assets/images/home.png';
import chatIcon from '../../../assets/images/chat.png';
import profileIcon from '../../../assets/images/profile.png';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLOR.YELLOW,
        tabBarInactiveTintColor: COLOR.GRAY, // Added this
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: COLOR.PRIMARY,
          height: 80, // Added height
          paddingTop: 10, // Added padding
        },
        tabBarLabelStyle: { // Added label styling
          fontSize: 12,
          marginBottom: 4,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <Image
              source={homeIcon}
              style={{
                width: 28,
                height: 28,
                tintColor: focused ? COLOR.YELLOW : '#fff', // Use white when not focused
              }}
            />
          ),
          tabBarLabel: "Home",
        }}
      />
      <Tabs.Screen
        name="order"
        options={{
          tabBarIcon: ({ focused }) => (
            <MaterialCommunityIcons
              name="file-document-outline" // Example third-party icon
              size={28}
              color={focused ? COLOR.YELLOW : '#fff'} // Use white when not focused
            />
          ),
          tabBarLabel: "Pesanan",
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          tabBarIcon: ({ focused }) => (
            <Image
              source={chatIcon}
              style={{
                width: 28,
                height: 28,
                resizeMode: 'contain', // Ensure icon is not cropped
                tintColor: focused ? COLOR.YELLOW : '#fff', // Use white when not focused
              }}
            />
          ),
          tabBarLabel: "Chat",
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <Image
              source={profileIcon}
              style={{
                width: 28,
                height: 28,
                tintColor: focused ? COLOR.YELLOW : '#fff', // Use white when not focused
              }}
            />
          ),
          tabBarLabel: "Profile",
        }}
      />
    </Tabs>
  );
}