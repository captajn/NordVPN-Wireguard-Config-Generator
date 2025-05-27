'use client';

import { useState, useEffect, useCallback } from 'react';
import Header from "../components/Header";
import Footer from "../components/Footer";
import { NordVPNServer } from '../types';

interface Country {
  id: number;
  name: string;
  code: string;
}

interface Credentials {
  username: string;
  password: string;
}

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
  const [countries, setCountries] = useState<Country[]>([]);
  const [sortOption, setSortOption] = useState<'load-asc' | 'load-desc'>('load-asc');
  const [filteredServers, setFilteredServers] = useState<NordVPNServer[]>([]);
  
  // Trong component
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  
  // Sắp xếp danh sách máy chủ
  const sortServers = useCallback((serverList: NordVPNServer[], sort: string) => {
    const sorted = [...serverList];
    
    switch (sort) {
      case 'load-asc':
        return sorted.sort((a, b) => a.load - b.load);
      case 'load-desc':
        return sorted.sort((a, b) => b.load - a.load);
      default:
        return sorted;
    }
  }, []);
  
  // Hàm lấy danh sách máy chủ SOCKS
  const fetchSocksServers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/nordvpn/socks');
      const data = await response.json();
      
      console.log('Debug - API Response:', data); // Debug log
      console.log('Debug - Credentials from API:', data.credentials); // Thêm debug để kiểm tra mật khẩu

      if (data.success) {
        const serverList = data.servers as NordVPNServer[];
        setServers(serverList);
        
        // Lưu credentials từ API response
        if (data.credentials) {
          setCredentials(data.credentials);
          setUsername(data.credentials.username);
          setPassword(data.credentials.password);
          setIsAuthenticated(true);
          
          console.log('Debug - Credentials set in state:', {
            username: data.credentials.username,
            password: data.credentials.password,
            passwordLength: data.credentials.password?.length,
          });
        }

        // Xử lý danh sách quốc gia từ máy chủ trả về
        const countryMap = new Map<number, Country>();
        
        serverList.forEach((server: NordVPNServer) => {
          const country = server.locations[0]?.country;
          if (country && country.id) {
            countryMap.set(country.id, {
              id: country.id,
              name: country.name,
              code: country.code
            });
          }
        });

        const uniqueCountries = Array.from(countryMap.values())
          .sort((a, b) => a.name.localeCompare(b.name));
        
        setCountries(uniqueCountries);
        setFilteredServers(sortServers(serverList, sortOption));
      } else {
        setError(data.error || 'Lỗi không xác định');
      }
    } catch (err) {
      console.error('Debug - Error:', err);
      setError(err instanceof Error ? err.message : 'Lỗi không xác định');
    } finally {
      setLoading(false);
    }
  }, [sortOption, sortServers]);
  
  useEffect(() => {
    // Kiểm tra xem có token đã lưu không
    const savedToken = localStorage.getItem('nordvpn_token');
    
    if (savedToken) {
      // Nếu có token, lấy thông tin username và password từ localStorage nếu có
      const savedUsername = localStorage.getItem('nordvpn_username');
      const savedPassword = localStorage.getItem('nordvpn_password');
      
      if (savedUsername && savedPassword) {
        setUsername(savedUsername);
        setPassword(savedPassword);
        setIsAuthenticated(true);
        console.log('Debug - Loaded credentials from localStorage:', {
          username: savedUsername,
          passwordLength: savedPassword?.length || 0
        });
      } else {
        // Nếu không có thông tin đăng nhập trong localStorage, lấy từ API
        console.log('Debug - No saved credentials, fetching from API using token');
        fetchUserCredentials(savedToken);
      }
    } else {
      console.log('Debug - No saved token found');
    }
    
    // Lấy danh sách máy chủ SOCKS
    fetchSocksServers();
  }, [fetchSocksServers]);
  
  // Lọc và sắp xếp danh sách máy chủ khi có thay đổi
  useEffect(() => {
    if (servers.length > 0) {
      let filtered = [...servers];
      
      // Lọc theo quốc gia
      if (selectedCountry) {
        filtered = filtered.filter(server => 
          server.locations[0]?.country?.name === selectedCountry
        );
      }
      
      // Sắp xếp theo tùy chọn
      filtered = sortServers(filtered, sortOption);
      
      setFilteredServers(filtered);
    }
  }, [servers, selectedCountry, sortOption, sortServers]);
  
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

  const fetchUserCredentials = async (userToken: string) => {
    try {
      setLoadingCredentials(true);
      console.log('Debug - Fetching user credentials with token');
      
      const response = await fetch('/api/nordvpn/user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: userToken }),
      });
      
      const data = await response.json();
      console.log('Debug - User API response status:', response.status);
      
      if (!response.ok) {
        throw new Error(data.error || 'Không thể lấy thông tin đăng nhập');
      }
      
      console.log('Debug - User API response data:', {
        username: data.username,
        passwordLength: data.password?.length || 0
      });
      
      if (data.username && data.password) {
        setUsername(data.username);
        setPassword(data.password);
        setIsAuthenticated(true);
        
        // Lưu thông tin đăng nhập vào localStorage
        localStorage.setItem('nordvpn_username', data.username);
        localStorage.setItem('nordvpn_password', data.password);
        
        console.log('Debug - Credentials saved to localStorage');
      }
    } catch (err) {
      console.error('Lỗi khi lấy thông tin đăng nhập:', err);
      // Không hiển thị lỗi này cho người dùng
    } finally {
      setLoadingCredentials(false);
    }
  };

  // Thay thế phần table bằng cards
  const renderServerList = () => {
    if (loading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-[#1a1f2e] rounded-lg p-4 animate-pulse">
              <div className="h-6 bg-[#2d3748] rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-[#2d3748] rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-[#2d3748] rounded w-2/3"></div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-6">
        {filteredServers.map((server) => {
          const city = server.locations[0]?.country?.city?.name || '';
          const country = server.locations[0]?.country?.name || 'Unknown';
          
          return (
            <div key={server.id} className="bg-[#1a1f2e] rounded-lg p-4 border border-[#2d3748] hover:border-[#f8b700] transition-colors">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-white font-medium truncate" title={server.name}>{server.name}</h3>
                <div className="flex items-center">
                  <div className="w-12 bg-[#2d3748] rounded-full h-2 mr-1">
                    <div 
                      className={`h-2 rounded-full ${
                        server.load < 30 ? 'bg-green-500' : 
                        server.load < 70 ? 'bg-yellow-500' : 
                        'bg-red-500'
                      }`} 
                      style={{ width: `${server.load}%` }}
                    ></div>
                  </div>
                  <span className="text-gray-400 text-xs">{server.load}%</span>
                </div>
              </div>
              
              <p className="text-gray-400 text-sm mb-2">
                {city ? `${city}, ${country}` : country}
              </p>
              
              <p className="text-gray-400 text-xs mb-2 truncate" title={server.hostname}>
                {server.hostname}
              </p>
              
              <div className="flex justify-between text-xs mb-3">
                <span className="text-gray-400">Status:</span>
                <span className={`${server.status === 'online' ? 'text-green-400' : 'text-red-400'}`}>
                  {server.status}
                </span>
              </div>

              <button
                onClick={() => {
                  const proxyInfo = `${server.hostname}:1080:${username}:${credentials?.password || password}`;
                  const blob = new Blob([proxyInfo], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `proxy_${server.hostname}.txt`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}
                className="w-full mt-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
                disabled={!username || !password}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Tải proxy
              </button>
            </div>
          );
        })}
      </div>
    );
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
            <h2 className="text-xl font-semibold p-6 border-b border-[#2d3748]">Thông tin đăng nhập SOCKS</h2>
            
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
                      placeholder={loadingCredentials ? "Đang lấy thông tin..." : "Tên người dùng SOCKS"}
                      readOnly={loadingCredentials}
                    />
                  </div>
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium mb-1 text-gray-300">
                      Mật khẩu SOCKS
                    </label>
                    <input
                      type="text" // Đổi thành text để hiển thị password
                      id="password"
                      className="w-full px-3 py-2 bg-[#1a1f2e] border border-[#2d3748] rounded-md text-white focus:border-[#f8b700] focus:ring-1 focus:ring-[#f8b700]"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={loadingCredentials ? "Đang lấy thông tin..." : "Mật khẩu SOCKS"}
                      readOnly={loadingCredentials}
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
            <div className="p-4 border-b border-[#2d3748]">
              <div className="flex flex-col md:flex-row gap-3 items-center">
                <div className="w-full md:w-1/2">
                  <label htmlFor="country" className="block text-sm font-medium mb-1 text-gray-300">
                    Lọc Quốc Gia
                  </label>
                  <select
                    id="country"
                    className="w-full px-3 py-2 bg-[#1a1f2e] border border-[#2d3748] rounded-md text-white focus:border-[#f8b700] focus:ring-1 focus:ring-[#f8b700]"
                    value={selectedCountry}
                    onChange={(e) => setSelectedCountry(e.target.value)}
                    disabled={loading}
                  >
                    <option value="">Tất cả quốc gia</option>
                    {countries.map((country) => (
                      <option key={country.id} value={country.name}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="w-full md:w-1/2">
                  <label htmlFor="sort" className="block text-sm font-medium mb-1 text-gray-300">
                    Lọc Theo % Tải
                  </label>
                  <select
                    id="sort"
                    className="w-full px-3 py-2 bg-[#1a1f2e] border border-[#2d3748] rounded-md text-white focus:border-[#f8b700] focus:ring-1 focus:ring-[#f8b700]"
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value as 'load-asc' | 'load-desc')}
                    disabled={loading}
                  >
                    <option value="load-asc">Tải thấp nhất</option>
                    <option value="load-desc">Tải cao nhất</option>
                  </select>
                </div>
              </div>
            </div>

            {error ? (
              <div className="bg-red-900/30 border border-red-500 text-red-300 m-6 px-4 py-3 rounded">
                <p>{error}</p>
              </div>
            ) : filteredServers.length === 0 ? (
              <div className="p-6 text-center text-gray-400">
                {loading ? 'Đang tải danh sách máy chủ...' : 'Không tìm thấy máy chủ nào phù hợp với bộ lọc'}
              </div>
            ) : (
              renderServerList()
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
} 