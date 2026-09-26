const { withSentryConfig } = require('@sentry/nextjs/config')

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
}

module.exports = withSentryConfig(nextConfig, {
  org: 'gest-ar',
  project: 'tributar',
  silent: true,
  tunnelRoute: '/monitoring',
  sourcemaps: { disable: true },
})
