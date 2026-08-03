import React, { useCallback } from 'react';
import { Platform, Text } from 'react-native';
import config from '../app/constants/config';

let MapView, Marker, Polyline;
if (Platform.OS !== 'web') {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
  Polyline = Maps.Polyline;
}

const TrackingMapNative = ({ selectedOrder, routeCoordinates, primaryColor }) => {
  const hasLiveLocation = selectedOrder.currentLat && selectedOrder.currentLng;

  return (
    <MapView
      ref={(ref) => {
        if (ref && selectedOrder.sellerLat && selectedOrder.buyerLat && selectedOrder.sellerLng && selectedOrder.buyerLng) {
          setTimeout(() => {
            const coordinatesToFit = routeCoordinates.length > 0
              ? routeCoordinates
              : [
                  { latitude: hasLiveLocation ? selectedOrder.currentLat : selectedOrder.sellerLat, longitude: hasLiveLocation ? selectedOrder.currentLng : selectedOrder.sellerLng },
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
          opacity={hasLiveLocation ? 0.5 : 1}
        />
      )}
      {hasLiveLocation && (
        <Marker
          coordinate={{ latitude: selectedOrder.currentLat, longitude: selectedOrder.currentLng }}
          title="Posisi Penjual Sekarang"
          description={selectedOrder.sellerName || "Sedang dalam perjalanan"}
          pinColor="blue"
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
};

// ---------------------------------------------------------------------------
// Web tracking map — upgraded from Google Static Maps (a flat, non-interactive
// PNG requiring a full re-fetch on every location update) to the real Google
// Maps JavaScript API. Loaded dynamically via a <script> tag rather than an
// npm package, since this branch only ever runs on web. Gives pan/zoom, a
// real driving-route polyline via DirectionsService (instead of a straight
// line stitched from raw GPS points), and markers that animate to a new
// position instead of the whole map reloading as an image.
// ---------------------------------------------------------------------------
let googleMapsLoadingPromise = null;
const loadGoogleMapsScript = (apiKey) => {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (window.google && window.google.maps) return Promise.resolve(window.google);
  if (googleMapsLoadingPromise) return googleMapsLoadingPromise;

  googleMapsLoadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
    script.async = true;
    script.onload = () => resolve(window.google);
    script.onerror = (e) => reject(e);
    document.head.appendChild(script);
  });
  return googleMapsLoadingPromise;
};

const TrackingMapWeb = ({ selectedOrder, routeCoordinates, primaryColor }) => {
  const { View } = require('react-native');
  const containerRef = React.useRef(null);
  const mapRef = React.useRef(null);
  const sellerMarkerRef = React.useRef(null);
  const liveMarkerRef = React.useRef(null);
  const buyerMarkerRef = React.useRef(null);
  const directionsRendererRef = React.useRef(null);
  const [loaded, setLoaded] = React.useState(false);
  const [loadError, setLoadError] = React.useState(false);

  const hasLiveLocation = selectedOrder.currentLat && selectedOrder.currentLng;

  // Load the SDK once (cached across mounts via the module-level promise)
  React.useEffect(() => {
    let cancelled = false;
    loadGoogleMapsScript(config.GOOGLE_MAPS_API_KEY)
      .then((google) => { if (!cancelled && google) setLoaded(true); })
      .catch(() => { if (!cancelled) setLoadError(true); });
    return () => { cancelled = true; };
  }, []);

  const requestDirections = useCallback(() => {
    if (!window.google || !mapRef.current || !directionsRendererRef.current) return;
    if (!selectedOrder.buyerLat || !selectedOrder.buyerLng) return;

    const origin = hasLiveLocation
      ? { lat: selectedOrder.currentLat, lng: selectedOrder.currentLng }
      : selectedOrder.sellerLat && selectedOrder.sellerLng
        ? { lat: selectedOrder.sellerLat, lng: selectedOrder.sellerLng }
        : null;
    if (!origin) return;

    new window.google.maps.DirectionsService().route(
      {
        origin,
        destination: { lat: selectedOrder.buyerLat, lng: selectedOrder.buyerLng },
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        // Kalau gagal (misal Directions API belum diaktifkan di Google Cloud
        // Console untuk key ini), map tetap tampil dengan marker — cuma
        // tanpa garis rute, tidak crash.
        if (status === 'OK') directionsRendererRef.current.setDirections(result);
      }
    );
  }, [selectedOrder.currentLat, selectedOrder.currentLng, selectedOrder.sellerLat, selectedOrder.sellerLng, selectedOrder.buyerLat, selectedOrder.buyerLng]);

  // Initialize the map + markers once the SDK is ready
  React.useEffect(() => {
    if (!loaded || !containerRef.current || mapRef.current) return;
    const google = window.google;

    const center = selectedOrder.sellerLat && selectedOrder.buyerLat
      ? { lat: (selectedOrder.sellerLat + selectedOrder.buyerLat) / 2, lng: (selectedOrder.sellerLng + selectedOrder.buyerLng) / 2 }
      : { lat: selectedOrder.sellerLat || selectedOrder.buyerLat || -6.2088, lng: selectedOrder.sellerLng || selectedOrder.buyerLng || 106.8456 };

    mapRef.current = new google.maps.Map(containerRef.current, {
      center,
      zoom: 14,
      zoomControl: true,
      streetViewControl: false,
      mapTypeControl: false,
    });

    directionsRendererRef.current = new google.maps.DirectionsRenderer({
      suppressMarkers: true, // custom markers below, not the default ones
      polylineOptions: { strokeColor: primaryColor || '#711330', strokeWeight: 4 },
    });
    directionsRendererRef.current.setMap(mapRef.current);

    if (selectedOrder.sellerLat && selectedOrder.sellerLng) {
      sellerMarkerRef.current = new google.maps.Marker({
        position: { lat: selectedOrder.sellerLat, lng: selectedOrder.sellerLng },
        map: mapRef.current,
        title: selectedOrder.sellerName || 'Penjual',
        icon: { url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png' },
        opacity: hasLiveLocation ? 0.5 : 1,
      });
    }
    if (selectedOrder.buyerLat && selectedOrder.buyerLng) {
      buyerMarkerRef.current = new google.maps.Marker({
        position: { lat: selectedOrder.buyerLat, lng: selectedOrder.buyerLng },
        map: mapRef.current,
        title: selectedOrder.deliveryAddress || 'Tujuan Pengiriman',
        icon: { url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png' },
      });
    }
    if (hasLiveLocation) {
      liveMarkerRef.current = new google.maps.Marker({
        position: { lat: selectedOrder.currentLat, lng: selectedOrder.currentLng },
        map: mapRef.current,
        title: selectedOrder.sellerName || 'Sedang dalam perjalanan',
        icon: { url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png' },
      });
    }

    if (selectedOrder.sellerLat && selectedOrder.buyerLat) {
      const bounds = new google.maps.LatLngBounds();
      bounds.extend({ lat: hasLiveLocation ? selectedOrder.currentLat : selectedOrder.sellerLat, lng: hasLiveLocation ? selectedOrder.currentLng : selectedOrder.sellerLng });
      bounds.extend({ lat: selectedOrder.buyerLat, lng: selectedOrder.buyerLng });
      mapRef.current.fitBounds(bounds, 80);
    }

    requestDirections();
  }, [loaded]);

  // Smoothly move the live marker + recompute the route on each location
  // update, instead of re-fetching a whole new static image.
  React.useEffect(() => {
    if (!loaded || !window.google || !mapRef.current || !hasLiveLocation) return;
    const pos = { lat: selectedOrder.currentLat, lng: selectedOrder.currentLng };
    if (liveMarkerRef.current) {
      liveMarkerRef.current.setPosition(pos);
    } else {
      liveMarkerRef.current = new window.google.maps.Marker({
        position: pos,
        map: mapRef.current,
        title: selectedOrder.sellerName || 'Sedang dalam perjalanan',
        icon: { url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png' },
      });
    }
    if (sellerMarkerRef.current) sellerMarkerRef.current.setOpacity(0.5);
    requestDirections();
  }, [selectedOrder.currentLat, selectedOrder.currentLng, loaded]);

  if (loadError) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ color: '#999', textAlign: 'center' }}>
          Peta tidak dapat dimuat. Cek koneksi internet Anda.
        </Text>
      </View>
    );
  }

  return <View ref={containerRef} style={{ flex: 1 }} />;
};

const TrackingMap = (props) => (Platform.OS === 'web' ? <TrackingMapWeb {...props} /> : <TrackingMapNative {...props} />);

export default TrackingMap;