import { Tabs } from 'expo-router';
import React from 'react';
import { Image, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HapticTab from '../../../components/HapticTab';
import COLOR from '../../constants/color';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Fixed image paths
import homeIcon from '../../../assets/images/home.png';
import statusIcon from '../../../assets/images/statusIcon.png';
import riwayatIcon from '../../../assets/images/riwayatIcon.png';
import profileIcon from '../../../assets/images/profile.png';

// Bungkus tiap icon dengan ini — kasih background pill putih transparan
// kalau tab-nya lagi aktif, transparan kalau nggak aktif.
const TabIconWrap = ({ focused, children }) => (
  <View
    style={{
      width: 46,
      height: 32,
      borderRadius: 16,
      backgroundColor: focused ? 'rgba(255,255,255,0.2)' : 'transparent',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    {children}
  </View>
);

export default function TabLayout() {
  // insets.bottom = tinggi area navigasi bawaan HP (gesture bar / 3 tombol).
  // Dipakai supaya navbar burgundy kita berhenti PAS di atasnya, nggak numpuk.
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarShowLabel: false,
        // Tidak pakai position:'absolute' — biar navbar reserve ruangnya
        // sendiri di layout dan nggak menutupi/tertutup navigasi sistem HP.
        tabBarStyle: {
          backgroundColor: COLOR.PRIMARY,
          height: 58 + insets.bottom,
          paddingBottom: insets.bottom,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          borderTopWidth: 0,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIconWrap focused={focused}>
              <Image
                source={homeIcon}
                style={{ width: 24, height: 24, tintColor: '#fff' }}
              />
            </TabIconWrap>
          ),
          tabBarLabel: "Home",
        }}
      />
      <Tabs.Screen
        name="status"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIconWrap focused={focused}>
              <Image
                source={statusIcon}
                style={{ width: 24, height: 24, resizeMode: 'contain', tintColor: '#fff' }}
              />
            </TabIconWrap>
          ),
          tabBarLabel: "Status",
        }}
      />
      <Tabs.Screen
        name="riwayat"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIconWrap focused={focused}>
              <Image
                source={riwayatIcon}
                style={{ width: 24, height: 24, tintColor: '#fff' }}
              />
            </TabIconWrap>
          ),
          tabBarLabel: "Riwayat",
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIconWrap focused={focused}>
              <Image
                source={profileIcon}
                style={{ width: 24, height: 24, tintColor: '#fff' }}
              />
            </TabIconWrap>
          ),
          tabBarLabel: "Profile",
        }}
      />
    </Tabs>
  );
}