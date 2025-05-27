/** @type {import('next').NextConfig} */
const nextConfig = {
  // Tắt console log trong production
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Cấu hình logging
  logging: {
    fetches: {
      fullUrl: false
    }
  },

  // Cấu hình output
  output: 'standalone',

  // Cấu hình môi trường
  poweredByHeader: false,
  reactStrictMode: true,

  // Cho phép import JSON
  webpack: (config) => {
    config.module.rules.push({
      test: /\.json$/,
      type: 'json'
    });
    return config;
  }
}

module.exports = nextConfig 