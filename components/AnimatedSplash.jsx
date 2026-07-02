import React, { useEffect, useRef } from 'react';
import {
  View,
  Image,
  Text,
  Animated,
  StyleSheet,
  Dimensions,
} from 'react-native';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

const BURGUNDY = '#711330';

export default function AnimatedSplash({ onFinish }) {
  const logoTranslateY = useRef(new Animated.Value(30)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    // Step 1: Logo slide up + fade in
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(logoTranslateY, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Step 2: Teks fade in setelah logo
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(textTranslateY, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Step 3: Tahan 800ms lalu lanjut ke app
        setTimeout(() => {
          onFinish?.();
        }, 800);
      });
    });
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.logoWrap,
          {
            opacity: logoOpacity,
            transform: [{ translateY: logoTranslateY }],
          },
        ]}
      >
        <Image
          source={require('../assets/images/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      <Animated.View
        style={{
          opacity: textOpacity,
          transform: [{ translateY: textTranslateY }],
        }}
      >
        <Text style={styles.appName}>Bite&Co</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BURGUNDY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrap: {
    marginBottom: SCREEN_HEIGHT * 0.025, // 2.5% tinggi layar
  },
  logo: {
    width: SCREEN_WIDTH * 0.35,   // 35% lebar layar
    height: SCREEN_WIDTH * 0.35,  // tetap persegi
  },
  appName: {
    fontSize: SCREEN_WIDTH * 0.07, // 7% lebar layar
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 2,
    textAlign: 'center',
  },
});