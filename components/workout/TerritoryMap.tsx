import { useEffect, useRef } from 'react';
import { View, Text, Platform } from 'react-native';
import type { GpsRoutePoint } from '@/types';

// Lazy import to avoid web/SSR crashes
let MapView: any = null;
let Marker: any = null;
let Polyline: any = null;
let PROVIDER_DEFAULT: any = null;

if (Platform.OS !== 'web') {
  try {
    const maps = require('react-native-maps');
    MapView = maps.default;
    Marker = maps.Marker;
    Polyline = maps.Polyline;
    PROVIDER_DEFAULT = maps.PROVIDER_DEFAULT;
  } catch {
    MapView = null;
  }
}

interface TerritoryMapProps {
  readonly points: readonly GpsRoutePoint[];
  readonly height?: number;
}

const ACCENT_CYAN = '#81ecff';
const ACCENT_PURPLE = '#ce96ff';

// Dark map style matching GymClash palette
const MAP_DARK_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#0c0c1f' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#74738b' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0c0c1f' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#aaa8c3' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#74738b' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#1d1d37' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#23233f' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#aaa8c3' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#46465c' }],
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#17172f' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#0c0c1f' }],
  },
];

export function TerritoryMap({ points, height = 240 }: TerritoryMapProps) {
  const mapRef = useRef<any>(null);

  // Auto-follow current position
  useEffect(() => {
    if (!mapRef.current || points.length === 0) return;
    const latest = points[points.length - 1];
    mapRef.current.animateCamera(
      {
        center: { latitude: latest.latitude, longitude: latest.longitude },
        zoom: 17,
      },
      { duration: 800 }
    );
  }, [points.length]);

  // Fallback: no map module available
  if (!MapView || Platform.OS === 'web') {
    return (
      <View
        style={{
          height,
          backgroundColor: '#0d2b2e',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 12,
        }}
      >
        <Text style={{ color: '#aaa8c3', fontFamily: 'BeVietnamPro-Regular', fontSize: 12 }}>
          Map not available on this platform
        </Text>
      </View>
    );
  }

  // No points yet — show waiting state
  if (points.length === 0) {
    return (
      <View
        style={{
          height,
          backgroundColor: '#0d2b2e',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 12,
        }}
      >
        <Text style={{ color: '#aaa8c3', fontFamily: 'BeVietnamPro-Regular', fontSize: 12 }}>
          Acquiring GPS signal…
        </Text>
      </View>
    );
  }

  const latest = points[points.length - 1];
  const polylineCoords = points.map((p) => ({
    latitude: p.latitude,
    longitude: p.longitude,
  }));

  return (
    <View style={{ height, borderRadius: 12, overflow: 'hidden' }}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={{ flex: 1 }}
        initialRegion={{
          latitude: latest.latitude,
          longitude: latest.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        showsScale={false}
        showsBuildings={false}
        showsTraffic={false}
        toolbarEnabled={false}
        rotateEnabled={true}
        scrollEnabled={true}
        zoomEnabled={true}
        customMapStyle={MAP_DARK_STYLE}
      >
        {/* Route trail */}
        {polylineCoords.length >= 2 && (
          <Polyline
            coordinates={polylineCoords}
            strokeColor={ACCENT_PURPLE}
            strokeWidth={4}
            lineCap="round"
            lineJoin="round"
          />
        )}

        {/* Current position marker */}
        <Marker
          coordinate={{ latitude: latest.latitude, longitude: latest.longitude }}
          anchor={{ x: 0.5, y: 0.5 }}
          tracksViewChanges={false}
        >
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 11,
              backgroundColor: ACCENT_CYAN,
              borderWidth: 3,
              borderColor: '#fff',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: ACCENT_CYAN,
              shadowOpacity: 0.8,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 0 },
              elevation: 8,
            }}
          >
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: '#fff',
              }}
            />
          </View>
        </Marker>
      </MapView>
    </View>
  );
}
