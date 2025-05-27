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
  station?: string;
  ipv6_station?: string;
  technologies?: {
    id: number;
    name: string;
    identifier: string;
    metadata?: {
      name: string;
      value: string;
    }[];
    pivot?: {
      status: string;
    }
  }[];
  locations?: {
    id?: number;
    latitude?: number;
    longitude?: number;
    country?: {
      id?: number;
      name?: string;
      code?: string;
      city?: {
        id?: number;
        name?: string;
        latitude?: number;
        longitude?: number;
        dns_name?: string;
      }
    }
  }[];
  publicKeyFetched?: boolean;
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
  const [fetchingPrivateKey, setFetchingPrivateKey] = useState(false);
  const [privateKeyMessage, setPrivateKeyMessage] = useState<string | null>(null);
  const [showCountrySuggestions, setShowCountrySuggestions] = useState(false);
  const [countrySuggestions, setCountrySuggestions] = useState<Country[]>([]);
  const [loadFilter, setLoadFilter] = useState<string>('all');
  const [selectedDNS, setSelectedDNS] = useState<DNSOption>('cloudflare');

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

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  useEffect(() => {
    setLoading(false);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedToken = localStorage.getItem('nordvpn_token');
      const savedPrivateKey = localStorage.getItem('nordvpn_private_key');
      const expiresAt = localStorage.getItem('nordvpn_expires_at');
      
      if (expiresAt) {
        const expiryDate = new Date(expiresAt);
        const now = new Date();
        
        if (expiryDate <= now) {
          localStorage.removeItem('nordvpn_token');
          localStorage.removeItem('nordvpn_private_key');
          localStorage.removeItem('nordvpn_expires_at');
          return;
        }
        
        setTokenExpiry(expiryDate);
      }
      
      if (savedToken) {
        setToken(savedToken);
        
        if (!savedPrivateKey) {
          setFetchingPrivateKey(true);
          setPrivateKeyMessage("Đang lấy thông tin xác thực từ token đã lưu...");
          
          fetch('/api/nordvpn/credentials', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token: savedToken }),
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
            if (data.privateKey) {
              localStorage.setItem('nordvpn_private_key', data.privateKey);
              
              if (data.expires_at) {
                localStorage.setItem('nordvpn_expires_at', data.expires_at);
                setTokenExpiry(new Date(data.expires_at));
              }
              
              setIsAuthenticated(true);
              setPrivateKeyMessage("Đã lấy thông tin xác thực thành công!");
            }
          })
          .catch(err => {
            setPrivateKeyMessage(`Không thể lấy thông tin xác thực: ${err.message}`);
            setError(`Không thể lấy thông tin xác thực: ${err.message}`);
          })
          .finally(() => {
            setFetchingPrivateKey(false);
          });
        } else {
          setIsAuthenticated(true);
        }
      }
    }
  }, []);

  useEffect(() => {
    if (!tokenExpiry) return;
    
    const interval = setInterval(() => {
      const now = new Date();
      if (tokenExpiry <= now) {
        handleLogout();
        clearInterval(interval);
      }
    }, 60000);
    
    return () => clearInterval(interval);
  }, [tokenExpiry]);

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

  useEffect(() => {
    if (isAuthenticated && countries.length === 0) {
      const fetchCountries = async () => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          
          const response = await fetch('/api/nordvpn/countries', {
            signal: controller.signal,
            headers: {
              'Accept': 'application/json'
            }
          });
          
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            throw new Error(`Lỗi khi tải danh sách quốc gia: ${response.status}`);
          }
          
          const data = await response.json();
          
          if (data.success && Array.isArray(data.countries)) {
            const validCountries = data.countries
              .filter((country: Country) => 
                country && typeof country.id === 'number' && 
                country.name && country.code
              );
              
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

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    if (!selectedId) {
      setSelectedCountry('');
      setSelectedCountryId(null);
      setSelectedCity('');
      setCities([]);
      console.log('Đã xóa quốc gia, selectedCountryId = null');
    } else {
      const countryObj = countries.find(c => c.id === parseInt(selectedId));
      if (countryObj) {
        setSelectedCountry(countryObj.name);
        setSelectedCountryId(countryObj.id);
        setSelectedCity('');
        console.log('Đã chọn quốc gia:', countryObj.name, 'selectedCountryId =', countryObj.id);
      }
    }
  };

  const fetchServers = useCallback(async () => {
    setLoading(true);
    setError('');
    
    try {
      const savedToken = localStorage.getItem('nordvpn_token');
      if (!savedToken) {
        throw new Error('Không tìm thấy token xác thực. Vui lòng đăng nhập lại.');
      }
      
      let url = '/api/nordvpn/wireguard';
      
      if (selectedCountryId) {
        url = `/api/nordvpn/wireguard?country_id=${selectedCountryId}`;
        console.log('Gọi API với country_id:', selectedCountryId);
      } else {
        console.log('Gọi API không có country_id');
      }
      
      url += (url.includes('?') ? '&' : '?') + `token=${encodeURIComponent(savedToken)}`;
      
      console.log('Gọi API với URL:', url);
      
      const response = await fetch(url, {
        headers: {
          'x-auth-token': savedToken,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error(`Không thể lấy danh sách máy chủ: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Không thể lấy danh sách máy chủ');
      }
      
      const formattedServers: ServerInfo[] = data.servers || [];

      const enhancedServers = formattedServers.map(server => {
        let publicKey = "bmXOC+F1FxEMF9dyiK2H5/1SUtzH0JuVo51h2wPfgyo=";
        let city = server.city || '';
        let country = '';
        
        if (server.technologies && Array.isArray(server.technologies)) {
          const wireguardTech = server.technologies.find(tech => tech.identifier === 'wireguard_udp');
          
          if (wireguardTech && wireguardTech.metadata && Array.isArray(wireguardTech.metadata)) {
            const publicKeyData = wireguardTech.metadata.find(meta => meta.name === 'public_key');
            if (publicKeyData && publicKeyData.value) {
              publicKey = publicKeyData.value;
            }
          }
        }
        
        if (server.locations && server.locations.length > 0) {
          const location = server.locations[0];
          if (location.country) {
            if (location.country.city && location.country.city.name) {
              city = location.country.city.name;
            }
            
            if (location.country.name) {
              country = location.country.name;
              console.log('Tìm thấy quốc gia từ API:', location.country.name, 'ID:', location.country.id);
            }
          }
        }
        
        return {
          ...server,
          publicKey: publicKey,
          city: city,
          country: country
        };
      });
      
      console.log('Dữ liệu nhận từ API:', formattedServers.length, 'máy chủ');
      console.log('Servers sau khi xử lý:', enhancedServers.length, 'máy chủ');
      
      setServers(enhancedServers);
      
      if (selectedCountryId && enhancedServers.length > 0) {
        const countryName = enhancedServers[0].country;
        if (countryName && countryName !== selectedCountry) {
          console.log('Cập nhật tên quốc gia từ:', selectedCountry, 'thành:', countryName);
          setSelectedCountry(countryName);
        }
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi tải danh sách máy chủ');
    } finally {
      setLoading(false);
    }
  }, [selectedCountryId, selectedCountry]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchServers();
    }
  }, [isAuthenticated, fetchServers]);

  useEffect(() => {
    if (selectedCountry && servers.length > 0) {
      const countryServers = servers.filter(server => server.country === selectedCountry);
      const uniqueCities = [...new Set(countryServers
        .map(server => server.city)
        .filter((city): city is string => city !== undefined && city !== ''))]
        .sort();
      setCities(uniqueCities);
      
      setSelectedCity('');
      
      setFilteredServers(countryServers);
    } else if (!selectedCountry && servers.length > 0) {
      setCities([]);
      setSelectedCity('');
      setFilteredServers(servers);
    } else {
      setCities([]);
      setSelectedCity('');
    }
  }, [selectedCountry, servers]);

  useEffect(() => {
    if (servers.length > 0) {
      let filtered = [...servers];
      
      if (selectedCountry && !selectedCountryId) {
        filtered = filtered.filter(server => 
          server.country === selectedCountry || 
          (server.locations && 
           server.locations[0] && 
           server.locations[0].country && 
           server.locations[0].country.name === selectedCountry)
        );
        console.log('Lọc theo tên quốc gia:', selectedCountry, 'kết quả:', filtered.length);
      }
      
      if (selectedCity) {
        filtered = filtered.filter(server => server.city === selectedCity);
        console.log('Lọc theo thành phố:', selectedCity, 'kết quả:', filtered.length);
      }
      
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
        console.log('Lọc theo tải:', loadFilter, 'kết quả:', filtered.length);
      }
      
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(server => 
          server.name.toLowerCase().includes(query) || 
          (server.hostname && server.hostname.toLowerCase().includes(query)) ||
          server.country.toLowerCase().includes(query) ||
          (server.city && server.city.toLowerCase().includes(query))
        );
        console.log('Lọc theo từ khóa:', searchQuery, 'kết quả:', filtered.length);
      }
      
      setFilteredServers(filtered);
    }
  }, [servers, selectedCity, searchQuery, selectedCountry, loadFilter, selectedCountryId]);

  const handleLogout = () => {
    localStorage.removeItem('nordvpn_token');
    localStorage.removeItem('nordvpn_private_key');
    localStorage.removeItem('nordvpn_expires_at');
    setToken('');
    setTokenExpiry(null);
    setIsAuthenticated(false);
  };

  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setCountrySuggestions([]);
      setShowCountrySuggestions(false);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const suggestions = countries.filter(country => {
      const countryName = country.name.toLowerCase();
      
      if (countryName.includes(query)) return true;
      
      if (countryName.startsWith(query)) return true;
      
      if (query.length >= 3 && countryName.includes(query)) return true;
      
      return false;
    });
    
    setCountrySuggestions(suggestions.slice(0, 50));
    setShowCountrySuggestions(suggestions.length > 0);
  }, [searchQuery, countries]);

  const handleSelectSuggestedCountry = useCallback((country: Country) => {
    setSelectedCountry(country.name);
    setSelectedCountryId(country.id);
    setSearchQuery('');
    setShowCountrySuggestions(false);
    setSelectedCity('');
  }, []);

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

  const resetAllFilters = useCallback(() => {
    setSelectedCountry('');
    setSelectedCountryId(null);
    setSelectedCity('');
    setSearchQuery('');
    setLoadFilter('all');
    setSelectedDNS('cloudflare');
    setShowCountrySuggestions(false);
    
    fetchServers();
  }, [fetchServers]);

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

      const savedPrivateKey = localStorage.getItem('nordvpn_private_key');
      const savedToken = localStorage.getItem('nordvpn_token');
      
      if (!savedPrivateKey) {
        setError('Không tìm thấy private key. Vui lòng đăng nhập lại.');
        setLoading(false);
        return;
      }

      if (!savedToken) {
        setError('Không tìm thấy token. Vui lòng đăng nhập lại.');
        setLoading(false);
        return;
      }

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
        const errorText = await response.text();
        let errorMessage;
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || 'Không thể tải cấu hình';
        } catch {
          errorMessage = errorText || `Lỗi HTTP: ${response.status}`;
        }
        
        throw new Error(errorMessage);
      }

      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${server.hostname}.conf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
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

          {isAuthenticated && (
            <div className="mb-4 flex flex-wrap gap-2 items-center">
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg mb-4">
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <p className="font-medium">{error}</p>
              </div>
              <p className="mt-2 text-sm text-red-300/80">
                Nếu lỗi vẫn tiếp tục, hãy thử làm mới trang hoặc đăng nhập lại.
              </p>
            </div>
          )}

          {privateKeyMessage && !fetchingPrivateKey && !error && (
            <div className="bg-green-500/10 border border-green-500/50 text-green-300 px-4 py-3 rounded-lg mb-4">
              <p>{privateKeyMessage}</p>
            </div>
          )}

          {!isAuthenticated && (
            <div className="bg-[#1f2937] p-6 rounded-lg border border-[#2d3748]">
              <h2 className="text-xl font-semibold mb-4 text-[#f8b700]">Nhập Token NordVPN</h2>
              <p className="mb-4 text-gray-300">
                Để tạo cấu hình WireGuard, bạn cần có token xác thực từ tài khoản NordVPN.
              </p>
              
              {fetchingPrivateKey && (
                <div className="mb-4 bg-blue-500/10 border border-blue-500/50 text-blue-300 px-4 py-3 rounded-lg">
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p>{privateKeyMessage}</p>
                  </div>
                </div>
              )}
              
              <form onSubmit={(e) => {
                e.preventDefault();
                const trimmedToken = token.trim();
                
                setError('');
                setLoading(false);
                
                if (!trimmedToken) {
                  setError('Vui lòng nhập token');
                  return;
                }
                
                setLoading(true);
                
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
                  
                  localStorage.setItem('nordvpn_token', trimmedToken);
                  localStorage.setItem('nordvpn_private_key', data.privateKey);
                  
                  if (data.expires_at) {
                    localStorage.setItem('nordvpn_expires_at', data.expires_at);
                    setTokenExpiry(new Date(data.expires_at));
                  }
                  
                  window.dispatchEvent(new Event('nordvpn-login'));
                  
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

          {isAuthenticated && (
            <div className="bg-[#1f2937] p-6 rounded-lg border border-[#2d3748]">
              <div className="mb-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
                    <h2 className="text-xl font-semibold text-[#f8b700]">Chọn máy chủ WireGuard</h2>
                    
                    <button
                      onClick={fetchServers}
                      className="px-3 py-1 bg-green-500/10 hover:bg-green-500/20 text-green-300 rounded-md transition-colors flex items-center gap-2 text-sm"
                      disabled={loading}
                      title="Tải lại danh sách máy chủ"
                    >
                      <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                      </svg>
                      Làm mới
                    </button>
                    
                    <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:flex-wrap sm:gap-2">
                      <div className="w-full sm:w-auto">
                        <select
                          className="w-48 px-3 py-2 bg-[#121827] border border-[#2d3748] rounded-md text-white focus:border-[#f8b700]"
                          value={selectedCountryId || ''}
                          onChange={handleCountryChange}
                          disabled={loading}
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
                          disabled={loading}
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
                          disabled={loading}
                        >
                          {DNS_CONFIGS.map(dns => (
                            <option key={dns.value} value={dns.value}>
                              {dns.name}
                            </option>
                          ))}
                        </select>
                      </div>

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
                          disabled={loading}
                        />
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

                      {selectedCountry && cities.length > 0 && (
                        <div className="w-full sm:w-auto">
                          <select
                            className="w-48 px-3 py-2 bg-[#121827] border border-[#2d3748] rounded-md text-white focus:border-[#f8b700]"
                            value={selectedCity}
                            onChange={(e) => setSelectedCity(e.target.value)}
                            disabled={loading}
                          >
                            <option key="city-all" value="">Tất cả thành phố</option>
                            {cities.map(city => (
                              <option key={`city-${city.replace(/\s+/g, '-')}`} value={city}>{city}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {(selectedCountry || selectedCity || searchQuery || loadFilter !== 'all' || selectedDNS !== 'cloudflare') && (
                        <button
                          onClick={resetAllFilters}
                          className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-300 rounded-md transition-colors flex items-center gap-2"
                          disabled={loading}
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

                {(selectedCountry || selectedCity || loading) && (
                  <div className="mb-4 flex flex-wrap gap-2 items-center">
                    {selectedCity && (
                      <div className="bg-purple-500/10 text-purple-300 px-3 py-1 rounded-full text-sm flex items-center">
                        <span className="mr-1">Thành phố:</span>
                        <span className="font-medium">{selectedCity}</span>
                      </div>
                    )}
                    
                    {loading && (
                      <div className="bg-yellow-500/10 text-yellow-300 px-3 py-1 rounded-full text-sm flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Đang tải máy chủ...</span>
                      </div>
                    )}
                  </div>
                )}

                <ServerList
                  servers={paginatedServers}
                  loading={loading}
                  error={error}
                  renderServer={(server, utils) => (
                    <div className="bg-[#1f2937] rounded-lg overflow-hidden border border-[#2d3748] hover:border-[#f8b700]/30 transition-colors">
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
                          <div className="flex flex-col items-end">
                            <span className={`text-xl font-bold ${utils.getLoadColor(server.load)}`}>
                              {server.load}%
                            </span>
                            <span className={`text-xs ${
                              server.status === 'online' ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {server.status === 'online' ? 'Online' : 'Offline'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="text-sm text-gray-400">
                          {server.hostname}
                        </div>

                        {/* @ts-expect-error - Thuộc tính 'station' tồn tại trong dữ liệu từ API */}
                        {server && server.station && (
                          <div className="text-sm text-gray-400 mt-1">
                            <div className="flex items-center">
                              {/* @ts-expect-error - Thuộc tính 'station' tồn tại trong dữ liệu từ API */}
                              <span>IP: <span className="font-mono">{server.station}</span></span>
                            </div>
                          </div>
                        )}
                      </div>

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

                {!loading && !error && filteredServers.length === 0 && (
                  <div className="bg-[#1f2937] rounded-lg p-8 border border-[#2d3748] text-center">
                    <svg className="h-12 w-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <h3 className="text-lg font-medium text-white mb-2">Không tìm thấy máy chủ</h3>
                    <p className="text-gray-400">
                      Vui lòng thử lại với bộ lọc khác.
                    </p>
                    <button
                      onClick={resetAllFilters}
                      className="mt-4 bg-[#f8b700] hover:bg-[#f8b700]/90 text-black px-4 py-2 rounded font-medium transition-colors"
                    >
                      Xóa tất cả bộ lọc
                    </button>
                  </div>
                )}

                {filteredServers.length > 0 && (
                  <div className="mt-6 flex justify-center items-center">
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={goToPage}
                    />
                  </div>
                )}

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