import type { NextConfig } from 'next'
import { LEGACY_TOOL_SLUGS } from './src/lib/tools'

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
]

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: 'standalone',
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }]
  },
  async redirects() {
    return Object.entries(LEGACY_TOOL_SLUGS).map(([legacy, current]) => ({ source: `/tools/${legacy}`, destination: `/tools/${current}`, permanent: true }))
  },
}

export default nextConfig
