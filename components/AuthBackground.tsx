import { useEffect, useMemo, useState } from 'react';
import {
  Animated,
  Platform,
  StyleSheet,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const AUTH_BG = '#0E0E0E';

const REMOTE_IMAGES: ImageSourcePropType[] = [
  { uri: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1080' },
  { uri: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1080' },
  { uri: 'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=1080' },
];

// Las imágenes locales forman parte del bundle. Los fallbacks remotos se conservan
// para el caso en que una fuente local falle durante la ejecución.
let cachedImages: ImageSourcePropType[] | null = null;

export const getBgImages = (): ImageSourcePropType[] => {
  if (cachedImages) return cachedImages;
  try {
    const local: ImageSourcePropType[] = [
      require('../../assets/images/auth/casa1.jpeg'),
      require('../../assets/images/auth/casa2.jpeg'),
      require('../../assets/images/auth/casa3.jpeg'),
    ];
    cachedImages = local;
  } catch {
    cachedImages = REMOTE_IMAGES;
  }
  return cachedImages;
};

type AuthBackgroundProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export default function AuthBackground({ children, style }: AuthBackgroundProps) {
  const images = useMemo(() => getBgImages(), []);
  const [fade] = useState(() => new Animated.Value(1));
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      Animated.timing(fade, {
        toValue: 0,
        duration: 600,
        useNativeDriver: Platform.OS !== 'web',
      }).start(() => {
        setIndex((prev) => (prev + 1) % images.length);
        Animated.timing(fade, {
          toValue: 1,
          duration: 600,
          useNativeDriver: Platform.OS !== 'web',
        }).start();
      });
    }, 4000);

    // Limpia intervalo y animaciones pendientes al desmontar.
    return () => {
      clearInterval(interval);
      fade.stopAnimation();
    };
  }, [fade, images.length]);

  return (
    <View style={[styles.root, style]}>
      {/* Slideshow de fondo (imagen actual con crossfade) */}
      <Animated.Image
        source={images[index % images.length]}
        style={[styles.image, { opacity: fade }]}
        resizeMode="cover"
      />

      {/* Degradado hacia el tema #0E0E0E para legibilidad */}
      <LinearGradient
        colors={['rgba(0,0,0,0.3)', 'rgba(14,14,14,0.9)', AUTH_BG]}
        locations={[0, 0.5, 0.85]}
        style={StyleSheet.absoluteFill}
      />

      {/* Contenido por encima */}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0E0E0E', overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  content: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 2,
  },
});