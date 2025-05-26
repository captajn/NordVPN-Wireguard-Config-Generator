'use client';

import { useState, useEffect } from 'react';
import Header from "./components/Header";
import Footer from "./components/Footer";
import Link from "next/link";
import { motion } from "framer-motion";
import StarryBackground from './components/StarryBackground';

export default function Home() {
  const [token, setToken] = useState('');
  const [tokenExpiry, setTokenExpiry] = useState<Date | null>(null);

  // Khôi phục token từ localStorage khi component được mount
  useEffect(() => {
    const savedToken = localStorage.getItem('nordvpn_token');
    const expiresAt = localStorage.getItem('nordvpn_expires_at');
    
    if (savedToken && expiresAt) {
      const expiryDate = new Date(expiresAt);
      const now = new Date();
      
      if (expiryDate > now) {
        setToken(savedToken);
        setTokenExpiry(expiryDate);
      } else {
        // Token đã hết hạn, xóa khỏi localStorage
        localStorage.removeItem('nordvpn_token');
        localStorage.removeItem('nordvpn_expires_at');
        localStorage.removeItem('nordvpn_private_key');
      }
    }
  }, []);

  // Format thời gian còn lại
  const formatTimeRemaining = (): string => {
    if (!tokenExpiry) return '';
    
    const now = new Date();
    const diff = tokenExpiry.getTime() - now.getTime();
    
    if (diff <= 0) return 'Đã hết hạn';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) {
      return `${days} ngày ${hours} giờ`;
    } else if (hours > 0) {
      return `${hours} giờ ${minutes} phút`;
    } else {
      return `${minutes} phút`;
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Background with StarryBackground */}
      <StarryBackground 
        starDensity={0.0003}
        shootingStarMinDelay={2000}
        shootingStarMaxDelay={8000}
        shootingStarColor="#ffdd00"
        shootingStarTrailColor="#4299E1"
      />
      
      <Header />
      
      <main className="flex-grow relative z-10">
        {/* Hero Section */}
        <section className="py-20 px-6 relative overflow-hidden">
          <div className="container mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
            >
              <h1 className="text-4xl md:text-6xl font-bold mb-6 text-white">
                <span className="text-primary">NordVPN</span> API Explorer
              </h1>
            </motion.div>
            
            {token && tokenExpiry && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="text-sm text-gray-300 flex items-center justify-center mb-6"
              >
                <svg className="w-4 h-4 mr-1 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Phiên làm việc còn: <span className="text-primary ml-1">{formatTimeRemaining()}</span>
              </motion.div>
            )}
            
            <motion.p 
              className="text-xl md:text-2xl mb-10 max-w-3xl mx-auto text-gray-200"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.7 }}
            >
              Khám phá và quản lý các API của NordVPN để tạo kết nối WireGuard và SOCKS proxy
            </motion.p>
            
            <motion.div 
              className="flex flex-col sm:flex-row gap-4 justify-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.7 }}
            >
              <Link href="/servers" className="btn-primary py-3 px-8 rounded-full font-medium text-lg shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 hover:-translate-y-1">
                Xem máy chủ
              </Link>
              <Link href="/wireguard" className="btn-secondary py-3 px-8 rounded-full font-medium text-lg border border-primary hover:bg-primary hover:text-black transition-all duration-200 hover:scale-105 hover:-translate-y-1">
                Tạo WireGuard
              </Link>
            </motion.div>
          </div>
        </section>

        {/* Features */}
        <section className="py-16 px-6">
          <div className="container mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
            >
              <h2 className="text-3xl font-bold mb-12 text-center text-white">
                <span className="text-primary">Tính năng</span> chính
              </h2>
            </motion.div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <motion.div 
                className="bg-black/60 p-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] border border-gray-700/30 backdrop-blur-sm"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1, duration: 0.5 }}
                whileHover={{ y: -5 }}
              >
                <Link href="/servers" className="block h-full">
                  <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mb-4 text-white font-bold text-xl">1</div>
                  <h3 className="text-xl font-bold mb-3 text-primary">Danh sách máy chủ</h3>
                  <p className="text-gray-300">
                    Xem và tìm kiếm danh sách các máy chủ NordVPN với thông tin chi tiết về vị trí, tải và công nghệ
                  </p>
                </Link>
              </motion.div>
              
              <motion.div 
                className="bg-black/60 p-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] border border-gray-700/30 backdrop-blur-sm"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2, duration: 0.5 }}
                whileHover={{ y: -5 }}
              >
                <Link href="/wireguard" className="block h-full">
                  <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mb-4 text-white font-bold text-xl">2</div>
                  <h3 className="text-xl font-bold mb-3 text-primary">WireGuard Config</h3>
                  <p className="text-gray-300">
                    Tạo cấu hình WireGuard cho các kết nối VPN tốc độ cao và an toàn với máy chủ NordVPN
                  </p>
                </Link>
              </motion.div>
              
              <motion.div 
                className="bg-black/60 p-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] border border-gray-700/30 backdrop-blur-sm"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3, duration: 0.5 }}
                whileHover={{ y: -5 }}
              >
                <Link href="/socks" className="block h-full">
                  <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mb-4 text-white font-bold text-xl">3</div>
                  <h3 className="text-xl font-bold mb-3 text-primary">SOCKS Proxy</h3>
                  <p className="text-gray-300">
                    Tìm và sử dụng các máy chủ proxy SOCKS để tạo kết nối bảo mật cho các ứng dụng và dịch vụ
                  </p>
                </Link>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 px-6">
          <div className="container mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
            >
              <h2 className="text-3xl font-bold mb-12 text-center text-white">
                <span className="text-primary">Thống kê</span> mạng lưới
              </h2>
            </motion.div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <motion.div 
                className="bg-black/60 p-6 rounded-lg text-center border border-gray-700/30 backdrop-blur-sm"
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1, duration: 0.5 }}
                whileHover={{ scale: 1.05 }}
              >
                <div className="text-4xl font-bold text-primary mb-2">5400+</div>
                <div className="text-gray-300">Máy chủ</div>
              </motion.div>
              
              <motion.div 
                className="bg-black/60 p-6 rounded-lg text-center border border-gray-700/30 backdrop-blur-sm"
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2, duration: 0.5 }}
                whileHover={{ scale: 1.05 }}
              >
                <div className="text-4xl font-bold text-primary mb-2">60+</div>
                <div className="text-gray-300">Quốc gia</div>
              </motion.div>
              
              <motion.div 
                className="bg-black/60 p-6 rounded-lg text-center border border-gray-700/30 backdrop-blur-sm"
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3, duration: 0.5 }}
                whileHover={{ scale: 1.05 }}
              >
                <div className="text-4xl font-bold text-primary mb-2">10 Gbps</div>
                <div className="text-gray-300">Tốc độ</div>
              </motion.div>
              
              <motion.div 
                className="bg-black/60 p-6 rounded-lg text-center border border-gray-700/30 backdrop-blur-sm"
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4, duration: 0.5 }}
                whileHover={{ scale: 1.05 }}
              >
                <div className="text-4xl font-bold text-primary mb-2">24/7</div>
                <div className="text-gray-300">Hỗ trợ</div>
              </motion.div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
