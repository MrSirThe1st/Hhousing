const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Watch the entire monorepo
config.watchFolders = Array.from(new Set([...(config.watchFolders ?? []), workspaceRoot]));

// Resolve modules from the app first, then the workspace root
config.resolver.nodeModulesPaths = Array.from(
  new Set([
    ...(config.resolver.nodeModulesPaths ?? []),
    path.resolve(projectRoot, "node_modules"),
    path.resolve(workspaceRoot, "node_modules"),
  ])
);

// Force React and React Native to resolve from a single location
// to prevent "Invalid hook call" errors in pnpm monorepos
config.resolver.extraNodeModules = {
  react: path.resolve(projectRoot, "node_modules/react"),
  "react-native": path.resolve(projectRoot, "node_modules/react-native"),
  "react/jsx-runtime": path.resolve(projectRoot, "node_modules/react/jsx-runtime"),
  "react/jsx-dev-runtime": path.resolve(projectRoot, "node_modules/react/jsx-dev-runtime"),
};

module.exports = config;
