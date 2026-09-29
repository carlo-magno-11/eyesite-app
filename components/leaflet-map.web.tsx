import { StyleProp, StyleSheet, ViewStyle } from "react-native";
import { useEffect, useRef } from "react";
import type React from "react";

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
      style={{
        ...(StyleSheet.flatten(style) as React.CSSProperties),
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        width: "100%",
        height: "100%",
        minWidth: 0,
        minHeight: 0,
        border: "none",
        display: "block",
        backgroundColor: "#0B0B0B",
      }}
    />
  );
}
