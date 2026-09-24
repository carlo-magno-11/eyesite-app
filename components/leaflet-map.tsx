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
      runScript: (script) => webViewRef.current?.injectJavaScript(script),
    }), []);
    useEffect(() => {
      if (command) webViewRef.current?.injectJavaScript(command);
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
