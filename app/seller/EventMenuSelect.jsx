import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet } from "react-native";
import React, { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import HeaderTitleBack from "../../components/HeaderTitleBack";
import COLORS from "../constants/color";
import config from "../constants/config";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";

export default function EventMenuSelect() {
  const { eventId } = useLocalSearchParams();
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

useEffect(() => {
  const load = async () => {
    try {
      const token = await AsyncStorage.getItem('sellerToken');
      const [menuRes, regRes] = await Promise.all([
        fetch(`${config.API_URL}/seller/menu`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${config.API_URL}/seller/events/${eventId}/register`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const menuResult = await menuRes.json();
      setCategories(menuResult.data || []);

      const regResult = await regRes.json();
      setSelectedIds(new Set(regResult.registration?.eventItemIds || []));
    } catch (e) {
        //empty state 
    } finally {
      setLoading(false);
    }
  };
  load();
}, []);

  const toggleItem = (itemId) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(itemId) ? next.delete(itemId) : next.add(itemId);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('sellerToken');
      const res = await fetch(`${config.API_URL}/seller/events/${eventId}/register`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ itemIds: Array.from(selectedIds) }),
      });
      const data = await res.json();
      if (data.success) {
        router.back();
      } else {
        alert(data.message || 'Gagal menyimpan');
      }
    } catch (e) {
      alert('Gagal menyimpan: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <HeaderTitleBack title="Pilih Menu untuk Event" />
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.PRIMARY} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <Text style={styles.hint}>
            Pilih menu yang akan kamu bawa/jual di stand event. Buyer yang datang lewat halaman event cuma akan lihat menu yang kamu centang di sini.
          </Text>
          {categories.map(cat => (
            <View key={cat.id} style={{ marginBottom: 20 }}>
              <Text style={styles.categoryTitle}>{cat.name}</Text>
              {(cat.items || []).map(item => {
                const checked = selectedIds.has(item.id);
                return (
                  <TouchableOpacity key={item.id} style={styles.itemRow} onPress={() => toggleItem(item.id)} activeOpacity={0.7}>
                    <MaterialIcons name={checked ? 'check-box' : 'check-box-outline-blank'} size={22} color={checked ? COLORS.PRIMARY : '#bbb'} />
                    <Text style={styles.itemName}>{item.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </ScrollView>
      )}
      <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
        <Text style={styles.saveButtonText}>{saving ? 'Menyimpan...' : 'Simpan Pilihan'}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hint: { fontSize: 13, color: '#666', marginBottom: 16, lineHeight: 18 },
  categoryTitle: { fontSize: 15, fontWeight: '700', color: '#23272f', marginBottom: 8 },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 10 },
  itemName: { fontSize: 14, color: '#23272f' },
  saveButton: { backgroundColor: COLORS.PRIMARY, margin: 16, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});