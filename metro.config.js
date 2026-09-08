const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// V6.3: pnpm + @expo/vector-icons — resolver de symlinks y package exports.
// Fix del error "ExpoAsset.downloadAsync failed ... ?unstable_path=...".
// (SDK 57 soporta ambos flags; symlinks ya es default pero explícito no daña)
config.resolver = {
  ...config.resolver,
  unstable_enableSymlinks: true,
  unstable_enablePackageExports: true,
};

module.exports = withNativeWind(config, {
  input: "./global.css",
  // Force write CSS to file system instead of virtual modules
  // This fixes iOS styling issues in development mode
  forceWriteFileSystem: true,
});
