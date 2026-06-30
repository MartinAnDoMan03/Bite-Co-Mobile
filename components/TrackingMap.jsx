import React, { useCallback } from 'react';
import { Platform } from 'react-native';
import config from '../app/constants/config';

let MapView, Marker, Polyline;
if (Platform.OS !== 'web') {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
  Polyline = Maps.Polyline;
}

const TrackingMapNative = ({ selectedOrder, routeCoordinates, primaryColor }) => (
  <MapView
    ref={(ref) => {
      if (ref && selectedOrder.sellerLat && selectedOrder.buyerLat && selectedOrder.sellerLng && selectedOrder.buyerLng) {
        setTimeout(() => {
          const coordinatesToFit = routeCoordinates.length > 0
            ? routeCoordinates
            : [
                { latitude: selectedOrder.sellerLat, longitude: selectedOrder.sellerLng },
                { latitude: selectedOrder.buyerLat, longitude: selectedOrder.buyerLng },
              ];
          ref.fitToCoordinates(coordinatesToFit, {
            edgePadding: { top: 100, right: 50, bottom: 300, left: 50 },
            animated: true,
          });
        }, 1000);
      }
    }}
    style={{ flex: 1 }}
    initialRegion={{
      latitude: selectedOrder.sellerLat && selectedOrder.buyerLat
        ? (selectedOrder.sellerLat + selectedOrder.buyerLat) / 2
        : selectedOrder.sellerLat || selectedOrder.buyerLat || -6.2088,
      longitude: selectedOrder.sellerLng && selectedOrder.buyerLng
        ? (selectedOrder.sellerLng + selectedOrder.buyerLng) / 2
        : selectedOrder.sellerLng || selectedOrder.buyerLng || 106.8456,
      latitudeDelta: selectedOrder.sellerLat && selectedOrder.buyerLat
        ? Math.max(Math.abs(selectedOrder.sellerLat - selectedOrder.buyerLat) * 1.3, 0.01)
        : 0.01,
      longitudeDelta: selectedOrder.sellerLng && selectedOrder.buyerLng
        ? Math.max(Math.abs(selectedOrder.sellerLng - selectedOrder.buyerLng) * 1.3, 0.01)
        : 0.01,
    }}
    showsUserLocation={true}
    showsMyLocationButton={true}
  >
    {selectedOrder.sellerLat && selectedOrder.sellerLng && (
      <Marker
        coordinate={{ latitude: selectedOrder.sellerLat, longitude: selectedOrder.sellerLng }}
        title="Penjual"
        description={selectedOrder.sellerName || "Lokasi Penjual"}
        pinColor="red"
      />
    )}
    {selectedOrder.buyerLat && selectedOrder.buyerLng && (
      <Marker
        coordinate={{ latitude: selectedOrder.buyerLat, longitude: selectedOrder.buyerLng }}
        title="Tujuan Pengiriman"
        description={selectedOrder.deliveryAddress || "Alamat Pengiriman"}
        pinColor="green"
      />
    )}
    {routeCoordinates.length > 0 && (
      <Polyline coordinates={routeCoordinates} strokeColor={primaryColor} strokeWidth={4} lineDashPattern={[5, 5]} />
    )}
  </MapView>
);

const TrackingMapWeb = ({ selectedOrder, routeCoordinates, primaryColor }) => {
  const center = {
    lat: selectedOrder.sellerLat && selectedOrder.buyerLat
      ? (selectedOrder.sellerLat + selectedOrder.buyerLat) / 2
      : selectedOrder.sellerLat || selectedOrder.buyerLat || -6.2088,
    lng: selectedOrder.sellerLng && selectedOrder.buyerLng
      ? (selectedOrder.sellerLng + selectedOrder.buyerLng) / 2
      : selectedOrder.sellerLng || selectedOrder.buyerLng || 106.8456,
  };
  const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${center.lat},${center.lng}&zoom=14&size=600x600&markers=color:red%7C${selectedOrder.sellerLat},${selectedOrder.sellerLng}&markers=color:green%7C${selectedOrder.buyerLat},${selectedOrder.buyerLng}&key=${config.GOOGLE_MAPS_API_KEY}`;

  const { View, Image } = require('react-native');
  return (
    <View style={{ flex: 1 }}>
      <Image source={{ uri: mapUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
    </View>
  );
};

const TrackingMap = (props) => (Platform.OS === 'web' ? <TrackingMapWeb {...props} /> : <TrackingMapNative {...props} />);

export default TrackingMap;