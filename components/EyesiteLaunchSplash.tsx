import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { useI18n } from "@/lib/i18n";

export default function EyesiteLaunchSplash() {
  const { t } = useI18n();
  const [pulse] = useState(() => new Animated.Value(0.88));
  const [glow] = useState(() => new Animated.Value(0));
  const [logoY] = useState(() => new Animated.Value(18));
  const [textOpacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulse, { toValue: 1.06, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(glow, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(pulse, { toValue: 0.96, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(glow, { toValue: 0.35, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
      ]),
    );
    loop.start();

    Animated.parallel([
      Animated.spring(logoY, { toValue: 0, damping: 14, stiffness: 110, mass: 0.7, useNativeDriver: true }),
      Animated.timing(textOpacity, { toValue: 1, duration: 650, delay: 220, easing: Easing.out(Easing.ease), useNativeDriver: true }),
    ]).start();

    return () => loop.stop();
  }, [glow, logoY, pulse, textOpacity]);

  const glowOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0.12, 0.34] });

  return (
    <View style={styles.root} accessibilityRole="progressbar" accessibilityLabel={t("appStarting")}>
      <Animated.View style={[styles.glow, { opacity: glowOpacity, transform: [{ scale: pulse }] }]} />
      <Animated.View style={[styles.logo, { transform: [{ translateY: logoY }, { scale: pulse }] }]}>
        <Ionicons name="eye-outline" size={66} color="#C9A84C" />
      </Animated.View>
      <Animated.View style={{ opacity: textOpacity, alignItems: "center" }}>
        <Text style={styles.brand}>EYESITE</Text>
        <Text style={styles.tagline}>{t("tagline")}</Text>
      </Animated.View>
      <View style={styles.loaderTrack}>
        <Animated.View style={[styles.loader, { opacity: textOpacity }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0E0E0E",
    alignItems: "center",
    justifyContent: "center",
  },
  glow: {
    position: "absolute",
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: "#C9A84C",
  },
  logo: {
    width: 118,
    height: 118,
    borderRadius: 59,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "rgba(201,168,76,0.55)",
    shadowColor: "#C9A84C",
    shadowOpacity: 0.28,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
    marginBottom: 24,
  },
  brand: {
    color: "#FFFFFF",
    fontSize: 31,
    fontWeight: "900",
    letterSpacing: 5,
  },
  tagline: {
    color: "#9D9D9D",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 2,
    marginTop: 8,
  },
  loaderTrack: {
    width: 112,
    height: 2,
    marginTop: 30,
    backgroundColor: "#292929",
    overflow: "hidden",
    borderRadius: 2,
  },
  loader: {
    width: 48,
    height: 2,
    backgroundColor: "#C9A84C",
  },
});
