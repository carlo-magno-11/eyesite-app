import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import { LeafletMap } from "@/components/leaflet-map";

import { formatPrice } from "@/lib/properties-data";
import { ScreenContainer } from "@/components/screen-container";
import { useCommercial } from "@/hooks/use-commercial";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";

type UserCoords = {
  latitude: number;
  longitude: number;
};

type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
  zoom: number;
};

const YUCATAN_BOUNDS = {
  south: 19.35,
  west: -90.55,
  north: 21.82,
  east: -87.28,
};

const YUCATAN_MAP_CENTER = {
  latitude: 20.6,
  longitude: -88.91,
};

const YUCATAN_QUERY_RADIUS_KM = 300;

type MapProperty = {
  id: string;
  title?: string;
  titulo?: string;
  municipio?: string;
  location?: string;
  latitud?: number | string | null;
  longitud?: number | string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  currentPrice?: number | string | null;
  precio_actual?: number | string | null;
  priceUnit?: string | null;
  unidad_precio?: string | null;
};

type NearbyProperty = MapProperty & {
  distance?: number;
};

const DEFAULT_REGION: Region = {
  ...YUCATAN_MAP_CENTER,
  latitudeDelta: 2.55,
  longitudeDelta: 3.35,
  zoom: 7,
};



function distanceKm(a: UserCoords, b: UserCoords) {
  const R = 6371;

  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;

  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function getLatitude(property: MapProperty) {
  return Number(property.latitud ?? property.latitude);
}

function getLongitude(property: MapProperty) {
  return Number(property.longitud ?? property.longitude);
}

function getPropertyTitle(property: MapProperty) {
  return property.title || property.titulo || "Propiedad EYESITE";
}

function getPropertyPrice(property: MapProperty) {
  const price = property.currentPrice ?? property.precio_actual;

  if (price === null || price === undefined || price === "") {
    return "";
  }

  const numericPrice = Number(price);

  if (!Number.isFinite(numericPrice)) {
    return "";
  }

  return formatPrice(
    numericPrice,
    property.priceUnit ?? property.unidad_precio ?? "MXN",
  );
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function createMapHtml(
  properties: NearbyProperty[],
  initialRegion: Region,
  userLocation: UserCoords | null,
) {
  const safeProperties = properties.map((property) => ({
    id: escapeHtml(property.id),
    title: escapeHtml(getPropertyTitle(property)),
    municipio: escapeHtml(property.municipio || property.location || "Yucatán"),
    latitude: getLatitude(property),
    longitude: getLongitude(property),
    price: escapeHtml(getPropertyPrice(property)),
    distance:
      typeof property.distance === "number"
        ? Number(property.distance.toFixed(1))
        : null,
  }));

  const userLocationJson = userLocation
    ? JSON.stringify(userLocation)
    : "null";

  const propertiesJson = JSON.stringify(safeProperties)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/<\/script/gi, "<\\/script");

  const initialJson = JSON.stringify({
    latitude: initialRegion.latitude,
    longitude: initialRegion.longitude,
    latitudeDelta: initialRegion.latitudeDelta,
    longitudeDelta: initialRegion.longitudeDelta,
    zoom: initialRegion.zoom,
  });

  return `
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />

<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
/>

<link
  rel="stylesheet"
  href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
/>

<style>
  html,
  body,
  #map {
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    background: #0b0b0b;
  }

  body {
    overflow: hidden;
    font-family:
      -apple-system,
      BlinkMacSystemFont,
      "Segoe UI",
      sans-serif;
  }

  .leaflet-control-zoom a {
    background: #141414 !important;
    color: #f5f5f5 !important;
    border-color: #2a2a2a !important;
  }

  .leaflet-control-attribution {
    background: rgba(14, 14, 14, 0.8) !important;
    color: #999 !important;
    font-size: 9px !important;
  }

  .leaflet-control-attribution a {
    color: #d8b968 !important;
  }

  .property-popup {
    min-width: 180px;
  }

  .property-title {
    font-size: 15px;
    font-weight: 800;
    color: #171717;
    margin-bottom: 5px;
  }

  .property-location {
    font-size: 12px;
    color: #666;
    margin-bottom: 5px;
  }

  .property-price {
    font-size: 13px;
    font-weight: 700;
    color: #c9a84c;
    margin-bottom: 4px;
  }

  .property-distance {
    font-size: 11px;
    color: #777;
    margin-bottom: 8px;
  }

  .property-button {
    border: 0;
    border-radius: 7px;
    background: #c9a84c;
    color: #0d0d0d;
    padding: 8px 11px;
    font-size: 12px;
    font-weight: 800;
  }
</style>
</head>

<body>
<div id="map"></div>

<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

<script>
  const PROPERTIES = ${propertiesJson};
  const INITIAL_REGION = ${initialJson};
  const USER_LOCATION = ${userLocationJson};

  const map = L.map('map', {
    zoomControl: true,
    attributionControl: true,
  }).setView(
    [INITIAL_REGION.latitude, INITIAL_REGION.longitude],
    INITIAL_REGION.zoom
  );

  L.tileLayer(
    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }
  ).addTo(map);

  map.setMaxBounds([
    [19.35, -90.55],
    [21.82, -87.28],
  ]);
  map.options.maxBoundsViscosity = 0.85;

  function sendToApp(payload) {
    const message = JSON.stringify(payload);

    if (
      window.ReactNativeWebView &&
      window.ReactNativeWebView.postMessage
    ) {
      window.ReactNativeWebView.postMessage(message);
    } else if (window.parent && window.parent !== window) {
      window.parent.postMessage(message, "*");
    }
  }

  const propertyIcon = L.divIcon({
    className: '',
    html: \`
      <div style="
        width: 30px;
        height: 30px;
        border-radius: 15px;
        background: #c9a84c;
        border: 3px solid #111;
        box-shadow: 0 2px 7px rgba(0,0,0,.45);
        display:flex;
        align-items:center;
        justify-content:center;
        color:#111;
        font-weight:900;
        font-size:13px;
      ">E</div>
    \`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
  });

  const markers = [];

  if (
    USER_LOCATION &&
    Number.isFinite(USER_LOCATION.latitude) &&
    Number.isFinite(USER_LOCATION.longitude)
  ) {
    L.circleMarker(
      [USER_LOCATION.latitude, USER_LOCATION.longitude],
      {
        radius: 8,
        color: '#111',
        weight: 3,
        fillColor: '#4A90E2',
        fillOpacity: 1,
      }
    )
      .addTo(map)
      .bindTooltip('Tu ubicación', { direction: 'top', offset: [0, -8] });
  }

  PROPERTIES.forEach((property) => {
    if (
      !Number.isFinite(property.latitude) ||
      !Number.isFinite(property.longitude)
    ) {
      return;
    }

    const marker = L.marker(
      [property.latitude, property.longitude],
      {
        icon: propertyIcon,
      }
    ).addTo(map);

    let popup = \`
      <div class="property-popup">

        <div class="property-title">
          \${property.title}
        </div>

        <div class="property-location">
          \${property.municipio}
        </div>
    \`;

    if (property.price) {
      popup += \`
        <div class="property-price">
          \${property.price}
        </div>
      \`;
    }

    if (property.distance !== null) {
      popup += \`
        <div class="property-distance">
          A \${property.distance} km de ti
        </div>
      \`;
    }

    popup += \`
        <button
          class="property-button"
          onclick="openProperty('\${property.id}')"
        >
          Ver propiedad
        </button>

      </div>
    \`;

    marker.bindPopup(popup);

    marker.on('click', function () {
      sendToApp({
        type: 'property_marker',
        id: property.id,
      });
    });

    markers.push(marker);
  });

  function openProperty(id) {
    sendToApp({
      type: 'property',
      id: String(id),
    });
  }

  // Leaflet keeps internal pixel dimensions. Recalculate them when the
  // responsive WebView/iframe changes size (browser resize, orientation,
  // split-screen, tablet rotation, etc.).
  const refreshMapSize = () => map.invalidateSize({ pan: false });
  window.addEventListener('resize', refreshMapSize);
  setTimeout(refreshMapSize, 0);
  setTimeout(refreshMapSize, 250);

  // The default view is the whole state of Yucatán. User location is optional
  // and never replaces the initial statewide view.
</script>
</body>
</html>
`;
}

export default function MapScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { height: windowHeight } = useWindowDimensions();

  const { trackPropertyEvent } = useCommercial();
  const [properties, setProperties] = useState<MapProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);
  const mapRequestGeneration = useRef(0);

  const [userLocation, setUserLocation] = useState<UserCoords | null>(null);

  const [locating, setLocating] = useState(false);

  const fetchMapProperties = useCallback(async (center: UserCoords, radiusKm: number) => {
    const requestId = ++mapRequestGeneration.current;
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc("get_public_map_properties", {
        p_lat: center.latitude,
        p_lon: center.longitude,
        p_radius_km: radiusKm,
        p_limit: 500,
      });

      if (error) throw error;
      if (requestId !== mapRequestGeneration.current) return;
      setProperties((data ?? []) as MapProperty[]);
      setMapError(null);
    } catch (error) {
      if (requestId !== mapRequestGeneration.current) return;
      console.error("[EYESITE] map properties error", error);
      setProperties([]);
      setMapError(error instanceof Error ? error.message : t("mapLoadError"));
    } finally {
      if (requestId === mapRequestGeneration.current) setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    const center = userLocation ?? {
      latitude: DEFAULT_REGION.latitude,
      longitude: DEFAULT_REGION.longitude,
    };
    const timer = setTimeout(() => {
      void fetchMapProperties(
        { latitude: YUCATAN_MAP_CENTER.latitude, longitude: YUCATAN_MAP_CENTER.longitude },
        YUCATAN_QUERY_RADIUS_KM,
      );
    }, 0);

    let refreshTimer: ReturnType<typeof setTimeout> | null = null;

    const channel = supabase
      .channel("eyesite-map-property-feed")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "propiedades_cambios",
        },
        () => {
          if (refreshTimer) clearTimeout(refreshTimer);
          refreshTimer = setTimeout(() => {
            refreshTimer = null;
            void fetchMapProperties(
              { latitude: YUCATAN_MAP_CENTER.latitude, longitude: YUCATAN_MAP_CENTER.longitude },
              YUCATAN_QUERY_RADIUS_KM,
            );
          }, 500);
        },
      )
      .subscribe();

    return () => {
      clearTimeout(timer);
      if (refreshTimer) clearTimeout(refreshTimer);
      void supabase.removeChannel(channel);
    };
  }, [fetchMapProperties, userLocation]);

  const requestLocation = useCallback(async () => {
    setLocating(true);

    try {
      if (Platform.OS === "web") {
        if (!("geolocation" in navigator)) {
          throw new Error("El navegador no ofrece geolocalización.");
        }

        await new Promise<void>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const coords = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
              };

              setUserLocation(coords);
              resolve();
            },
            reject,
            {
              enableHighAccuracy: false,
              maximumAge: 60_000,
              timeout: 10_000,
            },
          );
        });

        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== Location.PermissionStatus.GRANTED) {
        Alert.alert(t("mapLocationPermission"), t("mapLocationPermissionDescription"));
        return;
      }

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const coords: UserCoords = {
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      };

      setUserLocation(coords);
    } catch (error) {
      console.error("[EYESITE] map location error", error);

      Alert.alert(t("mapLocation"), t("mapLocationError"));
    } finally {
      setLocating(false);
    }
  }, [t]);

  const geoProperties = useMemo(() => {
    return (properties ?? []).filter((property: any) => {
      const latitude = getLatitude(property);
      const longitude = getLongitude(property);

      return (
        Number.isFinite(latitude) &&
        Number.isFinite(longitude) &&
        Math.abs(latitude) <= 90 &&
        Math.abs(longitude) <= 180
      );
    });
  }, [properties]);

  const nearby = useMemo<NearbyProperty[]>(() => {
    if (!userLocation) {
      return geoProperties.map((property: any) => ({
        ...property,
        distance: undefined,
      }));
    }

    return geoProperties
      .map((property: any) => ({
        ...property,
        distance: distanceKm(userLocation, {
          latitude: getLatitude(property),
          longitude: getLongitude(property),
        }),
      }))
      .sort((a: any, b: any) => Number(a.distance) - Number(b.distance));
  }, [geoProperties, userLocation]);

  const mapHtml = useMemo(
    () =>
      createMapHtml(
        nearby,
        userLocation
          ? {
              ...DEFAULT_REGION,
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
              latitudeDelta: 0.18,
              longitudeDelta: 0.18,
              zoom: 11,
            }
          : DEFAULT_REGION,
        userLocation,
      ),
    [nearby, userLocation],
  );

  // Web: keep the map responsive across laptops, tablets and split-screen.
  // The map shares the page with a header and a short result list.
  // En web el mapa debe ocupar el espacio vertical disponible y no quedar
  // reducido por una altura fija pequeña. El footer permanece compacto debajo.
  const webMapHeight = Math.max(
    500,
    Math.min(Math.round(windowHeight * 0.70), 860),
  );

  const handleMapMessage = useCallback(
    (rawData: string) => {
      try {
        const data = JSON.parse(rawData || "{}");

        if (data?.type === "property" || data?.type === "property_marker") {
          if (!data.id) return;
          void trackPropertyEvent(String(data.id), "map_open", {
            interaction: data.type === "property_marker" ? "marker" : "popup",
          }, "map");
          router.push(`/property/${String(data.id)}` as any);
        }
      } catch (error) {
        console.error("[EYESITE] map message error", error);
      }
    },
    [router, trackPropertyEvent],
  );

  return (
    <ScreenContainer
      edges={["top", "left", "right"]}
      containerClassName="bg-background"
    >
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>{t("mapTitle")}</Text>

          <Text style={styles.subtitle}>
            {userLocation
              ? `${nearby.length} oportunidades en Yucatán`
              : `${geoProperties.length} propiedades con ubicación`}
          </Text>
        </View>

        <View style={styles.headerActions}>
          {userLocation && (
            <Pressable
              onPress={() => setUserLocation(null)}
              style={styles.resetMapButton}
            >
              <Text style={styles.resetMapButtonText}>{t("mapAllYucatan")}</Text>
            </Pressable>
          )}

          <Pressable
            onPress={requestLocation}
            style={styles.locationButton}
            disabled={locating}
          >
            {locating ? (
              <ActivityIndicator size="small" color="#0D0D0D" />
            ) : (
              <Text style={styles.locationButtonText}>⌖</Text>
            )}
          </Pressable>
        </View>
      </View>

      <View style={styles.mapHintRow}>
        <Text style={styles.mapHintText}>
          {t("mapHint")}
        </Text>
      </View>

      <View
        style={[
          styles.mapWrap,
          Platform.OS === "web" && { height: webMapHeight },
        ]}
      >
        <>
          <LeafletMap
            html={mapHtml}
            onMessage={handleMapMessage}
            style={StyleSheet.absoluteFill}
          />

          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator color="#C9A84C" size="large" />
            </View>
          )}

          {!loading && geoProperties.length === 0 && (

            <View style={styles.emptyOverlay}>
              <Text style={styles.emptyTitle}>
                {mapError ? t("mapLoadError") : t("mapNoLocated")}
              </Text>

              <Text style={styles.emptyText}>
                {mapError || t("mapOnlyActive")}
              </Text>
            </View>
          )}
        </>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerTitle}>
          {userLocation ? t("mapNearbyTitle") : t("mapLocatedTitle")}
        </Text>

        <Text style={styles.footerNote}>
          {t("mapPublishedOnly")}
        </Text>

        {nearby.slice(0, 4).map((item) => {
          const distance =
            typeof item.distance === "number" ? item.distance : undefined;

          return (
            <Pressable
              key={item.id}
              style={styles.resultRow}
              onPress={() => router.push(`/property/${String(item.id)}` as any)}
            >
              <View style={styles.pin}>
                <Text style={styles.pinText}>E</Text>
              </View>

              <View style={styles.resultContent}>
                <Text numberOfLines={1} style={styles.resultTitle}>
                  {getPropertyTitle(item)}
                </Text>

                <Text style={styles.resultMeta}>
                  {item.municipio || item.location || "Yucatán"}
                  {distance !== undefined ? ` · ${distance.toFixed(1)} km ${t("kmFromYou")}` : ""}
                </Text>
              </View>

              <Text style={styles.arrow}>›</Text>
            </Pressable>
          );
        })}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 8,
  },

  headerContent: {
    flex: 1,
  },

  title: {
    color: "#F5F5F5",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 1.2,
  },

  subtitle: {
    color: "#9A9A9A",
    fontSize: 12,
    marginTop: 4,
  },

  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  resetMapButton: {
    minHeight: 38,
    paddingHorizontal: 10,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: "#C9A84C",
    justifyContent: "center",
  },

  resetMapButtonText: {
    color: "#C9A84C",
    fontSize: 10,
    fontWeight: "800",
  },

  locationButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#C9A84C",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },

  locationButtonText: {
    color: "#0B0B0B",
    fontSize: 23,
    fontWeight: "900",
  },

  mapHintRow: {
    paddingHorizontal: 18,
    paddingBottom: 10,
  },

  mapHintText: {
    color: "#9A9A9A",
    fontSize: 11,
  },

  mapWrap: {
    flex: 1,
    minHeight: 360,
    marginHorizontal: 12,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#2A2A2A",
    position: "relative",
  },

  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(11,11,11,.55)",
  },

  emptyOverlay: {
    position: "absolute",
    left: 24,
    right: 24,
    bottom: 24,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "rgba(11,11,11,.94)",
    borderWidth: 1,
    borderColor: "#C9A84C",
  },

  emptyTitle: {
    color: "#F5F5F5",
    fontWeight: "800",
    marginBottom: 5,
  },

  emptyText: {
    color: "#B8B8B8",
    fontSize: 12,
    lineHeight: 17,
  },

  footer: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 8,
  },

  footerTitle: {
    color: "#F5F5F5",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 2,
  },

  footerNote: {
    color: "#707070",
    fontSize: 10,
    marginBottom: 4,
  },

  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    gap: 10,
  },

  pin: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#1A1A1A",
    alignItems: "center",
    justifyContent: "center",
  },

  pinText: {
    color: "#F5F5F5",
    fontSize: 13,
    fontWeight: "700",
  },

  resultContent: {
    flex: 1,
  },

  resultTitle: {
    color: "#F5F5F5",
    fontSize: 13,
    fontWeight: "700",
  },

  resultMeta: {
    color: "#8E8E8E",
    fontSize: 11,
    marginTop: 2,
  },

  arrow: {
    color: "#C9A84C",
    fontSize: 24,
  },
});
