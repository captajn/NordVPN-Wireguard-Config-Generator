'use client';

import { useState, useEffect, useCallback } from 'react';
import Header from "../components/Header";
import Footer from "../components/Footer";
import { getSocksServers } from "../services/api";
import type { NordVPNServer } from "../types";

export default function SocksPage() {
  const [servers, setServers] = useState<NordVPNServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loadingCredentials, setLoadingCredentials] = useState(false);
  
  // Thêm state cho việc lọc và sắp xếp
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [countries, setCountries] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<'load-asc' | 'load-desc' | 'name-asc' | 'name-desc'>('load-asc');
  const [filteredServers, setFilteredServers] = useState<NordVPNServer[]>([]);
  const [countriesData, setCountriesData] = useState<Array<{id: number, name: string}>>([]);
  
  // Sắp xếp danh sách máy chủ
  const sortServers = useCallback((serverList: NordVPNServer[], sort: string) => {
    const sorted = [...serverList];
    
    switch (sort) {
      case 'load-asc':
        return sorted.sort((a, b) => a.load - b.load);
      case 'load-desc':
        return sorted.sort((a, b) => b.load - a.load);
      case 'name-asc':
        return sorted.sort((a, b) => a.hostname.localeCompare(b.hostname));
      case 'name-desc':
        return sorted.sort((a, b) => b.hostname.localeCompare(a.hostname));
      default:
        return sorted;
    }
  }, []);
  
  // Hàm lấy danh sách máy chủ SOCKS
  const fetchSocksServers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getSocksServers({
        revalidateSeconds: 60 // Cache 1 phút
      });
      
      if (response.success && response.data) {
        const serverList = response.data.servers;
        setServers(serverList);
        setFilteredServers(sortServers(serverList, sortOption));
        
        // Tạo danh sách quốc gia từ máy chủ
        const uniqueCountries = Array.from(new Set(
          serverList.map(server => server.locations[0]?.country?.name)
        )).filter(Boolean) as string[];
        
        setCountries(uniqueCountries.sort());
      } else {
        setError(response.error || 'Lỗi không xác định');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi không xác định');
    } finally {
      setLoading(false);
    }
  }, [sortOption, sortServers]);
  
  useEffect(() => {
    // Kiểm tra xem có token đã lưu không
    const savedToken = localStorage.getItem('nordvpn_token');
    
    // Nếu có token, lấy thông tin username và password từ localStorage nếu có
    if (savedToken) {
      const savedUsername = localStorage.getItem('nordvpn_username');
      const savedPassword = localStorage.getItem('nordvpn_password');
      
      if (savedUsername && savedPassword) {
        setUsername(savedUsername);
        setPassword(savedPassword);
        setIsAuthenticated(true);
      } else {
        // Nếu không có thông tin đăng nhập trong localStorage, lấy từ API
        fetchUserCredentials(savedToken);
      }
    }
    
    // Lấy danh sách máy chủ SOCKS
    fetchSocksServers();
    
    // Lấy danh sách quốc gia
    fetchCountries();
  }, [fetchSocksServers]);
  
  // Lấy danh sách quốc gia từ API
  const fetchCountries = async () => {
    try {
      const response = await fetch('/api/nordvpn/countries');
      const data = await response.json();
      
      if (data.success && data.countries) {
        setCountriesData(data.countries);
      }
    } catch (err) {
      console.error('Lỗi khi lấy danh sách quốc gia:', err);
    }
  };
  
  // Cập nhật danh sách quốc gia khi có dữ liệu từ API
  useEffect(() => {
    if (countriesData.length > 0) {
      const uniqueCountries = countriesData.map(country => country.name).sort();
      setCountries(uniqueCountries);
    }
  }, [countriesData]);
  
  // Lọc và sắp xếp danh sách máy chủ khi có thay đổi
  useEffect(() => {
    if (servers.length > 0) {
      let filtered = [...servers];
      
      // Lọc theo quốc gia
      if (selectedCountry) {
        filtered = filtered.filter(server => 
          server.locations[0]?.country.name === selectedCountry
        );
      }
      
      // Lọc theo từ khóa tìm kiếm
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(server => 
          server.hostname.toLowerCase().includes(query) ||
          (server.locations[0]?.country.name && 
           server.locations[0].country.name.toLowerCase().includes(query))
        );
      }
      
      // Sắp xếp theo tùy chọn
      filtered = sortServers(filtered, sortOption);
      
      setFilteredServers(filtered);
    }
  }, [servers, selectedCountry, searchQuery, sortOption, sortServers]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Lưu thông tin đăng nhập vào localStorage
    if (username && password) {
      localStorage.setItem('nordvpn_username', username);
      localStorage.setItem('nordvpn_password', password);
      setIsAuthenticated(true);
    }
  };
  
  const downloadProxies = () => {
    if (!username || !password) {
      setError('Vui lòng nhập tên người dùng và mật khẩu');
      return;
    }
    
    // Lấy danh sách máy chủ đã lọc
    const serversToDownload = selectedCountry 
      ? filteredServers 
      : servers;
    
    // Tạo danh sách proxy với định dạng hostname:port:username:password
    const proxyList = serversToDownload.map(server => {
      return `${server.hostname}:1080:${username}:${password}`;
    });
    
    // Tạo file blob và tải xuống
    const blob = new Blob([proxyList.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const fileName = selectedCountry 
      ? `proxies_${selectedCountry.toLowerCase().replace(/\s+/g, '_')}.txt`
      : 'proxies_all.txt';
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const fetchUserCredentials = async (token: string) => {
    try {
      setLoadingCredentials(true);
      
      const response = await fetch('/api/nordvpn/user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Không thể lấy thông tin đăng nhập');
      }
      
      if (data.username && data.password) {
        setUsername(data.username);
        setPassword(data.password);
        setIsAuthenticated(true);
        
        // Lưu thông tin đăng nhập vào localStorage
        localStorage.setItem('nordvpn_username', data.username);
        localStorage.setItem('nordvpn_password', data.password);
      }
    } catch (err) {
      console.error('Lỗi khi lấy thông tin đăng nhập:', err);
      // Không hiển thị lỗi này cho người dùng
    } finally {
      setLoadingCredentials(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#121827]">
      <Header />
      
      <main className="flex-grow p-3 sm:p-6">
        <div className="container mx-auto">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 sm:mb-6 md:mb-8">
            <span className="text-[#f8b700]">Danh sách</span> <span className="text-white">SOCKS Proxy</span>
          </h1>
          
          {/* Form đăng nhập và tải xuống proxy */}
          <div className="bg-[#1f2937] rounded-lg overflow-hidden border border-[#2d3748] mb-8">
            <h2 className="text-xl font-semibold p-6 border-b border-[#2d3748]">Tải xuống danh sách proxy</h2>
            
            {error && (
              <div className="bg-red-900/30 border border-red-500 text-red-300 m-6 px-4 py-3 rounded">
                <p>{error}</p>
              </div>
            )}
            
            <div className="p-6">
              <form onSubmit={handleSubmit} className="mb-4">
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label htmlFor="username" className="block text-sm font-medium mb-1 text-gray-300">
                      Tên người dùng SOCKS
                    </label>
                    <input
                      type="text"
                      id="username"
                      className="w-full px-3 py-2 bg-[#1a1f2e] border border-[#2d3748] rounded-md text-white focus:border-[#f8b700] focus:ring-1 focus:ring-[#f8b700]"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder={loadingCredentials ? "Đang lấy thông tin..." : "Nhập tên người dùng NordVPN"}
                      required
                      disabled={loadingCredentials}
                    />
                  </div>
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium mb-1 text-gray-300">
                      Mật khẩu SOCKS
                    </label>
                    <input
                      type="password"
                      id="password"
                      className="w-full px-3 py-2 bg-[#1a1f2e] border border-[#2d3748] rounded-md text-white focus:border-[#f8b700] focus:ring-1 focus:ring-[#f8b700]"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={loadingCredentials ? "Đang lấy thông tin..." : "Nhập mật khẩu NordVPN"}
                      required
                      disabled={loadingCredentials}
                    />
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#f8b700] text-black font-medium rounded-md hover:bg-yellow-400 transition-all duration-200"
                    disabled={loadingCredentials}
                  >
                    {loadingCredentials ? 'Đang xử lý...' : 'Lưu thông tin'}
                  </button>
                  
                  <button
                    type="button"
                    className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-all duration-200"
                    onClick={downloadProxies}
                    disabled={!username || !password || loadingCredentials}
                  >
                    {loadingCredentials ? 'Đang xử lý...' : `Tải xuống ${selectedCountry || 'tất cả'} proxy`}
                  </button>
                </div>
              </form>
              
              {isAuthenticated && (
                <div className="text-green-400 text-sm">
                  <span className="flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    Thông tin đăng nhập đã được lưu
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Bộ lọc và danh sách máy chủ */}
          <div className="bg-[#1f2937] rounded-lg overflow-hidden border border-[#2d3748]">
            <div className="p-6 border-b border-[#2d3748]">
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="country" className="block text-sm font-medium mb-1 text-gray-300">
                    Quốc gia
                  </label>
                  <select
                    id="country"
                    className="w-full px-3 py-2 bg-[#1a1f2e] border border-[#2d3748] rounded-md text-white focus:border-[#f8b700] focus:ring-1 focus:ring-[#f8b700]"
                    value={selectedCountry}
                    onChange={(e) => setSelectedCountry(e.target.value)}
                    disabled={loading}
                  >
                    <option value="">Tất cả quốc gia</option>
                    {countries.map(country => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label htmlFor="search" className="block text-sm font-medium mb-1 text-gray-300">
                    Tìm kiếm
                  </label>
                  <input
                    type="text"
                    id="search"
                    className="w-full px-3 py-2 bg-[#1a1f2e] border border-[#2d3748] rounded-md text-white focus:border-[#f8b700] focus:ring-1 focus:ring-[#f8b700]"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm theo tên máy chủ hoặc quốc gia"
                    disabled={loading}
                  />
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-gray-400">Sắp xếp theo:</span>
                <button 
                  type="button"
                  className={`py-1 px-3 text-xs rounded transition-all duration-200 ${sortOption === 'load-asc' ? 'bg-[#f8b700] text-black' : 'bg-[#1a1f2e] text-white hover:bg-[#2d3748]'}`}
                  onClick={() => setSortOption('load-asc')}
                >
                  Tải thấp nhất
                </button>
                <button 
                  type="button"
                  className={`py-1 px-3 text-xs rounded transition-all duration-200 ${sortOption === 'load-desc' ? 'bg-[#f8b700] text-black' : 'bg-[#1a1f2e] text-white hover:bg-[#2d3748]'}`}
                  onClick={() => setSortOption('load-desc')}
                >
                  Tải cao nhất
                </button>
                <button 
                  type="button"
                  className={`py-1 px-3 text-xs rounded transition-all duration-200 ${sortOption === 'name-asc' ? 'bg-[#f8b700] text-black' : 'bg-[#1a1f2e] text-white hover:bg-[#2d3748]'}`}
                  onClick={() => setSortOption('name-asc')}
                >
                  Tên A-Z
                </button>
                <button 
                  type="button"
                  className={`py-1 px-3 text-xs rounded transition-all duration-200 ${sortOption === 'name-desc' ? 'bg-[#f8b700] text-black' : 'bg-[#1a1f2e] text-white hover:bg-[#2d3748]'}`}
                  onClick={() => setSortOption('name-desc')}
                >
                  Tên Z-A
                </button>
              </div>
            </div>

            {/* Bảng danh sách máy chủ */}
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#f8b700]"></div>
              </div>
            ) : error ? (
              <div className="bg-red-900/30 border border-red-500 text-red-300 m-6 px-4 py-3 rounded">
                <p>{error}</p>
              </div>
            ) : (
              <>
                {filteredServers.length === 0 ? (
                  <div className="p-6 text-center text-gray-400">
                    Không tìm thấy máy chủ nào phù hợp với bộ lọc
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-[#1a1f2e]">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-[#f8b700] uppercase tracking-wider">
                            Máy chủ
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-[#f8b700] uppercase tracking-wider">
                            Quốc gia
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-[#f8b700] uppercase tracking-wider">
                            Tải
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-[#f8b700] uppercase tracking-wider">
                            IP
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-[#f8b700] uppercase tracking-wider">
                            Cổng
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#2d3748]">
                        {filteredServers.map((server) => (
                          <tr key={server.id} className="hover:bg-[#1a1f2e]">
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-white">
                              {server.hostname}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                              {server.locations[0]?.country?.name || 'N/A'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                              <div className="flex items-center">
                                <div className="w-16 bg-[#2d3748] rounded-full h-2 mr-2">
                                  <div 
                                    className={`h-2 rounded-full ${
                                      server.load < 30 ? 'bg-green-500' : 
                                      server.load < 70 ? 'bg-yellow-500' : 
                                      'bg-red-500'
                                    }`} 
                                    style={{ width: `${server.load}%` }}
                                  ></div>
                                </div>
                                <span className="text-gray-400">{server.load}%</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                              {server.station || 'N/A'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                              1080
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
} 