/** @type {import('next').NextConfig} */
const nextConfig = {
  // Tắt SWC minify
  compiler: {
    removeConsole: false,
  },
  // Tắt các tính năng thử nghiệm
  experimental: {
    // Không cần thiết nữa
  },
}

module.exports = nextConfig 