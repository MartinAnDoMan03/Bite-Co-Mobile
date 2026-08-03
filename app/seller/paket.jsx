import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
  TouchableWithoutFeedback,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  PanResponder,
} from "react-native";
import React, { useState, useEffect, useRef } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import AntDesign from "@expo/vector-icons/AntDesign";
import COLORS from "../constants/color";
import { useRouter } from "expo-router";
import config from "../constants/config";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLanguage } from "../contexts/LanguageContext";

const getAuthToken = async () => {
  try {
    return await AsyncStorage.getItem("sellerToken");
  } catch (error) {
    console.error("Error getting auth token:", error);
    return null;
  }
};

// Alert kustom, selaras dengan pola CustomAlert di halaman lain
const ALERT_TYPE_STYLES = {
  info: { icon: "info", color: COLORS.PRIMARY, bg: "#F7EAEF" },
  success: { icon: "check-circle", color: "#2E7D32", bg: "#E8F5E9" },
  error: { icon: "error", color: "#C62828", bg: "#FFEBEE" },
  warning: { icon: "warning", color: "#B26A00", bg: "#FFF3E0" },
};

const CustomAlert = ({ visible, title, message, buttons, type = "info", onClose }) => {
  const typeStyle = ALERT_TYPE_STYLES[type] || ALERT_TYPE_STYLES.info;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.alertOverlay}>
        <View style={styles.alertContent}>
          <View style={[styles.alertIconCircle, { backgroundColor: typeStyle.bg }]}>
            <MaterialIcons name={typeStyle.icon} size={26} color={typeStyle.color} />
          </View>
          <Text style={styles.alertTitle}>{title}</Text>
          {!!message && <Text style={styles.alertMessage}>{message}</Text>}
          <View style={styles.alertButtons}>
            {buttons.map((btn, index) => {
              const isCancel = btn.style === "cancel";
              const isDestructive = btn.style === "destructive";
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.alertButton,
                    isCancel && styles.alertButtonOutline,
                    isDestructive && styles.alertButtonDestructive,
                    !isCancel && !isDestructive && styles.alertButtonSolid,
                  ]}
                  onPress={() => {
                    onClose();
                    btn.onPress && btn.onPress();
                  }}
                >
                  <Text style={[styles.alertButtonText, isCancel ? styles.alertButtonTextOutline : styles.alertButtonTextSolid]}>
                    {btn.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Segmented tab switcher: Rantangan vs Paket Catering
const TabSwitcher = ({ activeTab, setActiveTab, t }) => (
  <View style={styles.tabSwitcher}>
    <TouchableOpacity
      style={[styles.tabButton, activeTab === "rantangan" && styles.tabButtonActive]}
      onPress={() => setActiveTab("rantangan")}
      activeOpacity={0.85}
    >
      <Text style={[styles.tabButtonText, activeTab === "rantangan" && styles.tabButtonTextActive]}>
        {t('paket.tabs.rantangan')}
      </Text>
    </TouchableOpacity>
    <TouchableOpacity
      style={[styles.tabButton, activeTab === "catering" && styles.tabButtonActive]}
      onPress={() => setActiveTab("catering")}
      activeOpacity={0.85}
    >
      <Text style={[styles.tabButtonText, activeTab === "catering" && styles.tabButtonTextActive]}>
        {t('paket.tabs.catering')}
      </Text>
    </TouchableOpacity>
  </View>
);

// Item paket rantangan, swipe kiri buat munculin tombol edit & hapus (pola sama seperti DaftarKetegori)
const RantanganPackageItem = ({ nama, description, price, onEdit, onDelete, t }) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const [isRevealed, setIsRevealed] = useState(false);
  const actionWidth = -80;

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 10;
    },
    onPanResponderMove: (evt, gestureState) => {
      if (gestureState.dx < 0) {
        translateX.setValue(Math.max(gestureState.dx, actionWidth));
      } else if (isRevealed) {
        translateX.setValue(Math.min(gestureState.dx + actionWidth, 0));
      }
    },
    onPanResponderRelease: (evt, gestureState) => {
      if (gestureState.dx < -40 && !isRevealed) {
        Animated.spring(translateX, { toValue: actionWidth, useNativeDriver: false }).start();
        setIsRevealed(true);
      } else if (gestureState.dx > 40 && isRevealed) {
        Animated.spring(translateX, { toValue: 0, useNativeDriver: false }).start();
        setIsRevealed(false);
      } else {
        Animated.spring(translateX, { toValue: isRevealed ? actionWidth : 0, useNativeDriver: false }).start();
      }
    },
  });

  const handlePress = () => {
    if (isRevealed) {
      Animated.spring(translateX, { toValue: 0, useNativeDriver: false }).start();
      setIsRevealed(false);
    } else {
      onEdit();
    }
  };

  return (
    <View style={styles.rantanganOuter}>
      <View style={styles.rantanganWrapper}>
        <Animated.View style={[styles.rantanganContent, { transform: [{ translateX }] }]} {...panResponder.panHandlers}>
          <TouchableOpacity style={styles.rantanganTouchable} onPress={handlePress} activeOpacity={0.7}>
            <View style={styles.rantanganDetails}>
              <Text style={styles.rantanganName}>{nama}</Text>
              <Text style={styles.rantanganDescription}>{description}</Text>
              <Text style={styles.rantanganPrice}>{t('paket.priceFormat', { price: price.toLocaleString() })}</Text>
            </View>
            <View style={styles.rantanganEditIcon}>
              <AntDesign name="edit" size={18} color={COLORS.PRIMARY} />
            </View>
          </TouchableOpacity>
        </Animated.View>

        <View style={styles.rantanganActions}>
          <TouchableOpacity style={[styles.actionButton, styles.editButton]} onPress={onEdit}>
            <AntDesign name="edit" size={16} color="white" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={onDelete}>
            <AntDesign name="delete" size={16} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

// Tab: Rantangan — daftar paket dinamis, seller bebas tambah/edit/hapus (misal Paket Diet, Paket Hemat, dst)
const TabRantangan = ({ showAlert, t }) => {
  const [rantanganPackages, setRantanganPackages] = useState([]);
  const [isFetching, setIsFetching] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPrice, setNewPrice] = useState("");

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPrice, setEditPrice] = useState("");

  const fetchRantanganPackages = async () => {
    try {
      setIsFetching(true);
      const response = await fetch(`${config.API_URL}/seller/rantangan`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await getAuthToken()}`,
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch rantangan packages");
      }
      const result = await response.json();
      setRantanganPackages(result.data || []);
    } catch (error) {
      console.error("Fetch rantangan packages error:", error);
      showAlert(t('common.error'), t('paket.rantangan.fetchFailed'), [{ text: t('common.ok') }], "error");
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchRantanganPackages();
  }, []);

  const resetAddForm = () => {
    setNewName("");
    setNewDescription("");
    setNewPrice("");
  };

  const handleAddPackage = async () => {
    if (!newName.trim() || !newDescription.trim() || !newPrice.trim() || isNaN(Number(newPrice)) || Number(newPrice) <= 0) {
      showAlert(t('common.error'), t('paket.rantangan.validationError'), [{ text: t('common.ok') }], "error");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${config.API_URL}/seller/rantangan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await getAuthToken()}`,
        },
        body: JSON.stringify({
          name: newName.trim(),
          description: newDescription.trim(),
          price: Number(newPrice),
        }),
      });
      const resJson = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(resJson.message || "Gagal menambahkan paket");

      showAlert(t('common.success'), t('paket.rantangan.addSuccess'), [{ text: t('common.ok') }], "success");
      resetAddForm();
      setShowAddModal(false);
      fetchRantanganPackages();
    } catch (error) {
      showAlert(t('common.error'), error.message, [{ text: t('common.ok') }], "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditPackage = (item) => {
    setEditingPackage(item);
    setEditName(item.name);
    setEditDescription(item.description);
    setEditPrice(item.price.toString());
    setShowEditModal(true);
  };

const handleUpdatePackage = async () => {
    if (!editName.trim() || !editDescription.trim() || !editPrice.trim() || isNaN(Number(editPrice)) || Number(editPrice) <= 0) {
      showAlert(t('common.error'), t('paket.rantangan.validationError'), [{ text: t('common.ok') }], "error");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${config.API_URL}/seller/rantangan?id=${editingPackage.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await getAuthToken()}`,
        },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDescription.trim(),
          price: Number(editPrice),
        }),
      });
      
      const resJson = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(resJson.message || "Gagal memperbarui paket");

      showAlert(t('common.success'), t('paket.rantangan.updateSuccess'), [{ text: t('common.ok') }], "success");
      setShowEditModal(false);
      fetchRantanganPackages();
    } catch (error) {
      showAlert(t('common.error'), error.message, [{ text: t('common.ok') }], "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePackage = (item) => {
    showAlert(
      t('paket.rantangan.deleteTitle'),
      t('paket.rantangan.deleteMessage', { name: item.name }),
      [
        { text: t('common.cancel'), style: "cancel" },
        {
          text: t('common.delete'),
          style: "destructive",
          onPress: async () => {
            try {
              const response = await fetch(`${config.API_URL}/seller/rantangan?id=${item.id}`, {
                method: "DELETE",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${await getAuthToken()}`,
                },
              });
              if (!response.ok) throw new Error("Failed to delete package");

              showAlert(t('common.success'), t('paket.rantangan.deleteSuccess'), [{ text: t('common.ok') }], "success");
              fetchRantanganPackages();
            } catch (error) {
              console.error(error);
              showAlert(t('common.error'), t('paket.rantangan.deleteFailed'), [{ text: t('common.ok') }], "error");
            }
          },
        },
      ],
      "warning"
    );
  };

  if (isFetching) {
    return (
      <View style={styles.tabLoadingContainer}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
        <Text style={styles.loadingText}>{t('paket.rantangan.loading')}</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView style={styles.contentContainer}>
        {rantanganPackages.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              {t('paket.rantangan.empty')}
            </Text>
          </View>
        ) : (
          rantanganPackages.map((item) => (
            <RantanganPackageItem
              key={item.id}
              nama={item.name}
              description={item.description}
              price={item.price}
              onEdit={() => handleEditPackage(item)}
              onDelete={() => handleDeletePackage(item)}
              t={t}
            />
          ))
        )}
      </ScrollView>

      <View style={{ padding: 16 }}>
        <TouchableOpacity style={styles.primaryButton} onPress={() => setShowAddModal(true)} activeOpacity={0.85}>
          <Text style={styles.primaryButtonText}>{t('paket.rantangan.addButton')}</Text>
        </TouchableOpacity>
      </View>

      {/* Add Package Modal */}
      <Modal transparent={true} visible={showAddModal} animationType="fade" onRequestClose={() => setShowAddModal(false)}>
        <TouchableWithoutFeedback onPress={() => setShowAddModal(false)}>
          <View style={styles.modalOverlay} />
        </TouchableWithoutFeedback>
        <KeyboardAvoidingView style={styles.centerModalContent} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>{t('paket.rantangan.modal.addTitle')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('paket.rantangan.modal.namePlaceholder')}
              placeholderTextColor="#aaa"
              value={newName}
              onChangeText={setNewName}
              autoFocus={true}
            />
            <TextInput
              style={[styles.input, { height: 80 }]}
              placeholder={t('paket.rantangan.modal.descriptionPlaceholder')}
              placeholderTextColor="#aaa"
              value={newDescription}
              onChangeText={setNewDescription}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <TextInput
              style={styles.input}
              placeholder={t('paket.rantangan.modal.pricePlaceholder')}
              placeholderTextColor="#aaa"
              value={newPrice}
              onChangeText={setNewPrice}
              keyboardType="numeric"
            />
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  resetAddForm();
                  setShowAddModal(false);
                }}
              >
                <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.confirmButton]} onPress={handleAddPackage} disabled={isLoading}>
                <Text style={styles.confirmButtonText}>{isLoading ? t('paket.rantangan.modal.adding') : t('paket.rantangan.modal.add')}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Package Modal */}
      <Modal transparent={true} visible={showEditModal} animationType="fade" onRequestClose={() => setShowEditModal(false)}>
        <TouchableWithoutFeedback onPress={() => setShowEditModal(false)}>
          <View style={styles.modalOverlay} />
        </TouchableWithoutFeedback>
        <KeyboardAvoidingView style={styles.centerModalContent} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>{t('paket.rantangan.modal.editTitle')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('paket.rantangan.modal.namePlaceholder')}
              placeholderTextColor="#aaa"
              value={editName}
              onChangeText={setEditName}
              autoFocus={true}
            />
            <TextInput
              style={[styles.input, { height: 80 }]}
              placeholder={t('paket.rantangan.modal.descriptionPlaceholder')}
              placeholderTextColor="#aaa"
              value={editDescription}
              onChangeText={setEditDescription}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <TextInput
              style={styles.input}
              placeholder={t('paket.rantangan.modal.pricePlaceholder')}
              placeholderTextColor="#aaa"
              value={editPrice}
              onChangeText={setEditPrice}
              keyboardType="numeric"
            />
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setShowEditModal(false)}>
                <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.confirmButton]} onPress={handleUpdatePackage} disabled={isLoading}>
                <Text style={styles.confirmButtonText}>{isLoading ? t('paket.rantangan.modal.saving') : t('paket.rantangan.modal.save')}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.deleteButtonModal, { marginTop: 16 }]}
              onPress={() => {
                setShowEditModal(false);
                handleDeletePackage(editingPackage);
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.deleteButtonModalText}>{t('paket.rantangan.modal.deleteButton')}</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
};

