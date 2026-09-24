import { StyleProp, StyleSheet, ViewStyle } from "react-native";
import { useEffect, useRef } from "react";

export type LeafletMapHandle = {
  runScript: (script: string) => void;
};

type LeafletMapProps = {
  html: string;
  onMessage?: (data: string) => void;
  style?: StyleProp<ViewStyle>;
  onLoad?: () => void;
  command?: string | null;
};

export function LeafletMap({ html, onMessage, style, onLoad, command }: LeafletMapProps) {
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

  useEffect(() => {
    if (command) frameRef.current?.contentWindow?.postMessage(command, "*");
  }, [command]);

  return (
    <iframe
      ref={frameRef}
      title="Mapa de propiedades EYESITE"
      srcDoc={html}
      onLoad={onLoad}
      style={{ ...StyleSheet.flatten(style), border: "none", display: "block" }}
    />
  );
}
