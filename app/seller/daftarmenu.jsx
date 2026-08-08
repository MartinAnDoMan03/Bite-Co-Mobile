import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
  TouchableWithoutFeedback,
  TextInput,
  FlatList,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import React, { useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import AntDesign from "@expo/vector-icons/AntDesign";
import { MaterialIcons } from "@expo/vector-icons";
import COLORS from '../constants/color';
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import config from '../constants/config';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLanguage } from '../contexts/LanguageContext';

// Helper function to get auth token
const getAuthToken = async () => {
  try {
    const token = await AsyncStorage.getItem("sellerToken");
    console.log("Retrieved token:", token ? "Token exists" : "No token found");
    return token;
  } catch (error) {
    console.error("Error getting auth token:", error);
    return null;
  }
};

// Alert kustom, selaras dengan pola CustomAlert di halaman lain
const ALERT_TYPE_STYLES = {
  info: { icon: 'info', color: COLORS.PRIMARY, bg: '#F7EAEF' },
  success: { icon: 'check-circle', color: '#2E7D32', bg: '#E8F5E9' },
  error: { icon: 'error', color: '#C62828', bg: '#FFEBEE' },
  warning: { icon: 'warning', color: '#B26A00', bg: '#FFF3E0' },
};

const CustomAlert = ({ visible, title, message, buttons, type = 'info', onClose }) => {
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
              const isCancel = btn.style === 'cancel';
              const isDestructive = btn.style === 'destructive';
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
                  <Text style={[
                    styles.alertButtonText,
                    isCancel ? styles.alertButtonTextOutline : styles.alertButtonTextSolid,
                  ]}>
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

const HeaderTitleBackCustom = ({ title, state, setState, t }) => {
  const router = useRouter();
  const handleBack = () => {
    if (state === "kategori") {
      router.back();
    }
    if (state === "menu") {
      setState("kategori");
    }
    if (state === "tambahMenu") {
      setState("menu");
    }
  };
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={handleBack} style={styles.backBtn} accessibilityLabel={t('daftarMenu.accessibility.back')}>
        <MaterialIcons name="chevron-left" size={26} color={COLORS.PRIMARY} />
      </TouchableOpacity>
      <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
      <View style={{ width: 26 }} />
    </View>
  );
};

// Validasi harga dipakai bersama form tambah & edit menu
const isValidPrice = (value) => {
  const num = Number(value);
  return value !== "" && !isNaN(num) && num > 0;
};

