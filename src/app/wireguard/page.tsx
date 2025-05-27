'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Header from "../components/Header";
import Footer from "../components/Footer";
import ServerList from '../components/ServerList';
import Pagination from '../components/Pagination';
import usePagination from '../hooks/usePagination';

interface Country {
  id: number;
  name: string;
  code: string;
}

interface ServerInfo {
  id: number;
  name: string;
  hostname: string;
  country: string;
  city?: string;
  load: number;
  publicKey?: string;
  status?: string;
  technologies?: {
    id: number;
    name: string;
    identifier: string;
    pivot?: {
      status: string;
    }
  }[];
}

type DNSOption = 'cloudflare' | 'google' | 'nordvpn';

interface DNSConfig {
  name: string;
  value: DNSOption;
  servers: string;
}

const DNS_CONFIGS: DNSConfig[] = [
  { name: 'Cloudflare DNS', value: 'cloudflare', servers: '1.1.1.1, 1.0.0.1' },
  { name: 'Google DNS', value: 'google', servers: '8.8.8.8, 8.8.4.4' },
  { name: 'NordVPN DNS', value: 'nordvpn', servers: '103.86.96.100, 103.86.99.100' }
];

export default function WireGuardPage() {
  const [token, setToken] = useState('');
  const [servers, setServers] = useState<ServerInfo[]>([]);
  const [filteredServers, setFilteredServers] = useState<ServerInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [cities, setCities] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [countries, setCountries] = useState<Country[]>([]);
  const [tokenExpiry, setTokenExpiry] = useState<Date | null>(null);
  const [selectedCountryId, setSelectedCountryId] = useState<number | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionListRef = useRef<HTMLDivElement>(null);

  // Thêm state cho chức năng tìm kiếm nâng cao
  const [showCountrySuggestions, setShowCountrySuggestions] = useState(false);
  const [countrySuggestions, setCountrySuggestions] = useState<Country[]>([]);

  // Thêm bộ lọc % tải
  const [loadFilter, setLoadFilter] = useState<string>('all');

  // Thêm state cho DNS selection
  const [selectedDNS, setSelectedDNS] = useState<DNSOption>('cloudflare');

  // Thêm useEffect để theo dõi scroll
  useEffect(() => {
    const handleScroll = () => {
      const shouldShow = window.scrollY > 400;
      if (shouldShow !== showScrollTop) {
        setShowScrollTop(shouldShow);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [showScrollTop]);

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

  // Tải dữ liệu country từ API
  useEffect(() => {
    if (isAuthenticated && countries.length === 0) {
      const fetchCountries = async () => {
        try {
          // Loại bỏ việc gọi trực tiếp đến API của NordVPN
          // Chỉ sử dụng API local của chúng ta
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 giây timeout
          
          const response = await fetch('/api/nordvpn/countries', {
            signal: controller.signal,
            headers: {
              'Accept': 'application/json'
            }
          });
          
          // Xóa timeout khi request thành công
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            throw new Error(`Lỗi khi tải danh sách quốc gia: ${response.status}`);
          }
          
          const data = await response.json();
          
          if (data.success && Array.isArray(data.countries)) {
            // Lọc ra các quốc gia có id và name hợp lệ
            const validCountries = data.countries
              .filter((country: Country) => 
                country && typeof country.id === 'number' && 
                country.name && country.code
              );
              
            // Sắp xếp theo tên quốc gia
            const sortedCountries = validCountries.sort((a: Country, b: Country) => 
              a.name.localeCompare(b.name)
            );
            
            setCountries(sortedCountries);
          } else {
            throw new Error('Định dạng dữ liệu không hợp lệ');
          }
        } catch (error) {
          setError(error instanceof Error ? error.message : 'Không thể tải danh sách quốc gia');
          setCountries([]);
        }
      };
      
      fetchCountries();
    }
  }, [isAuthenticated, countries.length]);

  // Cập nhật hàm xử lý khi chọn quốc gia
  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    if (!selectedId) {
      // Reset các state liên quan khi chọn "Tất cả quốc gia"
      setSelectedCountry('');
      setSelectedCountryId(null);
      setSelectedCity('');
      setCities([]);
    } else {
      // Tìm country object dựa trên ID đã chọn
      const countryObj = countries.find(c => c.id === parseInt(selectedId));
      if (countryObj) {
        setSelectedCountry(countryObj.name);
        setSelectedCountryId(countryObj.id);
        // Reset city khi đổi quốc gia
        setSelectedCity('');
      }
    }
  };

  // Định nghĩa fetchServers với useCallback
  const fetchServers = useCallback(async () => {
    setLoading(true);
    setError('');
    
    try {
      // Xây dựng URL API với các tham số phù hợp
      let url = '/api/nordvpn/servers?technology=wireguard';
      
      // Thêm tham số country_id nếu đã chọn
      if (selectedCountryId) {
        url = `/api/nordvpn/wireguard?country_id=${selectedCountryId}`;
      } else {
        url = '/api/nordvpn/wireguard';
      }
      
      console.log('Fetching from URL:', url);
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Không thể lấy danh sách máy chủ: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Không thể lấy danh sách máy chủ');
      }
      
      // Lấy danh sách máy chủ từ API
      const formattedServers: ServerInfo[] = data.servers || [];
      
      console.log('Received servers:', formattedServers.length);
      
      setServers(formattedServers);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi tải danh sách máy chủ');
    } finally {
      setLoading(false);
    }
  }, [selectedCountryId]);

  // Lấy danh sách máy chủ khi vào bước 2 hoặc khi chọn quốc gia/ID quốc gia
  useEffect(() => {
    if (isAuthenticated) {
      fetchServers();
    }
  }, [isAuthenticated, fetchServers]);

  // Cập nhật danh sách thành phố khi chọn quốc gia
  useEffect(() => {
    if (selectedCountry && servers.length > 0) {
      const countryServers = servers.filter(server => server.country === selectedCountry);
      const uniqueCities = [...new Set(countryServers
        .map(server => server.city)
        .filter((city): city is string => city !== undefined && city !== ''))]
        .sort();
      setCities(uniqueCities);
      
      // Reset thành phố đã chọn khi thay đổi quốc gia
      setSelectedCity('');
      
      // Lọc lại danh sách server theo quốc gia đã chọn
      setFilteredServers(countryServers);
    } else if (!selectedCountry && servers.length > 0) {
      // Nếu không chọn quốc gia, hiển thị tất cả server
      setCities([]);
      setSelectedCity('');
      setFilteredServers(servers);
    } else {
      setCities([]);
      setSelectedCity('');
    }
  }, [selectedCountry, servers]);

  // Lọc và sắp xếp danh sách máy chủ khi có thay đổi ở thành phố hoặc tìm kiếm
  useEffect(() => {
    if (servers.length > 0) {
      let filtered = [...servers];
      
      // Lọc theo quốc gia nếu đã chọn
      if (selectedCountry) {
        filtered = filtered.filter(server => server.country === selectedCountry);
      }
      
      // Lọc theo thành phố nếu đã chọn
      if (selectedCity) {
        filtered = filtered.filter(server => server.city === selectedCity);
      }
      
      // Lọc theo % tải
      if (loadFilter !== 'all') {
        filtered = filtered.filter(server => {
          const load = server.load;
          switch(loadFilter) {
            case 'low': return load <= 30;
            case 'medium': return load > 30 && load <= 70;
            case 'high': return load > 70;
            default: return true;
          }
        });
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
      
      setFilteredServers(filtered);
    }
  }, [servers, selectedCity, searchQuery, selectedCountry, loadFilter]);

  // Thay thế loadMoreServers bằng các hàm phân trang
  
  // Hàm đăng xuất - xóa token và quay lại bước 1
  const handleLogout = () => {
    localStorage.removeItem('nordvpn_token');
    localStorage.removeItem('nordvpn_private_key');
    localStorage.removeItem('nordvpn_expires_at');
    setToken('');
    setTokenExpiry(null);
    setIsAuthenticated(false);
  };

  // Effect để lọc gợi ý quốc gia khi nhập vào ô tìm kiếm
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setCountrySuggestions([]);
      setShowCountrySuggestions(false);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const suggestions = countries.filter(country => {
      const countryName = country.name.toLowerCase();
      
      // Tìm kiếm chính xác
      if (countryName.includes(query)) return true;
      
      // Tìm kiếm theo tiền tố
      if (countryName.startsWith(query)) return true;
      
      // Tìm kiếm mờ nếu từ khóa đủ dài (3 ký tự trở lên)
      if (query.length >= 3 && countryName.includes(query)) return true;
      
      return false;
    });
    
    setCountrySuggestions(suggestions.slice(0, 10)); // Giới hạn 10 gợi ý
    setShowCountrySuggestions(suggestions.length > 0);
  }, [searchQuery, countries]);

  // Xử lý khi chọn một quốc gia từ danh sách gợi ý
  const handleSelectSuggestedCountry = useCallback((country: Country) => {
    setSelectedCountry(country.name);
    setSelectedCountryId(country.id);
    setSearchQuery('');
    setShowCountrySuggestions(false);
    // Reset city khi đổi quốc gia
    setSelectedCity('');
  }, []);

  // Xử lý sự kiện click ra ngoài để ẩn gợi ý
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchInputRef.current && 
        !searchInputRef.current.contains(event.target as Node) &&
        suggestionListRef.current &&
        !suggestionListRef.current.contains(event.target as Node)
      ) {
        setShowCountrySuggestions(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Hàm reset tất cả bộ lọc
  const resetAllFilters = useCallback(() => {
    setSelectedCountry('');
    setSelectedCountryId(null);
    setSelectedCity('');
    setSearchQuery('');
    setLoadFilter('all');
    setSelectedDNS('cloudflare');
    setShowCountrySuggestions(false);
    setFilteredServers(servers);
  }, [servers]);

  // Phân trang
  const {
    currentPage,
    totalPages,
    startIndex,
    endIndex,
    goToPage
  } = usePagination({
    totalItems: filteredServers.length,
    itemsPerPage: 20
  });

  const paginatedServers = filteredServers.slice(startIndex, endIndex + 1);

  const downloadConfig = async (server: ServerInfo) => {
    try {
      setLoading(true);
      setError('');

      // Lấy private key đã lưu
      const savedPrivateKey = localStorage.getItem('nordvpn_private_key');
      
      if (!savedPrivateKey) {
        setError('Không tìm thấy private key. Vui lòng đăng nhập lại.');
        setLoading(false);
        return;
      }

      if (!server.publicKey) {
        setError('Không tìm thấy public key cho server này');
        setLoading(false);
        return;
      }

      // Gọi API để lấy cấu hình WireGuard
      const response = await fetch('/api/nordvpn/wireguard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hostname: server.hostname,
          privateKey: savedPrivateKey,
          publicKey: server.publicKey,
          dnsOption: selectedDNS,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Không thể tải cấu hình');
      }

      // Lấy blob từ response
      const blob = await response.blob();
      
      // Tạo URL và tải file
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${server.hostname}.conf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error downloading config:', error);
      setError(error instanceof Error ? error.message : 'Đã xảy ra lỗi khi tải cấu hình');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#121827]">
      <Header />
      
      <main className="flex-grow p-3 sm:p-6">
        <div className="container mx-auto">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 sm:mb-6 md:mb-8">
            <span className="text-[#f8b700]">Tạo cấu hình</span> <span className="text-white">WireGuard</span>
          </h1>
          
          {/* Token Status */}
          {isAuthenticated && (
            <div className="mb-4 bg-[#1f2937] p-3 rounded-lg border border-[#2d3748]">
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
            </div>
          )}

          {/* Filters */}
          {isAuthenticated && (
            <div className="mb-4 flex flex-wrap gap-2 items-center">
              {/* Xóa phần này vì đã được di chuyển xuống dưới */}
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
              <div className="mb-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
                    <h2 className="text-xl font-semibold text-[#f8b700]">Chọn máy chủ WireGuard</h2>
                    
                    <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:flex-wrap sm:gap-2">
                      <div className="w-full sm:w-auto">
                        <select
                          className="w-48 px-3 py-2 bg-[#121827] border border-[#2d3748] rounded-md text-white focus:border-[#f8b700]"
                          value={selectedCountryId || ''}
                          onChange={handleCountryChange}
                        >
                          <option key="country-all" value="">Tất cả quốc gia</option>
                          {countries.map(country => (
                            <option 
                              key={`country-${country.id || country.name}`} 
                              value={country.id}
                            >
                              {country.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="w-full sm:w-auto">
                        <select
                          className="w-48 px-3 py-2 bg-[#121827] border border-[#2d3748] rounded-md text-white focus:border-[#f8b700]"
                          value={loadFilter}
                          onChange={(e) => setLoadFilter(e.target.value)}
                        >
                          <option value="all">Tất cả % tải</option>
                          <option value="low">Thấp (≤ 30%)</option>
                          <option value="medium">TB (31-70%)</option>
                          <option value="high">Cao ({'>'}70%)</option>
                        </select>
                      </div>

                      <div className="w-full sm:w-auto">
                        <select
                          id="dns"
                          value={selectedDNS}
                          onChange={(e) => setSelectedDNS(e.target.value as DNSOption)}
                          className="w-48 px-3 py-2 bg-[#121827] border border-[#2d3748] rounded-md text-white focus:border-[#f8b700]"
                        >
                          {DNS_CONFIGS.map(dns => (
                            <option key={dns.value} value={dns.value}>
                              {dns.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Ô tìm kiếm */}
                      <div className="w-full sm:w-auto">
                        <input
                          ref={searchInputRef}
                          type="text"
                          className="w-48 px-3 py-2 bg-[#121827] border border-[#2d3748] rounded-md text-white focus:border-[#f8b700]"
                          placeholder="Tìm kiếm máy chủ..."
                          value={searchQuery}
                          onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setShowCountrySuggestions(true);
                          }}
                        />
                        {/* Danh sách gợi ý quốc gia */}
                        {showCountrySuggestions && countrySuggestions.length > 0 && (
                          <div
                            ref={suggestionListRef}
                            className="absolute z-10 w-48 mt-1 bg-[#1f2937] border border-[#2d3748] rounded-md shadow-lg max-h-60 overflow-auto"
                          >
                            {countrySuggestions.map((country) => (
                              <button
                                key={country.id}
                                className="w-full px-4 py-2 text-left text-white hover:bg-[#2d3748] transition-colors"
                                onClick={() => handleSelectSuggestedCountry(country)}
                              >
                                {country.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Chọn thành phố */}
                      {selectedCountry && cities.length > 0 && (
                        <div className="w-full sm:w-auto">
                          <select
                            className="w-48 px-3 py-2 bg-[#121827] border border-[#2d3748] rounded-md text-white focus:border-[#f8b700]"
                            value={selectedCity}
                            onChange={(e) => setSelectedCity(e.target.value)}
                          >
                            <option key="city-all" value="">Tất cả thành phố</option>
                            {cities.map(city => (
                              <option key={`city-${city.replace(/\s+/g, '-')}`} value={city}>{city}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Nút xóa bộ lọc */}
                      {(selectedCountry || selectedCity || searchQuery || loadFilter !== 'all' || selectedDNS !== 'cloudflare') && (
                        <button
                          onClick={resetAllFilters}
                          className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-300 rounded-md transition-colors flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                          </svg>
                          Xóa bộ lọc
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Hiển thị danh sách server */}
                <ServerList
                  servers={paginatedServers}
                  loading={loading}
                  error={error}
                  renderServer={(server, utils) => (
                    <div className="bg-[#1f2937] rounded-lg overflow-hidden border border-[#2d3748] hover:border-[#f8b700]/30 transition-colors">
                      {/* Thông tin server */}
                      <div className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-medium text-white">
                            {server.name}
                            {server.city && (
                              <span className="text-sm text-gray-400 block">
                                {server.city}
                              </span>
                            )}
                          </h3>
                          <span className={`text-xl font-bold ${utils.getLoadColor(server.load)}`}>
                            {server.load}%
                          </span>
                        </div>
                        
                        <div className="text-sm text-gray-400">
                          {server.hostname}
                        </div>

                        <div className="mt-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            server.status === 'online' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                          }`}>
                            {server.status === 'online' ? 'Online' : 'Offline'}
                          </span>
                        </div>
                      </div>

                      {/* Nút Download */}
                      <div className="p-4 pt-0">
                        <button
                          onClick={() => downloadConfig(server)}
                          className="w-full bg-[#f8b700] hover:bg-[#f8b700]/90 text-black px-3 py-2 rounded text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                          </svg>
                          Download
                        </button>
                      </div>
                    </div>
                  )}
                />

                {/* Phân trang */}
                {filteredServers.length > 0 && (
                  <div className="mt-6 flex justify-center items-center">
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={goToPage}
                    />
                  </div>
                )}

                {/* Nút scroll to top */}
                {showScrollTop && (
                  <button
                    onClick={scrollToTop}
                    className="fixed bottom-6 right-6 bg-[#f8b700] hover:bg-[#f8b700]/90 text-black p-3 rounded-full shadow-lg transition-colors"
                    aria-label="Cuộn lên đầu trang"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18"></path>
                    </svg>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
}