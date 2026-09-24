import { StyleProp, ViewStyle } from "react-native";
import { WebView } from "react-native-webview";

type LeafletMapProps = {
  html: string;
  onMessage?: (data: string) => void;
  style?: StyleProp<ViewStyle>;
  onLoad?: () => void;
};

export function LeafletMap({ html, onMessage, style, onLoad }: LeafletMapProps) {
  return (
    <WebView
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
}
