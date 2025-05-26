'use client';

import { useState, useEffect, useCallback } from 'react';
import Header from "../components/Header";
import Footer from "../components/Footer";
import { generateWireGuardConfig } from '../utils/wireguard';

interface ServerInfo {
  id: number;
  name: string;
  hostname: string;
  country: string;
  city: string;
  load: number;
  publicKey: string;
}

type SortOption = 'load-asc' | 'load-desc' | 'name-asc' | 'name-desc' | 'country-asc' | 'country-desc' | 'load-med' | 'load-high';

export default function WireGuardPage() {
  const [token, setToken] = useState('');
  const [servers, setServers] = useState<ServerInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [privateKey, setPrivateKey] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [cities, setCities] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<'load-asc' | 'load-desc' | 'name-asc' | 'name-desc' | 'load-med' | 'load-high'>('load-asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [filteredServers, setFilteredServers] = useState<ServerInfo[]>([]);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const serversPerPage = 100;
  
  // Thêm state cho token expiration
  const [tokenExpiry, setTokenExpiry] = useState<Date | null>(null);
  
  // Thêm state cho danh sách máy chủ
  const [loadingServers, setLoadingServers] = useState(false);
  const [countries, setCountries] = useState<string[]>([]);

  // Thêm state cho danh sách quốc gia từ API
  const [countriesData, setCountriesData] = useState<Array<{id: number, name: string}>>([]);

  // Thêm useEffect để theo dõi scroll
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Hàm scroll to top với animation mượt
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // Thêm useEffect để reset loading khi component mount
  useEffect(() => {
    setLoading(false);
  }, []);

  // Khôi phục token từ localStorage khi trang được tải
  useEffect(() => {
    // Kiểm tra xem có đang chạy trên client không
    if (typeof window !== 'undefined') {
      const savedToken = localStorage.getItem('nordvpn_token');
      const savedPrivateKey = localStorage.getItem('nordvpn_private_key');
      const expiresAt = localStorage.getItem('nordvpn_expires_at');
      
      // Kiểm tra token có hết hạn không
      if (expiresAt) {
        const expiryDate = new Date(expiresAt);
        const now = new Date();
        
        if (expiryDate <= now) {
          // Token đã hết hạn, xóa dữ liệu lưu trữ
          localStorage.removeItem('nordvpn_token');
          localStorage.removeItem('nordvpn_private_key');
          localStorage.removeItem('nordvpn_expires_at');
          return;
        }
        
        // Lưu thời gian hết hạn
        setTokenExpiry(expiryDate);
      }
      
      if (savedToken) {
        setToken(savedToken);
      }
      
      if (savedPrivateKey) {
        setPrivateKey(savedPrivateKey);
        setIsAuthenticated(true);
      }
    }
  }, []);

  // Cập nhật thời gian còn lại của token
  useEffect(() => {
    if (!tokenExpiry) return;
    
    const interval = setInterval(() => {
      const now = new Date();
      if (tokenExpiry <= now) {
        // Token đã hết hạn
        handleLogout();
        clearInterval(interval);
      }
    }, 60000); // Kiểm tra mỗi phút
    
    return () => clearInterval(interval);
  }, [tokenExpiry]);

  // Hàm định dạng thời gian còn lại
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

  // Hàm sắp xếp máy chủ theo nhiều tiêu chí
  const sortServers = useCallback((serverList: ServerInfo[], option: SortOption): ServerInfo[] => {
    const sorted = [...serverList];
    switch (option) {
      case 'load-asc':
        return sorted.sort((a, b) => a.load - b.load);
      case 'load-desc':
        return sorted.sort((a, b) => b.load - a.load);
      case 'name-asc':
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case 'name-desc':
        return sorted.sort((a, b) => b.name.localeCompare(a.name));
      case 'country-asc':
        return sorted.sort((a, b) => a.country.localeCompare(b.country) || a.city.localeCompare(b.city));
      case 'country-desc':
        return sorted.sort((a, b) => b.country.localeCompare(a.country) || b.city.localeCompare(a.city));
      case 'load-med':
        return sorted.filter(server => server.load >= 30 && server.load < 70);
      case 'load-high':
        return sorted.filter(server => server.load >= 70);
      default:
        return sorted;
    }
  }, []);

  // Định nghĩa fetchServers với useCallback
  const fetchServers = useCallback(async () => {
    setLoadingServers(true);
    setError('');
    
    try {
      const response = await fetch('/api/nordvpn/servers');
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Không thể lấy danh sách máy chủ');
      }
      
      setServers(data.servers);
      setFilteredServers(sortServers(data.servers, sortOption));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi tải danh sách máy chủ');
    } finally {
      setLoadingServers(false);
    }
  }, [sortOption, sortServers]);

  // Lấy danh sách máy chủ khi vào bước 2
  useEffect(() => {
    if (isAuthenticated) {
      fetchServers();
    }
  }, [isAuthenticated, fetchServers]);

  // Cập nhật danh sách thành phố khi chọn quốc gia
  useEffect(() => {
    if (selectedCountry && servers.length > 0) {
      // Lọc ra các máy chủ của quốc gia đã chọn
      const countryServers = servers.filter(server => server.country === selectedCountry);
      
      // Lấy danh sách thành phố duy nhất
      const uniqueCities = [...new Set(countryServers
        .filter(server => server.city) // Lọc bỏ các server không có thành phố
        .map(server => server.city))]
        .sort();
      
      setCities(uniqueCities);
      setSelectedCity(''); // Reset thành phố đã chọn khi đổi quốc gia
    } else {
      setCities([]);
      setSelectedCity('');
    }
  }, [selectedCountry, servers]);

  // Lọc và sắp xếp danh sách máy chủ khi có thay đổi
  useEffect(() => {
    if (servers.length > 0) {
      let filtered = [...servers];
      
      // Lọc theo quốc gia
      if (selectedCountry) {
        filtered = filtered.filter(server => server.country === selectedCountry);
        
        // Lọc theo thành phố nếu đã chọn
        if (selectedCity) {
          filtered = filtered.filter(server => server.city === selectedCity);
        }
      }
      
      // Lọc theo từ khóa tìm kiếm
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(server => 
          server.name.toLowerCase().includes(query) || 
          (server.hostname && server.hostname.toLowerCase().includes(query)) ||
          server.country.toLowerCase().includes(query) ||
          (server.city && server.city.toLowerCase().includes(query))
        );
      }
      
      // Lọc và sắp xếp theo tùy chọn
      switch (sortOption) {
        case 'load-asc':
          filtered = filtered.filter(server => server.load < 30)
            .sort((a, b) => a.load - b.load);
          break;
        case 'load-med':
          filtered = filtered.filter(server => server.load >= 30 && server.load < 70)
            .sort((a, b) => a.load - b.load);
          break;
        case 'load-high':
          filtered = filtered.filter(server => server.load >= 70)
            .sort((a, b) => a.load - b.load);
          break;
      }
      
      setFilteredServers(filtered);
      // Reset trang về 1 khi lọc hoặc sắp xếp lại
      setCurrentPage(1);
    }
  }, [servers, selectedCountry, selectedCity, searchQuery, sortOption]);

  // Lấy danh sách quốc gia từ API
  useEffect(() => {
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
    
    fetchCountries();
  }, []);

  // Cập nhật danh sách quốc gia khi có dữ liệu từ API
  useEffect(() => {
    if (countriesData.length > 0) {
      const uniqueCountries = countriesData.map(country => country.name).sort();
      setCountries(uniqueCountries);
    } else if (servers.length > 0) {
      // Fallback nếu API không hoạt động
      const uniqueCountries = [...new Set(servers.map(server => server.country))].sort();
      setCountries(uniqueCountries);
    }
  }, [servers, countriesData]);

  // Thay thế loadMoreServers bằng các hàm phân trang
  const totalPages = Math.ceil(filteredServers.length / serversPerPage);
  
  const goToPage = (page: number) => {
    if (page < 1) page = 1;
    if (page > totalPages) page = totalPages;
    setCurrentPage(page);
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Tính toán servers hiển thị cho trang hiện tại
  const currentServers = filteredServers.slice(
    (currentPage - 1) * serversPerPage,
    currentPage * serversPerPage
  );

  // Hàm tạo và tải xuống cấu hình cho máy chủ được chọn
  const generateAndDownloadConfig = async (server: ServerInfo) => {
    setLoading(true);
    setError('');
    
    try {
      if (!privateKey) {
        throw new Error('Không tìm thấy private key');
      }
      
      const configTemplate = generateWireGuardConfig(
        privateKey, 
        server.hostname, 
        server.publicKey
      );
      
      // Tự động tải xuống
      const blob = new Blob([configTemplate], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      // Fix lỗi ký tự # trong tên file
      const serverName = server.name.replace(/[#\s]+/g, '_').toLowerCase() || 'nordvpn';
      link.download = `${serverName}_wireguard.conf`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi không xác định');
    } finally {
      setLoading(false);
    }
  };

  // Hàm đăng xuất - xóa token và quay lại bước 1
  const handleLogout = () => {
    localStorage.removeItem('nordvpn_token');
    localStorage.removeItem('nordvpn_private_key');
    localStorage.removeItem('nordvpn_expires_at');
    setToken('');
    setPrivateKey('');
    setTokenExpiry(null);
    setIsAuthenticated(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#121827]">
      <Header />
      
      <main className="flex-grow p-3 sm:p-6">
        <div className="container mx-auto">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 sm:mb-6 md:mb-8">
            <span className="text-[#f8b700]">Tạo cấu hình</span> <span className="text-white">WireGuard</span>
          </h1>
          
          {/* Token Status & Logout */}
          {isAuthenticated && (
            <div className="mb-4 flex justify-between items-center bg-[#1f2937] p-3 rounded-lg border border-[#2d3748]">
              <div className="text-sm text-gray-400">
                {tokenExpiry && (
                  <span className="flex items-center">
                    <svg className="w-4 h-4 mr-1 text-[#f8b700]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    Phiên làm việc còn: <span className="text-[#f8b700] font-medium ml-1">{formatTimeRemaining()}</span>
                  </span>
                )}
              </div>
              <button
                onClick={handleLogout}
                className="text-sm bg-red-500/10 hover:bg-red-500/20 text-red-300 px-3 py-1 rounded-md transition-colors"
              >
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                  </svg>
                  Đăng xuất
                </span>
              </button>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg mb-4">
              <p>{error}</p>
            </div>
          )}

          {/* Step 1: Token Input */}
          {!isAuthenticated && (
            <div className="bg-[#1f2937] p-6 rounded-lg border border-[#2d3748]">
              <h2 className="text-xl font-semibold mb-4 text-[#f8b700]">Nhập Token NordVPN</h2>
              <p className="mb-4 text-gray-300">
                Để tạo cấu hình WireGuard, bạn cần có token xác thực từ tài khoản NordVPN.
              </p>
              
              <form onSubmit={(e) => {
                e.preventDefault();
                const trimmedToken = token.trim();
                
                // Reset lỗi và trạng thái loading
                setError('');
                setLoading(false);
                
                if (!trimmedToken) {
                  setError('Vui lòng nhập token');
                  return;
                }
                
                // Set loading trước khi gọi API
                setLoading(true);
                
                // Gọi API xác thực token
                fetch('/api/nordvpn/credentials', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ token: trimmedToken }),
                })
                .then(response => {
                  if (!response.ok) {
                    return response.json().then(data => {
                      throw new Error(data.error || `Lỗi khi lấy thông tin xác thực: ${response.status}`);
                    });
                  }
                  return response.json();
                })
                .then(data => {
                  if (!data.privateKey) {
                    throw new Error("Private key không tìm thấy trong phản hồi API. Vui lòng kiểm tra token của bạn.");
                  }
                  
                  // Lưu token và private key vào localStorage
                  localStorage.setItem('nordvpn_token', trimmedToken);
                  localStorage.setItem('nordvpn_private_key', data.privateKey);
                  
                  // Lưu thời gian hết hạn nếu có
                  if (data.expires_at) {
                    localStorage.setItem('nordvpn_expires_at', data.expires_at);
                    setTokenExpiry(new Date(data.expires_at));
                  }
                  
                  setPrivateKey(data.privateKey);
                  setIsAuthenticated(true);
                })
                .catch(err => {
                  setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi không xác định');
                })
                .finally(() => {
                  setLoading(false);
                });
              }} className="space-y-4">
                <div className="mb-4">
                  <label htmlFor="token" className="block text-sm font-medium mb-1 text-gray-300">
                    Token xác thực
                  </label>
                  <input
                    type="text"
                    id="token"
                    className="w-full px-3 py-2 bg-[#121827] border border-[#2d3748] rounded-md text-white focus:border-[#f8b700] focus:ring-1 focus:ring-[#f8b700]"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Nhập token xác thực của bạn tại đây"
                    disabled={loading}
                  />
                </div>
                
                <button
                  type="submit"
                  className="w-full bg-[#f8b700] hover:bg-[#f8b700]/90 text-black font-medium px-4 py-2 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Đang xử lý...
                    </span>
                  ) : 'Tiếp tục'}
                </button>
              </form>
              
              <div className="mt-4 text-sm text-gray-400">
                <p>
                  Bạn có thể lấy token xác thực bằng cách đăng nhập vào tài khoản NordVPN và truy cập vào trang API.
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Server Selection */}
          {isAuthenticated && (
            <div className="bg-[#1f2937] p-6 rounded-lg border border-[#2d3748]">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-[#f8b700]">Chọn máy chủ WireGuard</h2>
                  <p className="text-gray-300 mt-1">
                    Chọn máy chủ NordVPN mà bạn muốn kết nối.
                  </p>
                </div>

                {/* Search & Filters */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="w-full sm:w-48">
                    <select
                      className="w-full px-3 py-2 bg-[#121827] border border-[#2d3748] rounded-md text-white focus:border-[#f8b700]"
                      value={selectedCountry}
                      onChange={(e) => setSelectedCountry(e.target.value)}
                    >
                      <option value="">Tất cả quốc gia</option>
                      {countries.map(country => (
                        <option key={country} value={country}>{country}</option>
                      ))}
                    </select>
                  </div>
                  
                  {selectedCountry && cities.length > 0 && (
                    <div className="w-full sm:w-48">
                      <select
                        className="w-full px-3 py-2 bg-[#121827] border border-[#2d3748] rounded-md text-white focus:border-[#f8b700]"
                        value={selectedCity}
                        onChange={(e) => setSelectedCity(e.target.value)}
                      >
                        <option value="">Tất cả thành phố</option>
                        {cities.map(city => (
                          <option key={city} value={city}>{city}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  
                  <div className="w-full sm:w-64">
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-[#121827] border border-[#2d3748] rounded-md text-white focus:border-[#f8b700]"
                      placeholder="Tìm kiếm máy chủ..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Filter Options */}
              <div className="flex flex-wrap gap-2 mb-4">
                <button 
                  className={`px-3 py-1 rounded-md text-sm transition-colors ${
                    sortOption === 'load-asc' && 'bg-[#f8b700] text-black'
                  } ${
                    sortOption !== 'load-asc' && 'hover:bg-[#2d3748]'
                  } bg-green-500/10 text-green-400`}
                  onClick={() => setSortOption('load-asc')}
                >
                  Tải 0-30%
                </button>
                <button 
                  className={`px-3 py-1 rounded-md text-sm transition-colors ${
                    sortOption === 'load-med' && 'bg-[#f8b700] text-black'
                  } ${
                    sortOption !== 'load-med' && 'hover:bg-[#2d3748]'
                  } bg-yellow-500/10 text-yellow-400`}
                  onClick={() => setSortOption('load-med')}
                >
                  Tải 30-70%
                </button>
                <button 
                  className={`px-3 py-1 rounded-md text-sm transition-colors ${
                    sortOption === 'load-high' && 'bg-[#f8b700] text-black'
                  } ${
                    sortOption !== 'load-high' && 'hover:bg-[#2d3748]'
                  } bg-red-500/10 text-red-400`}
                  onClick={() => setSortOption('load-high')}
                >
                  Tải {'>'}70%
                </button>
              </div>

              {/* Server List */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loadingServers ? (
                  <div className="col-span-full text-center py-8">
                    <div className="inline-block w-8 h-8 border-2 border-[#f8b700] border-t-transparent rounded-full animate-spin"></div>
                    <p className="mt-2 text-gray-400">Đang tải danh sách máy chủ...</p>
                  </div>
                ) : currentServers.length === 0 ? (
                  <div className="col-span-full text-center py-8">
                    <p className="text-gray-400">Không tìm thấy máy chủ nào phù hợp.</p>
                  </div>
                ) : (
                  currentServers.map(server => (
                    <div 
                      key={server.id}
                      className="bg-[#121827] p-4 rounded-lg border border-[#2d3748] hover:border-[#f8b700]/30"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-white">{server.name}</h3>
                            <span className={`px-2 py-0.5 rounded-full text-xs ${
                              server.load < 30 ? 'bg-green-500/10 text-green-400' :
                              server.load < 70 ? 'bg-yellow-500/10 text-yellow-400' :
                              'bg-red-500/10 text-red-400'
                            }`}>
                              {server.load}% tải
                            </span>
                          </div>
                          <div className="text-sm text-gray-400 mt-1">{server.city ? `${server.city}, ${server.country}` : server.country}</div>
                          <div className="text-xs text-gray-500 mt-0.5 font-mono">{server.hostname}</div>
                        </div>
                        <button
                          onClick={() => generateAndDownloadConfig(server)}
                          disabled={loading}
                          className="group relative bg-[#f8b700] hover:bg-[#f8b700]/90 text-black p-2 rounded-full text-sm transition-colors flex-shrink-0"
                        >
                          {loading ? (
                            <>
                              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              <span className="sr-only">Đang tạo...</span>
                            </>
                          ) : (
                            <>
                              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                              </svg>
                              <span className="sr-only">Tải cấu hình</span>
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs bg-black text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                Tải cấu hình
                              </div>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Pagination */}
              {filteredServers.length > serversPerPage && (
                <div className="mt-6 flex justify-center">
                  <nav className="flex items-center space-x-1">
                    <button
                      onClick={goToPreviousPage}
                      disabled={currentPage === 1}
                      className="p-2 rounded-md bg-[#121827] text-white hover:bg-[#2d3748] disabled:opacity-50"
                    >
                      &laquo;
                    </button>
                    
                    {[...Array(totalPages)].map((_, i) => {
                      const pageNumber = i + 1;
                      if (
                        pageNumber === 1 ||
                        pageNumber === totalPages ||
                        (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
                      ) {
                        return (
                          <button
                            key={pageNumber}
                            onClick={() => goToPage(pageNumber)}
                            className={`w-8 h-8 rounded-md text-sm ${
                              currentPage === pageNumber
                                ? 'bg-[#f8b700] text-black'
                                : 'bg-[#121827] text-white hover:bg-[#2d3748]'
                            }`}
                          >
                            {pageNumber}
                          </button>
                        );
                      }
                      if (
                        pageNumber === currentPage - 2 ||
                        pageNumber === currentPage + 2
                      ) {
                        return <span key={pageNumber} className="text-gray-500">...</span>;
                      }
                      return null;
                    })}
                    
                    <button
                      onClick={goToNextPage}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-md bg-[#121827] text-white hover:bg-[#2d3748] disabled:opacity-50"
                    >
                      &raquo;
                    </button>
                  </nav>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Nút scroll to top */}
      <button
        onClick={scrollToTop}
        className={`fixed bottom-4 right-4 bg-[#f8b700] hover:bg-[#f8b700]/90 text-black p-3 rounded-full shadow-lg transition-all duration-300 ${
          showScrollTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-16'
        }`}
        aria-label="Cuộn lên đầu trang"
      >
        <svg 
          className="w-6 h-6" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth="2" 
            d="M5 10l7-7m0 0l7 7m-7-7v18"
          />
        </svg>
      </button>

      <Footer />
    </div>
  );
} 