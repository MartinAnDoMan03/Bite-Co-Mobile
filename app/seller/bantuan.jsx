import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import HeaderTitleBack from '../../components/HeaderTitleBack';
import { MaterialIcons } from '@expo/vector-icons';

const BantuanPage = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [expandedFAQ, setExpandedFAQ] = useState(null);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const handleWhatsAppContact = () => {
    const phoneNumber = '+6281234567890'; // Replace with actual support number
    const message = 'Halo, saya membutuhkan bantuan untuk aplikasi Bite&Co seller.';
    const url = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;
    
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert('Error', 'WhatsApp tidak terinstall di perangkat Anda');
      }
    });
  };

  const handleEmailContact = () => {
    const email = 'support@biteandco.id';
    const subject = 'Bantuan Aplikasi Seller';
    const url = `mailto:${email}?subject=${encodeURIComponent(subject)}`;
    
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Tidak dapat membuka aplikasi email');
    });
  };

  const faqData = [
    {
      id: 1,
      question: 'Bagaimana cara menambahkan menu baru?',
      answer: 'Buka halaman Menu, tekan tombol "+" di pojok kanan atas, lalu isi detail menu seperti nama, harga, deskripsi, dan foto. Pastikan semua field wajib sudah diisi sebelum menyimpan.'
    },
    {
      id: 2,
      question: 'Mengapa pesanan tidak muncul di dashboard?',
      answer: 'Pastikan koneksi internet stabil dan status warung dalam keadaan "Buka". Jika masih bermasalah, coba refresh halaman atau restart aplikasi.'
    },
    {
      id: 3,
      question: 'Bagaimana cara mengubah status pesanan?',
      answer: 'Masuk ke halaman Order/Pesanan, pilih pesanan yang ingin diubah statusnya, lalu tekan tombol status dan pilih status baru (Diproses, Siap, Selesai, dll).'
    },
    {
      id: 4,
      question: 'Cara melihat laporan penjualan?',
      answer: 'Buka menu Laporan untuk melihat ringkasan penjualan harian, mingguan, dan bulanan. Anda juga bisa download laporan dalam format PDF atau Excel.'
    },
    {
      id: 5,
      question: 'Bagaimana cara mengatur jadwal buka tutup warung?',
      answer: 'Masuk ke menu Jadwal, lalu atur jam buka dan tutup untuk setiap hari. Anda juga bisa mengatur hari libur atau jam istirahat.'
    },
    {
      id: 6,
      question: 'Kenapa foto menu tidak muncul?',
      answer: 'Pastikan foto berformat JPG atau PNG dengan ukuran maksimal 5MB. Koneksi internet yang lambat juga bisa menyebabkan foto tidak tampil dengan baik.'
    }
  ];

  const quickActions = [
    {
      id: 1,
      title: 'Chat WhatsApp',
      subtitle: 'Hubungi tim support via WhatsApp',
      icon: 'chat',
      color: '#25D366',
      onPress: handleWhatsAppContact
    },
    {
      id: 2,
      title: 'Email Support',
      subtitle: 'Kirim email ke tim support',
      icon: 'email',
      color: '#EA4335',
      onPress: handleEmailContact
    },
    {
      id: 3,
      title: 'Panduan Lengkap',
      subtitle: 'Baca panduan penggunaan aplikasi',
      icon: 'menu-book',
      color: '#4285F4',
      onPress: () => Alert.alert('Info', 'Fitur panduan lengkap akan segera hadir')
    },
    {
      id: 4,
      title: 'Video Tutorial',
      subtitle: 'Tonton video cara menggunakan aplikasi',
      icon: 'play-circle-filled',
      color: '#FF0000',
      onPress: () => Alert.alert('Info', 'Video tutorial akan segera tersedia')
    }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <HeaderTitleBack title="Bantuan & Dukungan" />
      
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Quick Contact Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hubungi Kami</Text>
          <View style={styles.quickActionsContainer}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={styles.quickActionCard}
                onPress={action.onPress}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: action.color }]}>
                  <MaterialIcons name={action.icon} size={24} color="white" />
                </View>
                <View style={styles.quickActionContent}>
                  <Text style={styles.quickActionTitle}>{action.title}</Text>
                  <Text style={styles.quickActionSubtitle}>{action.subtitle}</Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color="#666" />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* FAQ Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pertanyaan Umum (FAQ)</Text>
          {faqData.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.faqItem}
              onPress={() => setExpandedFAQ(expandedFAQ === item.id ? null : item.id)}
            >
              <View style={styles.faqHeader}>
                <Text style={styles.faqQuestion}>{item.question}</Text>
                <MaterialIcons
                  name={expandedFAQ === item.id ? "expand-less" : "expand-more"}
                  size={24}
                  color="#666"
                />
              </View>
              {expandedFAQ === item.id && (
                <Text style={styles.faqAnswer}>{item.answer}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Contact Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informasi Kontak</Text>
          <View style={styles.contactInfo}>
            <View style={styles.contactItem}>
              <MaterialIcons name="phone" size={20} color="#FF6B35" />
              <Text style={styles.contactText}>+62 812-3456-7890</Text>
            </View>
            <View style={styles.contactItem}>
              <MaterialIcons name="email" size={20} color="#FF6B35" />
              <Text style={styles.contactText}>support@biteandco.id</Text>
            </View>
            <View style={styles.contactItem}>
              <MaterialIcons name="access-time" size={20} color="#FF6B35" />
              <Text style={styles.contactText}>Senin - Jumat: 08:00 - 17:00 WIB</Text>
            </View>
            <View style={styles.contactItem}>
              <MaterialIcons name="location-on" size={20} color="#FF6B35" />
              <Text style={styles.contactText}>Jakarta, Indonesia</Text>
            </View>
          </View>
        </View>

        {/* App Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informasi Aplikasi</Text>
          <View style={styles.appInfo}>
            <View style={styles.appInfoItem}>
              <Text style={styles.appInfoLabel}>Versi Aplikasi</Text>
              <Text style={styles.appInfoValue}>1.2.5</Text>
            </View>
            <View style={styles.appInfoItem}>
              <Text style={styles.appInfoLabel}>Update Terakhir</Text>
              <Text style={styles.appInfoValue}>15 Desember 2024</Text>
            </View>
            <View style={styles.appInfoItem}>
              <Text style={styles.appInfoLabel}>ID Perangkat</Text>
              <Text style={styles.appInfoValue}>BTC-SELLER-001</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  quickActionsContainer: {
    gap: 12,
  },
  quickActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  quickActionContent: {
    flex: 1,
  },
  quickActionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  quickActionSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  faqItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    paddingVertical: 12,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 12,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    lineHeight: 20,
  },
  contactInfo: {
    gap: 12,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  contactText: {
    fontSize: 16,
    color: '#333',
  },
  appInfo: {
    gap: 12,
  },
  appInfoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  appInfoLabel: {
    fontSize: 16,
    color: '#666',
  },
  appInfoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
});

export default BantuanPage;
