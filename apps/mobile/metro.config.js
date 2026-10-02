/* Metro bundler config. packages/theme and packages/engine use NodeNext
   module resolution, which requires explicit .js extensions on
   relative imports even though the real files are .ts (tsc maps
   ./colors.js to the compiled output of colors.ts). Metro does not
   know that convention by default and looks for a literal colors.js,
   which does not exist - this resolver teaches it to fall back to
   .ts/.tsx when a .js relative import is not found as-is. */
const { getDefaultConfig } = require("expo/metro-config")

const config = getDefaultConfig(__dirname)

const upstreamResolveRequest = config.resolver.resolveRequest

function resolveTypeScriptJsImports(context, moduleName, platform) {
  const isRelativeJsImport = moduleName.startsWith(".") && moduleName.endsWith(".js")
  if (isRelativeJsImport) {
    const tsCandidate = moduleName.slice(0, -3) + ".ts"
    try {
      return context.resolveRequest(context, tsCandidate, platform)
    } catch {
      const tsxCandidate = moduleName.slice(0, -3) + ".tsx"
      try {
        return context.resolveRequest(context, tsxCandidate, platform)
      } catch {
        /* Neither a .ts nor a .tsx source exists - fall through below */
      }
    }
  }
  const defaultResolve = upstreamResolveRequest ?? context.resolveRequest
  return defaultResolve(context, moduleName, platform)
}

config.resolver.resolveRequest = resolveTypeScriptJsImports

module.exports = config
