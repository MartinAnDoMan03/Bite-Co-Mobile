import React from 'react';
import { Platform, View, Image } from 'react-native';
import config from '../app/constants/config';

let MapView, Marker;
if (Platform.OS !== 'web') {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
}

const MapPreview = ({ latitude, longitude, style }) => {
  if (Platform.OS === 'web') {
    return (
      <View style={style}>
        <Image
          source={{
            uri: `https://maps.googleapis.com/maps/api/staticmap?center=${latitude},${longitude}&zoom=16&size=600x360&markers=color:red%7C${latitude},${longitude}&key=${config.GOOGLE_MAPS_API_KEY}`,
          }}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
        />
      </View>
    );
  }

  return (
    <MapView
      style={style}
      region={{ latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
      pointerEvents="none"
      scrollEnabled={false}
      zoomEnabled={false}
      pitchEnabled={false}
      rotateEnabled={false}
    >
      <Marker coordinate={{ latitude, longitude }} />
    </MapView>
  );
};

export default MapPreview;