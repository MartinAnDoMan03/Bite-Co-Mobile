import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  Image,
  Alert,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import { KeyboardAvoidingView, Platform } from "react-native";
import config from '../constants/config';
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from 'expo-file-system/legacy';
import { useLanguage } from '../contexts/LanguageContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const BURGUNDY = "#711330";

// Helper responsif sederhana biar ukuran nggak "kekunci" di satu device
const scale = (size) => (SCREEN_WIDTH / 375) * size;
const CARD_MARGIN_H = Math.max(14, SCREEN_WIDTH * 0.045);

/* ---------- Reusable step header (burgundy + step badge) ---------- */
const StepHeader = ({ step, title, subtitle, containerStyle }) => (
  <View style={[styles.stepHeader, containerStyle]}>
    <View style={styles.stepBadge}>
      <Text style={styles.stepBadgeText}>{step}</Text>
    </View>
    <Text style={styles.stepTitle}>{title}</Text>
    <Text style={styles.stepSubtitle}>{subtitle}</Text>
  </View>
);

/* ---------- Reusable bullet item (Syarat step) ---------- */
const BulletItem = ({ text }) => (
  <View style={styles.bulletRow}>
    <Text style={styles.bulletDot}>{"\u2022"}</Text>
    <Text style={styles.bulletText}>{text}</Text>
  </View>
);

/* ---------- Reusable terms section w/ checkbox (Syarat step) ---------- */
const TermsSection = ({ title, children, checked, onToggle, checkboxLabel }) => (
  <View style={styles.termsSection}>
    <Text style={styles.termsSectionTitle}>{title}</Text>
    {children}
    <TouchableOpacity
      style={styles.checkboxRow}
      onPress={onToggle}
      activeOpacity={0.8}
    >
      <View style={[styles.checkboxBox, checked && styles.checkboxBoxChecked]}>
        {checked && <Ionicons name="checkmark" size={14} color="#fff" />}
      </View>
      <Text style={styles.checkboxLabel}>{checkboxLabel}</Text>
    </TouchableOpacity>
  </View>
);

/* ---------- Success screen ---------- */
const Success = () => {
  const router = useRouter();
  const { t } = useLanguage();
  return (
    <View style={styles.successContainer}>
      <View style={styles.successIconWrap}>
        <Ionicons name="checkmark" size={40} color={BURGUNDY} />
      </View>
      <Text style={styles.successTitle}>{t('detailUsaha.success.title')}</Text>
      <Text style={styles.successText}>
        {t('detailUsaha.success.message')}
      </Text>
      <TouchableOpacity
        style={styles.successBtn}
        // NOTE: sesuaikan route ini dengan route beranda seller di project-mu,
        // contoh: "/seller/home" atau "/(seller)/dashboard"
        onPress={() => router.replace("/seller/SellerHome")}
      >
        <Text style={styles.successBtnText}>{t('detailUsaha.success.button')}</Text>
      </TouchableOpacity>
    </View>
  );
};