// Item paket catering, swipe kiri buat munculin tombol edit & hapus
const CateringPackageItem = ({ nama, pricePerPax, minPax, slotCount, onEdit, onDelete, t }) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const [isRevealed, setIsRevealed] = useState(false);
  const actionWidth = -80;

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 10;
    },
    onPanResponderMove: (evt, gestureState) => {
      if (gestureState.dx < 0) {
        translateX.setValue(Math.max(gestureState.dx, actionWidth));
      } else if (isRevealed) {
        translateX.setValue(Math.min(gestureState.dx + actionWidth, 0));
      }
    },
    onPanResponderRelease: (evt, gestureState) => {
      if (gestureState.dx < -40 && !isRevealed) {
        Animated.spring(translateX, { toValue: actionWidth, useNativeDriver: false }).start();
        setIsRevealed(true);
      } else if (gestureState.dx > 40 && isRevealed) {
        Animated.spring(translateX, { toValue: 0, useNativeDriver: false }).start();
        setIsRevealed(false);
      } else {
        Animated.spring(translateX, { toValue: isRevealed ? actionWidth : 0, useNativeDriver: false }).start();
      }
    },
  });

  const handlePress = () => {
    if (isRevealed) {
      Animated.spring(translateX, { toValue: 0, useNativeDriver: false }).start();
      setIsRevealed(false);
    } else {
      onEdit();
    }
  };

  return (
    <View style={styles.rantanganOuter}>
      <View style={styles.rantanganWrapper}>
        <Animated.View style={[styles.rantanganContent, { transform: [{ translateX }] }]} {...panResponder.panHandlers}>
          <TouchableOpacity style={styles.rantanganTouchable} onPress={handlePress} activeOpacity={0.7}>
            <View style={styles.rantanganDetails}>
              <Text style={styles.rantanganName}>{nama}</Text>
              <Text style={styles.rantanganDescription}>
                {t('paket.catering.minPaxSlots', { minPax, slotCount })}
              </Text>
              <Text style={styles.rantanganPrice}>{t('paket.pricePerPaxFormat', { price: pricePerPax.toLocaleString() })}</Text>
            </View>
            <View style={styles.rantanganEditIcon}>
              <AntDesign name="edit" size={18} color={COLORS.PRIMARY} />
            </View>
          </TouchableOpacity>
        </Animated.View>

        <View style={styles.rantanganActions}>
          <TouchableOpacity style={[styles.actionButton, styles.editButton]} onPress={onEdit}>
            <AntDesign name="edit" size={16} color="white" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={onDelete}>
            <AntDesign name="delete" size={16} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

// Baris slot di dalam form paket, tap buat edit, ada tombol hapus
const SlotRow = ({ slot, onEdit, onDelete, t }) => (
  <View style={styles.slotRow}>
    <TouchableOpacity style={{ flex: 1 }} onPress={onEdit} activeOpacity={0.7}>
      <Text style={styles.slotLabel}>{slot.label}</Text>
      <Text style={styles.slotMeta}>
        {t('paket.slot.metaFormat', { category: slot.category_name, maxPick: slot.max_pick })}
      </Text>
    </TouchableOpacity>
    <TouchableOpacity style={styles.slotDeleteBtn} onPress={onDelete}>
      <AntDesign name="close" size={16} color="#C62828" />
    </TouchableOpacity>
  </View>
);

// Modal kecil buat pilih 1 kategori dari daftar Menu
const CategoryPickerModal = ({ visible, categories, onSelect, onClose, t }) => (
  <Modal transparent={true} visible={visible} animationType="fade" onRequestClose={onClose}>
    <TouchableWithoutFeedback onPress={onClose}>
      <View style={styles.modalOverlay} />
    </TouchableWithoutFeedback>
    <View style={styles.centerModalContent}>
      <Text style={styles.modalTitle}>{t('paket.categoryPicker.title')}</Text>
      <ScrollView style={{ maxHeight: 320 }}>
        {categories.length === 0 ? (
          <Text style={styles.emptyStateText}>{t('paket.categoryPicker.empty')}</Text>
        ) : (
          categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={styles.categoryOptionRow}
              onPress={() => {
                onSelect(cat);
                onClose();
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.categoryOptionText}>{cat.name}</Text>
              <Text style={styles.categoryOptionCount}>{t('paket.categoryPicker.itemCount', { count: (cat.items || []).length })}</Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
      <TouchableOpacity style={[styles.modalButton, styles.cancelButton, { marginTop: 12 }]} onPress={onClose}>
        <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
      </TouchableOpacity>
    </View>
  </Modal>
);

// Modal buat tambah/edit 1 slot pilihan (label + kategori sumber + kuota)
const SlotFormModal = ({ visible, categories, initialSlot, onSave, onClose, t }) => {
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState(null);
  const [maxPick, setMaxPick] = useState("1");
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  useEffect(() => {
    if (visible) {
      setLabel(initialSlot?.label || "");
      setCategory(
        initialSlot ? { id: initialSlot.category_id, name: initialSlot.category_name } : null
      );
      setMaxPick(initialSlot?.max_pick ? initialSlot.max_pick.toString() : "1");
    }
  }, [visible]);

  const handleSave = () => {
    if (!label.trim()) {
      return;
    }
    if (!category) {
      return;
    }
    if (!maxPick || isNaN(Number(maxPick)) || Number(maxPick) <= 0) {
      return;
    }
    onSave({
      label: label.trim(),
      category_id: category.id,
      category_name: category.name,
      max_pick: Number(maxPick),
    });
    onClose();
  };

  return (
    <Modal transparent={true} visible={visible} animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay} />
      </TouchableWithoutFeedback>
      <KeyboardAvoidingView style={styles.centerModalContent} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <Text style={styles.modalTitle}>{initialSlot ? t('paket.slot.editTitle') : t('paket.slot.addTitle')}</Text>

          <TextInput
            style={styles.input}
            placeholder={t('paket.slot.namePlaceholder')}
            placeholderTextColor="#aaa"
            value={label}
            onChangeText={setLabel}
            autoFocus={true}
          />

          <TouchableOpacity style={styles.pickerButton} onPress={() => setShowCategoryPicker(true)} activeOpacity={0.85}>
            <MaterialIcons name="category" size={18} color={COLORS.PRIMARY} />
            <Text style={styles.pickerButtonText}>{category ? category.name : t('paket.slot.categoryPickerPlaceholder')}</Text>
            <MaterialIcons name="chevron-right" size={20} color="#c9c9c9" />
          </TouchableOpacity>

          <Text style={styles.label}>{t('paket.slot.maxPickLabel')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('paket.slot.maxPickPlaceholder')}
            placeholderTextColor="#aaa"
            value={maxPick}
            onChangeText={setMaxPick}
            keyboardType="numeric"
          />

          <View style={styles.modalButtonContainer}>
            <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={onClose}>
              <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalButton, styles.confirmButton]} onPress={handleSave}>
              <Text style={styles.confirmButtonText}>{t('paket.slot.saveButton')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <CategoryPickerModal
        visible={showCategoryPicker}
        categories={categories}
        onSelect={(cat) => setCategory(cat)}
        onClose={() => setShowCategoryPicker(false)}
        t={t}
      />
    </Modal>
  );
};

const EVENT_TYPE_VALUES = ["nikahan", "arisan", "ulang_tahun", "rapat", "syukuran", "lainnya"];

// Tab: Paket Catering — paket dengan harga per pax + slot pilihan (buyer yang milih item di app buyer)
const TabPaketCatering = ({ showAlert, t }) => {
  const [cateringPackages, setCateringPackages] = useState([]);
  const [menuCategories, setMenuCategories] = useState([]);
  const [isFetching, setIsFetching] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);

  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPricePerPax, setFormPricePerPax] = useState("");
  const [formMinPax, setFormMinPax] = useState("");
  const [formSlots, setFormSlots] = useState([]); // [{label, category_id, category_name, max_pick}]
  const [formEventTypes, setFormEventTypes] = useState([]); // ["nikahan", "arisan", ...]

  const [showSlotForm, setShowSlotForm] = useState(false);
  const [editingSlotIndex, setEditingSlotIndex] = useState(null);

  const fetchAll = async () => {
    setIsFetching(true);
    const token = await getAuthToken();

    // Fetch menu categories (endpoint ini sudah ada, dipakai buat slot picker)
    try {
      const menuRes = await fetch(`${config.API_URL}/seller/menu`, {
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      if (!menuRes.ok) throw new Error("Failed to fetch menu");
      const menuResult = await menuRes.json();
      setMenuCategories(menuResult.data || menuResult || []);
    } catch (error) {
      console.log("Menu categories not loaded:", error.message);
      setMenuCategories([]);
    }

    // Fetch catering packages (endpoint ini belum ada di backend — gagal diam-diam dulu)
    try {
      const packagesRes = await fetch(`${config.API_URL}/seller/catering-packages`, {
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      if (!packagesRes.ok) throw new Error("Failed to fetch catering packages");
      const packagesResult = await packagesRes.json();
      setCateringPackages(packagesResult.data || []);
    } catch (error) {
      console.log("Catering packages not loaded (backend belum siap):", error.message);
      setCateringPackages([]);
    }

    setIsFetching(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const resetForm = () => {
    setFormName("");
    setFormDescription("");
    setFormPricePerPax("");
    setFormMinPax("");
    setFormSlots([]);
    setFormEventTypes([]);
  };

  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const openEditModal = (item) => {
    setEditingPackage(item);
    setFormName(item.name);
    setFormDescription(item.description);
    setFormPricePerPax(item.price_per_pax.toString());
    setFormMinPax(item.min_pax.toString());
    setFormSlots(item.slots || []);
    setFormEventTypes(item.event_types || []);
    setShowEditModal(true);
  };

  const handleAddSlot = () => {
    setEditingSlotIndex(null);
    setShowSlotForm(true);
  };

  const handleEditSlot = (idx) => {
    setEditingSlotIndex(idx);
    setShowSlotForm(true);
  };

  const handleSaveSlot = (slot) => {
    if (editingSlotIndex === null) {
      setFormSlots((prev) => [...prev, slot]);
    } else {
      setFormSlots((prev) => prev.map((s, idx) => (idx === editingSlotIndex ? slot : s)));
    }
  };

  const handleDeleteSlot = (idx) => {
    setFormSlots((prev) => prev.filter((_, i) => i !== idx));
  };

  const toggleEventType = (value) => {
    setFormEventTypes((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  };

  const validateForm = () => {
    if (!formName.trim() || !formDescription.trim()) {
      showAlert(t('common.error'), t('paket.catering.validation.nameDescription'), [{ text: t('common.ok') }], "error");
      return false;
    }
    if (!formPricePerPax || isNaN(Number(formPricePerPax)) || Number(formPricePerPax) <= 0) {
      showAlert(t('common.error'), t('paket.catering.validation.pricePerPax'), [{ text: t('common.ok') }], "error");
      return false;
    }
    if (!formMinPax || isNaN(Number(formMinPax)) || Number(formMinPax) <= 0) {
      showAlert(t('common.error'), t('paket.catering.validation.minPax'), [{ text: t('common.ok') }], "error");
      return false;
    }
    if (formSlots.length === 0) {
      showAlert(t('common.error'), t('paket.catering.validation.slotsRequired'), [{ text: t('common.ok') }], "error");
      return false;
    }
    return true;
  };

  const buildPayload = () => ({
    name: formName.trim(),
    description: formDescription.trim(),
    price_per_pax: Number(formPricePerPax),
    min_pax: Number(formMinPax),
    event_types: formEventTypes,
    slots: formSlots.map((s) => ({
      label: s.label,
      category_id: s.category_id,
      category_name: s.category_name,
      max_pick: s.max_pick,
    })),
  });

  const handleCreatePackage = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${config.API_URL}/seller/catering-packages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await getAuthToken()}`,
        },
        body: JSON.stringify(buildPayload()),
      });
      const resJson = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(resJson.error || resJson.message || "Gagal menambahkan paket");

      showAlert(t('common.success'), t('paket.catering.addSuccess'), [{ text: t('common.ok') }], "success");
      resetForm();
      setShowAddModal(false);
      fetchAll();
    } catch (error) {
      showAlert(t('common.error'), error.message, [{ text: t('common.ok') }], "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePackage = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${config.API_URL}/seller/catering-packages/${editingPackage.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await getAuthToken()}`,
        },
        body: JSON.stringify(buildPayload()),
      });
      const resJson = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(resJson.message || "Gagal memperbarui paket");

      showAlert(t('common.success'), t('paket.catering.updateSuccess'), [{ text: t('common.ok') }], "success");
      setShowEditModal(false);
      fetchAll();
    } catch (error) {
      showAlert(t('common.error'), error.message, [{ text: t('common.ok') }], "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePackage = (item) => {
    showAlert(
      t('paket.catering.deleteTitle'),
      t('paket.catering.deleteMessage', { name: item.name }),
      [
        { text: t('common.cancel'), style: "cancel" },
        {
          text: t('common.delete'),
          style: "destructive",
          onPress: async () => {
            try {
              const response = await fetch(`${config.API_URL}/seller/catering-packages/${item.id}`, {
                method: "DELETE",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${await getAuthToken()}`,
                },
              });
              const resJson = await response.json().catch(() => ({}));
              if (!response.ok) throw new Error(resJson.error || resJson.message || "Failed to delete package");

              showAlert(t('common.success'), t('paket.catering.deleteSuccess'), [{ text: t('common.ok') }], "success");
              fetchAll();
            } catch (error) {
              console.error(error);
              showAlert(t('common.error'), t('paket.catering.deleteFailed'), [{ text: t('common.ok') }], "error");
            }
          },
        },
      ],
      "warning"
    );
  };

  if (isFetching) {
    return (
      <View style={styles.tabLoadingContainer}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
        <Text style={styles.loadingText}>{t('paket.catering.loading')}</Text>
      </View>
    );
  }

  const renderPackageForm = (isEdit) => (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
      <Text style={styles.modalTitle}>{isEdit ? t('paket.catering.form.editTitle') : t('paket.catering.form.addTitle')}</Text>

      <TextInput
        style={styles.input}
        placeholder={t('paket.catering.form.namePlaceholder')}
        placeholderTextColor="#aaa"
        value={formName}
        onChangeText={setFormName}
      />
      <TextInput
        style={[styles.input, { height: 80 }]}
        placeholder={t('paket.catering.form.descriptionPlaceholder')}
        placeholderTextColor="#aaa"
        value={formDescription}
        onChangeText={setFormDescription}
        multiline
        numberOfLines={3}
        textAlignVertical="top"
      />

      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>{t('paket.catering.form.pricePerPaxLabel')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('paket.catering.form.pricePerPaxPlaceholder')}
            placeholderTextColor="#aaa"
            value={formPricePerPax}
            onChangeText={setFormPricePerPax}
            keyboardType="numeric"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>{t('paket.catering.form.minPaxLabel')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('paket.catering.form.minPaxPlaceholder')}
            placeholderTextColor="#aaa"
            value={formMinPax}
            onChangeText={setFormMinPax}
            keyboardType="numeric"
          />
        </View>
      </View>

      <Text style={styles.label}>{t('paket.catering.form.eventTypesLabel')}</Text>
      <View style={styles.eventTypeWrap}>
        {EVENT_TYPE_VALUES.map((value) => {
          const selected = formEventTypes.includes(value);
          return (
            <TouchableOpacity
              key={value}
              style={[styles.eventTypeChip, selected && styles.eventTypeChipSelected]}
              onPress={() => toggleEventType(value)}
              activeOpacity={0.8}
            >
              <Text style={[styles.eventTypeChipText, selected && styles.eventTypeChipTextSelected]}>
                {t(`paket.eventTypes.${value}`)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.slotSectionHeader}>
        <Text style={styles.label}>{t('paket.catering.form.slotsLabel')}</Text>
        <TouchableOpacity onPress={handleAddSlot} style={styles.addSlotBtn} activeOpacity={0.85}>
          <MaterialIcons name="add" size={16} color={COLORS.PRIMARY} />
          <Text style={styles.addSlotBtnText}>{t('paket.catering.form.addSlotButton')}</Text>
        </TouchableOpacity>
      </View>

      {formSlots.length === 0 ? (
        <Text style={styles.itemPickerEmptyText}>{t('paket.catering.form.emptySlots')}</Text>
      ) : (
        formSlots.map((slot, idx) => (
          <SlotRow key={idx} slot={slot} onEdit={() => handleEditSlot(idx)} onDelete={() => handleDeleteSlot(idx)} t={t} />
        ))
      )}

      <View style={[styles.modalButtonContainer, { marginTop: 18 }]}>
        <TouchableOpacity
          style={[styles.modalButton, styles.cancelButton]}
          onPress={() => (isEdit ? setShowEditModal(false) : setShowAddModal(false))}
        >
          <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modalButton, styles.confirmButton]}
          onPress={isEdit ? handleUpdatePackage : handleCreatePackage}
          disabled={isLoading}
        >
          <Text style={styles.confirmButtonText}>
            {isLoading ? t('paket.catering.form.saving') : isEdit ? t('paket.catering.form.save') : t('paket.catering.form.add')}
          </Text>
        </TouchableOpacity>
      </View>

      {isEdit && (
        <TouchableOpacity
          style={[styles.deleteButtonModal, { marginTop: 16 }]}
          onPress={() => {
            setShowEditModal(false);
            handleDeletePackage(editingPackage);
          }}
          activeOpacity={0.85}
        >
          <Text style={styles.deleteButtonModalText}>{t('paket.catering.form.deleteButton')}</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );

  return (
    <>
      <ScrollView style={styles.contentContainer}>
        {cateringPackages.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              {t('paket.catering.empty')}
            </Text>
          </View>
        ) : (
          cateringPackages.map((item) => (
            <CateringPackageItem
              key={item.id}
              nama={item.name}
              pricePerPax={item.price_per_pax}
              minPax={item.min_pax}
              slotCount={(item.slots || []).length}
              onEdit={() => openEditModal(item)}
              onDelete={() => handleDeletePackage(item)}
              t={t}
            />
          ))
        )}
      </ScrollView>

      <View style={{ padding: 16 }}>
        <TouchableOpacity style={styles.primaryButton} onPress={openAddModal} activeOpacity={0.85}>
          <Text style={styles.primaryButtonText}>{t('paket.catering.addButton')}</Text>
        </TouchableOpacity>
      </View>

      {/* Add Package Modal */}
      <Modal transparent={true} visible={showAddModal} animationType="fade" onRequestClose={() => setShowAddModal(false)}>
        <TouchableWithoutFeedback onPress={() => setShowAddModal(false)}>
          <View style={styles.modalOverlay} />
        </TouchableWithoutFeedback>
        <KeyboardAvoidingView style={styles.centerModalContentTall} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          {renderPackageForm(false)}
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Package Modal */}
      <Modal transparent={true} visible={showEditModal} animationType="fade" onRequestClose={() => setShowEditModal(false)}>
        <TouchableWithoutFeedback onPress={() => setShowEditModal(false)}>
          <View style={styles.modalOverlay} />
        </TouchableWithoutFeedback>
        <KeyboardAvoidingView style={styles.centerModalContentTall} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          {renderPackageForm(true)}
        </KeyboardAvoidingView>
      </Modal>

      {/* Slot Form Modal — dipakai bareng buat Add & Edit paket */}
      <SlotFormModal
        visible={showSlotForm}
        categories={menuCategories}
        initialSlot={editingSlotIndex !== null ? formSlots[editingSlotIndex] : null}
        onSave={handleSaveSlot}
        onClose={() => setShowSlotForm(false)}
        t={t}
      />
    </>
  );
};

const PaketScreen = () => {
  const router = useRouter();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("rantangan");
  const [customAlert, setCustomAlert] = useState({ visible: false, title: "", message: "", buttons: [], type: "info" });

  const showAlert = (title, message, buttons = [{ text: "OK" }], type = "info") => {
    setCustomAlert({ visible: true, title, message, buttons, type });
  };
  const closeAlert = () => setCustomAlert((prev) => ({ ...prev, visible: false }));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel={t('paket.accessibility.back')}>
          <MaterialIcons name="chevron-left" size={26} color={COLORS.PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('paket.header.title')}</Text>
        <View style={{ width: 26 }} />
      </View>

      <TabSwitcher activeTab={activeTab} setActiveTab={setActiveTab} t={t} />

      {activeTab === "rantangan" ? <TabRantangan showAlert={showAlert} t={t} /> : <TabPaketCatering showAlert={showAlert} t={t} />}

      <CustomAlert
        visible={customAlert.visible}
        title={customAlert.title}
        message={customAlert.message}
        buttons={customAlert.buttons}
        type={customAlert.type}
        onClose={closeAlert}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F6FA",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backBtn: { width: 26 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "700", color: COLORS.PRIMARY, textAlign: "center" },

  label: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#23272f",
    marginBottom: 6,
  },

  tabSwitcher: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9,
    alignItems: "center",
  },
  tabButtonActive: {
    backgroundColor: COLORS.PRIMARY,
  },
  tabButtonText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#888",
  },
  tabButtonTextActive: {
    color: "#fff",
  },

  contentContainer: {
    flex: 1,
    paddingTop: 16,
  },

  emptyState: {
    padding: 32,
    alignItems: "center",
  },
  emptyStateText: {
    fontSize: 13.5,
    color: "#888",
    textAlign: "center",
    lineHeight: 20,
  },

  tabLoadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13.5,
    color: "#888",
  },

  comingSoonContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  comingSoonTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#888",
    marginTop: 12,
    marginBottom: 6,
  },
  comingSoonText: {
    fontSize: 13,
    color: "#aaa",
    textAlign: "center",
    lineHeight: 19,
  },

  primaryButton: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 30,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },

  // Rantangan package item (swipeable)
  rantanganOuter: {
    overflow: "hidden",
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 14,
  },
  rantanganWrapper: {
    position: "relative",
    backgroundColor: "#fff",
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  rantanganContent: {
    backgroundColor: "#fff",
    borderRadius: 14,
    zIndex: 1,
  },
  rantanganTouchable: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rantanganDetails: {
    flex: 1,
    marginRight: 12,
  },
  rantanganEditIcon: {
    padding: 8,
  },
  rantanganName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#23272f",
    marginBottom: 4,
  },
  rantanganDescription: {
    fontSize: 13,
    color: "#888",
    marginBottom: 6,
    lineHeight: 18,
  },
  rantanganPrice: {
    fontSize: 14.5,
    fontWeight: "700",
    color: COLORS.PRIMARY,
  },
  rantanganActions: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 10,
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  editButton: {
    backgroundColor: COLORS.PRIMARY,
  },
  deleteButton: {
    backgroundColor: "#C62828",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  centerModalContent: {
    position: "absolute",
    top: "20%",
    left: "8%",
    right: "8%",
    backgroundColor: "white",
    borderRadius: 18,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#23272f",
    marginBottom: 18,
    textAlign: "center",
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    fontSize: 14,
    color: "#23272f",
  },
  modalButtonContainer: {
    flexDirection: "row",
    gap: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 30,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#e5e5e5",
  },
  cancelButtonText: {
    color: "#777",
    fontWeight: "700",
    fontSize: 14,
  },
  confirmButton: {
    backgroundColor: COLORS.PRIMARY,
  },
  confirmButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  deleteButtonModal: {
    backgroundColor: "#FFEBEE",
    paddingVertical: 12,
    borderRadius: 30,
    alignItems: "center",
  },
  deleteButtonModalText: {
    color: "#C62828",
    fontSize: 14,
    fontWeight: "700",
  },

  // Item picker button (di dalam form tambah/edit paket catering)
  pickerButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F5F6FA",
    borderRadius: 10,
    padding: 12,
    marginBottom: 18,
  },
  pickerButtonText: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: "600",
    color: "#23272f",
  },

  // Modal form paket catering (lebih tinggi karena banyak field + slot)
  centerModalContentTall: {
    position: "absolute",
    top: "8%",
    bottom: "8%",
    left: "6%",
    right: "6%",
    backgroundColor: "white",
    borderRadius: 18,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },

  // Slot section (di dalam form paket)
  slotSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
    marginBottom: 10,
  },
  addSlotBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: "#F7EAEF",
  },
  addSlotBtnText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: COLORS.PRIMARY,
  },
  slotRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F6FA",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  slotLabel: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#23272f",
    marginBottom: 2,
  },
  slotMeta: {
    fontSize: 12,
    color: "#888",
  },
  slotDeleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FFEBEE",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },

  // Event type chips (di dalam form paket catering) — FIX: style yang sebelumnya hilang
  eventTypeWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 18,
  },
  eventTypeChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#e5e5e5",
    backgroundColor: "#fff",
  },
  eventTypeChipSelected: {
    backgroundColor: COLORS.PRIMARY,
    borderColor: COLORS.PRIMARY,
  },
  eventTypeChipText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#777",
  },
  eventTypeChipTextSelected: {
    color: "#fff",
  },

  // Category picker modal (dipakai di dalam slot form)
  categoryOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  categoryOptionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#23272f",
  },
  categoryOptionCount: {
    fontSize: 12,
    color: "#888",
  },

  // Item picker modal (list kategori + checklist item)
  pickerModalContent: {
    position: "absolute",
    top: "12%",
    bottom: "12%",
    left: "6%",
    right: "6%",
    backgroundColor: "white",
    borderRadius: 18,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  categoryPickerHeader: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.PRIMARY,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  itemPickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  itemPickerRowText: {
    flex: 1,
    fontSize: 13.5,
    color: "#23272f",
  },
  itemPickerRowPrice: {
    fontSize: 12.5,
    color: "#888",
  },
  itemPickerEmptyText: {
    fontSize: 12.5,
    color: "#aaa",
    fontStyle: "italic",
    marginBottom: 8,
  },

  // CustomAlert
  alertOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  alertContent: {
    backgroundColor: "white",
    borderRadius: 18,
    padding: 22,
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
  },
  alertIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#23272f",
    textAlign: "center",
    marginBottom: 6,
  },
  alertMessage: {
    fontSize: 13.5,
    color: "#777",
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 20,
  },
  alertButtons: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  alertButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 30,
    alignItems: "center",
  },
  alertButtonSolid: {
    backgroundColor: COLORS.PRIMARY,
  },
  alertButtonDestructive: {
    backgroundColor: "#C62828",
  },
  alertButtonOutline: {
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#e5e5e5",
  },
  alertButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },
  alertButtonTextSolid: {
    color: "#fff",
  },
  alertButtonTextOutline: {
    color: "#777",
  },
});

export default PaketScreen;