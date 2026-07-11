export default {
  common: {
    ok: 'OK',
    cancel: 'Batal',
    save: 'Simpan',
    error: 'Ralat',
    success: 'Berjaya',
    info: 'Info',
    warning: 'Amaran',
  },

  settings: {
    headerTitle: 'Tetapan',

    sections: {
      notifications: {
        title: 'Pemberitahuan',
        orderNotifications: {
          label: 'Pemberitahuan Pesanan',
          subtitle: 'Terima pemberitahuan untuk pesanan baharu',
        },
        promotionNotifications: {
          label: 'Pemberitahuan Promosi',
          subtitle: 'Terima pemberitahuan tentang promosi dan tawaran',
        },
        soundEnabled: {
          label: 'Bunyi Pemberitahuan',
          subtitle: 'Aktifkan bunyi untuk pemberitahuan',
        },
        vibrationEnabled: {
          label: 'Getaran',
          subtitle: 'Aktifkan getaran untuk pemberitahuan',
        },
      },

      business: {
        title: 'Tetapan Perniagaan',
        autoAcceptOrders: {
          label: 'Terima Pesanan Automatik',
          subtitle: 'Terima pesanan masuk secara automatik',
        },
        showOnlineStatus: {
          label: 'Tunjukkan Status Dalam Talian',
          subtitle: 'Tunjukkan status dalam talian kepada pelanggan',
        },
        allowScheduledOrders: {
          label: 'Pesanan Berjadual',
          subtitle: 'Benarkan pelanggan membuat pesanan pada masa tertentu',
        },
      },

      account: {
        title: 'Akaun & Keselamatan',
        changePassword: {
          label: 'Tukar Kata Laluan',
          subtitle: 'Tukar kata laluan akaun anda',
        },
        twoFactor: {
          label: 'Pengesahan 2 Faktor',
          subtitle: 'Tingkatkan keselamatan akaun',
          comingSoon: 'Ciri 2FA akan tersedia tidak lama lagi',
        },
      },

      app: {
        title: 'Aplikasi',
        language: {
          label: 'Bahasa',
          subtitle: 'Pilih bahasa aplikasi',
        },
        cache: {
          label: 'Kosongkan Cache',
          subtitle: 'Padam data cache aplikasi',
          success: 'Cache berjaya dikosongkan',
        },
      },

      other: {
        title: 'Lain-lain',
        privacy: {
          label: 'Dasar Privasi',
          subtitle: 'Baca dasar privasi kami',
          comingSoon: 'Dasar privasi akan dipaparkan',
        },
        terms: {
          label: 'Terma & Syarat',
          subtitle: 'Baca terma dan syarat',
          comingSoon: 'Terma & syarat akan dipaparkan',
        },
        about: {
          label: 'Mengenai Aplikasi',
          subtitle: 'Versi 1.2.5',
          title: 'Mengenai',
          message: 'Bite&Co Seller v1.2.5\nDibina untuk memudahkan pengurusan kedai anda',
        },
      },

      danger: {
        title: 'Tindakan Berbahaya',
        logout: {
          label: 'Log Keluar',
          subtitle: 'Log keluar daripada aplikasi',
        },
        deleteAccount: {
          label: 'Padam Akaun',
          subtitle: 'Padam akaun dan semua data',
        },
      },
    },

    languagePicker: {
      title: 'Pilih Bahasa',
      subtitle: 'Pilih bahasa yang ingin digunakan dalam aplikasi',
    },

    changePasswordModal: {
      title: 'Tukar Kata Laluan',
      currentPassword: 'Kata Laluan Semasa',
      newPassword: 'Kata Laluan Baharu',
      confirmPassword: 'Sahkan Kata Laluan Baharu',
      errors: {
        emptyFields: 'Sila isi semua medan kata laluan',
        mismatch: 'Kata laluan baharu tidak sepadan dengan pengesahan',
        tooShort: 'Kata laluan baharu mestilah sekurang-kurangnya 6 aksara',
      },
      success: 'Kata laluan berjaya ditukar',
    },

    logoutModal: {
      title: 'Log Keluar',
      message: 'Adakah anda pasti mahu log keluar daripada aplikasi?',
      confirmButton: 'Log Keluar',
      success: 'Berjaya log keluar',
    },

    deleteAccountModal: {
      title: 'Padam Akaun',
      message: 'Adakah anda pasti mahu memadam akaun? Tindakan ini tidak boleh dibatalkan dan semua data akan hilang.',
      confirmButton: 'Padam',
      comingSoon: 'Ciri padam akaun akan tersedia tidak lama lagi. Sila hubungi khidmat pelanggan untuk bantuan.',
    },
  },

  beranda: {
    welcome: 'Selamat Datang',
    defaultStoreName: 'Kedai Saya',
    defaultAddress: 'Alamat belum ditetapkan',
    menu: {
      pelanggan: 'Pelanggan',
      menu: 'Menu',
      jadwal: 'Jadual',
      laporan: 'Laporan',
      riwayat: 'Sejarah',
      giziPro: 'GiziPro',
      biteEco: 'Bite Eco',
      ulasan: 'Ulasan',
      bantuan: 'Bantuan',
      pengaturan: 'Tetapan',
    },
    sections: {
      businessSummary: 'Ringkasan Perniagaan',
      quickActions: 'Tindakan Pantas',
      todaySummary: 'Ringkasan Hari Ini',
    },
    stats: {
      subscribers: { title: 'Langganan', subtitle: 'Pelanggan pek makanan' },
      monthlyRevenue: { title: 'Pendapatan Bulan Ini', subtitle: 'Daripada {{count}} pesanan' },
      pendingOrders: { title: 'Pesanan Tertunda', subtitle: 'Perlu pengesahan' },
      totalOrders: { title: 'Jumlah Pesanan', subtitle: 'Sepanjang masa' },
    },
    quickActions: {
      addMenu: { title: 'Tambah Menu Baharu', description: 'Tambah item makanan ke katalog anda' },
      viewOrders: { title: 'Lihat Pesanan Baharu', description: '{{count}} pesanan menunggu pengesahan' },
      updateSchedule: { title: 'Kemaskini Jadual', description: 'Uruskan jadual penghantaran mingguan anda' },
    },
    today: {
      newOrders: 'Pesanan Baharu',
      readyToDeliver: 'Sedia Dihantar',
      completed: 'Selesai',
    },
  },

  pesanan: {
    header: { title: 'Pesanan' },
    emptyState: 'Tiada pesanan.',
    dateNotAvailable: 'Tarikh tidak tersedia',
    filters: {
      all: 'Semua',
      processing: 'Diproses',
      payment: 'Pembayaran',
      completed: 'Selesai',
    },
    status: {
      awaitingApproval: 'Menunggu Kelulusan',
      awaitingPayment: 'Menunggu Pembayaran',
      processing: 'Sedang Diproses',
      delivery: 'Penghantaran',
      recurring: 'Kitaran Penghantaran Aktif',
      completed: 'Selesai',
      cancelled: 'Dibatalkan',
    },
    actions: {
      pleaseWait: 'Sila tunggu...',
      sendOrder: 'Hantar Pesanan',
      completedToday: 'Selesai hari ini',
      completeOrderBiteEco: 'Selesaikan Pesanan',
      completeOrder: 'Selesaikan Pesanan',
      accept: 'Terima',
      reject: 'Tolak',
    },
    startsInDays: 'Bermula dalam {{count}} hari',
    remainingDays: 'Baki {{count}} hari',
    deliveryHistory: 'Sejarah penghantaran ({{count}})',
    accessibility: {
      back: 'Kembali',
      orderDetail: 'Butiran pesanan',
      chatBuyer: 'Sembang dengan pembeli',
    },
  },

  chat: {
    header: { title: 'Mesej' },
    noMessages: 'Belum ada mesej',
    online: 'Dalam Talian',
    typeMessage: 'Taip mesej...',
    searchPlaceholder: 'Cari perbualan...',
    loadingConversations: 'Sedang memuatkan perbualan...',
    noChatsFound: 'Tiada sembang dijumpai',
    sendMessageError: 'Gagal menghantar mesej: ',
    accessibility: {
      back: 'Kembali',
    },
  },
  bantuan: {
    header: { title: 'Bantuan & Sokongan' },
    accessibility: { back: 'Kembali' },
    whatsappMessage: 'Helo, saya memerlukan bantuan untuk aplikasi Bite&Co seller.',
    alerts: {
      whatsappNotInstalled: 'WhatsApp tidak dipasang pada peranti anda',
      emailNotAvailable: 'Tidak dapat membuka aplikasi e-mel',
      guideComingSoon: 'Ciri panduan lengkap akan tersedia tidak lama lagi',
      videoComingSoon: 'Video tutorial akan tersedia tidak lama lagi',
    },
    sections: {
      contactUs: 'Hubungi Kami',
      faq: 'Soalan Lazim (FAQ)',
      contactInfo: 'Maklumat Hubungan',
      appInfo: 'Maklumat Aplikasi',
    },
    quickActions: {
      whatsapp: { title: 'Sembang WhatsApp', subtitle: 'Hubungi pasukan sokongan melalui WhatsApp' },
      email: { title: 'Sokongan E-mel', subtitle: 'Hantar e-mel kepada pasukan sokongan' },
      guide: { title: 'Panduan Lengkap', subtitle: 'Baca panduan penggunaan aplikasi' },
      video: { title: 'Video Tutorial', subtitle: 'Tonton video cara menggunakan aplikasi' },
    },
    faq: {
      q1: { question: 'Bagaimana cara menambah menu baharu?', answer: 'Buka halaman Menu, tekan butang "+" di penjuru kanan atas, kemudian isi butiran menu seperti nama, harga, penerangan, dan foto. Pastikan semua medan wajib diisi sebelum menyimpan.' },
      q2: { question: 'Mengapa pesanan tidak muncul di papan pemuka?', answer: 'Pastikan sambungan internet stabil dan status kedai dalam keadaan "Buka". Jika masih bermasalah, cuba muat semula halaman atau mulakan semula aplikasi.' },
      q3: { question: 'Bagaimana cara menukar status pesanan?', answer: 'Masuk ke halaman Pesanan, pilih pesanan yang ingin ditukar statusnya, kemudian tekan butang status dan pilih status baharu (Diproses, Sedia, Selesai, dll).' },
      q4: { question: 'Cara melihat laporan jualan?', answer: 'Buka menu Laporan untuk melihat ringkasan jualan harian, mingguan, dan bulanan. Anda juga boleh muat turun laporan dalam format PDF atau Excel.' },
      q5: { question: 'Bagaimana cara menetapkan jadual buka tutup kedai?', answer: 'Masuk ke menu Jadual, kemudian tetapkan waktu buka dan tutup untuk setiap hari. Anda juga boleh menetapkan hari cuti atau waktu rehat.' },
      q6: { question: 'Kenapa foto menu tidak muncul?', answer: 'Pastikan foto berformat JPG atau PNG dengan saiz maksimum 5MB. Sambungan internet yang perlahan juga boleh menyebabkan foto tidak dipaparkan dengan baik.' },
    },
    contact: {
      phone: '+62 812-3456-7890',
      email: 'support@biteandco.id',
      hours: 'Isnin - Jumaat: 08:00 - 17:00 WIB',
      location: 'Jakarta, Indonesia',
    },
    appInfo: {
      versionLabel: 'Versi Aplikasi',
      versionValue: '1.2.5',
      lastUpdateLabel: 'Kemas Kini Terakhir',
      lastUpdateValue: '15 Disember 2024',
      deviceIdLabel: 'ID Peranti',
      deviceIdValue: 'BTC-SELLER-001',
    },
  },

  biteEco: {
    header: { title: 'Bite Eco' },
    accessibility: { back: 'Kembali' },
    whatsappMessage: 'Helo, saya ingin menyertai program Bite Eco untuk kedai saya',
    intro: {
      title: 'Bite Eco',
      subtitle: 'Sertai gerakan kedai mesra alam untuk masa depan yang lebih hijau',
    },
    stats: {
      storesJoined: { value: '500+', label: 'Kedai Menyertai' },
      ecoPackaging: { value: '10K+', label: 'Bungkusan Eco' },
      co2Reduced: { value: '2 Tan', label: 'CO2 Dikurangkan' },
    },
    sections: {
      program: 'Program Bite Eco',
      benefits: 'Kelebihan Menyertai',
      tips: 'Tip Kedai Mesra Alam',
    },
    features: {
      wasteManagement: { title: 'Urus Sisa Makanan', description: 'Siarkan dan jual sisa makanan anda kepada pembeli yang memerlukan', actionText: 'Urus Sisa' },
      ecoPackaging: { title: 'Bungkusan Mesra Alam', description: 'Dapatkan bungkusan biodegradasi untuk semua pesanan' },
      ecoCertificate: { title: 'Sijil Eco-Friendly', description: 'Dapatkan sijil kedai mesra alam' },
      carbonTracking: { title: 'Penjejakan Jejak Karbon', description: 'Pantau jejak karbon operasi kedai anda' },
    },
    benefits: {
      brandImage: 'Tingkatkan imej jenama sebagai kedai prihatin alam sekitar',
      discountPackaging: 'Dapatkan bungkusan mesra alam dengan harga istimewa',
      certificate: 'Sijil rasmi kedai mesra alam',
      community: 'Akses kepada komuniti kedai mesra alam',
    },
    tips: {
      reduceWaste: { title: 'Kurangkan Sisa Makanan', description: 'Urus bahagian makanan dengan tepat untuk mengurangkan sisa' },
      localIngredients: { title: 'Gunakan Bahan Tempatan', description: 'Utamakan bahan makanan daripada petani tempatan' },
      saveEnergy: { title: 'Jimat Tenaga', description: 'Optimumkan penggunaan gas dan elektrik semasa memasak' },
      compost: { title: 'Kompos Organik', description: 'Tukar sisa makanan menjadi kompos untuk baja' },
    },
    cta: {
      title: 'Bersedia Menjadi Kedai Eco-Friendly?',
      description: 'Sertai program Bite Eco dan mula menyumbang kepada persekitaran yang lebih baik',
      button: 'Sertai Sekarang',
    },
  },

  jadwalPengantaran: {
    header: { title: 'Jadual Penghantaran' },
    detailHeader: { title: 'Butiran Penghantaran' },
    accessibility: { back: 'Kembali' },
    filters: {
      all: 'Semua',
      processing: 'Diproses',
      completed: 'Selesai',
    },
    emptyState: 'Tiada jadual penghantaran.',
    fallbackValue: '-',
    statusFallback: 'Tertunda',
    detail: {
      address: 'Alamat',
      deliveryDate: 'Tarikh Penghantaran',
      deliveryTime: 'Masa Penghantaran',
    },
    actions: {
      deliverNow: 'Hantar Sekarang',
    },
    status: {
      processing: 'Sedang Diproses',
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
      loading: 'Sedang memuatkan data carta...',
    },
    stats: {
      totalRevenue: 'Jumlah Pendapatan',
      totalOrders: 'Jumlah Pesanan',
      averageOrder: 'Purata Pesanan',
      customers: 'Pelanggan',
      loadingValue: 'Sedang memuatkan...',
      comparedToLastPeriod: 'vs tempoh lalu',
    },
    topItems: {
      title: 'Item Terlaris',
      loading: 'Sedang memuatkan item terlaris...',
      empty: 'Belum ada data jualan',
      ordersSuffix: '{{count}} pesanan',
    },
    errors: {
      loginRequired: 'Sila log masuk dahulu',
      fetchFailed: 'Gagal memuatkan data laporan. Sila cuba lagi.',
    },
    chartLabels: {
      week: ['Ahd', 'Isn', 'Sel', 'Rab', 'Kha', 'Jum', 'Sab'],
      year: ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogo', 'Sep', 'Okt', 'Nov', 'Dis'],
      monthPrefix: 'M',
    },
  },
  menuPage: {
    header: { title: 'Menu' },
    accessibility: { back: 'Kembali' },
    cards: {
      menu: { title: 'Menu', desc: 'Urus senarai menu anda di sini' },
      paket: { title: 'Pakej', desc: 'Urus senarai pakej anda di sini' },
    },
  },
  riwayat: {
    header: { title: 'Sejarah Pesanan' },
    accessibility: { back: 'Kembali' },
    sectionTitle: 'Jumlah {{count}} pesanan selesai',
    statusCompleted: 'Selesai',
    buyerFallback: 'Pelanggan',
    itemsLabel: 'Menu',
    empty: {
      title: 'Belum Ada Sejarah',
      description: 'Sejarah pesanan yang telah selesai akan dipaparkan di sini',
    },
  },

  pelanggan: {
    header: { title: 'Pelanggan' },
    accessibility: { back: 'Kembali' },
    search: { placeholder: 'Cari pelanggan...' },
    errors: {
      noToken: 'Token tidak dijumpai. Sila log masuk semula.',
      parseFailed: 'Gagal memproses data daripada pelayan. Respons bukan JSON.',
      serverErrorHtml: 'Ralat pelayan: Menerima HTML bukan JSON (Status: {{status}})',
      serverErrorGeneric: 'Ralat pelayan: {{status}}',
      serverErrorWithBody: 'Ralat pelayan: {{status}} - {{body}}',
      fetchFailed: 'Gagal memuatkan data pelanggan',
    },
    numberFormat: { million: 'Jt', thousand: 'rb' },
    status: {
      completed: 'Selesai',
      delivery: 'Dihantar',
      processing: 'Diproses',
      waitingApproval: 'Menunggu',
      pending: 'Tertunda',
    },
    card: {
      customerFallback: 'Pelanggan',
      serviceLabel: 'Perkhidmatan: {{service}}',
      serviceFallback: 'Katering',
      ordersStats: '{{count}} pesanan \u00b7 {{amount}}',
      dateUnknown: 'Tidak diketahui',
      vip: 'VIP',
    },
    stats: {
      totalCustomers: 'Jumlah Pelanggan',
      totalOrders: 'Jumlah Pesanan',
      totalRevenue: 'Jumlah Pendapatan',
    },
    growth: {
      newCustomers: '{{count}} baharu (30 hari)',
      returningCustomers: '{{count}} pelanggan setia',
    },
    empty: {
      title: 'Belum Ada Pelanggan',
      subtitle: 'Pelanggan akan dipaparkan selepas mereka membuat pesanan',
    },
    notFound: {
      title: 'Tidak Dijumpai',
      subtitle: 'Tiada pelanggan sepadan dengan carian "{{query}}"',
    },
    error: {
      title: 'Ralat Berlaku',
      retry: 'Cuba Lagi',
    },
    loading: 'Sedang memuatkan data pelanggan...',
  },

  ulasan: {
    header: { title: 'Ulasan Pelanggan' },
    accessibility: { back: 'Kembali' },
    errors: { fetchFailed: 'Gagal memuatkan ulasan' },
    buyerFallback: 'Pelanggan',
    orderLabel: 'Pesanan',
    orderDetailsFallback: 'Butiran tidak tersedia',
    totalReviews: '{{count}} ulasan',
    allReviews: 'Semua Ulasan ({{count}})',
    empty: {
      title: 'Belum Ada Ulasan',
      description: 'Ulasan daripada pelanggan akan dipaparkan di sini selepas mereka menyelesaikan pesanan',
      ratingOutOf5: '{{rating}}/5',
    },
  },
  detailUsaha: {
  identitas: {
    header: { title: 'Sediakan Identiti Anda', subtitle: 'Muat naik foto KTP dan foto diri sambil memegang KTP untuk proses pengesahan identiti.' },
    cardTitle: 'Sediakan Identiti Anda',
    upload: {
      ktp: { title: 'Ambil Foto e-KTP', subtitle: 'Ambil foto KTP yang jelas & tidak kabur' },
      selfie: { title: 'Ambil Foto Selfie bersama e-KTP', subtitle: 'Foto wajah sambil memegang KTP Anda' },
    },
    retakeButton: 'Ambil Semula Foto',
    continueButton: 'Seterusnya',
    alerts: {
      invalidPhoto: {
        title: 'Foto Tidak Sah',
        message: 'Foto yang diambil tidak dikesan sebagai KTP. Pastikan:\n\n• KTP kelihatan jelas dan tidak kabur\n• Keseluruhan KTP berada dalam bingkai\n• Pencahayaan mencukupi\n\nSila cuba lagi.',
        retryButton: 'Cuba Lagi',
      },
      permissionDenied: { title: 'Kebenaran Ditolak', message: 'Kami memerlukan kebenaran kamera untuk mengambil foto. Sila aktifkan kebenaran kamera dalam tetapan aplikasi.' },
      incomplete: { title: 'Perhatian', message: 'Sila ambil foto KTP dan selfie terlebih dahulu' },
    },
    permissionModal: {
      title: 'Kebenaran Akses Kamera',
      textKtp: 'Kami memerlukan akses kamera untuk mengambil foto e-KTP anda. Foto ini digunakan untuk proses pengesahan identiti.',
      textSelfie: 'Kami memerlukan akses kamera untuk mengambil foto selfie bersama e-KTP anda. Foto ini digunakan untuk proses pengesahan identiti.',
      later: 'Nanti',
      allow: 'Benarkan',
    },
  },
  detail: {
    header: { title: 'Sediakan Butiran Perniagaan Anda', subtitle: 'Lengkapkan maklumat perniagaan anda untuk meneruskan proses pengesahan.' },
    cardTitle: 'Butiran Perniagaan',
    fields: {
      outletName: { label: 'Nama Outlet', placeholder: 'Masukkan nama penuh anda...' },
      outletPhone: { label: 'Nombor Telefon Outlet', placeholder: '0813...' },
      outletEmail: { label: 'E-mel Outlet', placeholder: 'Masukkan e-mel outlet anda...' },
      password: { label: 'Kata Laluan', placeholder: 'Min. 8 Aksara...' },
      taxRate: { label: 'Masukkan Cukai Restoran/PB1 yang Berkuat Kuasa (Pilihan)', placeholder: 'Contoh: 10 (dalam %)' },
      bank: { label: 'Pilih Bank', placeholder: 'Pilih bank anda' },
      bankAccountNumber: { label: 'Nombor Akaun Bank', placeholder: 'Contoh: 1234567890' },
    },
    continueButton: 'Seterusnya',
    alerts: { incomplete: { title: 'Borang Tidak Lengkap', message: 'Sila lengkapkan semua data yang diperlukan:' } },
  },
  syarat: {
    header: { title: 'Terma dan Syarat', subtitle: 'Baca dan setuju dengan terma berikut sebelum meneruskan proses pendaftaran rakan kongsi' },
    termsList: [
      'Rakan kongsi wajib menjaga kualiti dan kebersihan produk yang dijual.',
      'Data perniagaan yang didaftarkan mestilah benar dan boleh dipertanggungjawabkan.',
      'Rakan kongsi wajib mengemas kini ketersediaan menu secara berkala melalui aplikasi.',
      'Pengesahan pesanan mesti dilakukan dalam masa 1x24 jam selepas pesanan diterima.',
      'Setiap transaksi yang berjaya dikenakan komisen platform sebanyak 10%.',
      'Pelanggaran terhadap terma di atas boleh mengakibatkan penyahaktifan akaun rakan kongsi.',
    ],
    sections: {
      general: { title: 'Terma Umum Platform', checkboxLabel: 'Saya bersetuju dengan terma umum di atas' },
      halal: {
        title: 'Pernyataan Status Halal',
        paragraph: 'Tandakan jika produk anda halal. Label akan dipaparkan secara automatik pada profil dan boleh ditapis oleh pembeli. Jika tidak ditanda, kedai ditandakan sebagai umum, bukan bermaksud tidak halal.',
        checkboxLabel: 'Produk saya halal',
      },
    },
    submitButton: 'Daftar Sekarang',
    alerts: {
      notAgreed: { title: 'Terma Belum Dipersetujui', message: 'Sila setuju dengan terma umum platform sebelum meneruskan pendaftaran.' },
      submitFailed: { title: 'Pendaftaran Gagal', message: 'Ralat berlaku semasa menghantar data:\n\n{{details}}', noDetails: 'Tiada butiran ralat tambahan' },
      systemError: {
        title: 'Ralat Sistem',
        defaultMessage: 'Ralat berlaku semasa pendaftaran. Sila cuba lagi.',
        serverError: 'Ralat {{status}}: {{message}}',
        serverErrorFallback: 'Ralat Pelayan',
        timeout: 'Tamat masa sambungan. Sila semak sambungan internet anda dan cuba lagi.',
        noResponse: 'Tiada respons daripada pelayan. Sila semak sambungan internet anda.',
        networkError: 'Tidak dapat menyambung ke pelayan. Sila semak sambungan internet anda.',
        generic: 'Ralat: {{message}}',
        errorCode: 'Kod Ralat: {{code}}',
      },
    },
  },
  success: {
    title: 'Tahniah!',
    message: 'Anda telah berjaya mendaftar sebagai penjual di Bite&Co. Sila tunggu pengesahan daripada pasukan kami. Jika ada sebarang pertanyaan, sila hubungi kami di info@biteandco.com',
    button: 'Masuk ke Laman Utama Penjual',
  },
},
started: {
  title: "Mulakan Sebagai...",
  subtitle: "Pilih peranan anda untuk meneruskan",
  buyer: "Saya Pembeli",
  seller: "Saya Penjual",
},
sellerLogin: {
  greeting: "Halo!",
  subtitle: "Selamat datang ke Bite&Co",
  email: "E-mel",
  password: "Kata Laluan",
  forgotPassword: "Lupa kata laluan?",
  processing: "Sedang diproses...",
  login: "Log Masuk",
  noAccount: "Belum mempunyai akaun? ",
  register: "Daftar",
  loginFailedTitle: "Log Masuk Gagal",
  loginFailed: "Log masuk gagal",
  loginFailedRetry: "Log masuk gagal. Sila cuba lagi.",
},
};