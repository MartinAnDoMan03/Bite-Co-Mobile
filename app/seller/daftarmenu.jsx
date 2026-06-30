import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
  TouchableWithoutFeedback,
  Animated,
  TextInput,
  FlatList,
  Alert,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  PanResponder,
} from "react-native";
import React, { useState, useRef, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import AntDesign from "@expo/vector-icons/AntDesign";
import COLORS from '../constants/color';
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import config from '../constants/config';
import AsyncStorage from "@react-native-async-storage/async-storage";

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

const HeaderTitleBackCustom = ({
  title,
  textColor = "black",
  state = "kategori",
  setState,
}) => {
  const route = useRouter();
  const handleBack = () => {
    if (state === "kategori") {
      route.back();
    }
    if (state === "menu") {
      setState("kategori");
    }
    if (state === "tambahMenu") {
      setState("menu");
    }
  };
  return (
    <View
      style={{
        flexDirection: "row",
        width: "100%",
        padding: 20,
        justifyContent: "center",
      }}
    >
      <TouchableOpacity
        style={{
          height: 50,
          width: 50,
          backgroundColor: COLORS.BACKGROUND,
          borderRadius: 99,
          alignItems: "center",
          justifyContent: "center",
          position: "absolute",
          top: 20,
          left: 20,
        }}
        onPress={handleBack}
      >
        <AntDesign name="left" size={20} color={COLORS.TEXT} />
      </TouchableOpacity>
      <View
        style={{ height: 50, justifyContent: "center", alignItems: "center" }}
      >
        <Text style={{ fontSize: 16, fontWeight: "bold", color: textColor }}>
          {title}
        </Text>
      </View>
    </View>
  );
};

const Dropdown = ({ selectedOption, onSelect }) => {
  const [visible, setVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const options = ["Rantangan", "Catering"];

  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      slideAnim.setValue(0);
    }
  }, [visible]);

  const handleSelect = (option) => {
    onSelect(option);
    closeModal();
  };

  const closeModal = () => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setVisible(false));
  };

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [300, 0],
  });

  return (
    <View style={styles.dropdownWrapper}>
      <TouchableOpacity
        style={styles.dropdownButton}
        onPress={() => setVisible(true)}
      >
        <Text style={styles.dropdownButtonText}>{selectedOption}</Text>
      </TouchableOpacity>

      <Modal
        transparent={true}
        visible={visible}
        animationType="none"
        onRequestClose={closeModal}
      >
        <TouchableWithoutFeedback onPress={closeModal}>
          <View style={styles.modalOverlay} />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[styles.bottomModalContent, { transform: [{ translateY }] }]}
        >
          {options.map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.option,
                selectedOption === option && styles.selectedOption,
              ]}
              onPress={() => handleSelect(option)}
            >
              <Text style={styles.optionText}>{option}</Text>
            </TouchableOpacity>
          ))}
        </Animated.View>
      </Modal>
    </View>
  );
};

