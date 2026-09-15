import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { WebView } from "react-native-webview";

import { ScreenContainer } from "@/components/screen-container";
import { supabase } from "@/lib/supabase";

const YUCATAN_REGION = {
  latitude: 20.9674,
  longitude: -89.5926,
  latitudeDelta: 0.35,
  longitudeDelta: 0.35,
};

type MapPoint = {
  latitude: number;
  longitude: number;
};

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function createMapHtml(
  point: MapPoint | null,
  title: string,
  municipio: string,
) {
  const latitude = point?.latitude ?? YUCATAN_REGION.latitude;
  const longitude = point?.longitude ?? YUCATAN_REGION.longitude;

  const markerJson = point
    ? JSON.stringify({
        latitude: point.latitude,
        longitude: point.longitude,
        title: escapeHtml(title),
      })
        .replace(/</g, "\\u003c")
        .replace(/>/g, "\\u003e")
        .replace(/&/g, "\\u0026")
        .replace(/<\/script/gi, "<\\/script")
    : "null";

  const initialJson = JSON.stringify({
    latitude,
    longitude,
    latitudeDelta: point ? 0.02 : YUCATAN_REGION.latitudeDelta,
    longitudeDelta: point ? 0.02 : YUCATAN_REGION.longitudeDelta,
  });

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
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
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #111;
}

.leaflet-control-attribution {
  font-size: 9px;
}

.location-box {
  position: absolute;
  z-index: 1000;
  top: 10px;
  left: 10px;
  right: 10px;
  padding: 9px 12px;
  border-radius: 9px;
  background: rgba(14, 14, 14, 0.90);
  color: white;
  font-family: Arial, sans-serif;
  font-size: 11px;
  text-align: center;
  box-shadow: 0 2px 10px rgba(0,0,0,.35);
}
</style>
</head>

<body>

<div id="map"></div>

<div class="location-box">
  Toca el mapa para colocar o mover el punto real del terreno
</div>

<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

<script>
const initial = ${initialJson};
const existingMarker = ${markerJson};

const map = L.map('map', {
  zoomControl: true,
  attributionControl: true
}).setView(
  [initial.latitude, initial.longitude],
  existingMarker ? 15 : 9
);

L.tileLayer(
  'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }
).addTo(map);

let marker = null;

function sendPoint(latitude, longitude) {
  window.ReactNativeWebView.postMessage(
    JSON.stringify({
      type: 'map_point',
      latitude,
      longitude
    })
  );
}

function placeMarker(latitude, longitude) {
  if (marker) {
    marker.setLatLng([latitude, longitude]);
  } else {
    marker = L.marker([latitude, longitude], {
      draggable: true
    }).addTo(map);

    marker.on('dragend', function () {
      const position = marker.getLatLng();
      sendPoint(position.lat, position.lng);
    });
  }

  marker.bindPopup(
    ${JSON.stringify(
      `${escapeHtml(title)}${municipio ? ` — ${escapeHtml(municipio)}` : ""}`,
    )}
  );

  map.setView([latitude, longitude], 17);

  sendPoint(latitude, longitude);
}

if (existingMarker) {
  placeMarker(
    existingMarker.latitude,
    existingMarker.longitude
  );
}

map.on('click', function (event) {
  placeMarker(
    event.latlng.lat,
    event.latlng.lng
  );
});
</script>

