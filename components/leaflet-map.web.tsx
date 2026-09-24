import { StyleProp, StyleSheet, ViewStyle } from "react-native";
import { useEffect, useRef } from "react";

type LeafletMapProps = {
  html: string;
  onMessage?: (data: string) => void;
  style?: StyleProp<ViewStyle>;
  onLoad?: () => void;
};

export function LeafletMap({ html, onMessage, style, onLoad }: LeafletMapProps) {
  const frameRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (frameRef.current?.contentWindow !== event.source) return;
      if (typeof event.data !== "string") return;
      onMessage?.(event.data);
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onMessage]);

  return (
    <iframe
      ref={frameRef}
      title="Mapa de propiedades EYESITE"
      srcDoc={html}
      onLoad={onLoad}
      style={{
        ...StyleSheet.flatten(style),
        border: "none",
        display: "block",
      }}
    />
  );
}
