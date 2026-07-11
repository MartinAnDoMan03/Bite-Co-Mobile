export default {
  common: {
    ok: 'OK',
    cancel: 'Batal',
    save: 'Simpan',
    error: 'Error',
    success: 'Berhasil',
    info: 'Info',
    warning: 'Peringatan',
  },

  settings: {
    headerTitle: 'Pengaturan',

    sections: {
      notifications: {
        title: 'Notifikasi',
        orderNotifications: {
          label: 'Notifikasi Pesanan',
          subtitle: 'Terima notifikasi untuk pesanan baru',
        },
        promotionNotifications: {
          label: 'Notifikasi Promosi',
          subtitle: 'Terima notifikasi tentang promosi dan penawaran',
        },
        soundEnabled: {
          label: 'Suara Notifikasi',
          subtitle: 'Aktifkan suara untuk notifikasi',
        },
        vibrationEnabled: {
          label: 'Getar',
          subtitle: 'Aktifkan getaran untuk notifikasi',
        },
      },

      business: {
        title: 'Pengaturan Bisnis',
        autoAcceptOrders: {
          label: 'Auto Accept Pesanan',
          subtitle: 'Otomatis terima pesanan yang masuk',
        },
        showOnlineStatus: {
          label: 'Tampilkan Status Online',
          subtitle: 'Tampilkan status online ke pelanggan',
        },
        allowScheduledOrders: {
          label: 'Pesanan Terjadwal',
          subtitle: 'Izinkan pelanggan memesan untuk jadwal tertentu',
        },
      },

      account: {
        title: 'Akun & Keamanan',
        changePassword: {
          label: 'Ubah Password',
          subtitle: 'Ganti password akun Anda',
        },
        twoFactor: {
          label: 'Autentikasi 2 Faktor',
          subtitle: 'Tingkatkan keamanan akun',
          comingSoon: 'Fitur 2FA akan segera tersedia',
        },
      },

      app: {
        title: 'Aplikasi',
        language: {
          label: 'Bahasa',
          subtitle: 'Pilih bahasa aplikasi',
        },
        cache: {
          label: 'Bersihkan Cache',
          subtitle: 'Hapus data cache aplikasi',
          success: 'Cache berhasil dibersihkan',
        },
      },

      other: {
        title: 'Lainnya',
        privacy: {
          label: 'Kebijakan Privasi',
          subtitle: 'Baca kebijakan privasi kami',
          comingSoon: 'Kebijakan privasi akan ditampilkan',
        },
        terms: {
          label: 'Syarat & Ketentuan',
          subtitle: 'Baca syarat dan ketentuan',
          comingSoon: 'Syarat & ketentuan akan ditampilkan',
        },
        about: {
          label: 'Tentang Aplikasi',
          subtitle: 'Versi 1.2.5',
          title: 'Tentang',
          message: 'Bite&Co Seller v1.2.5\nDikembangkan untuk memudahkan pengelolaan warung Anda',
        },
      },

      danger: {
        title: 'Aksi Berbahaya',
        logout: {
          label: 'Keluar',
          subtitle: 'Keluar dari aplikasi',
        },
        deleteAccount: {
          label: 'Hapus Akun',
          subtitle: 'Hapus akun dan semua data',
        },
      },
    },

    languagePicker: {
      title: 'Pilih Bahasa',
      subtitle: 'Pilih bahasa yang ingin digunakan di aplikasi',
    },

    changePasswordModal: {
      title: 'Ubah Password',
      currentPassword: 'Password Saat Ini',
      newPassword: 'Password Baru',
      confirmPassword: 'Konfirmasi Password Baru',
      errors: {
        emptyFields: 'Mohon isi semua field password',
        mismatch: 'Password baru tidak sama dengan konfirmasi password',
        tooShort: 'Password baru minimal 6 karakter',
      },
      success: 'Password berhasil diubah',
    },

    logoutModal: {
      title: 'Keluar',
      message: 'Apakah Anda yakin ingin keluar dari aplikasi?',
      confirmButton: 'Keluar',
      success: 'Logout berhasil',
    },

    deleteAccountModal: {
      title: 'Hapus Akun',
      message: 'Apakah Anda yakin ingin menghapus akun? Tindakan ini tidak dapat dibatalkan dan semua data akan hilang.',
      confirmButton: 'Hapus',
      comingSoon: 'Fitur hapus akun akan segera tersedia. Silakan hubungi customer service untuk bantuan.',
    },
  },

  beranda: {
    welcome: 'Selamat Datang',
    defaultStoreName: 'Warung Saya',
    defaultAddress: 'Alamat belum diatur',
    menu: {
      pelanggan: 'Pelanggan',
      menu: 'Menu',
      jadwal: 'Jadwal',
      laporan: 'Laporan',
      riwayat: 'Riwayat',
      giziPro: 'GiziPro',
      biteEco: 'Bite Eco',
      ulasan: 'Ulasan',
      bantuan: 'Bantuan',
      pengaturan: 'Pengaturan',
    },
    sections: {
      businessSummary: 'Ringkasan Bisnis',
      quickActions: 'Aksi Cepat',
      todaySummary: 'Ringkasan Hari Ini',
    },
    stats: {
      subscribers: { title: 'Berlangganan', subtitle: 'Pelanggan rantangan' },
      monthlyRevenue: { title: 'Pendapatan Bulan Ini', subtitle: 'Dari {{count}} pesanan' },
      pendingOrders: { title: 'Pesanan Pending', subtitle: 'Perlu konfirmasi' },
      totalOrders: { title: 'Total Pesanan', subtitle: 'Semua waktu' },
    },
    quickActions: {
      addMenu: { title: 'Tambah Menu Baru', description: 'Tambahkan menu makanan ke katalog Anda' },
      viewOrders: { title: 'Lihat Pesanan Baru', description: '{{count}} pesanan menunggu konfirmasi' },
      updateSchedule: { title: 'Update Jadwal', description: 'Atur jadwal pengantaran mingguan' },
    },
    today: {
      newOrders: 'Pesanan Baru',
      readyToDeliver: 'Siap Kirim',
      completed: 'Selesai',
    },
  },

  pesanan: {
    header: { title: 'Pesanan' },
    emptyState: 'Tidak ada pesanan.',
    dateNotAvailable: 'Tanggal tidak tersedia',
    filters: {
      all: 'Semua',
      processing: 'Diproses',
      payment: 'Pembayaran',
      completed: 'Selesai',
    },
    status: {
      awaitingApproval: 'Menunggu Persetujuan',
      awaitingPayment: 'Menunggu Pembayaran',
      processing: 'Dalam Proses',
      delivery: 'Pengiriman',
      recurring: 'Siklus Pengiriman Aktif',
      completed: 'Selesai',
      cancelled: 'Dibatalkan',
    },
    actions: {
      pleaseWait: 'Mohon tunggu...',
      sendOrder: 'Kirim Pesanan',
      completedToday: 'Selesai hari ini',
      completeOrderBiteEco: 'Selesaikan Orderan',
      completeOrder: 'Selesaikan Pesanan',
      accept: 'Terima',
      reject: 'Tolak',
    },
    startsInDays: 'Mulai {{count}} hari lagi',
    remainingDays: 'Sisa {{count}} hari',
    deliveryHistory: 'Riwayat pengiriman ({{count}})',
    accessibility: {
      back: 'Kembali',
      orderDetail: 'Detail pesanan',
      chatBuyer: 'Chat pembeli',
    },
  },

  chat: {
    header: { title: 'Pesan' },
    noMessages: 'Belum ada pesan',
    online: 'Online',
    typeMessage: 'Ketik pesan...',
    searchPlaceholder: 'Cari percakapan...',
    loadingConversations: 'Sedang memuat percakapan...',
    noChatsFound: 'Tidak ada chat ditemukan',
    sendMessageError: 'Gagal mengirim pesan: ',
    accessibility: {
      back: 'Kembali',
    },
  },
  bantuan: {
    header: { title: 'Bantuan & Dukungan' },
    accessibility: { back: 'Kembali' },
    whatsappMessage: 'Halo, saya membutuhkan bantuan untuk aplikasi Bite&Co seller.',
    alerts: {
      whatsappNotInstalled: 'WhatsApp tidak terinstall di perangkat Anda',
      emailNotAvailable: 'Tidak dapat membuka aplikasi email',
      guideComingSoon: 'Fitur panduan lengkap akan segera hadir',
      videoComingSoon: 'Video tutorial akan segera tersedia',
    },
    sections: {
      contactUs: 'Hubungi Kami',
      faq: 'Pertanyaan Umum (FAQ)',
      contactInfo: 'Informasi Kontak',
      appInfo: 'Informasi Aplikasi',
    },
    quickActions: {
      whatsapp: { title: 'Chat WhatsApp', subtitle: 'Hubungi tim support via WhatsApp' },
      email: { title: 'Email Support', subtitle: 'Kirim email ke tim support' },
      guide: { title: 'Panduan Lengkap', subtitle: 'Baca panduan penggunaan aplikasi' },
      video: { title: 'Video Tutorial', subtitle: 'Tonton video cara menggunakan aplikasi' },
    },
    faq: {
      q1: { question: 'Bagaimana cara menambahkan menu baru?', answer: 'Buka halaman Menu, tekan tombol "+" di pojok kanan atas, lalu isi detail menu seperti nama, harga, deskripsi, dan foto. Pastikan semua field wajib sudah diisi sebelum menyimpan.' },
      q2: { question: 'Mengapa pesanan tidak muncul di dashboard?', answer: 'Pastikan koneksi internet stabil dan status warung dalam keadaan "Buka". Jika masih bermasalah, coba refresh halaman atau restart aplikasi.' },
      q3: { question: 'Bagaimana cara mengubah status pesanan?', answer: 'Masuk ke halaman Order/Pesanan, pilih pesanan yang ingin diubah statusnya, lalu tekan tombol status dan pilih status baru (Diproses, Siap, Selesai, dll).' },
      q4: { question: 'Cara melihat laporan penjualan?', answer: 'Buka menu Laporan untuk melihat ringkasan penjualan harian, mingguan, dan bulanan. Anda juga bisa download laporan dalam format PDF atau Excel.' },
      q5: { question: 'Bagaimana cara mengatur jadwal buka tutup warung?', answer: 'Masuk ke menu Jadwal, lalu atur jam buka dan tutup untuk setiap hari. Anda juga bisa mengatur hari libur atau jam istirahat.' },
      q6: { question: 'Kenapa foto menu tidak muncul?', answer: 'Pastikan foto berformat JPG atau PNG dengan ukuran maksimal 5MB. Koneksi internet yang lambat juga bisa menyebabkan foto tidak tampil dengan baik.' },
    },
    contact: {
      phone: '+62 812-3456-7890',
      email: 'support@biteandco.id',
      hours: 'Senin - Jumat: 08:00 - 17:00 WIB',
      location: 'Jakarta, Indonesia',
    },
    appInfo: {
      versionLabel: 'Versi Aplikasi',
      versionValue: '1.2.5',
      lastUpdateLabel: 'Update Terakhir',
      lastUpdateValue: '15 Desember 2024',
      deviceIdLabel: 'ID Perangkat',
      deviceIdValue: 'BTC-SELLER-001',
    },
  },

  biteEco: {
    header: { title: 'Bite Eco' },
    accessibility: { back: 'Kembali' },
    whatsappMessage: 'Halo, saya ingin bergabung dengan program Bite Eco untuk warung saya',
    intro: {
      title: 'Bite Eco',
      subtitle: 'Bergabunglah dalam gerakan warung ramah lingkungan untuk masa depan yang lebih hijau',
    },
    stats: {
      storesJoined: { value: '500+', label: 'Warung Bergabung' },
      ecoPackaging: { value: '10K+', label: 'Kemasan Eco' },
      co2Reduced: { value: '2 Ton', label: 'CO2 Dikurangi' },
    },
    sections: {
      program: 'Program Bite Eco',
      benefits: 'Keuntungan Bergabung',
      tips: 'Tips Warung Ramah Lingkungan',
    },
    features: {
      wasteManagement: { title: 'Kelola Limbah Makanan', description: 'Posting dan jual limbah makanan Anda kepada pembeli yang membutuhkan', actionText: 'Kelola Limbah' },
      ecoPackaging: { title: 'Kemasan Ramah Lingkungan', description: 'Dapatkan kemasan biodegradable untuk semua pesanan' },
      ecoCertificate: { title: 'Sertifikat Eco-Friendly', description: 'Dapatkan sertifikat warung ramah lingkungan' },
      carbonTracking: { title: 'Carbon Footprint Tracking', description: 'Pantau jejak karbon dari operasional warung Anda' },
    },
    benefits: {
      brandImage: 'Tingkatkan brand image sebagai warung peduli lingkungan',
      discountPackaging: 'Dapatkan kemasan eco-friendly dengan harga khusus',
      certificate: 'Sertifikat resmi warung ramah lingkungan',
      community: 'Akses komunitas warung eco-friendly',
    },
    tips: {
      reduceWaste: { title: 'Reduce Food Waste', description: 'Kelola porsi makanan dengan tepat untuk mengurangi limbah' },
      localIngredients: { title: 'Gunakan Bahan Lokal', description: 'Prioritaskan bahan makanan dari petani lokal' },
      saveEnergy: { title: 'Hemat Energi', description: 'Optimalkan penggunaan gas dan listrik saat memasak' },
      compost: { title: 'Kompos Organik', description: 'Ubah sisa makanan menjadi kompos untuk pupuk' },
    },
    cta: {
      title: 'Siap Menjadi Warung Eco-Friendly?',
      description: 'Bergabunglah dengan program Bite Eco dan mulai berkontribusi untuk lingkungan yang lebih baik',
      button: 'Bergabung Sekarang',
    },
  },

  jadwalPengantaran: {
    header: { title: 'Jadwal Pengantaran' },
    detailHeader: { title: 'Detail Pengantaran' },
    accessibility: { back: 'Kembali' },
    filters: {
      all: 'Semua',
      processing: 'Diproses',
      completed: 'Selesai',
    },
    emptyState: 'Tidak ada jadwal pengantaran.',
    fallbackValue: '-',
    statusFallback: 'Pending',
    detail: {
      address: 'Alamat',
      deliveryDate: 'Tanggal Pengantaran',
      deliveryTime: 'Jam Pengantaran',
    },
    actions: {
      deliverNow: 'Antar Sekarang',
    },
     status: {
      processing: 'Sedang Proses',
      completed: 'Selesai',
      cancelled: 'Dibatalkan',
    },
  },

  laporan: {
    header: { title: 'Laporan Statistik' },
    accessibility: { back: 'Kembali' },
    timeRanges: {
      week: 'Minggu',
      month: 'Bulan',
      year: 'Tahun',
    },
    chart: {
      title: 'Ringkasan Pendapatan',
      loading: 'Memuat data grafik...',
    },
    stats: {
      totalRevenue: 'Total Pendapatan',
      totalOrders: 'Total Pesanan',
      averageOrder: 'Rata-rata Pesanan',
      customers: 'Pelanggan',
      loadingValue: 'Memuat...',
      comparedToLastPeriod: 'vs periode lalu',
    },
    topItems: {
      title: 'Item Terlaris',
      loading: 'Memuat item terlaris...',
      empty: 'Belum ada data penjualan',
      ordersSuffix: '{{count}} pesanan',
    },
    errors: {
      loginRequired: 'Silakan login terlebih dahulu',
      fetchFailed: 'Gagal memuat data laporan. Silakan coba lagi.',
    },
    chartLabels: {
      week: ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'],
      year: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
      monthPrefix: 'M',
    },
  },
  menuPage: {
    header: { title: 'Menu' },
    accessibility: { back: 'Kembali' },
    cards: {
      menu: { title: 'Menu', desc: 'Kelola daftar menu anda di sini' },
      paket: { title: 'Paket', desc: 'Kelola daftar paket anda di sini' },
    },
  },
  riwayat: {
    header: { title: 'Riwayat Pesanan' },
    accessibility: { back: 'Kembali' },
    sectionTitle: 'Total {{count}} pesanan selesai',
    statusCompleted: 'Selesai',
    buyerFallback: 'Pelanggan',
    itemsLabel: 'Menu',
    empty: {
      title: 'Belum Ada Riwayat',
      description: 'Riwayat pesanan yang sudah selesai akan muncul di sini',
    },
  },

  pelanggan: {
    header: { title: 'Pelanggan' },
    accessibility: { back: 'Kembali' },
    search: { placeholder: 'Cari pelanggan...' },
    errors: {
      noToken: 'Token tidak ditemukan. Silakan login kembali.',
      parseFailed: 'Gagal memproses data dari server. Response bukan JSON.',
      serverErrorHtml: 'Server error: Menerima HTML, bukan JSON (Status: {{status}})',
      serverErrorGeneric: 'Server error: {{status}}',
      serverErrorWithBody: 'Server error: {{status}} - {{body}}',
      fetchFailed: 'Gagal memuat data pelanggan',
    },
    numberFormat: { million: 'Jt', thousand: 'rb' },
    status: {
      completed: 'Selesai',
      delivery: 'Dikirim',
      processing: 'Diproses',
      waitingApproval: 'Menunggu',
      pending: 'Pending',
    },
    card: {
      customerFallback: 'Customer',
      serviceLabel: 'Layanan: {{service}}',
      serviceFallback: 'Catering',
      ordersStats: '{{count}} pesanan \u00b7 {{amount}}',
      dateUnknown: 'Tidak diketahui',
      vip: 'VIP',
    },
    stats: {
      totalCustomers: 'Total Pelanggan',
      totalOrders: 'Total Pesanan',
      totalRevenue: 'Total Pendapatan',
    },
    growth: {
      newCustomers: '{{count}} baru (30 hari)',
      returningCustomers: '{{count}} pelanggan setia',
    },
    empty: {
      title: 'Belum Ada Pelanggan',
      subtitle: 'Pelanggan akan muncul setelah mereka melakukan pemesanan',
    },
    notFound: {
      title: 'Tidak Ditemukan',
      subtitle: 'Tidak ada pelanggan yang sesuai dengan pencarian "{{query}}"',
    },
    error: {
      title: 'Terjadi Kesalahan',
      retry: 'Coba Lagi',
    },
    loading: 'Memuat data pelanggan...',
  },

  ulasan: {
    header: { title: 'Ulasan Pelanggan' },
    accessibility: { back: 'Kembali' },
    errors: { fetchFailed: 'Gagal memuat ulasan' },
    buyerFallback: 'Pelanggan',
    orderLabel: 'Pesanan',
    orderDetailsFallback: 'Detail tidak tersedia',
    totalReviews: '{{count}} ulasan',
    allReviews: 'Semua Ulasan ({{count}})',
    empty: {
      title: 'Belum Ada Ulasan',
      description: 'Ulasan dari pelanggan akan muncul di sini setelah mereka menyelesaikan pesanan',
      ratingOutOf5: '{{rating}}/5',
    },
  },
  detailUsaha: {
  identitas: {
    header: {
      title: 'Siapkan Identitas Anda',
      subtitle: 'Unggah foto KTP dan foto diri sambil memegang KTP untuk proses verifikasi identitas.',
    },
    cardTitle: 'Siapkan Identitas Anda',
    upload: {
      ktp: { title: 'Ambil Foto e-KTP', subtitle: 'Ambil foto KTP yang jelas & tidak buram' },
      selfie: { title: 'Ambil Foto Selfie bersama e-KTP', subtitle: 'Foto wajah sambil memegang KTP Anda' },
    },
    retakeButton: 'Ambil Ulang Foto',
    continueButton: 'Lanjut',
    alerts: {
      invalidPhoto: {
        title: 'Foto Tidak Valid',
        message: 'Foto yang diambil tidak terdeteksi sebagai KTP. Pastikan:\n\n• KTP terlihat jelas dan tidak buram\n• Seluruh bagian KTP masuk dalam frame\n• Pencahayaan cukup\n\nSilakan coba lagi.',
        retryButton: 'Coba Lagi',
      },
      permissionDenied: {
        title: 'Izin Ditolak',
        message: 'Kami memerlukan izin kamera untuk mengambil foto. Silakan aktifkan izin kamera di pengaturan aplikasi.',
      },
      incomplete: {
        title: 'Perhatian',
        message: 'Harap ambil foto KTP dan selfie terlebih dahulu',
      },
    },
    permissionModal: {
      title: 'Izin Akses Kamera',
      textKtp: 'Kami memerlukan akses kamera untuk mengambil foto e-KTP Anda. Foto ini digunakan untuk proses verifikasi identitas.',
      textSelfie: 'Kami memerlukan akses kamera untuk mengambil foto selfie bersama e-KTP Anda. Foto ini digunakan untuk proses verifikasi identitas.',
      later: 'Nanti',
      allow: 'Izinkan',
    },
  },
  detail: {
    header: {
      title: 'Siapkan Detail Usaha Anda',
      subtitle: 'Lengkapi informasi usaha kamu untuk melanjutkan proses verifikasi.',
    },
    cardTitle: 'Detail Usaha',
    fields: {
      outletName: { label: 'Nama Outlet', placeholder: 'Masukan nama lengkap Anda...' },
      outletPhone: { label: 'Nomor Telpon Outlet', placeholder: '0813...' },
      outletEmail: { label: 'Email Outlet', placeholder: 'Masukan email outlet Anda...' },
      password: { label: 'Password', placeholder: 'Min. 8 Karakter...' },
      taxRate: { label: 'Masukan Pajak Restoran/PB1 yang Berlaku (Opsional)', placeholder: 'Contoh: 10 (dalam %)' },
      bank: { label: 'Pilih Bank', placeholder: 'Pilih bank Anda' },
      bankAccountNumber: { label: 'Nomor Rekening Bank', placeholder: 'Contoh: 1234567890' },
    },
    continueButton: 'Lanjut',
    alerts: {
      incomplete: {
        title: 'Form Tidak Lengkap',
        message: 'Harap lengkapi semua data yang diperlukan:',
      },
    },
  },
  syarat: {
    header: {
      title: 'Syarat dan Ketentuan',
      subtitle: 'Baca dan setujui syarat berikut sebelum melanjutkan proses pendaftaran mitra',
    },
    termsList: [
      'Mitra wajib menjaga kualitas dan kebersihan produk yang dijual.',
      'Data usaha yang didaftarkan harus benar dan dapat dipertanggungjawabkan.',
      'Mitra wajib memperbarui ketersediaan menu secara berkala melalui aplikasi.',
      'Konfirmasi pesanan dilakukan paling lambat 1x24 jam setelah pesanan masuk.',
      'Setiap transaksi yang berhasil dikenakan komisi platform sebesar 10%.',
      'Pelanggaran terhadap ketentuan di atas dapat berakibat penonaktifan akun mitra.',
    ],
    sections: {
      general: { title: 'Syarat Umum Platform', checkboxLabel: 'Saya setuju dengan syarat umum di atas' },
      halal: {
        title: 'Pernyataan Status Halal',
        paragraph: 'Centang jika produk kamu halal. Label akan otomatis tampil di profil dan bisa difilter pembeli. Jika tidak dicentang, toko ditandai sebagai umum, bukan berarti non-halal.',
        checkboxLabel: 'Produk saya halal',
      },
    },
    submitButton: 'Daftar Sekarang',
    alerts: {
      notAgreed: {
        title: 'Syarat Belum Disetujui',
        message: 'Harap setujui syarat umum platform sebelum melanjutkan pendaftaran.',
      },
      submitFailed: {
        title: 'Gagal Mendaftar',
        message: 'Terjadi kesalahan saat mengirim data:\n\n{{details}}',
        noDetails: 'Tidak ada detail error tambahan',
      },
      systemError: {
        title: 'Error Sistem',
        defaultMessage: 'Terjadi kesalahan saat mendaftar. Silakan coba lagi.',
        serverError: 'Error {{status}}: {{message}}',
        serverErrorFallback: 'Kesalahan Server',
        timeout: 'Koneksi timeout. Silakan cek koneksi internet Anda dan coba lagi.',
        noResponse: 'Tidak ada respon dari server. Silakan cek koneksi internet Anda.',
        networkError: 'Tidak dapat terhubung ke server. Silakan cek koneksi internet Anda.',
        generic: 'Error: {{message}}',
        errorCode: 'Kode Error: {{code}}',
      },
    },
  },
  success: {
    title: 'Selamat!',
    message: 'Anda telah berhasil mendaftar sebagai penjual di Bite&Co. Silakan tunggu konfirmasi dari tim kami. Jika ada pertanyaan, silakan hubungi kami di info@biteandco.com',
    button: 'Masuk ke Beranda Seller',
  },
},
started: {
  title: "Mulai Sebagai...",
  subtitle: "Pilih peranmu untuk melanjutkan",
  buyer: "Saya Pembeli",
  seller: "Saya Penjual",
},
sellerLogin: {
  greeting: "Halo!",
  subtitle: "Selamat datang di Bite&Co",
  email: "Email",
  password: "Password",
  forgotPassword: "Lupa password?",
  processing: "Memproses...",
  login: "Masuk",
  noAccount: "Belum punya akun? ",
  register: "Daftar",
  loginFailedTitle: "Gagal Masuk",
  loginFailed: "Login gagal",
  loginFailedRetry: "Login gagal. Coba lagi.",
},
};