const ScreenTambahMenu = ({
  state,
  setState,
  selectedCategory,
  fetchCategories,
  showAlert,
  t,
}) => {
  const [menuName, setMenuName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [image, setImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleAddMenu = async () => {
    if (!menuName || !description || !price) {
      showAlert(t('common.error'), t('daftarMenu.alerts.incompleteFields'), [{ text: t('common.ok') }], "error");
      return;
    }

    if (!isValidPrice(price)) {
      showAlert(t('common.error'), t('daftarMenu.alerts.invalidPrice'), [{ text: t('common.ok') }], "error");
      return;
    }

    setIsLoading(true);

    try {
      // Create form data for file upload
      const formData = new FormData();
      formData.append("name", menuName);
      formData.append("description", description);
      formData.append("price", price);
      formData.append("category_id", selectedCategory.id);

      if (image) {
        if (Platform.OS === 'web') {
          const imgResponse = await fetch(image);
          const blob = await imgResponse.blob();
          formData.append("image", blob, "menu.jpg");
        } else {
          formData.append("image", { uri: image, type: "image/jpeg", name: "menu.jpg" });
        }
      }
      const response = await fetch(`${config.API_URL}/seller/menu`, {
        method: "POST",
        body: formData,
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${await getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to add menu");
      }

      showAlert(t('common.success'), t('daftarMenu.alerts.addMenuSuccess'), [{ text: t('common.ok') }], "success");
      fetchCategories(); // Refresh the categories
      setState("menu"); // Go back to menu screen
    } catch (error) {
      console.error(error);
      showAlert(t('common.error'), t('daftarMenu.alerts.addMenuFailed'), [{ text: t('common.ok') }], "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <HeaderTitleBackCustom
        title={t('daftarMenu.quickAdd.header')}
        state={state}
        setState={setState}
        t={t}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <Text style={styles.label}>{t('daftarMenu.quickAdd.photoLabel')}</Text>
            <Text style={styles.helperText}>
              {t('daftarMenu.quickAdd.photoHelper')}
            </Text>
            <TouchableOpacity
              style={styles.imagePickerBox}
              onPress={pickImage}
              activeOpacity={0.85}
            >
              {image ? (
                <Image
                  source={{ uri: image }}
                  style={styles.imagePickerPreview}
                />
              ) : (
                <View style={styles.imagePickerPlus}>
                  <MaterialIcons name="add" size={22} color="#fff" />
                </View>
              )}
            </TouchableOpacity>

            <Text style={[styles.label, { marginTop: 18 }]}>{t('daftarMenu.quickAdd.nameLabel')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('daftarMenu.quickAdd.namePlaceholder')}
              placeholderTextColor="#aaa"
              value={menuName}
              onChangeText={setMenuName}
            />

            <Text style={styles.label}>{t('daftarMenu.quickAdd.descriptionLabel')}</Text>
            <TextInput
              multiline
              numberOfLines={4}
              style={[styles.input, styles.textArea]}
              placeholder={t('daftarMenu.quickAdd.descriptionPlaceholder')}
              placeholderTextColor="#aaa"
              value={description}
              onChangeText={setDescription}
              textAlignVertical="top"
            />

            <Text style={styles.label}>{t('daftarMenu.quickAdd.priceLabel')}</Text>
            <TextInput
              style={[styles.input, { marginBottom: 4 }]}
              placeholder={t('daftarMenu.quickAdd.pricePlaceholder')}
              placeholderTextColor="#aaa"
              value={price}
              onChangeText={setPrice}
              keyboardType="numeric"
            />
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, isLoading && { opacity: 0.6 }]}
            onPress={handleAddMenu}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>{t('daftarMenu.quickAdd.saveButton')}</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// Baris kategori: tap konten -> masuk daftar menunya.
// Tombol edit (pensil) di kanan langsung buka modal edit kategori,
// tombol hapus ada DI DALAM modal edit itu (bukan popup terpisah lagi).
// Cocok juga dipakai di web: cukup TouchableOpacity biasa, gak butuh gesture.
const DaftarKetegori = ({ nama, amount, onPress, onEdit, t }) => {
  return (
    <View style={styles.categoryContainer}>
      <View style={styles.categoryRowWrapper}>
        <TouchableOpacity
          style={styles.categoryTouchable}
          onPress={onPress}
          activeOpacity={0.7}
        >
          <Text style={styles.categoryName} numberOfLines={1}>{nama}</Text>
          <View style={styles.categoryRight}>
            <View style={styles.amountBadge}>
              <Text style={styles.amountText}>{amount}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color="#c9c9c9" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.moreBtn}
          onPress={onEdit}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel={t('daftarMenu.accessibility.categoryOptions')}
        >
          <AntDesign name="edit" size={17} color={COLORS.PRIMARY} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Baris item menu: seluruh card langsung tappable ke form edit.
// Hapus ada di dalam modal edit (lihat ScreenMenu -> Edit Menu Modal).
const MenuItem = ({ item, onEdit, t }) => {
  return (
    <TouchableOpacity
      style={styles.menuItemContainer}
      onPress={() => onEdit(item)}
      activeOpacity={0.7}
    >
      <View style={styles.menuItemWrapper}>
        <View style={styles.menuItemTouchable}>
          {item.image && (
            <Image
              source={{ uri: item.image }}
              style={styles.menuItemImage}
            />
          )}
          <View style={styles.menuItemDetails}>
            <Text style={styles.menuItemName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.menuItemDescription} numberOfLines={2}>{item.description}</Text>
            <Text style={styles.menuItemPrice}>
              {t('daftarMenu.priceFormat', { price: item.price.toLocaleString() })}
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color="#c9c9c9" />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const ScreenKategori = ({
  KategoriList,
  setKategoriList,
  setSelectedCategory,
  state,
  setState,
  fetchCategories,
  showAlert,
  t,
}) => {
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [showEditCategoryModal, setShowEditCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategory, setEditingCategory] = useState(null);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const closeAddCategoryModal = () => {
    setShowAddCategoryModal(false);
    setNewCategoryName("");
  };

  const closeEditCategoryModal = () => {
    setShowEditCategoryModal(false);
    setEditingCategory(null);
    setEditCategoryName("");
  };

  const handleAddCategory = async () => {
    if (newCategoryName.trim() === "") return;

    setIsLoading(true);

    try {
      const response = await fetch(`${config.API_URL}/seller/categories`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await getAuthToken()}`,
        },
        body: JSON.stringify({
          name: newCategoryName,
          type: "catering",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add category");
      }

      const result = await response.json();
      const newCategory = result.category;
      setKategoriList([...KategoriList, newCategory]);
      closeAddCategoryModal();
    } catch (error) {
      console.error(error);
      showAlert(t('common.error'), t('daftarMenu.alerts.addCategoryFailed'), [{ text: t('common.ok') }], "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditCategory = (category) => {
    setEditingCategory(category);
    setEditCategoryName(category.name);
    setShowEditCategoryModal(true);
  };

  const handleDeleteCategory = async (category) => {
    showAlert(
      t('daftarMenu.alerts.deleteCategoryTitle'),
      t('daftarMenu.alerts.deleteCategoryMessage'),
      [
        { text: t('common.cancel'), style: "cancel" },
        {
          text: t('common.delete'),
          style: "destructive",
          onPress: async () => {
            setIsDeleting(true);
            try {
              const response = await fetch(
                `${config.API_URL}/seller/categories/${category.id}`,
                {
                  method: "DELETE",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${await getAuthToken()}`,
                  },
                }
              );

              if (!response.ok) {
                throw new Error("Failed to delete category");
              }

              showAlert(t('common.success'), t('daftarMenu.alerts.deleteCategorySuccess'), [{ text: t('common.ok') }], "success");
              fetchCategories();
            } catch (error) {
              console.error(error);
              showAlert(t('common.error'), t('daftarMenu.alerts.deleteCategoryFailed'), [{ text: t('common.ok') }], "error");
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ],
      "warning"
    );
  };

  const handleUpdateCategory = async () => {
    if (!editCategoryName.trim()) {
      showAlert(t('common.error'), t('daftarMenu.alerts.categoryNameRequired'), [{ text: t('common.ok') }], "error");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        `${config.API_URL}/seller/categories/${editingCategory.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${await getAuthToken()}`,
          },
          body: JSON.stringify({
            name: editCategoryName,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update category");
      }

      showAlert(t('common.success'), t('daftarMenu.alerts.updateCategorySuccess'), [{ text: t('common.ok') }], "success");
      closeEditCategoryModal();
      fetchCategories();
    } catch (error) {
      console.error(error);
      showAlert(t('common.error'), t('daftarMenu.alerts.updateCategoryFailed'), [{ text: t('common.ok') }], "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCategoryPress = (category) => {
    setSelectedCategory(category);
    setState("menu");
  };

  return (
    <SafeAreaView style={styles.container}>
      <HeaderTitleBackCustom title={t('daftarMenu.header.menuTitle')} state={state} setState={setState} t={t} />

      <ScrollView style={styles.contentContainer}>
        {KategoriList.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              {t('daftarMenu.emptyCategory')}
            </Text>
          </View>
        ) : (
          KategoriList.map((item) => (
            <DaftarKetegori
              key={item.id}
              nama={item.name}
              amount={item.items?.length || 0}
              onPress={() => handleCategoryPress(item)}
              onEdit={() => handleEditCategory(item)}
              t={t}
            />
          ))
        )}
      </ScrollView>

      <View style={{ padding: 16 }}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => setShowAddCategoryModal(true)}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>{t('daftarMenu.addCategoryButton')}</Text>
        </TouchableOpacity>
      </View>

    {/* Add Category Modal */}
      <Modal
        transparent={true}
        visible={showAddCategoryModal}
        animationType="fade"
        onRequestClose={closeAddCategoryModal}
      >
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={closeAddCategoryModal}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>

          <KeyboardAvoidingView
            style={styles.centerModalContent}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <ScrollView
              contentContainerStyle={{ flexGrow: 1 }}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.modalTitle}>{t('daftarMenu.modal.addCategoryTitle')}</Text>

              <TextInput
                style={styles.input}
                placeholder={t('daftarMenu.modal.categoryNamePlaceholder')}
                placeholderTextColor="#aaa"
                value={newCategoryName}
                onChangeText={setNewCategoryName}
                autoFocus={true}
              />

              <View style={styles.modalButtonContainer}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={closeAddCategoryModal}
                >
                  <Text style={styles.cancelButtonText}>{t('daftarMenu.modal.cancel')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.confirmButton]}
                  onPress={handleAddCategory}
                  disabled={isLoading}
                >
                  <Text style={styles.confirmButtonText}>
                    {isLoading ? t('daftarMenu.modal.adding') : t('daftarMenu.modal.add')}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Edit Category Modal */}
      <Modal
        transparent={true}
        visible={showEditCategoryModal}
        animationType="fade"
        onRequestClose={closeEditCategoryModal}
      >
       <View style={styles.modalOverlay}>
        <TouchableWithoutFeedback
          onPress={closeEditCategoryModal}
        >
            <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>

        <KeyboardAvoidingView
          style={styles.centerModalContent}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.modalTitle}>{t('daftarMenu.modal.editCategoryTitle')}</Text>

            <TextInput
              style={styles.input}
              placeholder={t('daftarMenu.modal.categoryNamePlaceholder')}
              placeholderTextColor="#aaa"
              value={editCategoryName}
              onChangeText={setEditCategoryName}
              autoFocus={true}
            />

            <View style={[styles.modalButtonContainer, { marginTop: 14 }]}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={closeEditCategoryModal}
              >
                <Text style={styles.cancelButtonText}>{t('daftarMenu.modal.cancel')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleUpdateCategory}
                disabled={isLoading}
              >
                <Text style={styles.confirmButtonText}>
                  {isLoading ? t('daftarMenu.modal.saving') : t('daftarMenu.modal.save')}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.deleteButtonModal, { marginTop: 16 }, isDeleting && { opacity: 0.6 }]}
              onPress={() => {
                closeEditCategoryModal();
                handleDeleteCategory(editingCategory);
              }}
              disabled={isDeleting}
              activeOpacity={0.85}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="#C62828" />
              ) : (
                <Text style={styles.deleteButtonModalText}>{t('daftarMenu.modal.deleteCategoryButton')}</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const ScreenMenu = ({ selectedCategory, state, setState, fetchCategories, showAlert, t }) => {
  const [editingItem, setEditingItem] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editImage, setEditImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleEditMenu = (item) => {
    setEditingItem(item);
    setEditName(item.name);
    setEditDescription(item.description);
    setEditPrice(item.price.toString());
    setEditImage(item.image);
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingItem(null);
    setEditName("");
    setEditDescription("");
    setEditPrice("");
    setEditImage(null);
  };

  const handleDeleteMenu = async (item) => {
    showAlert(
      t('daftarMenu.alerts.deleteMenuTitle'),
      t('daftarMenu.alerts.deleteMenuMessage'),
      [
        { text: t('common.cancel'), style: "cancel" },
        {
          text: t('common.delete'),
          style: "destructive",
          onPress: async () => {
            setIsDeleting(true);
            try {
              const response = await fetch(`${config.API_URL}/seller/menu`, {
                method: "DELETE",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${await getAuthToken()}`,
                },
                body: JSON.stringify({
                  categoryId: selectedCategory.id,
                  menuId: item.id,
                }),
              });

              if (!response.ok) {
                throw new Error("Failed to delete menu");
              }

              showAlert(t('common.success'), t('daftarMenu.alerts.deleteMenuSuccess'), [{ text: t('common.ok') }], "success");
              fetchCategories();
            } catch (error) {
              console.error(error);
              showAlert(t('common.error'), t('daftarMenu.alerts.deleteMenuFailed'), [{ text: t('common.ok') }], "error");
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ],
      "warning"
    );
  };

  const handleUpdateMenu = async () => {
    if (!editName || !editDescription || !editPrice) {
      showAlert(t('common.error'), t('daftarMenu.alerts.incompleteFields'), [{ text: t('common.ok') }], "error");
      return;
    }

    if (!isValidPrice(editPrice)) {
      showAlert(t('common.error'), t('daftarMenu.alerts.invalidPrice'), [{ text: t('common.ok') }], "error");
      return;
    }

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("name", editName);
      formData.append("description", editDescription);
      formData.append("price", editPrice);
      formData.append("category_id", selectedCategory.id);
      formData.append("menu_id", editingItem.id);

      if (editImage && editImage !== editingItem.image) {
        if (Platform.OS === 'web') {
          const imgResponse = await fetch(editImage);
          const blob = await imgResponse.blob();
          formData.append("image", blob, "menu.jpg");
        } else {
          formData.append("image", { uri: editImage, type: "image/jpeg", name: "menu.jpg" });
        }
      }

      const response = await fetch(`${config.API_URL}/seller/menu`, {
        method: "PUT",
        body: formData,
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${await getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to update menu");
      }

      showAlert(t('common.success'), t('daftarMenu.alerts.updateMenuSuccess'), [{ text: t('common.ok') }], "success");
      closeEditModal();
      fetchCategories();
    } catch (error) {
      console.error(error);
      showAlert(t('common.error'), t('daftarMenu.alerts.updateMenuFailed'), [{ text: t('common.ok') }], "error");
    } finally {
      setIsLoading(false);
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setEditImage(result.assets[0].uri);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { justifyContent: "space-between" }]}>
      <View style={{ flex: 1 }}>
        <HeaderTitleBackCustom
          title={selectedCategory.name}
          state={state}
          setState={setState}
          t={t}
        />
        {(selectedCategory.items || []).length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              {t('daftarMenu.emptyMenu')}
            </Text>
          </View>
        ) : (
          <FlatList
            data={selectedCategory.items || []}
            renderItem={({ item }) => (
              <MenuItem
                item={item}
                onEdit={() => handleEditMenu(item)}
                t={t}
              />
            )}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.menuList}
          />
        )}
      </View>

      {/* Edit Menu Modal */}
      <Modal
        transparent={true}
        visible={showEditModal}
        animationType="fade"
        onRequestClose={closeEditModal}
      >
          <View style={styles.modalOverlay}>
        <TouchableWithoutFeedback onPress={closeEditModal}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>

        <KeyboardAvoidingView
          style={styles.centerModalContent}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.modalTitle}>{t('daftarMenu.modal.editMenuTitle')}</Text>

            <TouchableOpacity
              style={[styles.imagePickerBox, { alignSelf: "center", marginBottom: 16 }]}
              onPress={pickImage}
              activeOpacity={0.85}
            >
              {editImage ? (
                <Image
                  source={{ uri: editImage }}
                  style={styles.imagePickerPreview}
                />
              ) : (
                <View style={styles.imagePickerPlus}>
                  <MaterialIcons name="add" size={22} color="#fff" />
                </View>
              )}
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              placeholder={t('daftarMenu.modal.menuNamePlaceholder')}
              placeholderTextColor="#aaa"
              value={editName}
              onChangeText={setEditName}
            />

            <TextInput
              style={[styles.input, { height: 100 }]}
              placeholder={t('daftarMenu.modal.descriptionPlaceholder')}
              placeholderTextColor="#aaa"
              value={editDescription}
              onChangeText={setEditDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <TextInput
              style={styles.input}
              placeholder={t('daftarMenu.modal.pricePlaceholder')}
              placeholderTextColor="#aaa"
              value={editPrice}
              onChangeText={setEditPrice}
              keyboardType="numeric"
            />

            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={closeEditModal}
              >
                <Text style={styles.cancelButtonText}>{t('daftarMenu.modal.cancel')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleUpdateMenu}
                disabled={isLoading}
              >
                <Text style={styles.confirmButtonText}>
                  {isLoading ? t('daftarMenu.modal.saving') : t('daftarMenu.modal.save')}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.deleteButtonModal, { marginTop: 16 }, isDeleting && { opacity: 0.6 }]}
              onPress={() => {
                closeEditModal();
                handleDeleteMenu(editingItem);
              }}
              disabled={isDeleting}
              activeOpacity={0.85}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="#C62828" />
              ) : (
                <Text style={styles.deleteButtonModalText}>{t('daftarMenu.modal.deleteMenuButton')}</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
      </Modal>

      <View style={{ alignItems: "center", padding: 16 }}>
        <TouchableOpacity
          style={[styles.primaryButton, { width: "100%" }]}
          onPress={() => setState("tambahMenu")}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>{t('daftarMenu.addMenuButton')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const Daftarmenu = () => {
  const { t } = useLanguage();
  const [state, setState] = useState("kategori");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [KategoriList, setKategoriList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [customAlert, setCustomAlert] = useState({ visible: false, title: '', message: '', buttons: [], type: 'info' });

  const showAlert = (title, message, buttons = [{ text: 'OK' }], type = 'info') => {
    setCustomAlert({ visible: true, title, message, buttons, type });
  };
  const closeAlert = () => setCustomAlert((prev) => ({ ...prev, visible: false }));

  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${config.API_URL}/seller/menu`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await getAuthToken()}`,
        },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("API Error:", response.status, errorData);
        throw new Error(
          `Failed to fetch menu data: ${response.status} - ${
            errorData.message || "Unknown error"
          }`
        );
      }
      const result = await response.json();
      console.log("API Response:", result);
      setKategoriList(result.data || result);
    } catch (error) {
      console.error("Fetch categories error:", error);
      showAlert(t('common.error'), t('daftarMenu.alerts.fetchFailed', { message: error.message }), [{ text: t('common.ok') }], "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  //Sinkronisasi setelah edit
  useEffect(() => {
    if (selectedCategory) {
      const updatedCategory = KategoriList.find(cat => cat.id === selectedCategory.id);
      if (updatedCategory) {
        setSelectedCategory(updatedCategory);
      }
    }
  }, [KategoriList]);

  if (isLoading && state === "kategori") {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
        <Text style={styles.loadingText}>{t('daftarMenu.loading')}</Text>
      </SafeAreaView>
    );
  }

  return (
    <>
      {state === "kategori" ? (
        <ScreenKategori
          KategoriList={KategoriList}
          setKategoriList={setKategoriList}
          setSelectedCategory={setSelectedCategory}
          setState={setState}
          state={state}
          fetchCategories={fetchCategories}
          showAlert={showAlert}
          t={t}
        />
      ) : null}
      {state === "menu" ? (
        <ScreenMenu
          selectedCategory={selectedCategory}
          setState={setState}
          state={state}
          fetchCategories={fetchCategories}
          showAlert={showAlert}
          t={t}
        />
      ) : null}
      {state === "tambahMenu" ? (
        <ScreenTambahMenu
          state={state}
          setState={setState}
          selectedCategory={selectedCategory}
          fetchCategories={fetchCategories}
          showAlert={showAlert}
          t={t}
        />
      ) : null}

      <CustomAlert
        visible={customAlert.visible}
        title={customAlert.title}
        message={customAlert.message}
        buttons={customAlert.buttons}
        type={customAlert.type}
        onClose={closeAlert}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backBtn: { width: 26 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: COLORS.PRIMARY, textAlign: 'center' },
  loadingText: {
    marginTop: 12,
    fontSize: 13.5,
    color: '#888',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 13.5,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    // di web, cursor pointer bikin jelas area overlay ini bisa diklik buat nutup modal
    ...(Platform.OS === 'web' ? { cursor: 'default' } : {}),
  },
  contentContainer: {
    flex: 1,
    paddingTop: 16,
  },

  // Card umum
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  label: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#23272f",
    marginBottom: 6,
  },
  helperText: {
    fontSize: 12.5,
    color: "#888",
    marginBottom: 12,
  },
  imagePickerBox: {
    width: 90,
    height: 90,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e5e5e5",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F6FA",
    overflow: "hidden",
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  imagePickerPreview: {
    width: "100%",
    height: "100%",
  },
  imagePickerPlus: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.PRIMARY,
    justifyContent: "center",
    alignItems: "center",
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
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },
  textArea: {
    height: 100,
  },

  primaryButton: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 30,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },

  // Category row
  categoryContainer: {
    marginHorizontal: 16,
    marginBottom: 10,
  },
  categoryRowWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  categoryTouchable: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingLeft: 16,
    paddingRight: 4,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  categoryName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: "#23272f",
    marginRight: 10,
  },
  categoryRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  amountBadge: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  amountText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12.5,
  },
  moreBtn: {
    width: 38,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 4,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },

  deleteButtonModal: {
    backgroundColor: "#FFEBEE",
    paddingVertical: 12,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  deleteButtonModalText: {
    color: "#C62828",
    fontSize: 14,
    fontWeight: "700",
  },
  centerModalContent: {
    backgroundColor: "white",
    borderRadius: 18,
    padding: 20,
    width: "100%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
    ...(Platform.OS === 'web' ? { maxWidth: 420, alignSelf: 'center', width: '100%' } : {}),
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#23272f",
    marginBottom: 18,
    textAlign: "center",
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
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
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

  // Menu item row
  menuItemContainer: {
    marginHorizontal: 16,
    marginBottom: 10,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  menuItemWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  menuItemTouchable: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
  },
  menuItemImage: {
    width: 56,
    height: 56,
    borderRadius: 10,
    marginRight: 12,
  },
  menuItemDetails: {
    flex: 1,
  },
  menuItemName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#23272f",
    marginBottom: 3,
  },
  menuItemDescription: {
    fontSize: 12.5,
    color: "#888",
    marginBottom: 4,
  },
  menuItemPrice: {
    fontSize: 13.5,
    fontWeight: "700",
    color: COLORS.PRIMARY,
  },
  menuList: {
    padding: 16,
    paddingBottom: 20,
  },

  // CustomAlert
  alertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  alertContent: {
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 22,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  alertIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#23272f',
    textAlign: 'center',
    marginBottom: 6,
  },
  alertMessage: {
    fontSize: 13.5,
    color: '#777',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  alertButtons: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  alertButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 30,
    alignItems: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  alertButtonSolid: {
    backgroundColor: COLORS.PRIMARY,
  },
  alertButtonDestructive: {
    backgroundColor: '#C62828',
  },
  alertButtonOutline: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e5e5e5',
  },
  alertButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  alertButtonTextSolid: {
    color: '#fff',
  },
  alertButtonTextOutline: {
    color: '#777',
  },
});

export default Daftarmenu;