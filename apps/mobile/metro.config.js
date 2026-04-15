const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

// 1. Find the project and workspace roots
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// 2. Watch all files within the monorepo
config.watchFolders = [workspaceRoot];

// 3. Let Metro look for modules in both the project and workspace node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// 4. Follow pnpm's Windows junctions / symlinks
config.resolver.unstable_enableSymlinks = true;

module.exports = config;
