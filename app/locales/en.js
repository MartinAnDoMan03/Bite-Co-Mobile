export default {
  common: {
    ok: 'OK',
    cancel: 'Cancel',
    save: 'Save',
    error: 'Error',
    success: 'Success',
    info: 'Info',
    warning: 'Warning',
  },

  settings: {
    headerTitle: 'Settings',

    sections: {
      notifications: {
        title: 'Notifications',
        orderNotifications: {
          label: 'Order Notifications',
          subtitle: 'Get notified about new orders',
        },
        promotionNotifications: {
          label: 'Promotion Notifications',
          subtitle: 'Get notified about promotions and offers',
        },
        soundEnabled: {
          label: 'Notification Sound',
          subtitle: 'Enable sound for notifications',
        },
        vibrationEnabled: {
          label: 'Vibration',
          subtitle: 'Enable vibration for notifications',
        },
      },

      business: {
        title: 'Business Settings',
        autoAcceptOrders: {
          label: 'Auto Accept Orders',
          subtitle: 'Automatically accept incoming orders',
        },
        showOnlineStatus: {
          label: 'Show Online Status',
          subtitle: 'Show your online status to customers',
        },
        allowScheduledOrders: {
          label: 'Scheduled Orders',
          subtitle: 'Allow customers to order for a specific time',
        },
      },

      account: {
        title: 'Account & Security',
        changePassword: {
          label: 'Change Password',
          subtitle: 'Change your account password',
        },
        twoFactor: {
          label: 'Two-Factor Authentication',
          subtitle: 'Increase your account security',
          comingSoon: '2FA feature is coming soon',
        },
      },

      app: {
        title: 'Application',
        language: {
          label: 'Language',
          subtitle: 'Choose the app language',
        },
        cache: {
          label: 'Clear Cache',
          subtitle: 'Remove app cache data',
          success: 'Cache cleared successfully',
        },
      },

      other: {
        title: 'Others',
        privacy: {
          label: 'Privacy Policy',
          subtitle: 'Read our privacy policy',
          comingSoon: 'Privacy policy will be shown here',
        },
        terms: {
          label: 'Terms & Conditions',
          subtitle: 'Read our terms and conditions',
          comingSoon: 'Terms & conditions will be shown here',
        },
        about: {
          label: 'About',
          subtitle: 'Version 1.2.5',
          title: 'About',
          message: 'Bite&Co Seller v1.2.5\nBuilt to make managing your store easier',
        },
      },

      danger: {
        title: 'Danger Zone',
        logout: {
          label: 'Log Out',
          subtitle: 'Sign out of the app',
        },
        deleteAccount: {
          label: 'Delete Account',
          subtitle: 'Delete your account and all data',
        },
      },
    },

    languagePicker: {
      title: 'Choose Language',
      subtitle: 'Choose which language to use in the app',
    },

    changePasswordModal: {
      title: 'Change Password',
      currentPassword: 'Current Password',
      newPassword: 'New Password',
      confirmPassword: 'Confirm New Password',
      errors: {
        emptyFields: 'Please fill in all password fields',
        mismatch: 'New password does not match the confirmation',
        tooShort: 'New password must be at least 6 characters',
      },
      success: 'Password changed successfully',
    },

    logoutModal: {
      title: 'Log Out',
      message: 'Are you sure you want to log out?',
      confirmButton: 'Log Out',
      success: 'Logged out successfully',
    },

    deleteAccountModal: {
      title: 'Delete Account',
      message: 'Are you sure you want to delete your account? This action cannot be undone and all data will be lost.',
      confirmButton: 'Delete',
      comingSoon: 'Account deletion is coming soon. Please contact customer service for help.',
    },
  },

  beranda: {
    welcome: 'Welcome',
    defaultStoreName: 'My Store',
    defaultAddress: 'Address not set',
    menu: {
      pelanggan: 'Customers',
      menu: 'Menu',
      jadwal: 'Schedule',
      laporan: 'Reports',
      riwayat: 'History',
      giziPro: 'GiziPro',
      biteEco: 'Bite Eco',
      ulasan: 'Reviews',
      bantuan: 'Help',
      pengaturan: 'Settings',
    },
    sections: {
      businessSummary: 'Business Summary',
      quickActions: 'Quick Actions',
      todaySummary: "Today's Summary",
    },
    stats: {
      subscribers: { title: 'Subscribers', subtitle: 'Meal plan customers' },
      monthlyRevenue: { title: 'Revenue This Month', subtitle: 'From {{count}} orders' },
      pendingOrders: { title: 'Pending Orders', subtitle: 'Needs confirmation' },
      totalOrders: { title: 'Total Orders', subtitle: 'All time' },
    },
    quickActions: {
      addMenu: { title: 'Add New Menu', description: 'Add food items to your catalog' },
      viewOrders: { title: 'View New Orders', description: '{{count}} orders awaiting confirmation' },
      updateSchedule: { title: 'Update Schedule', description: 'Manage your weekly delivery schedule' },
    },
    today: {
      newOrders: 'New Orders',
      readyToDeliver: 'Ready to Deliver',
      completed: 'Completed',
    },
  },

  pesanan: {
    header: { title: 'Orders' },
    emptyState: 'No orders yet.',
    dateNotAvailable: 'Date not available',
    filters: {
      all: 'All',
      processing: 'Processing',
      payment: 'Payment',
      completed: 'Completed',
    },
    status: {
      awaitingApproval: 'Awaiting Approval',
      awaitingPayment: 'Awaiting Payment',
      processing: 'Processing',
      delivery: 'Delivery',
      recurring: 'Active Delivery Cycle',
      completed: 'Completed',
      cancelled: 'Cancelled',
    },
    actions: {
      pleaseWait: 'Please wait...',
      sendOrder: 'Send Order',
      completedToday: 'Completed today',
      completeOrderBiteEco: 'Complete Order',
      completeOrder: 'Complete Order',
      accept: 'Accept',
      reject: 'Reject',
    },
    startsInDays: 'Starts in {{count}} days',
    remainingDays: '{{count}} days left',
    deliveryHistory: 'Delivery history ({{count}})',
    accessibility: {
      back: 'Back',
      orderDetail: 'Order detail',
      chatBuyer: 'Chat with buyer',
    },
  },

  chat: {
    header: { title: 'Messages' },
    noMessages: 'No messages yet',
    online: 'Online',
    typeMessage: 'Type a message...',
    searchPlaceholder: 'Search conversations...',
    loadingConversations: 'Loading conversations...',
    noChatsFound: 'No chats found',
    sendMessageError: 'Failed to send message: ',
    accessibility: {
      back: 'Back',
    },
  },
  bantuan: {
    header: { title: 'Help & Support' },
    accessibility: { back: 'Back' },
    whatsappMessage: 'Hello, I need help with the Bite&Co seller app.',
    alerts: {
      whatsappNotInstalled: 'WhatsApp is not installed on your device',
      emailNotAvailable: 'Unable to open the email app',
      guideComingSoon: 'The full guide feature is coming soon',
      videoComingSoon: 'Video tutorials will be available soon',
    },
    sections: {
      contactUs: 'Contact Us',
      faq: 'Frequently Asked Questions (FAQ)',
      contactInfo: 'Contact Information',
      appInfo: 'App Information',
    },
    quickActions: {
      whatsapp: { title: 'WhatsApp Chat', subtitle: 'Contact our support team via WhatsApp' },
      email: { title: 'Email Support', subtitle: 'Send an email to our support team' },
      guide: { title: 'Full Guide', subtitle: 'Read the app usage guide' },
      video: { title: 'Video Tutorial', subtitle: 'Watch a video on how to use the app' },
    },
    faq: {
      q1: { question: 'How do I add a new menu item?', answer: 'Open the Menu page, tap the "+" button in the top right corner, then fill in the details such as name, price, description, and photo. Make sure all required fields are filled before saving.' },
      q2: { question: "Why don't orders show up on the dashboard?", answer: 'Make sure your internet connection is stable and your store status is set to "Open". If the issue persists, try refreshing the page or restarting the app.' },
      q3: { question: 'How do I change an order status?', answer: 'Go to the Order page, select the order you want to update, then tap the status button and choose a new status (Processing, Ready, Completed, etc).' },
      q4: { question: 'How do I view sales reports?', answer: 'Open the Reports menu to see a summary of daily, weekly, and monthly sales. You can also download reports in PDF or Excel format.' },
      q5: { question: "How do I set my store's opening hours?", answer: 'Go to the Schedule menu, then set your opening and closing hours for each day. You can also set days off or break times.' },
      q6: { question: "Why don't menu photos show up?", answer: 'Make sure the photo is in JPG or PNG format with a maximum size of 5MB. A slow internet connection can also cause photos to not display properly.' },
    },
    contact: {
      phone: '+62 812-3456-7890',
      email: 'support@biteandco.id',
      hours: 'Monday - Friday: 08:00 - 17:00 WIB',
      location: 'Jakarta, Indonesia',
    },
    appInfo: {
      versionLabel: 'App Version',
      versionValue: '1.2.5',
      lastUpdateLabel: 'Last Updated',
      lastUpdateValue: 'December 15, 2024',
      deviceIdLabel: 'Device ID',
      deviceIdValue: 'BTC-SELLER-001',
    },
  },

  biteEco: {
    header: { title: 'Bite Eco' },
    accessibility: { back: 'Back' },
    whatsappMessage: 'Hello, I would like to join the Bite Eco program for my store',
    intro: {
      title: 'Bite Eco',
      subtitle: 'Join the eco-friendly store movement for a greener future',
    },
    stats: {
      storesJoined: { value: '500+', label: 'Stores Joined' },
      ecoPackaging: { value: '10K+', label: 'Eco Packaging' },
      co2Reduced: { value: '2 Tons', label: 'CO2 Reduced' },
    },
    sections: {
      program: 'Bite Eco Program',
      benefits: 'Membership Benefits',
      tips: 'Eco-Friendly Store Tips',
    },
    features: {
      wasteManagement: { title: 'Manage Food Waste', description: 'Post and sell your food waste to buyers who need it', actionText: 'Manage Waste' },
      ecoPackaging: { title: 'Eco-Friendly Packaging', description: 'Get biodegradable packaging for all orders' },
      ecoCertificate: { title: 'Eco-Friendly Certificate', description: 'Get an official eco-friendly store certificate' },
      carbonTracking: { title: 'Carbon Footprint Tracking', description: "Track your store's carbon footprint" },
    },
    benefits: {
      brandImage: 'Boost your brand image as an eco-conscious store',
      discountPackaging: 'Get eco-friendly packaging at special prices',
      certificate: 'Official eco-friendly store certificate',
      community: 'Access to the eco-friendly store community',
    },
    tips: {
      reduceWaste: { title: 'Reduce Food Waste', description: 'Manage food portions properly to reduce waste' },
      localIngredients: { title: 'Use Local Ingredients', description: 'Prioritize ingredients from local farmers' },
      saveEnergy: { title: 'Save Energy', description: 'Optimize gas and electricity use while cooking' },
      compost: { title: 'Organic Composting', description: 'Turn food scraps into compost fertilizer' },
    },
    cta: {
      title: 'Ready to Become an Eco-Friendly Store?',
      description: 'Join the Bite Eco program and start contributing to a better environment',
      button: 'Join Now',
    },
  },

  jadwalPengantaran: {
    header: { title: 'Delivery Schedule' },
    detailHeader: { title: 'Delivery Detail' },
    accessibility: { back: 'Back' },
    filters: {
      all: 'All',
      processing: 'Processing',
      completed: 'Completed',
    },
    emptyState: 'No delivery schedules yet.',
    fallbackValue: '-',
    statusFallback: 'Pending',
    detail: {
      address: 'Address',
      deliveryDate: 'Delivery Date',
      deliveryTime: 'Delivery Time',
    },
    actions: {
      deliverNow: 'Deliver Now',
    },
    status: {
      processing: 'Processing',
      completed: 'Completed',
      cancelled: 'Cancelled',
    },
  },

  laporan: {
    header: { title: 'Sales Report' },
    accessibility: { back: 'Back' },
    timeRanges: {
      week: 'Week',
      month: 'Month',
      year: 'Year',
    },
    chart: {
      title: 'Revenue Summary',
      loading: 'Loading chart data...',
    },
    stats: {
      totalRevenue: 'Total Revenue',
      totalOrders: 'Total Orders',
      averageOrder: 'Average Order',
      customers: 'Customers',
      loadingValue: 'Loading...',
      comparedToLastPeriod: 'vs last period',
    },
    topItems: {
      title: 'Best Selling Items',
      loading: 'Loading best selling items...',
      empty: 'No sales data yet',
      ordersSuffix: '{{count}} orders',
    },
    errors: {
      loginRequired: 'Please login first',
      fetchFailed: 'Failed to load report data. Please try again.',
    },
    chartLabels: {
      week: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      year: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      monthPrefix: 'W',
    },
  },
  menuPage: {
    header: { title: 'Menu' },
    accessibility: { back: 'Back' },
    cards: {
      menu: { title: 'Menu', desc: 'Manage your menu list here' },
      paket: { title: 'Package', desc: 'Manage your package list here' },
    },
  },
  riwayat: {
    header: { title: 'Order History' },
    accessibility: { back: 'Back' },
    sectionTitle: 'Total {{count}} completed orders',
    statusCompleted: 'Completed',
    buyerFallback: 'Customer',
    itemsLabel: 'Menu',
    empty: {
      title: 'No History Yet',
      description: 'Completed orders will appear here',
    },
  },

  pelanggan: {
    header: { title: 'Customers' },
    accessibility: { back: 'Back' },
    search: { placeholder: 'Search customers...' },
    errors: {
      noToken: 'Token not found. Please login again.',
      parseFailed: 'Failed to process server data. Response is not JSON.',
      serverErrorHtml: 'Server error: Received HTML instead of JSON (Status: {{status}})',
      serverErrorGeneric: 'Server error: {{status}}',
      serverErrorWithBody: 'Server error: {{status}} - {{body}}',
      fetchFailed: 'Failed to load customer data',
    },
    numberFormat: { million: 'M', thousand: 'K' },
    status: {
      completed: 'Completed',
      delivery: 'Delivering',
      processing: 'Processing',
      waitingApproval: 'Waiting',
      pending: 'Pending',
    },
    card: {
      customerFallback: 'Customer',
      serviceLabel: 'Service: {{service}}',
      serviceFallback: 'Catering',
      ordersStats: '{{count}} orders \u00b7 {{amount}}',
      dateUnknown: 'Unknown',
      vip: 'VIP',
    },
    stats: {
      totalCustomers: 'Total Customers',
      totalOrders: 'Total Orders',
      totalRevenue: 'Total Revenue',
    },
    growth: {
      newCustomers: '{{count}} new (30 days)',
      returningCustomers: '{{count}} returning customers',
    },
    empty: {
      title: 'No Customers Yet',
      subtitle: 'Customers will appear here once they place an order',
    },
    notFound: {
      title: 'Not Found',
      subtitle: 'No customers match the search "{{query}}"',
    },
    error: {
      title: 'Something Went Wrong',
      retry: 'Try Again',
    },
    loading: 'Loading customer data...',
  },

  ulasan: {
    header: { title: 'Customer Reviews' },
    accessibility: { back: 'Back' },
    errors: { fetchFailed: 'Failed to load reviews' },
    buyerFallback: 'Customer',
    orderLabel: 'Order',
    orderDetailsFallback: 'Details not available',
    totalReviews: '{{count}} reviews',
    allReviews: 'All Reviews ({{count}})',
    empty: {
      title: 'No Reviews Yet',
      description: 'Customer reviews will appear here once they complete an order',
      ratingOutOf5: '{{rating}}/5',
    },
  },
  detailUsaha: {
  identitas: {
    header: { title: 'Prepare Your Identity', subtitle: 'Upload your ID card photo and a selfie holding it for identity verification.' },
    cardTitle: 'Prepare Your Identity',
    upload: {
      ktp: { title: 'Take ID Card Photo', subtitle: 'Take a clear, non-blurry photo of your ID card' },
      selfie: { title: 'Take Selfie with ID Card', subtitle: 'Take a photo of your face while holding your ID card' },
    },
    retakeButton: 'Retake Photo',
    continueButton: 'Next',
    alerts: {
      invalidPhoto: {
        title: 'Invalid Photo',
        message: 'The photo taken was not detected as an ID card. Make sure:\n\n• The ID card is clear and not blurry\n• The whole ID card is in frame\n• Lighting is sufficient\n\nPlease try again.',
        retryButton: 'Try Again',
      },
      permissionDenied: { title: 'Permission Denied', message: 'We need camera permission to take photos. Please enable camera permission in app settings.' },
      incomplete: { title: 'Attention', message: 'Please take your ID card and selfie photos first' },
    },
    permissionModal: {
      title: 'Camera Access Permission',
      textKtp: 'We need camera access to take a photo of your ID card. This photo is used for identity verification.',
      textSelfie: 'We need camera access to take a selfie with your ID card. This photo is used for identity verification.',
      later: 'Later',
      allow: 'Allow',
    },
  },
  detail: {
    header: { title: 'Prepare Your Business Details', subtitle: 'Complete your business information to continue the verification process.' },
    cardTitle: 'Business Details',
    fields: {
      outletName: { label: 'Outlet Name', placeholder: 'Enter your full name...' },
      outletPhone: { label: 'Outlet Phone Number', placeholder: '0813...' },
      outletEmail: { label: 'Outlet Email', placeholder: 'Enter your outlet email...' },
      password: { label: 'Password', placeholder: 'Min. 8 Characters...' },
      taxRate: { label: 'Enter Applicable Restaurant/PB1 Tax (Optional)', placeholder: 'Example: 10 (in %)' },
      bank: { label: 'Select Bank', placeholder: 'Select your bank' },
      bankAccountNumber: { label: 'Bank Account Number', placeholder: 'Example: 1234567890' },
    },
    continueButton: 'Next',
    alerts: { incomplete: { title: 'Incomplete Form', message: 'Please complete all required data:' } },
  },
  syarat: {
    header: { title: 'Terms and Conditions', subtitle: 'Read and agree to the following terms before continuing the partner registration process' },
    termsList: [
      'Partners must maintain the quality and cleanliness of the products sold.',
      'Registered business data must be accurate and accountable.',
      'Partners must update menu availability periodically through the app.',
      'Order confirmation must be done within 1x24 hours after the order is received.',
      'Every successful transaction is subject to a 10% platform commission.',
      'Violation of the above terms may result in deactivation of the partner account.',
    ],
    sections: {
      general: { title: 'General Platform Terms', checkboxLabel: 'I agree to the general terms above' },
      halal: {
        title: 'Halal Status Declaration',
        paragraph: 'Check this if your product is halal. The label will automatically appear on your profile and can be filtered by buyers. If unchecked, the store is marked as general, not necessarily non-halal.',
        checkboxLabel: 'My product is halal',
      },
    },
    submitButton: 'Register Now',
    alerts: {
      notAgreed: { title: 'Terms Not Agreed', message: 'Please agree to the general platform terms before continuing registration.' },
      submitFailed: { title: 'Registration Failed', message: 'An error occurred while sending data:\n\n{{details}}', noDetails: 'No additional error details' },
      systemError: {
        title: 'System Error',
        defaultMessage: 'An error occurred during registration. Please try again.',
        serverError: 'Error {{status}}: {{message}}',
        serverErrorFallback: 'Server Error',
        timeout: 'Connection timeout. Please check your internet connection and try again.',
        noResponse: 'No response from server. Please check your internet connection.',
        networkError: 'Unable to connect to server. Please check your internet connection.',
        generic: 'Error: {{message}}',
        errorCode: 'Error Code: {{code}}',
      },
    },
  },
  success: {
    title: 'Congratulations!',
    message: 'You have successfully registered as a seller on Bite&Co. Please wait for confirmation from our team. If you have any questions, please contact us at info@biteandco.com',
    button: 'Go to Seller Home',
  },
},
started: {
  title: "Get Started As...",
  subtitle: "Choose your role to continue",
  buyer: "I'm a Buyer",
  seller: "I'm a Seller",
},
sellerLogin: {
  greeting: "Hello!",
  subtitle: "Welcome to Bite&Co",
  email: "Email",
  password: "Password",
  forgotPassword: "Forgot password?",
  processing: "Processing...",
  login: "Login",
  noAccount: "Don't have an account? ",
  register: "Register",
  loginFailedTitle: "Login Failed",
  loginFailed: "Login failed",
  loginFailedRetry: "Login failed. Please try again.",
},
};