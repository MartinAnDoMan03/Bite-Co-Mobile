import React from 'react';
import { View, Text } from 'react-native';

const MapPlaceholder = ({ style, children }) => (
  <View style={[{ backgroundColor: '#e0e0e0', alignItems: 'center', justifyContent: 'center', minHeight: 200 }, style]}>
    <Text style={{ color: '#888' }}>Map not available on web</Text>
    {children}
  </View>
);

export default MapPlaceholder;
export const Marker = () => null;
export const Polyline = () => null;
export const Circle = () => null;
export const Callout = () => null;
export const PROVIDER_GOOGLE = 'google';
export const PROVIDER_DEFAULT = null;