const ScreenTambahMenu = ({
  state,
  setState,
  selectedCategory,
  fetchCategories,
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
      Alert.alert("Error", "Please fill all fields");
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
        formData.append("image", {
          uri: image,
          type: "image/jpeg",
          name: "menu.jpg",
        });
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

      Alert.alert("Success", "Menu added successfully");
      fetchCategories(); // Refresh the categories
      setState("menu"); // Go back to menu screen
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to add menu");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <HeaderTitleBackCustom
        title="Tambah Menu"
        state={state}
        setState={setState}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "bold",
            }}
          >
            Detail menu
          </Text>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "bold",
              marginTop: 20,
            }}
          >
            Foto
          </Text>
          <Text
            style={{
              fontSize: 16,
            }}
          >
            Upload foto mu biar pelanggan lebih tertarik
          </Text>
          <TouchableOpacity
            style={{
              marginTop: 20,
              borderColor: COLORS.TEXTSECONDARY,
              width: 100,
              height: 100,
              borderWidth: 1,
              borderRadius: 10,
              justifyContent: "center",
              alignItems: "center",
            }}
            onPress={pickImage}
          >
            {image ? (
              <Image
                source={{ uri: image }}
                style={{ width: 100, height: 100, borderRadius: 10 }}
              />
            ) : (
              <View
                style={{
                  width: 24,
                  height: 24,
                  backgroundColor: COLORS.GREEN3,
                  borderRadius: 99,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "bold",
                    color: "white",
                  }}
                >
                  +
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "bold",
              marginTop: 20,
            }}
          >
            Nama
          </Text>
          <View>
            <TextInput
              style={styles.input}
              placeholder="Cth: Puding"
              value={menuName}
              onChangeText={setMenuName}
            />
          </View>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "bold",
              marginTop: 20,
            }}
          >
            Deskripsi
          </Text>
          <View>
            <TextInput
              multiline
              numberOfLines={4}
              height={100}
              style={styles.input}
              value={description}
              onChangeText={setDescription}
              placeholder="Deskripsi menu..."
            />
          </View>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "bold",
              marginTop: 20,
            }}
          >
            Harga
          </Text>
          <View>
            <TextInput
              style={styles.input}
              placeholder="Cth: 10000"
              value={price}
              onChangeText={setPrice}
              keyboardType="numeric"
            />
          </View>
          <TouchableOpacity
            style={{
              marginTop: 20,
              backgroundColor: COLORS.GREEN3,
              paddingVertical: 10,
              borderRadius: 12,
              alignItems: "center",
              opacity: isLoading ? 0.7 : 1,
            }}
            onPress={handleAddMenu}
            disabled={isLoading}
          >
            <Text
              style={{
                color: "white",
                fontSize: 16,
                fontWeight: "bold",
              }}
            >
              {isLoading ? "Menyimpan..." : "Simpan"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const DaftarKetegori = ({
  nama,
  amount,
  onPress,
  onEdit,
  onDelete,
  hideDelete = false,
}) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const [isRevealed, setIsRevealed] = useState(false);

  const actionWidth = hideDelete ? -40 : -80; // Adjust width based on number of buttons

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      return (
        Math.abs(gestureState.dx) > Math.abs(gestureState.dy) &&
        Math.abs(gestureState.dx) > 10
      );
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
        // Swipe left to reveal
        Animated.spring(translateX, {
          toValue: actionWidth,
          useNativeDriver: false,
        }).start();
        setIsRevealed(true);
      } else if (gestureState.dx > 40 && isRevealed) {
        // Swipe right to hide
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: false,
        }).start();
        setIsRevealed(false);
      } else {
        // Snap back to current state
        Animated.spring(translateX, {
          toValue: isRevealed ? actionWidth : 0,
          useNativeDriver: false,
        }).start();
      }
    },
  });

  const handlePress = () => {
    if (isRevealed) {
      // Hide actions first
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: false,
      }).start();
      setIsRevealed(false);
    } else {
      // If not revealed, navigate to show items inside category
      onPress();
    }
  };

  return (
    <View style={styles.categoryContainer}>
      <View style={styles.categoryWrapper}>
        <Animated.View
          style={[
            styles.categoryContent,
            {
              transform: [{ translateX }],
            },
          ]}
          {...panResponder.panHandlers}
        >
          <TouchableOpacity
            style={styles.categoryTouchable}
            onPress={handlePress}
            activeOpacity={0.7}
          >
            <Text style={styles.categoryName}>{nama}</Text>
            <View style={styles.categoryRight}>
              <View style={styles.amountBadge}>
                <Text style={styles.amountText}>{amount}</Text>
              </View>
              <AntDesign name="right" size={24} color={COLORS.TEXT} />
            </View>
          </TouchableOpacity>
        </Animated.View>

        <View style={styles.categoryActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={onEdit}
          >
            <AntDesign name="edit" size={16} color="white" />
          </TouchableOpacity>
          {!hideDelete && (
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={onDelete}
            >
              <AntDesign name="delete" size={16} color="white" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const RantanganPackageItem = ({ nama, description, price, onEdit }) => {
  return (
    <TouchableOpacity
      style={styles.rantanganContainer}
      onPress={onEdit}
      activeOpacity={0.7}
    >
      <View style={styles.rantanganContent}>
        <View style={styles.rantanganDetails}>
          <Text style={styles.rantanganName}>{nama}</Text>
          <Text style={styles.rantanganDescription}>{description}</Text>
          <Text style={styles.rantanganPrice}>Rp {price.toLocaleString()}</Text>
        </View>
        <View style={styles.rantanganEditIcon}>
          <AntDesign name="edit" size={20} color="#666666" />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const MenuItem = ({ item, onEdit, onDelete }) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const [isRevealed, setIsRevealed] = useState(false);

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      return (
        Math.abs(gestureState.dx) > Math.abs(gestureState.dy) &&
        Math.abs(gestureState.dx) > 10
      );
    },
    onPanResponderMove: (evt, gestureState) => {
      if (gestureState.dx < 0) {
        translateX.setValue(Math.max(gestureState.dx, -80));
      } else if (isRevealed) {
        translateX.setValue(Math.min(gestureState.dx - 80, 0));
      }
    },
    onPanResponderRelease: (evt, gestureState) => {
      if (gestureState.dx < -40 && !isRevealed) {
        // Swipe left to reveal
        Animated.spring(translateX, {
          toValue: -80,
          useNativeDriver: false,
        }).start();
        setIsRevealed(true);
      } else if (gestureState.dx > 40 && isRevealed) {
        // Swipe right to hide
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: false,
        }).start();
        setIsRevealed(false);
      } else {
        // Snap back to current state
        Animated.spring(translateX, {
          toValue: isRevealed ? -80 : 0,
          useNativeDriver: false,
        }).start();
      }
    },
  });

  const handleItemPress = () => {
    if (isRevealed) {
      // Hide actions first
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: false,
      }).start();
      setIsRevealed(false);
    } else {
      // If not revealed, directly edit the item
      onEdit(item);
    }
  };

  return (
    <View style={styles.menuItemContainer}>
      <View style={styles.menuItemWrapper}>
        <Animated.View
          style={[
            styles.menuItemContent,
            {
              transform: [{ translateX }],
            },
          ]}
          {...panResponder.panHandlers}
        >
          <TouchableOpacity 
            style={styles.menuItemTouchable}
            onPress={handleItemPress}
            activeOpacity={0.7}
          >
            {item.image && (
              <Image
                source={{ uri: item.image }}
                style={styles.menuItemImage}
              />
            )}
            <View style={styles.menuItemDetails}>
              <Text style={styles.menuItemName}>{item.name}</Text>
              <Text style={styles.menuItemDescription}>{item.description}</Text>
              <Text style={styles.menuItemPrice}>
                Rp {item.price.toLocaleString()}
              </Text>
            </View>
          </TouchableOpacity>
        </Animated.View>

        <View style={styles.menuItemActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={() => onEdit(item)}
          >
            <AntDesign name="edit" size={16} color="white" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => onDelete(item)}
          >
            <AntDesign name="delete" size={16} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const ScreenKategori = ({
  KategoriList,
  setKategoriList,
  setSelectedCategory,
  state,
  setState,
  fetchCategories,
  rantanganPackages,
  setRantanganPackages,
  fetchRantanganPackages,
}) => {
  const [selectedOption, setSelectedOption] = useState("Rantangan");
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [showEditCategoryModal, setShowEditCategoryModal] = useState(false);
  const [showEditRantanganModal, setShowEditRantanganModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingRantangan, setEditingRantangan] = useState(null);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [editCategoryType, setEditCategoryType] = useState("Catering");
  const [editRantanganName, setEditRantanganName] = useState("");
  const [editRantanganDescription, setEditRantanganDescription] = useState("");
  const [editRantanganPrice, setEditRantanganPrice] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showRantanganSimpanModal, setShowRantanganSimpanModal] = useState(false);
  const [paketHarian, setPaketHarian] = useState("");
  const [paketMingguan, setPaketMingguan] = useState("");
  const [paketBulanan, setPaketBulanan] = useState("");
  const [rantanganEditTemp, setRantanganEditTemp] = useState(null); // local temp for edit
  const [editRantanganIdx, setEditRantanganIdx] = useState(null); // index for editing rantangan

  // State for editing all 3 rantangan packages at once
  const [editRantanganArray, setEditRantanganArray] = useState([
    { type: "Harian", name: "", description: "", price: "" },
    { type: "Mingguan", name: "", description: "", price: "" },
    { type: "Bulanan", name: "", description: "", price: "" },
  ]);

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
          type: selectedOption.toLowerCase(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add category");
      }

      const result = await response.json();
      const newCategory = result.category;
      setKategoriList([...KategoriList, newCategory]);
      setNewCategoryName("");
      setShowAddCategoryModal(false);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to add category");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditCategory = (category) => {
    setEditingCategory(category);
    setEditCategoryName(category.name);
    setEditCategoryType(
      category.type.charAt(0).toUpperCase() + category.type.slice(1)
    );
    setShowEditCategoryModal(true);
  };

  const handleDeleteCategory = async (category) => {
    Alert.alert(
      "Hapus Kategori",
      "Apakah anda yakin ingin menghapus kategori ini? Semua menu dalam kategori ini akan terhapus.",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: async () => {
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

              Alert.alert("Success", "Category deleted successfully");
              fetchCategories();
            } catch (error) {
              console.error(error);
              Alert.alert("Error", "Failed to delete category");
            }
          },
        },
      ]
    );
  };

  const handleUpdateCategory = async () => {
    if (!editCategoryName.trim()) {
      Alert.alert("Error", "Category name is required");
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
            type: editCategoryType.toLowerCase(),
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update category");
      }

      Alert.alert("Success", "Category updated successfully");
      setShowEditCategoryModal(false);
      fetchCategories();
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to update category");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditRantangan = (item, idx) => {
    setEditingRantangan(item);
    setEditRantanganName(item.name);
    setEditRantanganDescription(item.description);
    setEditRantanganPrice(item.price.toString());
    setEditRantanganIdx(idx);
    setShowEditRantanganModal(true);
  };

  // Edit Rantangan: Save locally first
  const handleEditRantanganLocal = () => {
    if (!editRantanganName.trim() || !editRantanganDescription.trim() || !editRantanganPrice) {
      Alert.alert("Error", "Nama, deskripsi, dan harga semua paket harus diisi.");
      return;
    }
    const updated = {
      ...editingRantangan,
      name: editRantanganName,
      description: editRantanganDescription,
      price: Number(editRantanganPrice),
    };
    // Update only the selected package in the array
    const newArr = rantanganPackages.map((pkg, idx) => idx === editRantanganIdx ? updated : pkg);
    setRantanganEditTemp(newArr);
    setRantanganPackages(newArr);
    setShowEditRantanganModal(false);
    Alert.alert("Berhasil", "Perubahan paket disimpan sementara. Klik Simpan ke API untuk mengirim.");
  };

  // Save to API (edit only)
  const handleEditRantanganAPI = async () => {
    if (!rantanganEditTemp) {
      Alert.alert("Error", "Edit paket terlebih dahulu.");
      return;
    }
    // Validate all fields strictly
    for (const pkg of rantanganEditTemp) {
      if (!pkg.type || !pkg.name || !pkg.description || pkg.price === undefined || pkg.price === null || pkg.price === "" || isNaN(Number(pkg.price)) || Number(pkg.price) <= 1000) {
        console.log('Validation failed for package:', pkg);
        Alert.alert("Error", "Nama, deskripsi, dan harga semua paket harus diisi dan harga harus lebih dari 1000.");
        return;
      }
    }
    setIsLoading(true);
    try {
      // Prepare payload as array of 3 packages
      const payload = rantanganEditTemp.map(pkg => ({
        type: pkg.type ? pkg.type.toLowerCase() : '',
        name: pkg.name,
        description: pkg.description,
        price: Number(pkg.price),
      }));
      console.log('PUT /seller/rantangan payload:', JSON.stringify({ packages: payload }, null, 2));
      const response = await fetch(`${config.API_URL}/seller/rantangan`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await getAuthToken()}`,
        },
        body: JSON.stringify({ packages: payload }),
      });
      const resJson = await response.json().catch(() => ({}));
      console.log('PUT /seller/rantangan response:', resJson);
      if (!response.ok) throw new Error(resJson.message || "Gagal simpan ke API");
      Alert.alert("Sukses", "Paket rantangan berhasil disimpan ke server");
      setRantanganEditTemp(null);
      fetchRantanganPackages();
    } catch (e) {
      Alert.alert("Error", e.message);
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
      <HeaderTitleBackCustom title="Menu" state={state} setState={setState} />

      <View style={styles.headerContainer}>
        <View style={styles.dropdownContainer}>
          <Dropdown
            selectedOption={selectedOption}
            onSelect={setSelectedOption}
          />
        </View>
      </View>

      <ScrollView style={styles.contentContainer}>
        {selectedOption === "Rantangan"
          ? (
            <>
              {rantanganPackages.map((item, idx) => (
                <RantanganPackageItem
                  key={item.type}
                  nama={item.name}
                  description={item.description}
                  price={item.price}
                  onEdit={() => handleEditRantangan(item, idx)}
                />
              ))}
              {/* Simpan ke API Button for Rantangan Edit */}
              {rantanganEditTemp && (
                <View style={{ alignItems: "center", marginVertical: 20 }}>
                  <TouchableOpacity
                    style={{
                      backgroundColor: COLORS.GREEN3,
                      paddingVertical: 12,
                      borderRadius: 12,
                      alignItems: "center",
                      width: "90%",
                    }}
                    onPress={handleEditRantanganAPI}
                    disabled={isLoading}
                  >
                    <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
                      {isLoading ? "Menyimpan..." : "Simpan ke API"}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )
          : // Catering Categories List
            KategoriList.map((item) => (
              <DaftarKetegori
                key={item.id}
                nama={item.name}
                amount={item.items?.length || 0}
                onPress={() => handleCategoryPress(item)}
                onEdit={() => handleEditCategory(item)}
                onDelete={() => handleDeleteCategory(item)}
              />
            ))}
      </ScrollView>

      {selectedOption === "Catering" && (
        <View
          style={{
            padding: 20,
          }}
        >
          <TouchableOpacity
            style={{
              backgroundColor: COLORS.GREEN3,
              paddingVertical: 12,
              borderRadius: 12,
              alignItems: "center",
              shadowColor: "#000",
              shadowOffset: {
                width: 0,
                height: 2,
              },
              shadowOpacity: 0.25,
              shadowRadius: 3.84,
              elevation: 5,
            }}
            onPress={() => setShowAddCategoryModal(true)}
          >
            <Text
              style={{
                color: "#fff",
                fontSize: 16,
                fontWeight: "600",
              }}
            >
              Tambah Kategori
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Edit Rantangan Modal (edit all 3 at once) */}
      <Modal
        transparent={true}
        visible={showEditRantanganModal}
        animationType="fade"
        onRequestClose={() => setShowEditRantanganModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowEditRantanganModal(false)}>
          <View style={styles.modalOverlay} />
        </TouchableWithoutFeedback>
        <KeyboardAvoidingView
          style={styles.centerModalContent}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>Edit Paket {editingRantangan?.type}</Text>
            <TextInput
              style={styles.input}
              placeholder={`Nama Paket ${editingRantangan?.type || ''}`}
              value={editRantanganName}
              onChangeText={setEditRantanganName}
            />
            <TextInput
              style={[styles.input, { height: 80 }]}
              placeholder={`Deskripsi Paket ${editingRantangan?.type || ''}`}
              value={editRantanganDescription}
              onChangeText={setEditRantanganDescription}
              multiline
              numberOfLines={3}
            />
            <TextInput
              style={styles.input}
              placeholder={`Harga Paket ${editingRantangan?.type || ''}`}
              value={editRantanganPrice}
              onChangeText={setEditRantanganPrice}
              keyboardType="numeric"
            />
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowEditRantanganModal(false)}
              >
                <Text style={styles.buttonText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.addButton]}
                onPress={handleEditRantanganLocal}
              >
                <Text style={styles.buttonText}>Simpan</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add Category Modal */}
      <Modal
        transparent={true}
        visible={showAddCategoryModal}
        animationType="fade"
        onRequestClose={() => setShowAddCategoryModal(false)}
      >
        <TouchableWithoutFeedback
          onPress={() => setShowAddCategoryModal(false)}
        >
          <View style={styles.modalOverlay} />
        </TouchableWithoutFeedback>

        <KeyboardAvoidingView
          style={styles.centerModalContent}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.modalTitle}>Tambah Kategori Baru</Text>

            <TextInput
              style={styles.input}
              placeholder="Nama Kategori"
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              autoFocus={true}
            />

            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowAddCategoryModal(false)}
              >
                <Text style={styles.buttonText}>Batal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.addButton]}
                onPress={handleAddCategory}
                disabled={isLoading}
              >
                <Text style={styles.buttonText}>
                  {isLoading ? "Menambahkan..." : "Tambah"}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Category Modal */}
      <Modal
        transparent={true}
        visible={showEditCategoryModal}
        animationType="fade"
        onRequestClose={() => setShowEditCategoryModal(false)}
      >
        <TouchableWithoutFeedback
          onPress={() => setShowEditCategoryModal(false)}
        >
          <View style={styles.modalOverlay} />
        </TouchableWithoutFeedback>

        <KeyboardAvoidingView
          style={styles.centerModalContent}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.modalTitle}>Edit Kategori</Text>

            <TextInput
              style={styles.input}
              placeholder="Nama Kategori"
              value={editCategoryName}
              onChangeText={setEditCategoryName}
              autoFocus={true}
            />

            <Dropdown
              selectedOption={editCategoryType}
              onSelect={setEditCategoryType}
            />

            <View style={[styles.modalButtonContainer, { marginTop: 10 }]}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowEditCategoryModal(false)}
              >
                <Text style={styles.buttonText}>Batal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.addButton]}
                onPress={handleUpdateCategory}
                disabled={isLoading}
              >
                <Text style={styles.buttonText}>
                  {isLoading ? "Menyimpan..." : "Simpan"}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.deleteButtonModal, { marginTop: 20 }]}
              onPress={() => {
                setShowEditCategoryModal(false);
                handleDeleteCategory(editingCategory);
              }}
            >
              <Text style={styles.deleteButtonText}>Hapus Kategori</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const ScreenMenu = ({ selectedCategory, state, setState, fetchCategories }) => {
  const [selectedOption, setSelectedOption] = useState("Rantangan");
  const [editingItem, setEditingItem] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editImage, setEditImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleEditMenu = (item) => {
    setEditingItem(item);
    setEditName(item.name);
    setEditDescription(item.description);
    setEditPrice(item.price.toString());
    setEditImage(item.image);
    setShowEditModal(true);
  };

  const handleDeleteMenu = async (item) => {
    Alert.alert("Hapus Menu", "Apakah anda yakin ingin menghapus menu ini?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus",
        style: "destructive",
        onPress: async () => {
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

            Alert.alert("Success", "Menu deleted successfully");
            fetchCategories();
          } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to delete menu");
          }
        },
      },
    ]);
  };

  const handleUpdateMenu = async () => {
    if (!editName || !editDescription || !editPrice) {
      Alert.alert("Error", "Please fill all fields");
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
        formData.append("image", {
          uri: editImage,
          type: "image/jpeg",
          name: "menu.jpg",
        });
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

      Alert.alert("Success", "Menu updated successfully");
      setShowEditModal(false);
      fetchCategories();
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to update menu");
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
    <SafeAreaView
      style={{
        flex: 1,
        justifyContent: "space-between",
      }}
    >
      <View style={{ flex: 1 }}>
        <HeaderTitleBackCustom
          title={selectedCategory.name}
          state={state}
          setState={setState}
        />
        <FlatList
          data={selectedCategory.items || []}
          renderItem={({ item }) => (
            <MenuItem
              item={item}
              onEdit={() => handleEditMenu(item)}
              onDelete={() => handleDeleteMenu(item)}
            />
          )}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.menuList}
        />
      </View>

      {/* Edit Menu Modal */}
      <Modal
        transparent={true}
        visible={showEditModal}
        animationType="fade"
        onRequestClose={() => setShowEditModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowEditModal(false)}>
          <View style={styles.modalOverlay} />
        </TouchableWithoutFeedback>

        <KeyboardAvoidingView
          style={styles.centerModalContent}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.modalTitle}>Edit Menu</Text>

            <TouchableOpacity
              style={{
                marginVertical: 10,
                borderColor: COLORS.TEXTSECONDARY,
                width: 100,
                height: 100,
                borderWidth: 1,
                borderRadius: 10,
                justifyContent: "center",
                alignItems: "center",
                alignSelf: "center",
              }}
              onPress={pickImage}
            >
              {editImage ? (
                <Image
                  source={{ uri: editImage }}
                  style={{ width: 100, height: 100, borderRadius: 10 }}
                />
              ) : (
                <View
                  style={{
                    width: 24,
                    height: 24,
                    backgroundColor: COLORS.GREEN3,
                    borderRadius: 99,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{ fontSize: 18, fontWeight: "bold", color: "white" }}
                  >
                    +
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              placeholder="Nama Menu"
              value={editName}
              onChangeText={setEditName}
            />

            <TextInput
              style={[styles.input, { height: 100 }]}
              placeholder="Deskripsi"
              value={editDescription}
              onChangeText={setEditDescription}
              multiline
              numberOfLines={4}
            />

            <TextInput
              style={styles.input}
              placeholder="Harga"
              value={editPrice}
              onChangeText={setEditPrice}
              keyboardType="numeric"
            />

            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.buttonText}>Batal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.addButton]}
                onPress={handleUpdateMenu}
                disabled={isLoading}
              >
                <Text style={styles.buttonText}>
                  {isLoading ? "Menyimpan..." : "Simpan"}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
      <View
        style={{
          alignItems: "center",
        }}
      >
        <TouchableOpacity
          style={{
            paddingVertical: 10,
            paddingHorizontal: 20,
            backgroundColor: COLORS.GREEN3,
            borderRadius: 99,
            width: "90%",
            alignItems: "center",
          }}
          onPress={() => setState("tambahMenu")}
        >
          <Text
            style={{
              color: "white",
              fontSize: 16,
              fontWeight: "bold",
            }}
          >
            Tambah Menu
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const Daftarmenu = () => {
  const [state, setState] = useState("kategori");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [KategoriList, setKategoriList] = useState([]);
  const [rantanganPackages, setRantanganPackages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

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
      Alert.alert("Error", `Failed to load menu data: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRantanganPackages = async () => {
    try {
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
      Alert.alert("Error", "Failed to load rantangan packages");
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      await Promise.all([fetchCategories(), fetchRantanganPackages()]);
    };
    fetchData();
  }, []);

  if (isLoading && state === "kategori") {
    return (
      <SafeAreaView
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
      >
        <Text>Loading...</Text>
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
          rantanganPackages={rantanganPackages}
          setRantanganPackages={setRantanganPackages}
          fetchRantanganPackages={fetchRantanganPackages}
        />
      ) : null}
      {state === "menu" ? (
        <ScreenMenu
          selectedCategory={selectedCategory}
          setState={setState}
          state={state}
          fetchCategories={fetchCategories}
        />
      ) : null}
      {state === "tambahMenu" ? (
        <ScreenTambahMenu
          state={state}
          setState={setState}
          selectedCategory={selectedCategory}
          fetchCategories={fetchCategories}
        />
      ) : null}
    </>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  // Container styles
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  contentContainer: {
    flex: 1,
  },
  headerContainer: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingBottom: 12,
  },

  // Rantangan styles
  rantanganContainer: {
    backgroundColor: "#fff",
    marginBottom: 1,
  },
  rantanganContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  rantanganDetails: {
    flex: 1,
    marginRight: 16,
  },
  rantanganName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#272727",
    marginBottom: 6,
  },
  rantanganDescription: {
    fontSize: 14,
    color: "#666666",
    marginBottom: 8,
    lineHeight: 20,
  },
  rantanganPrice: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.GREEN3,
  },
  rantanganEditIcon: {
    padding: 8,
    marginLeft: 8,
  },

  // Category styles
  categoryContainer: {
    overflow: "hidden",
    backgroundColor: "#fff",
    marginBottom: 1,
  },
  categoryWrapper: {
    position: "relative",
    backgroundColor: "#fff",
  },
  categoryContent: {
    backgroundColor: "#fff",
    zIndex: 1,
  },
  categoryTouchable: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#272727",
  },
  categoryRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  amountBadge: {
    backgroundColor: COLORS.GREEN3,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
  },
  amountText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  categoryActions: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 10,
    gap: 8,
  },

  // Dropdown styles
  dropdownContainer: {
    paddingVertical: 12,
    backgroundColor: "#fff",
    alignItems: "center",
  },
  dropdownWrapper: {
    alignItems: "center",
  },
  dropdownButton: {
    backgroundColor: COLORS.GREEN3,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 99,
    alignItems: "center",
  },
  dropdownButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  // Add button styles
  addButtonContainer: {
    padding: 20,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  addButton: {
    backgroundColor: COLORS.GREEN3,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  deleteButtonModal: {
    backgroundColor: "#dc3545",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 20,
  },
  deleteButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  bottomModalContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  centerModalContent: {
    position: "absolute",
    top: "30%",
    left: "10%",
    right: "10%",
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  option: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  selectedOption: {
    backgroundColor: COLORS.GREEN3,
    borderRadius: 5,
  },
  optionText: {
    fontSize: 16,
    textAlign: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    fontSize: 16,
  },
  modalButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: "#e0e0e0",
  },
  addButton: {
    backgroundColor: COLORS.GREEN3,
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
  },
  menuItemContainer: {
    overflow: "hidden",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  menuItemWrapper: {
    position: "relative",
    backgroundColor: "#fff",
  },
  menuItemContent: {
    backgroundColor: "#fff",
    zIndex: 1,
  },
  menuItemTouchable: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  menuItemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  menuItemDetails: {
    flex: 1,
  },
  menuItemName: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  menuItemDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  menuItemPrice: {
    fontSize: 14,
    fontWeight: "bold",
    color: COLORS.GREEN3,
  },
  menuList: {
    paddingBottom: 20,
  },
  menuItemActions: {
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
    backgroundColor: COLORS.GREEN3,
  },
  deleteButton: {
    backgroundColor: "#dc3545",
  },
});

export default Daftarmenu;
