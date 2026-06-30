import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useRef, useEffect } from 'react';

const SkeletonLoader = ({ 
  width = '100%', 
  height = 20, 
  borderRadius = 4,
  style = {},
  children 
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createAnimation = () => {
      return Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: false,
        }),
      ]);
    };

    const animation = Animated.loop(createAnimation());
    animation.start();

    return () => animation.stop();
  }, [animatedValue]);

  const backgroundColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['#e1e9ee', '#f2f8fc'],
  });

  if (children) {
    return (
      <View style={style}>
        {children}
      </View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          backgroundColor,
        },
        style,
      ]}
    />
  );
};

// Predefined skeleton components
export const OrderCardSkeleton = () => (
  <View style={styles.orderCardSkeleton}>
    <View style={styles.orderCardHeader}>
      <SkeletonLoader width={60} height={60} borderRadius={30} />
      <View style={styles.orderCardInfo}>
        <SkeletonLoader width="70%" height={16} />
        <SkeletonLoader width="50%" height={14} style={{ marginTop: 4 }} />
        <SkeletonLoader width="60%" height={14} style={{ marginTop: 4 }} />
      </View>
    </View>
    <SkeletonLoader width="100%" height={1} style={{ marginVertical: 12 }} />
    <View style={styles.orderCardItems}>
      <SkeletonLoader width="80%" height={14} />
      <SkeletonLoader width="60%" height={14} style={{ marginTop: 4 }} />
    </View>
    <View style={styles.orderCardButtons}>
      <SkeletonLoader width={80} height={32} borderRadius={8} />
      <SkeletonLoader width={80} height={32} borderRadius={8} />
    </View>
  </View>
);

export const MenuItemSkeleton = () => (
  <View style={styles.menuItemSkeleton}>
    <View style={styles.menuItemInfo}>
      <SkeletonLoader width="85%" height={16} borderRadius={4} style={{ marginBottom: 8 }} />
      <SkeletonLoader width="75%" height={12} borderRadius={3} style={{ marginBottom: 6 }} />
      <SkeletonLoader width="45%" height={12} borderRadius={3} />
    </View>
    <View style={styles.menuItemImageContainer}>
      <SkeletonLoader width={100} height={100} borderRadius={10} />
      <SkeletonLoader width={70} height={24} borderRadius={12} style={{ marginTop: 8 }} />
    </View>
  </View>
);

export const ChatMessageSkeleton = ({ isOwn = false }) => (
  <View style={[styles.chatMessageContainer, isOwn && styles.ownMessageContainer]}>
    <SkeletonLoader 
      width={isOwn ? '70%' : '80%'} 
      height={40} 
      borderRadius={15}
      style={[styles.chatMessageSkeleton, isOwn && styles.ownChatMessage]}
    />
  </View>
);

export const StoreCardSkeleton = () => (
  <View style={styles.storeCardSkeleton}>
    <View style={styles.storeImageSkeleton}>
      <SkeletonLoader width="100%" height="100%" borderRadius={0} />
      {/* Rating badge skeleton */}
      <View style={styles.ratingBadgeSkeleton}>
        <SkeletonLoader width={40} height={16} borderRadius={8} />
      </View>
    </View>
    <View style={styles.storeCardContent}>
      <SkeletonLoader width="85%" height={16} style={{ marginBottom: 8 }} />
      <View style={styles.storeCardRating}>
        <SkeletonLoader width={12} height={12} borderRadius={6} style={{ marginRight: 4 }} />
        <SkeletonLoader width={50} height={12} />
      </View>
    </View>
  </View>
);

export const ProfileSkeleton = () => (
  <View style={styles.profileSkeletonContainer}>
    {/* Profile Header Skeleton */}
    <View style={styles.profileHeaderSkeleton}>
      <SkeletonLoader width={100} height={100} borderRadius={50} style={{ marginBottom: 10 }} />
      <SkeletonLoader width={120} height={20} borderRadius={4} />
    </View>
    
    {/* Profile Info Skeleton */}
    <View style={styles.profileInfoSkeleton}>
      <View style={styles.profileInfoRow}>
        <SkeletonLoader width={60} height={16} borderRadius={3} />
        <SkeletonLoader width={150} height={16} borderRadius={3} />
      </View>
      <View style={styles.profileInfoRow}>
        <SkeletonLoader width={50} height={16} borderRadius={3} />
        <SkeletonLoader width={180} height={16} borderRadius={3} />
      </View>
      <View style={styles.profileInfoRow}>
        <SkeletonLoader width={55} height={16} borderRadius={3} />
        <SkeletonLoader width={130} height={16} borderRadius={3} />
      </View>
    </View>
    
    {/* Address Section Skeleton */}
    <View style={styles.addressSectionSkeleton}>
      <SkeletonLoader width={140} height={18} borderRadius={4} style={{ marginBottom: 15 }} />
      
      {/* Address Info */}
      <View style={styles.addressInfoSkeleton}>
        <SkeletonLoader width={120} height={14} borderRadius={3} style={{ marginBottom: 5 }} />
        <SkeletonLoader width="90%" height={16} borderRadius={3} style={{ marginBottom: 5 }} />
        <SkeletonLoader width="70%" height={14} borderRadius={3} style={{ marginBottom: 3 }} />
        <SkeletonLoader width="75%" height={14} borderRadius={3} style={{ marginBottom: 3 }} />
        <SkeletonLoader width="60%" height={14} borderRadius={3} />
      </View>
      
      {/* Pin Point Section */}
      <View style={styles.pinPointSkeleton}>
        <SkeletonLoader width={130} height={14} borderRadius={3} style={{ marginBottom: 5 }} />
        <SkeletonLoader width="85%" height={16} borderRadius={3} style={{ marginBottom: 10 }} />
        <SkeletonLoader width="100%" height={44} borderRadius={8} style={{ marginTop: 10 }} />
        <SkeletonLoader width="100%" height={44} borderRadius={8} style={{ marginTop: 10 }} />
      </View>
    </View>
    
    {/* Sign Out Button Skeleton */}
    <SkeletonLoader width="100%" height={50} borderRadius={8} style={{ marginTop: 20 }} />
  </View>
);

const styles = StyleSheet.create({
  skeleton: {
    // Base skeleton styles are handled by the animated background
  },
  orderCardSkeleton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderCardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  orderCardItems: {
    marginVertical: 8,
  },
  orderCardButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  menuItemSkeleton: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    marginBottom: 8,
    borderRadius: 8,
  },
  menuItemInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  chatMessageContainer: {
    marginVertical: 2,
    paddingHorizontal: 16,
  },
  ownMessageContainer: {
    alignItems: 'flex-end',
  },
  chatMessageSkeleton: {
    marginVertical: 4,
  },
  ownChatMessage: {
    alignSelf: 'flex-end',
  },
  storeCardSkeleton: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 18,
    width: '48%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    overflow: 'hidden',
  },
  storeImageSkeleton: {
    position: 'relative',
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#f6f7fb',
  },
  ratingBadgeSkeleton: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  storeCardContent: {
    padding: 8,
    alignItems: 'center',
    minHeight: 60,
  },
  storeCardRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  profileSkeletonContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8f8f8',
  },
  profileHeaderSkeleton: {
    alignItems: 'center',
    marginBottom: 30,
  },
  profileInfoSkeleton: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  profileInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  addressSectionSkeleton: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  addressInfoSkeleton: {
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: 20,
  },
  pinPointSkeleton: {
    marginTop: 10,
  },
});

export default SkeletonLoader;