</body>
</html>`;
}

export default function AdminPropertyDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [price, setPrice] = useState("");
  const [latitud, setLatitud] = useState("");
  const [longitud, setLongitud] = useState("");

  const load = useCallback(async () => {
    if (!id) return;

    setLoading(true);

    const { data, error } = await supabase
      .from("propiedades_admin")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) {
      setLoading(false);

      Alert.alert("Error", error?.message || "Propiedad no encontrada.");

      router.back();
      return;
    }

    setProperty(data);

    setPrice(
      data.precio_actual !== null && data.precio_actual !== undefined
        ? String(data.precio_actual)
        : "",
    );

    setLatitud(
      data.latitud !== null && data.latitud !== undefined
        ? String(data.latitud)
        : "",
    );

    setLongitud(
      data.longitud !== null && data.longitud !== undefined
        ? String(data.longitud)
        : "",
    );

    setLoading(false);
  }, [id]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 0);

    return () => clearTimeout(timer);
  }, [load]);

  /*
   * Todas las modificaciones pasan por la función
   * administrativa segura.
   */
  const adminUpdateProperty = useCallback(
    async (changes: {
      precio_actual?: number | null;
      estado?: "activa" | "inactiva" | null;
      activa?: boolean | null;
      latitud?: number | null;
      longitud?: number | null;
    }) => {
      if (!id) return false;

      setSaving(true);

      try {
        const { error } = await supabase.rpc("admin_update_property", {
          p_property_id: id,
          p_precio_actual: changes.precio_actual ?? null,
          p_estado: changes.estado ?? null,
          p_activa: changes.activa ?? null,
          p_latitud: changes.latitud ?? null,
          p_longitud: changes.longitud ?? null,
        });

        if (error) {
          Alert.alert("Error", error.message);
          return false;
        }

        await load();
        return true;
      } catch (error) {
        console.error("[EYESITE] admin property update error", error);

        Alert.alert("Error", "No fue posible guardar los cambios.");

        return false;
      } finally {
        setSaving(false);
      }
    },
    [id, load],
  );

  const activateProperty = async () => {
    const ok = await adminUpdateProperty({
      estado: "activa",
      activa: true,
    });

    if (ok) {
      Alert.alert(
        "Propiedad activada",
        "La propiedad ya está disponible como propiedad activa.",
      );
    }
  };

  const deactivateProperty = async () => {
    const ok = await adminUpdateProperty({
      estado: "inactiva",
      activa: false,
    });

    if (ok) {
      Alert.alert(
        "Propiedad desactivada",
        "La propiedad dejó de mostrarse como activa.",
      );
    }
  };

  const savePrice = async () => {
    const normalized = price.trim().replace(",", ".");
    const value = Number(normalized);

    if (!normalized || !Number.isFinite(value) || value < 0) {
      Alert.alert(
        "Precio inválido",
        "Introduce un precio válido mayor o igual a cero.",
      );
      return;
    }

    const ok = await adminUpdateProperty({
      precio_actual: value,
    });

    if (ok) {
      Alert.alert("Guardado", "El precio fue actualizado correctamente.");
    }
  };

  const parseCoordinate = (value: string): number | null => {
    if (value.trim() === "") return null;

    const number = Number(value.trim().replace(",", "."));

    return Number.isFinite(number) ? number : null;
  };

  const saveLocation = async () => {
    const lat = parseCoordinate(latitud);
    const lng = parseCoordinate(longitud);

    const bothEmpty =
      lat === null &&
      lng === null &&
      latitud.trim() === "" &&
      longitud.trim() === "";

    if (bothEmpty) {
      const ok = await adminUpdateProperty({
        latitud: null,
        longitud: null,
      });

      if (ok) {
        Alert.alert(
          "Ubicación eliminada",
          "La propiedad ya no tiene coordenadas publicadas.",
        );
      }

      return;
    }

    if (lat === null || lng === null) {
      Alert.alert(
        "Coordenadas incompletas",
        "Captura latitud y longitud juntas.",
      );
      return;
    }

    if (lat < -90 || lat > 90) {
      Alert.alert("Latitud inválida", "La latitud debe estar entre -90 y 90.");
      return;
    }

    if (lng < -180 || lng > 180) {
      Alert.alert(
        "Longitud inválida",
        "La longitud debe estar entre -180 y 180.",
      );
      return;
    }

    const ok = await adminUpdateProperty({
      latitud: lat,
      longitud: lng,
    });

    if (ok) {
      Alert.alert(
        "Ubicación guardada",
        "La ubicación real de la propiedad fue guardada correctamente.",
      );
    }
  };

  const mapPoint = useMemo<MapPoint | null>(() => {
    const lat = parseCoordinate(latitud);
    const lng = parseCoordinate(longitud);

    if (lat === null || lng === null) {
      return null;
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return null;
    }

    return {
      latitude: lat,
      longitude: lng,
    };
  }, [latitud, longitud]);

  const mapHtml = useMemo(() => {
    if (!property) return "";

    return createMapHtml(
      mapPoint,
      property.titulo || "Propiedad EYESITE",
      property.municipio || property.ubicacion || "",
    );
  }, [mapPoint, property]);

  const handleMapMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event?.nativeEvent?.data || "{}");

      if (data?.type !== "map_point") {
        return;
      }

      const latitude = Number(data.latitude);
      const longitude = Number(data.longitude);

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return;
      }

      if (
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
      ) {
        return;
      }

      setLatitud(latitude.toFixed(7));
      setLongitud(longitude.toFixed(7));
    } catch (error) {
      console.error("[EYESITE] admin map message error", error);
    }
  }, []);

  if (loading) {
    return (
      <ScreenContainer
        edges={["top", "left", "right"]}
        containerClassName="bg-background"
      >
        <View style={styles.center}>
          <ActivityIndicator color="#C9A84C" size="large" />
        </View>
      </ScreenContainer>
    );
  }

  if (!property) {
    return null;
  }

  const hasCoords =
    Number.isFinite(Number(property.latitud)) &&
    Number.isFinite(Number(property.longitud));

  return (
    <ScreenContainer
      edges={["top", "left", "right"]}
      containerClassName="bg-background"
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>{property.titulo || "Propiedad"}</Text>

        <Text style={styles.code}>{property.codigo || property.id}</Text>

        {/* ESTADO */}
        <View style={styles.card}>
          <Text style={styles.label}>Estado</Text>

          <Text style={styles.value}>
            {property.estado || "—"} · {property.activa ? "Activa" : "Inactiva"}
          </Text>

          <View style={styles.actions}>
            <Pressable
              disabled={saving}
              onPress={activateProperty}
              style={[styles.green, saving && styles.disabled]}
            >
              <Text style={styles.btn}>Activar</Text>
            </Pressable>

            <Pressable
              disabled={saving}
              onPress={deactivateProperty}
              style={[styles.red, saving && styles.disabled]}
            >
              <Text style={styles.btn}>Desactivar</Text>
            </Pressable>
          </View>
        </View>

        {/* PRECIO */}
        <View style={styles.card}>
          <Text style={styles.label}>Precio actual</Text>

          <TextInput
            value={price}
            onChangeText={setPrice}
            keyboardType="decimal-pad"
            editable={!saving}
            style={styles.input}
            placeholder="Precio"
            placeholderTextColor="#666"
          />

          <Pressable
            disabled={saving}
            onPress={savePrice}
            style={[styles.gold, saving && styles.disabled]}
          >
            <Text style={styles.btn}>Guardar precio</Text>
          </Pressable>
        </View>

        {/* MAPA */}
        <View style={styles.card}>
          <Text style={styles.label}>Ubicación verificada para el mapa</Text>

          <Text style={styles.helper}>
            Toca exactamente sobre el terreno para colocar el marcador. También
            puedes arrastrar el marcador para corregirlo. No se utilizará
            automáticamente el centro del municipio.
          </Text>

          {Platform.OS !== "web" ? (
            <View style={styles.mapBox}>
              <WebView
                originWhitelist={["*"]}
                source={{ html: mapHtml }}
                onMessage={handleMapMessage}
                javaScriptEnabled
                domStorageEnabled
                scrollEnabled={false}
                setSupportMultipleWindows={false}
                style={styles.webview}
              />
            </View>
          ) : (
            <View style={styles.webMapNotice}>
              <Text style={styles.webMapNoticeText}>
                El selector de mapa está disponible en la aplicación móvil.
              </Text>
            </View>
          )}

          <TextInput
            value={latitud}
            onChangeText={setLatitud}
            keyboardType="decimal-pad"
            editable={!saving}
            placeholder="Latitud"
            placeholderTextColor="#666"
            style={styles.input}
          />

          <TextInput
            value={longitud}
            onChangeText={setLongitud}
            keyboardType="decimal-pad"
            editable={!saving}
            placeholder="Longitud"
            placeholderTextColor="#666"
            style={styles.input}
          />

          <Pressable
            disabled={saving}
            onPress={saveLocation}
            style={[styles.gold, saving && styles.disabled]}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btn}>Guardar ubicación del mapa</Text>
            )}
          </Pressable>

          {hasCoords && (
            <Text style={styles.saved}>
              ✓ Ubicación actual: {Number(property.latitud).toFixed(7)},{" "}
              {Number(property.longitud).toFixed(7)}
            </Text>
          )}

          {!hasCoords && (
            <Text style={styles.notSaved}>Sin ubicación verificada.</Text>
          )}
        </View>

        {/* INFORMACIÓN */}
        <View style={styles.card}>
          <Text style={styles.label}>Tipo</Text>

          <Text style={styles.value}>{property.tipo || "—"}</Text>

          <Text style={styles.label}>Ubicación</Text>

          <Text style={styles.value}>
            {property.municipio || property.ubicacion || "—"}
          </Text>

          <Text style={styles.label}>Superficie</Text>

          <Text style={styles.value}>
            {property.superficie || "—"} {property.unidad_superficie || "m²"}
          </Text>

          <Text style={styles.label}>Propietario interno</Text>

          <Text style={styles.value}>{property.dueno_nombre || "—"}</Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 100,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  title: {
    color: "#fff",
    fontSize: 23,
    fontWeight: "800",
  },

  code: {
    color: "#777",
    fontSize: 11,
    marginTop: 4,
    marginBottom: 15,
  },

  card: {
    backgroundColor: "#171717",
    borderWidth: 1,
    borderColor: "#2b2b2b",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },

  label: {
    color: "#888",
    fontSize: 12,
    marginTop: 8,
  },

  helper: {
    color: "#888",
    fontSize: 11,
    lineHeight: 17,
    marginTop: 6,
  },

  value: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    marginTop: 3,
  },

  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 15,
  },

  green: {
    flex: 1,
    backgroundColor: "#15803d",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },

  red: {
    flex: 1,
    backgroundColor: "#b91c1c",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },

  gold: {
    backgroundColor: "#9a7a25",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    minHeight: 44,
  },

  disabled: {
    opacity: 0.55,
  },

  btn: {
    color: "#fff",
    fontWeight: "800",
  },

  input: {
    backgroundColor: "#0f0f0f",
    borderWidth: 1,
    borderColor: "#444",
    color: "#fff",
    borderRadius: 8,
    padding: 12,
    marginTop: 7,
  },

  mapBox: {
    height: 300,
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#333",
  },

  webview: {
    flex: 1,
    backgroundColor: "#111",
  },

  webMapNotice: {
    minHeight: 100,
    borderRadius: 10,
    marginTop: 10,
    backgroundColor: "#0f0f0f",
    borderWidth: 1,
    borderColor: "#333",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },

  webMapNoticeText: {
    color: "#999",
    textAlign: "center",
    fontSize: 12,
  },

  saved: {
    color: "#7bbf8b",
    fontSize: 11,
    marginTop: 8,
  },

  notSaved: {
    color: "#c9955a",
    fontSize: 11,
    marginTop: 8,
  },
});
