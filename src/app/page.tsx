'use client';

import { useState, useEffect } from 'react';
import Header from "./components/Header";
import Footer from "./components/Footer";
import Link from "next/link";

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
    <div className="min-h-screen flex flex-col bg-black">
      <Header />
      
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="py-20 px-6">
          <div className="container mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              <span className="text-primary">NordVPN</span> API Explorer
            </h1>
            {token && tokenExpiry && (
              <div className="text-sm text-gray-400 flex items-center justify-center mb-6">
                <svg className="w-4 h-4 mr-1 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Phiên làm việc còn: <span className="text-primary ml-1">{formatTimeRemaining()}</span>
              </div>
            )}
            <p className="text-xl md:text-2xl mb-10 max-w-3xl mx-auto text-gray-300">
              Khám phá và quản lý các API của NordVPN để tạo kết nối WireGuard và SOCKS proxy
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/servers" className="btn-primary py-3 px-8 rounded-full font-medium text-lg shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105">
                Xem máy chủ
              </Link>
              <Link href="/wireguard" className="btn-secondary py-3 px-8 rounded-full font-medium text-lg border border-primary hover:bg-primary hover:text-black transition-all duration-200 hover:scale-105">
                Tạo WireGuard
              </Link>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-16 px-6 bg-secondary">
          <div className="container mx-auto">
            <h2 className="text-3xl font-bold mb-12 text-center">
              <span className="text-primary">Tính năng</span> chính
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-black p-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mb-4 text-black font-bold text-xl">1</div>
                <h3 className="text-xl font-bold mb-3 text-primary">Danh sách máy chủ</h3>
                <p className="text-gray-300">
                  Xem và tìm kiếm danh sách các máy chủ NordVPN với thông tin chi tiết về vị trí, tải và công nghệ
                </p>
              </div>
              <div className="bg-black p-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mb-4 text-black font-bold text-xl">2</div>
                <h3 className="text-xl font-bold mb-3 text-primary">WireGuard Config</h3>
                <p className="text-gray-300">
                  Tạo cấu hình WireGuard cho các kết nối VPN tốc độ cao và an toàn với máy chủ NordVPN
                </p>
              </div>
              <div className="bg-black p-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mb-4 text-black font-bold text-xl">3</div>
                <h3 className="text-xl font-bold mb-3 text-primary">SOCKS Proxy</h3>
                <p className="text-gray-300">
                  Tìm và sử dụng các máy chủ proxy SOCKS để tạo kết nối bảo mật cho các ứng dụng và dịch vụ
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* API Overview */}
        <section className="py-16 px-6">
          <div className="container mx-auto">
            <h2 className="text-3xl font-bold mb-12 text-center">
              <span className="text-primary">API</span> NordVPN
            </h2>
            <div className="bg-secondary p-6 md:p-8 rounded-lg shadow-lg">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-600">
                      <th className="py-3 px-4 text-left text-primary">Endpoint</th>
                      <th className="py-3 px-4 text-left text-primary">Mô tả</th>
                      <th className="py-3 px-4 text-left text-primary">Yêu cầu xác thực</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    <tr className="hover:bg-black/30">
                      <td className="py-3 px-4 font-mono text-sm text-white">
                        /v1/users/services/credentials
                      </td>
                      <td className="py-3 px-4 text-white">
                        Lấy thông tin xác thực NordVPN
                      </td>
                      <td className="py-3 px-4">
                        <span className="bg-primary text-black px-2 py-1 rounded-full text-xs font-medium">Có</span>
                      </td>
                    </tr>
                    <tr className="hover:bg-black/30">
                      <td className="py-3 px-4 font-mono text-sm text-white">
                        /v1/servers
                      </td>
                      <td className="py-3 px-4 text-white">
                        Lấy danh sách máy chủ NordVPN
                      </td>
                      <td className="py-3 px-4">
                        <span className="bg-primary text-black px-2 py-1 rounded-full text-xs font-medium">Không</span>
                      </td>
                    </tr>
                    <tr className="hover:bg-black/30">
                      <td className="py-3 px-4 font-mono text-sm text-white">
                        /v1/servers?filters[servers_technologies][identifier]=socks
                      </td>
                      <td className="py-3 px-4 text-white">
                        Lấy danh sách máy chủ SOCKS
                      </td>
                      <td className="py-3 px-4">
                        <span className="bg-primary text-black px-2 py-1 rounded-full text-xs font-medium">Không</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
