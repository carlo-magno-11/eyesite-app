import { StyleProp, ViewStyle } from "react-native";
import { WebView } from "react-native-webview";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

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

export const LeafletMap = forwardRef<LeafletMapHandle, LeafletMapProps>(
  function LeafletMap({ html, onMessage, style, onLoad, command }, ref) {
    const webViewRef = useRef<WebView>(null);
    useImperativeHandle(ref, () => ({
      runScript: (script) => {
        const safeScript = JSON.stringify(script);
        webViewRef.current?.injectJavaScript(
          `window.postMessage(${safeScript}, '*'); true;`,
        );
      },
    }), []);
    useEffect(() => {
      if (command) {
        const safeCommand = JSON.stringify(command);
        webViewRef.current?.injectJavaScript(
          `window.postMessage(${safeCommand}, '*'); true;`,
        );
      }
    }, [command]);
    return (
      <WebView
        ref={webViewRef}
        originWhitelist={["*"]}
        source={{ html }}
        onMessage={(event) => onMessage?.(event.nativeEvent.data)}
        onLoad={onLoad}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        style={style}
      />
    );
  },
);
