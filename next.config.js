const fs = require("fs")
const path = require("path")
const checkEnvVariables = require("./check-env-variables")

checkEnvVariables()

/**
 * Medusa Cloud-related environment variables
 */
const S3_HOSTNAME = process.env.MEDUSA_CLOUD_S3_HOSTNAME
const S3_PATHNAME = process.env.MEDUSA_CLOUD_S3_PATHNAME

/**
 * The build root: this app, unless `next` itself is installed above it.
 *
 * Standalone (Vercel, the storefront repo's own CI) `next` lives in this
 * app's node_modules, so the root is this app. Inside the jyt monorepo pnpm
 * puts `next` in the workspace root's node_modules, and Turbopack (Next 16's
 * default builder) refuses to compile files outside its root, so the root
 * becomes the nearest folder holding both (#2636).
 */
function buildRoot() {
  const nextPkg = fs.realpathSync(require.resolve("next/package.json"))
  let dir = __dirname
  while (!nextPkg.startsWith(dir + path.sep)) {
    const parent = path.dirname(dir)
    if (parent === dir) return __dirname
    dir = parent
  }
  return dir
}
const BUILD_ROOT = buildRoot()

/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  reactStrictMode: true,
  // Self-hosted origin (#2636): the Docker build sets NEXT_OUTPUT=standalone
  // to get a minimal server bundle. Vercel builds leave it unset.
  ...(process.env.NEXT_OUTPUT === "standalone" ? { output: "standalone" } : {}),
  // Pinned explicitly (see buildRoot): the storefront is a submodule with its
  // own lockfile inside the monorepo, so Next would otherwise guess between
  // the two. Tracing and Turbopack must share one root.
  outputFileTracingRoot: BUILD_ROOT,
  turbopack: { root: BUILD_ROOT },
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    minimumCacheTTL: 2592000, // 30 days — reduces Vercel image optimization cache writes
    formats: ["image/avif", "image/webp"],
    // Next 16 allows only quality 75 by default and coerces anything else to
    // it. These are the values our <Image quality={…}> props use (thumbnails
    // 50, quote images 40/60/90), kept so images look and weigh as before.
    qualities: [40, 50, 60, 75, 90],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "https",
        hostname: "medusa-public-images.s3.eu-west-1.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "medusa-server-testing.s3.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "medusa-server-testing.s3.us-east-1.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "automatic.jaalyantra.com",
      },
      {
        protocol: "https",
        hostname: "medusa-server-jyt.s3.us-east-1.amazonaws.com",
      },
      ...(S3_HOSTNAME && S3_PATHNAME
        ? [
            {
              protocol: "https",
              hostname: S3_HOSTNAME,
              pathname: S3_PATHNAME,
            },
          ]
        : []),
    ],
  },
  serverExternalPackages: [],
}

module.exports = nextConfig