/* ---------- Step 3: Syarat dan Ketentuan ---------- */
const Syarat = ({ setScreenNow, ktpImage, selfieImage, formData, selectedBank, setLoading }) => {
  const { t } = useLanguage();
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [productHalal, setProductHalal] = useState(false);

  const termsList = t('detailUsaha.syarat.termsList');

  const handleFinish = async () => {
    if (!agreedTerms) {
      Alert.alert(
        t('detailUsaha.syarat.alerts.notAgreed.title'),
        t('detailUsaha.syarat.alerts.notAgreed.message')
      );
      return;
    }

    setLoading(true);

    try {
      const data = new FormData();
      data.append("ktp", { uri: ktpImage.uri, type: "image/jpeg", name: "ktp.jpg" });
      data.append("selfie", { uri: selfieImage.uri, type: "image/jpeg", name: "selfie.jpg" });
      data.append("outletName", formData.outletName);
      data.append("outletPhone", formData.outletPhone);
      data.append("outletEmail", formData.outletEmail);
      data.append("taxRate", formData.taxRate || "0");
      data.append("bankName", selectedBank);
      data.append("bankAccountNumber", formData.bankAccountNumber);
      data.append("password", formData.password);
      data.append("agreedTerms", agreedTerms ? "1" : "0");
      data.append("productHalal", productHalal ? "1" : "0");

      const response = await axios.post(
        `${config.API_URL}/seller/register`,
        data,
        { headers: { "Content-Type": "multipart/form-data" }, timeout: config.TIMEOUT }
      );

      if (response.data.success) {
        setScreenNow("success");
      } else {
        const errorDetails = response.data.errors
          ? Object.entries(response.data.errors)
              .map(([field, message]) => `• ${field}: ${message}`)
              .join("\n")
          : response.data.message || t('detailUsaha.syarat.alerts.submitFailed.noDetails');

        Alert.alert(t('detailUsaha.syarat.alerts.submitFailed.title'), t('detailUsaha.syarat.alerts.submitFailed.message', { details: errorDetails }));
      }
    } catch (error) {
      let errorMessage = t('detailUsaha.syarat.alerts.systemError.defaultMessage');

      if (error.response) {
        const serverError = error.response.data;
        errorMessage = t('detailUsaha.syarat.alerts.systemError.serverError', {
          status: error.response.status,
          message: serverError.message || t('detailUsaha.syarat.alerts.systemError.serverErrorFallback'),
        }) + "\n";
        if (serverError.errors) {
          errorMessage += Object.entries(serverError.errors)
            .map(([field, messages]) => `• ${field}: ${messages.join(", ")}`)
            .join("\n");
        }
      } else if (error.request) {
        errorMessage =
          error.code === "ECONNABORTED"
            ? t('detailUsaha.syarat.alerts.systemError.timeout')
            : t('detailUsaha.syarat.alerts.systemError.noResponse');
      } else if (error.message.includes("Network Error")) {
        errorMessage = t('detailUsaha.syarat.alerts.systemError.networkError');
      } else {
        errorMessage = t('detailUsaha.syarat.alerts.systemError.generic', { message: error.message });
      }

      Alert.alert(
        t('detailUsaha.syarat.alerts.systemError.title'),
        errorMessage + "\n\n" + t('detailUsaha.syarat.alerts.systemError.errorCode', { code: error.code || "UNKNOWN" })
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <StepHeader
        step={3}
        title={t('detailUsaha.syarat.header.title')}
        subtitle={t('detailUsaha.syarat.header.subtitle')}
      />

      <View style={styles.whiteCard}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: 30 }}
          showsVerticalScrollIndicator={false}
        >
          <TermsSection
            title={t('detailUsaha.syarat.sections.general.title')}
            checked={agreedTerms}
            onToggle={() => setAgreedTerms(!agreedTerms)}
            checkboxLabel={t('detailUsaha.syarat.sections.general.checkboxLabel')}
          >
            {termsList.map((item, index) => (
              <BulletItem key={index} text={item} />
            ))}
          </TermsSection>

          <TermsSection
            title={t('detailUsaha.syarat.sections.halal.title')}
            checked={productHalal}
            onToggle={() => setProductHalal(!productHalal)}
            checkboxLabel={t('detailUsaha.syarat.sections.halal.checkboxLabel')}
          >
            <Text style={styles.termsParagraph}>
              {t('detailUsaha.syarat.sections.halal.paragraph')}
            </Text>
          </TermsSection>

          <TouchableOpacity
            style={[styles.btnPrimary, { marginTop: 24 }]}
            onPress={handleFinish}
            activeOpacity={0.85}
          >
            <Text style={styles.btnPrimaryText}>{t('detailUsaha.syarat.submitButton')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </>
  );
};

/* ---------- Step 2: Detail Usaha (form) ---------- */
const Detail = ({ setScreenNow, onNext }) => {
  const { t } = useLanguage();
  const [selectedBank, setSelectedBank] = useState(null);
  const [showBankModal, setShowBankModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    outletName: "",
    outletPhone: "",
    outletEmail: "",
    taxRate: "",
    bankAccountNumber: "",
    password: "",
  });

  const banks = [
    { id: 1, name: "BCA" },
    { id: 2, name: "Mandiri" },
    { id: 3, name: "BRI" },
    { id: 4, name: "BNI" },
  ];

  const handleInputChange = (name, value) => {
    setFormData({ ...formData, [name]: value });
  };

  const handleNext = () => {
    if (
      !formData.outletName ||
      !formData.outletPhone ||
      !formData.outletEmail ||
      !selectedBank ||
      !formData.bankAccountNumber ||
      !formData.password
    ) {
      const missingFields = [
        !formData.outletName && t('detailUsaha.detail.fields.outletName.label'),
        !formData.outletPhone && t('detailUsaha.detail.fields.outletPhone.label'),
        !formData.outletEmail && t('detailUsaha.detail.fields.outletEmail.label'),
        !selectedBank && t('detailUsaha.detail.fields.bank.label'),
        !formData.bankAccountNumber && t('detailUsaha.detail.fields.bankAccountNumber.label'),
        !formData.password && t('detailUsaha.detail.fields.password.label'),
      ].filter(Boolean);

      Alert.alert(
        t('detailUsaha.detail.alerts.incomplete.title'),
        t('detailUsaha.detail.alerts.incomplete.message') + "\n" + missingFields.map((f) => `• ${f}\n`).join("")
      );
      return;
    }

    // Simpan data ke parent, lalu lanjut ke step 3 (Syarat dan Ketentuan)
    onNext(formData, selectedBank);
    setScreenNow("syarat");
  };

  return (
    <>
      <StepHeader
        step={2}
        title={t('detailUsaha.detail.header.title')}
        subtitle={t('detailUsaha.detail.header.subtitle')}
      />

      <View style={styles.whiteCard}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={{ paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.cardTitle}>{t('detailUsaha.detail.cardTitle')}</Text>

            <Text style={styles.fieldLabel}>{t('detailUsaha.detail.fields.outletName.label')}</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder={t('detailUsaha.detail.fields.outletName.placeholder')}
              placeholderTextColor="#aaa"
              value={formData.outletName}
              onChangeText={(text) => handleInputChange("outletName", text)}
            />

            <Text style={styles.fieldLabel}>{t('detailUsaha.detail.fields.outletPhone.label')}</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder={t('detailUsaha.detail.fields.outletPhone.placeholder')}
              placeholderTextColor="#aaa"
              keyboardType="phone-pad"
              value={formData.outletPhone}
              onChangeText={(text) => handleInputChange("outletPhone", text)}
            />

            <Text style={styles.fieldLabel}>{t('detailUsaha.detail.fields.outletEmail.label')}</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder={t('detailUsaha.detail.fields.outletEmail.placeholder')}
              placeholderTextColor="#aaa"
              keyboardType="email-address"
              autoCapitalize="none"
              value={formData.outletEmail}
              onChangeText={(text) => handleInputChange("outletEmail", text)}
            />

            <Text style={styles.fieldLabel}>{t('detailUsaha.detail.fields.password.label')}</Text>
            <View style={styles.passwordFieldWrap}>
              <TextInput
                style={[styles.fieldInput, { paddingRight: scale(44) }]}
                placeholder={t('detailUsaha.detail.fields.password.placeholder')}
                placeholderTextColor="#aaa"
                secureTextEntry={!showPassword}
                value={formData.password}
                onChangeText={(text) => handleInputChange("password", text)}
              />
              <TouchableOpacity
                style={styles.passwordEyeBtn}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#888"
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>{t('detailUsaha.detail.fields.taxRate.label')}</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder={t('detailUsaha.detail.fields.taxRate.placeholder')}
              placeholderTextColor="#aaa"
              keyboardType="numeric"
              value={formData.taxRate}
              onChangeText={(text) => handleInputChange("taxRate", text)}
            />

            <Text style={styles.fieldLabel}>{t('detailUsaha.detail.fields.bank.label')}</Text>
            <View style={styles.bankFieldWrap}>
              <TouchableOpacity
                style={styles.fieldInput}
                onPress={() => setShowBankModal(!showBankModal)}
                activeOpacity={0.8}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ color: selectedBank ? "#1a1a1a" : "#aaa", fontSize: scale(14.5) }}>
                    {selectedBank || t('detailUsaha.detail.fields.bank.placeholder')}
                  </Text>
                  <Ionicons
                    name={showBankModal ? "chevron-up" : "chevron-down"}
                    size={18}
                    color={BURGUNDY}
                  />
                </View>
              </TouchableOpacity>

              {showBankModal && (
                <View style={styles.bankDropdown}>
                  {banks.map((bank, index) => (
                    <TouchableOpacity
                      key={bank.id}
                      style={[
                        styles.bankDropdownItem,
                        index === banks.length - 1 && { borderBottomWidth: 0 },
                      ]}
                      onPress={() => {
                        setSelectedBank(bank.name);
                        setShowBankModal(false);
                      }}
                    >
                      <Text
                        style={{
                          fontSize: scale(14),
                          color: selectedBank === bank.name ? BURGUNDY : "#1a1a1a",
                          fontWeight: selectedBank === bank.name ? "700" : "400",
                        }}
                      >
                        {bank.name}
                      </Text>
                      {selectedBank === bank.name && (
                        <Ionicons name="checkmark" size={16} color={BURGUNDY} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <Text style={styles.fieldLabel}>{t('detailUsaha.detail.fields.bankAccountNumber.label')}</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder={t('detailUsaha.detail.fields.bankAccountNumber.placeholder')}
              placeholderTextColor="#aaa"
              keyboardType="numeric"
              value={formData.bankAccountNumber}
              onChangeText={(text) => handleInputChange("bankAccountNumber", text)}
            />

            <TouchableOpacity style={styles.btnPrimary} onPress={handleNext} activeOpacity={0.85}>
              <Text style={styles.btnPrimaryText}>{t('detailUsaha.detail.continueButton')}</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </>
  );
};

/* ---------- Step 1: Identitas (KTP + selfie) ---------- */
const UploadItem = ({ number, title, subtitle, image, onPress, locked, retakeLabel }) => {
  if (image) {
    return (
      <View style={styles.uploadCard}>
        <View style={styles.uploadCardHeader}>
          <View style={styles.checkCircleActive}>
            <Ionicons name="checkmark" size={14} color="#fff" />
          </View>
          <Text style={styles.uploadCardTitle}>{title}</Text>
        </View>

        <View style={styles.uploadBox}>
          <Image source={{ uri: image.uri }} style={styles.uploadPreview} resizeMode="cover" />
        </View>

        <TouchableOpacity style={styles.retakeBtn} onPress={onPress} activeOpacity={0.85}>
          <Text style={styles.retakeBtnText}>{retakeLabel}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={styles.listRow}
      onPress={onPress}
      activeOpacity={locked ? 1 : 0.7}
      disabled={locked}
    >
      <View style={[styles.listNumberCircle, locked && styles.listNumberCircleLocked]}>
        <Text style={[styles.listNumberText, locked && styles.listNumberTextLocked]}>{number}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.listRowTitle, locked && styles.listRowTitleLocked]}>{title}</Text>
        <Text style={styles.listRowSubtitle}>{subtitle}</Text>
      </View>
      {!locked && (
        <View style={styles.listArrowCircle}>
          <Ionicons name="arrow-forward" size={16} color="#fff" />
        </View>
      )}
    </TouchableOpacity>
  );
};

const Identitas = ({ setScreenNow, setKtpImage, setSelfieImage, ktpImage, selfieImage, setLoading }) => {
  const { t } = useLanguage();
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [pendingIsKtp, setPendingIsKtp] = useState(true);
  const [cameraPermissionGranted, setCameraPermissionGranted] = useState(false);

const openCameraFor = async (isKtp) => {
  let result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.5,
  });

  if (!result.canceled) {
    if (isKtp) {
      // Validate KTP before accepting
      setLoading(true); // you'll need to pass setLoading down to Identitas
      const isValidKTP = await validateKTP(result.assets[0].uri);
      setLoading(false);
      
      if (isValidKTP === false) {
        Alert.alert(
          t('detailUsaha.identitas.alerts.invalidPhoto.title'),
          t('detailUsaha.identitas.alerts.invalidPhoto.message'),
          [{ text: t('detailUsaha.identitas.alerts.invalidPhoto.retryButton'), style: 'default' }]
        );
        return;
      }
      // isValidKTP === null artinya API gagal
      setKtpImage(result.assets[0]);
    } else {
     setLoading(true);
      const validation = await validateSelfieWithKTP(result.assets[0].uri);
      setLoading(false);

      if (validation === null) {
        setSelfieImage(result.assets[0]);
        return;
      }

      if (!validation.hasFace) {
        Alert.alert(
          'Wajah Tidak Terdeteksi',
          'Pastikan wajah terlihat jelas dalam foto. Pastikan:\n\n• Wajah menghadap kamera\n• Pencahayaan cukup\n• Tidak ada objek lain yang menutupi wajah\n\nSilahkan coba kembali',
          [{ text: 'Coba Lagi', style: 'default' }]
        );
        return;
      }

      if (!validation.hasKTPText) {
        Alert.alert(
          'KTP Tidak Terdeteksi',
          'Pastikan KTP terlihat jelas dalam foto. Pastikan:\n\n• KTP menghadap kamera\n• Pencahayaan cukup\n• Tidak ada objek lain yang menutupi KTP\n\nSilahkan coba kembali',
          [{ text: 'Coba Lagi', style: 'default' }]
        );
        return;
      }

      setSelfieImage(result.assets[0]);
    }
  }
};

  // Validasi KTP menggunakan Google Vision API
  const validateKTP = async (imageUri) => {
  try {
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const visionResponse = await axios.post(
      `https://vision.googleapis.com/v1/images:annotate?key=${config.GOOGLE_MAPS_API_KEY}`,
      {
        requests: [{
          image: { content: base64 },
          features: [{ type: 'TEXT_DETECTION', maxResults: 1 }]
        }]
      }
    );
    const detectedText = visionResponse.data.responses[0]?.fullTextAnnotation?.text?.toUpperCase() || '';
    const ktpKeywords = ['NIK', 'NAMA', 'TEMPAT', 'LAHIR', 'ALAMAT', 'JENIS', 'KELAMIN', 'KECAMATAN', 'PEKERJAAN', 'KEWARGANEGARAAN'];
    const matchCount = ktpKeywords.filter(keyword => detectedText.includes(keyword)).length;
    return matchCount >= 3;
  } catch (error) {
    console.error('Error validating KTP image:', error);
    return null;
  }
};

// Validasi selfie dengan KTP menggunakan Google Vision API
const validateSelfieWithKTP = async (imageUri) => {
  try {
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const visionResponse = await axios.post(
      `https://vision.googleapis.com/v1/images:annotate?key=${config.GOOGLE_MAPS_API_KEY}`,
      {
        requests: [{
          image: { content: base64 },
          features: [
            { type: 'FACE_DETECTION', maxResults: 5 },
          ]
        }]
      }
    );
    const response = visionResponse.data.responses[0];
    const faces = response.faceAnnotations || [];
    const hasFace = faces.length > 0;
    return { hasFace, hasKTPText: true }; // always pass KTP text check
  } catch (error) {
    console.error('Error validating selfie:', error);
    return null;
  }
};

  const requestPickImage = async (isKtp) => {
    const { status: currentStatus } = await ImagePicker.getCameraPermissionsAsync();
    if (currentStatus === "granted" || cameraPermissionGranted) {
      openCameraFor(isKtp);
      return;
    }
    setPendingIsKtp(isKtp);
    setShowPermissionModal(true);
  };

  const confirmAndPickImage = () => {
    setShowPermissionModal(false);

    setTimeout(async () => {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          t('detailUsaha.identitas.alerts.permissionDenied.title'),
          t('detailUsaha.identitas.alerts.permissionDenied.message')
        );
        return;
      }

      setCameraPermissionGranted(true);
      openCameraFor(pendingIsKtp);
    }, Platform.OS === "android" ? 500 : 0);
  };

  const handleContinue = () => {
    if (!ktpImage || !selfieImage) {
      Alert.alert(t('detailUsaha.identitas.alerts.incomplete.title'), t('detailUsaha.identitas.alerts.incomplete.message'));
      return;
    }
    setScreenNow("detail");
  };

  return (
    <>
      <View style={{ flex: 1 }}>
        <StepHeader
          step={1}
          title={t('detailUsaha.identitas.header.title')}
          subtitle={t('detailUsaha.identitas.header.subtitle')}
          containerStyle={styles.stepHeaderFlex}
        />

        <View style={styles.whiteCardAuto}>
          <Text style={styles.cardTitle}>{t('detailUsaha.identitas.cardTitle')}</Text>

          <UploadItem
            number={1}
            title={t('detailUsaha.identitas.upload.ktp.title')}
            subtitle={t('detailUsaha.identitas.upload.ktp.subtitle')}
            image={ktpImage}
            onPress={() => requestPickImage(true)}
            locked={false}
            retakeLabel={t('detailUsaha.identitas.retakeButton')}
          />

          <UploadItem
            number={2}
            title={t('detailUsaha.identitas.upload.selfie.title')}
            subtitle={t('detailUsaha.identitas.upload.selfie.subtitle')}
            image={selfieImage}
            onPress={() => requestPickImage(false)}
            locked={!ktpImage}
            retakeLabel={t('detailUsaha.identitas.retakeButton')}
          />

          <TouchableOpacity
            style={[
              styles.btnPrimary,
              styles.btnPrimaryIdentitas,
              { opacity: ktpImage && selfieImage ? 1 : 0.5 },
            ]}
            onPress={handleContinue}
            disabled={!ktpImage || !selfieImage}
            activeOpacity={0.85}
          >
            <Text style={styles.btnPrimaryText}>{t('detailUsaha.identitas.continueButton')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ---------- Modal custom izin kamera ---------- */}
      <Modal
        visible={showPermissionModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPermissionModal(false)}
      >
        <View style={styles.permissionOverlay}>
          <View style={styles.permissionCard}>
            <View style={styles.permissionIconWrap}>
              <Ionicons name="camera" size={28} color={BURGUNDY} />
            </View>

            <Text style={styles.permissionTitle}>{t('detailUsaha.identitas.permissionModal.title')}</Text>
            <Text style={styles.permissionText}>
              {pendingIsKtp
                ? t('detailUsaha.identitas.permissionModal.textKtp')
                : t('detailUsaha.identitas.permissionModal.textSelfie')}
            </Text>

            <View style={styles.permissionBtnRow}>
              <TouchableOpacity
                style={styles.permissionBtnSecondary}
                onPress={() => setShowPermissionModal(false)}
                activeOpacity={0.85}
              >
                <Text style={styles.permissionBtnSecondaryText}>{t('detailUsaha.identitas.permissionModal.later')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.permissionBtnPrimary}
                onPress={confirmAndPickImage}
                activeOpacity={0.85}
              >
                <Text style={styles.permissionBtnPrimaryText}>{t('detailUsaha.identitas.permissionModal.allow')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

/* ---------- Root screen ---------- */
const DetailUsaha = () => {
  const [screenNow, setScreenNow] = useState("identitas");
  const [ktpImage, setKtpImage] = useState(null);
  const [selfieImage, setSelfieImage] = useState(null);
  const [loading, setLoading] = useState(false);
  // Menyimpan data dari step 2 (Detail Usaha) untuk dipakai saat submit di step 3
  const [businessData, setBusinessData] = useState(null);

  const handleDetailNext = (formData, selectedBank) => {
    setBusinessData({ formData, selectedBank });
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {loading && (
      <View style={styles.loadingOverlay}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BURGUNDY} />
        </View>
      </View>
    )}

      {screenNow === "identitas" && (
        <Identitas
          setScreenNow={setScreenNow}
          setKtpImage={setKtpImage}
          setSelfieImage={setSelfieImage}
          ktpImage={ktpImage}
          selfieImage={selfieImage}
          setLoading={setLoading}
        />
      )}

      {screenNow === "detail" && (
        <Detail
          setScreenNow={setScreenNow}
          onNext={handleDetailNext}
        />
      )}

      {screenNow === "syarat" && businessData && (
        <Syarat
          setScreenNow={setScreenNow}
          ktpImage={ktpImage}
          selfieImage={selfieImage}
          formData={businessData.formData}
          selectedBank={businessData.selectedBank}
          setLoading={setLoading}
        />
      )}

      {screenNow === "success" && <Success />}
    </SafeAreaView>
  );
};

export default DetailUsaha;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BURGUNDY,
  },
  stepHeader: {
    backgroundColor: BURGUNDY,
    alignItems: "center",
    paddingTop: scale(28),
    paddingBottom: scale(24),
    paddingHorizontal: 28,
  },
  stepHeaderFlex: {
    flex: 1,
    justifyContent: "center",
    paddingBottom: scale(24),
  },
  stepBadge: {
    width: scale(50),
    height: scale(50),
    borderRadius: scale(30),
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  stepBadgeText: {
    color: "#fff",
    fontSize: scale(28),
    fontWeight: "700",
    marginTop: -5,
  },
  stepTitle: {
    color: "#fff",
    fontSize: scale(19),
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  stepSubtitle: {
    color: "#f0d9df",
    fontSize: scale(14.5),
    textAlign: "center",
    lineHeight: scale(20),
    paddingHorizontal: 6,
  },
  whiteCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    marginHorizontal: CARD_MARGIN_H,
    marginTop: 0,
    marginBottom: 0,
    padding: scale(20),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 6,
  },
  whiteCardAuto: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    marginHorizontal: CARD_MARGIN_H,
    marginTop: 0,
    marginBottom: 0,
    paddingTop: scale(20),
    paddingHorizontal: scale(20),
    paddingBottom: scale(28),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 6,
  },
  cardTitle: {
    color: BURGUNDY,
    fontSize: scale(17),
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 18,
  },

  /* Form fields (Detail step) */
  fieldLabel: {
    color: BURGUNDY,
    fontSize: scale(12.5),
    fontWeight: "700",
    marginBottom: 6,
    marginTop: 12,
  },
  fieldInput: {
    backgroundColor: "#fff",
    borderWidth: 1.2,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingVertical: scale(12),
    paddingHorizontal: scale(16),
    fontSize: scale(14.5),
    color: "#1a1a1a",
    justifyContent: "center",
  },
  passwordFieldWrap: {
    position: "relative",
    justifyContent: "center",
  },
  passwordEyeBtn: {
    position: "absolute",
    right: scale(14),
    height: "100%",
    justifyContent: "center",
  },
  /* List row (belum diambil) */
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  listNumberCircle: {
    width: scale(30),
    height: scale(30),
    borderRadius: scale(15),
    backgroundColor: BURGUNDY,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  listNumberCircleLocked: {
    backgroundColor: "#e0e0e0",
  },
  listNumberText: {
    color: "#fff",
    fontSize: scale(13),
    fontWeight: "700",
  },
  listNumberTextLocked: {
    color: "#999",
  },
  listRowTitle: {
    color: BURGUNDY,
    fontSize: scale(14),
    fontWeight: "700",
    marginBottom: 2,
  },
  listRowTitleLocked: {
    color: "#aaa",
  },
  listRowSubtitle: {
    color: "#999",
    fontSize: scale(12),
    lineHeight: scale(16),
  },
  listArrowCircle: {
    width: scale(30),
    height: scale(30),
    borderRadius: scale(15),
    backgroundColor: BURGUNDY,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },

  /* Upload cards (sudah diambil) */
  uploadCard: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  uploadCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  checkCircleActive: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: BURGUNDY,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  uploadCardTitle: {
    color: "#1a1a1a",
    fontSize: scale(14),
    fontWeight: "600",
    flex: 1,
  },
  uploadBox: {
    height: Math.max(90, SCREEN_HEIGHT * 0.12),
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#eee",
    backgroundColor: "#fafafa",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: 10,
  },
  uploadPreview: {
    width: "100%",
    height: "100%",
  },
  retakeBtn: {
    alignSelf: "center",
    backgroundColor: "#fdf1f4",
    borderWidth: 1,
    borderColor: BURGUNDY,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  retakeBtnText: {
    color: BURGUNDY,
    fontSize: scale(12),
    fontWeight: "600",
  },

  /* Shared pill button */
  btnPrimary: {
    width: "100%",
    backgroundColor: BURGUNDY,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 120,
    shadowColor: BURGUNDY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },

  btnPrimaryIdentitas: {
    marginTop: 20,
  },
  btnPrimaryText: {
    color: "#fff",
    fontSize: scale(15),
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  bankFieldWrap: {
    position: "relative",
    zIndex: 10,
  },
  bankDropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    marginTop: 6,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: "#eee",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 8,
    overflow: "hidden",
    zIndex: 20,
  },
  bankDropdownItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: scale(13),
    paddingHorizontal: scale(16),
    borderBottomWidth: 1,
    borderBottomColor: "#f2f2f2",
  },

  /* Syarat dan Ketentuan (step 3) */
  termsSection: {
    borderWidth: 1.2,
    borderColor: "#f0d9df",
    backgroundColor: "#fffbfc",
    borderRadius: 14,
    padding: scale(16),
    marginTop: scale(16),
  },
  termsSectionTitle: {
    color: BURGUNDY,
    fontSize: scale(15),
    fontWeight: "700",
    marginBottom: 10,
  },
  termsParagraph: {
    color: "#444",
    fontSize: scale(13),
    lineHeight: scale(19),
  },
  bulletRow: {
    flexDirection: "row",
    marginBottom: 6,
    paddingRight: 4,
  },
  bulletDot: {
    color: "#444",
    fontSize: scale(13),
    lineHeight: scale(19),
    marginRight: 8,
  },
  bulletText: {
    flex: 1,
    color: "#444",
    fontSize: scale(13),
    lineHeight: scale(19),
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 14,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: "#ccc",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    marginTop: 1,
  },
  checkboxBoxChecked: {
    backgroundColor: BURGUNDY,
    borderColor: BURGUNDY,
  },
  checkboxLabel: {
    flex: 1,
    color: "#1a1a1a",
    fontSize: scale(13.5),
    fontWeight: "700",
    lineHeight: scale(19),
  },

  /* Permission modal custom */
  permissionOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
  },
  permissionCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
  },
  permissionIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#fdf1f4",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  permissionTitle: {
    color: BURGUNDY,
    fontSize: scale(17),
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  permissionText: {
    color: "#555",
    fontSize: scale(13.5),
    textAlign: "center",
    lineHeight: scale(19),
    marginBottom: 22,
  },
  permissionBtnRow: {
    flexDirection: "row",
    width: "100%",
    gap: 10,
  },
  permissionBtnSecondary: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: "#ddd",
    alignItems: "center",
  },
  permissionBtnSecondaryText: {
    color: "#888",
    fontSize: scale(14),
    fontWeight: "600",
  },
  permissionBtnPrimary: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: BURGUNDY,
    alignItems: "center",
  },
  permissionBtnPrimaryText: {
    color: "#fff",
    fontSize: scale(14),
    fontWeight: "700",
  },

  /* Success screen */
  successContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: BURGUNDY,
    padding: 24,
  },
  successIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  successTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 12,
  },
  successText: {
    color: "#f0d9df",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  successBtn: {
    backgroundColor: "#fff",
    paddingVertical: 15,
    borderRadius: 14,
    width: "100%",
    alignItems: "center",
  },
  successBtnText: {
    color: BURGUNDY,
    fontSize: 15,
    fontWeight: "700",
  },

  /* Loading overlay */
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
loadingContainer: {
  backgroundColor: "white",
  padding: 24,
  borderRadius: 16,
  alignItems: "center",
  justifyContent: "center",
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.15,
  shadowRadius: 12,
  elevation: 8,
},
});