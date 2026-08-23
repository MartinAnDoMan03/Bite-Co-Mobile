import { Dimensions, Platform } from 'react-native';

const { width } = Dimensions.get('window');

export const isWeb = Platform.OS === 'web';

export const isMobile = width < 768;

export const isTablet = width >= 768 && width < 1024;

export const isDesktop = width >= 1024;

export const contentMaxWidth = 1200;

export const horizontalPadding = isDesktop ? 32 : isTablet ? 24 : 20;