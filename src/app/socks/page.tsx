'use client';

import { useState, useEffect, useCallback } from 'react';
import Header from "../components/Header";
import Footer from "../components/Footer";
import { NordVPNServer } from '../../types';

interface Country {
  id: number;
  name: string;
  code: string;
}

export default function SocksPage() {
  const [servers, setServers] = useState<NordVPNServer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loadingCredentials, setLoadingCredentials] = useState(false);
  const [token, setToken] = useState('');
  
  // Thêm state cho việc lọc và sắp xếp
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [selectedCountryId, setSelectedCountryId] = useState<string>('');
  const [countries, setCountries] = useState<Country[]>([]);
  const [sortOption, setSortOption] = useState<'load-asc' | 'load-desc'>('load-asc');
  const [filteredServers, setFilteredServers] = useState<NordVPNServer[]>([]);
  
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
  const fetchSocksServers = useCallback(async (setLoadingState = true, countryId?: string) => {
    try {
      if (setLoadingState) {
        setLoading(true);
      }
      
      // Lấy token từ localStorage
      const savedToken = localStorage.getItem('nordvpn_token');
      
      // Xây dựng URL API với country_id nếu có
      let apiUrl = '/api/nordvpn/socks';
      if (countryId) {
        apiUrl += `?country_id=${countryId}`;
      }
      
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': savedToken ? `Bearer ${savedToken}` : '',
          'Accept': 'application/json'
        }
      });
      
      // Kiểm tra response là JSON hợp lệ
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('API không trả về dữ liệu JSON hợp lệ');
      }
      
      const data = await response.json();
      
      if (data.success) {
        const serverList = data.servers as NordVPNServer[];
        
        // Debug: Log server đầu tiên để kiểm tra cấu trúc
        if (serverList.length > 0) {
          console.log('Server item sample:', serverList[0]);
          console.log('IP from station:', serverList[0].station);
        }
        
        setServers(serverList);
        
        // Cập nhật thông tin đăng nhập nếu có
        if (data.username && data.password) {
          setUsername(data.username);
          setPassword(data.password);
          
          // Lưu thông tin đăng nhập vào localStorage
          localStorage.setItem('nordvpn_username', data.username);
          localStorage.setItem('nordvpn_password', data.password);
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
      setError(err instanceof Error ? err.message : 'Lỗi không xác định');
    } finally {
      if (setLoadingState) {
        setLoading(false);
      }
    }
  }, [sortOption, sortServers]);
  
  useEffect(() => {
    // Kiểm tra xem có token đã lưu không
    const savedToken = localStorage.getItem('nordvpn_token');
    
    if (savedToken) {
      setToken(savedToken);
      setIsAuthenticated(true);
      fetchSocksServers();
      
      // Kiểm tra xem có thông tin đăng nhập SOCKS đã lưu không
      const savedUsername = localStorage.getItem('nordvpn_username');
      const savedPassword = localStorage.getItem('nordvpn_password');
      
      if (savedUsername && savedPassword) {
        setUsername(savedUsername);
        setPassword(savedPassword);
      } else {
        // Nếu chưa có thông tin đăng nhập, gọi API để lấy
        fetchUserCredentials(savedToken);
      }
      
      // Thêm event listener để lắng nghe thay đổi token từ các trang khác
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === 'nordvpn_token') {
          if (e.newValue) {
            setToken(e.newValue);
            setIsAuthenticated(true);
            fetchSocksServers();
            
            // Kiểm tra lại thông tin đăng nhập
            const username = localStorage.getItem('nordvpn_username');
            const password = localStorage.getItem('nordvpn_password');
            
            if (username && password) {
              setUsername(username);
              setPassword(password);
            } else {
              fetchUserCredentials(e.newValue);
            }
          } else {
            setToken('');
            setIsAuthenticated(false);
          }
        }
      };
      
      window.addEventListener('storage', handleStorageChange);
      return () => {
        window.removeEventListener('storage', handleStorageChange);
      };
    } else {
      setLoading(false);
    }
  }, [fetchSocksServers]);
  
  // Lọc và sắp xếp danh sách máy chủ khi có thay đổi
  useEffect(() => {
    if (servers.length > 0) {
      // Sắp xếp theo tùy chọn
      const sortedServers = sortServers([...servers], sortOption);
      setFilteredServers(sortedServers);
    }
  }, [servers, sortOption, sortServers]);
  
  const downloadProxies = () => {
    if (!username || !password) {
      setError('Vui lòng nhập tên người dùng và mật khẩu');
      return;
    }
    
    // Lấy danh sách máy chủ đã lọc
    const serversToDownload = filteredServers;
    
    // Tạo danh sách proxy với định dạng hostname:port:username:password
    const proxyList = serversToDownload.map(server => {
      return `${server.hostname}:1080:${username}:${password}`;
    });
    
    // Tạo file blob và tải xuống
    const blob = new Blob([proxyList.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const fileName = selectedCountry 
      ? `proxies_${selectedCountryId}_${selectedCountry.toLowerCase().replace(/\s+/g, '_')}.txt`
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
      
      const response = await fetch('/api/nordvpn/user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: userToken }),
      });
      
      // Kiểm tra response là JSON hợp lệ
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('API không trả về dữ liệu JSON hợp lệ');
      }
      
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
      setError(err instanceof Error ? err.message : 'Lỗi không xác định');
    } finally {
      setLoadingCredentials(false);
    }
  };

  // Thay thế phần table bằng cards
  const renderServerList = () => {
    if (loading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-[#1a1f2e] rounded-lg p-4 animate-pulse">
              <div className="h-6 bg-[#2d3748] rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-[#2d3748] rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-[#2d3748] rounded w-2/3 mb-2"></div>
              <div className="h-4 bg-[#2d3748] rounded w-1/3 mb-2"></div>
              <div className="h-8 bg-[#2d3748] rounded w-1/2 mx-auto mt-4"></div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
        {filteredServers.map((server) => {
          const city = server.locations[0]?.country?.city?.name || '';
          const country = server.locations[0]?.country?.name || 'Unknown';
          // Lấy IP từ station (chứa IP trực tiếp) hoặc từ các nguồn khác nếu có
          const ip = server.station || server.ips?.socks || server.ips?.nordvpn || extractIPFromHostname(server.hostname) || '';
          
          return (
            <div key={server.id} className="bg-[#1a1f2e] rounded-lg p-4 border border-[#2d3748] hover:border-[#f8b700] transition-colors">
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-white font-medium truncate" title={server.name}>{server.name}</h3>
                <div className="flex items-center space-x-2">
                  <span className={`text-lg font-semibold ${
                    server.load < 30 ? 'text-green-400' : 
                    server.load < 70 ? 'text-yellow-400' : 
                    'text-red-400'
                  }`}>{server.load}%</span>
                  <span className={`text-sm px-2 py-0.5 rounded ${server.status === 'online' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                    {server.status}
                  </span>
                </div>
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="flex items-center">
                  <span className="text-gray-500 text-xs w-20">Country:</span>
                  <span className="text-gray-300 text-sm flex-1" title={`${city ? `${city}, ${country}` : country}`}>
                    {city ? `${city}, ${country}` : country}
                  </span>
                </div>
                
                <div className="flex items-center">
                  <span className="text-gray-500 text-xs w-20">Hostname:</span>
                  <span className="text-gray-300 text-sm truncate flex-1" title={server.hostname}>
                    {server.hostname}
                  </span>
                </div>
                
                <div className="flex items-center">
                  <span className="text-gray-500 text-xs w-20">IP Address:</span>
                  <span className="text-gray-300 text-sm flex-1" title={`${ip} (${server.hostname})`}>
                    {ip || 'N/A'}
                  </span>
                </div>
              </div>

              <div className="flex justify-between space-x-2">
                <button
                  onClick={() => {
                    const proxyInfo = `${server.hostname}:1080:${username}:${password}`;
                    navigator.clipboard.writeText(proxyInfo)
                      .then(() => {
                        // Có thể thêm thông báo đã sao chép thành công
                      })
                      .catch(err => {
                        console.error('Không thể sao chép vào clipboard:', err);
                      });
                  }}
                  className="flex-1 px-3 py-1.5 bg-[#2d3748] hover:bg-[#3d4758] text-white text-sm font-medium rounded transition-colors"
                  disabled={!username || !password}
                >
                  Sao chép
                </button>
                <button
                  onClick={() => {
                    const proxyInfo = `${server.hostname}:1080:${username}:${password}`;
                    const blob = new Blob([proxyInfo], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `proxy_${ip || server.hostname}.txt`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  }}
                  className="flex-1 px-3 py-1.5 bg-[#f8b700] hover:bg-[#e5a800] text-black text-sm font-medium rounded transition-colors"
                  disabled={!username || !password}
                >
                  Tải proxy
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Hàm trích xuất IP từ hostname nếu không có trong server.ips
  const extractIPFromHostname = (hostname: string) => {
    try {
      // Cố gắng trích xuất IP từ hostname nếu có thể
      // Một số hostname có thể chứa địa chỉ IP trong tên
      const ipMatches = hostname.match(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/);
      return ipMatches ? ipMatches[0] : null;
    } catch {
      return null;
    }
  };

  // Hàm ẩn một phần thông tin đăng nhập
  const maskCredential = (text: string) => {
    if (!text || text.length <= 4) return text;
    
    const visibleStart = text.substring(0, 3);
    const visibleEnd = text.substring(text.length - 3);
    const middleAsterisks = '*'.repeat(Math.min(8, text.length - 6));
    
    return `${visibleStart}${middleAsterisks}${visibleEnd}`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#121827]">
      <Header />
      
      <main className="flex-grow p-3 sm:p-6">
        <div className="container mx-auto">
          
          {/* Step 1: Token Input */}
          {!isAuthenticated && (
            <div className="bg-[#1f2937] p-6 rounded-lg border border-[#2d3748]">
              <h2 className="text-xl font-semibold mb-4 text-[#f8b700]">Nhập Token NordVPN</h2>
              <p className="mb-4 text-gray-300">
                Để lấy thông tin đăng nhập SOCKS, bạn cần có token xác thực từ tài khoản NordVPN.
              </p>
              
              <form onSubmit={(e) => {
                e.preventDefault();
                const trimmedToken = token.trim();
                
                setError('');
                
                if (!trimmedToken) {
                  setError('Vui lòng nhập token');
                  return;
                }
                
                setLoading(true);
                
                // Lưu token vào localStorage
                localStorage.setItem('nordvpn_token', trimmedToken);
                
                // Lấy thông tin đăng nhập SOCKS
                fetchUserCredentials(trimmedToken);
                
                // Tải danh sách máy chủ
                fetchSocksServers();
                
                setIsAuthenticated(true);
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

          {/* Form đăng nhập và tải xuống proxy */}
          {isAuthenticated && (
            <div className="bg-[#1f2937] rounded-lg overflow-hidden border border-[#2d3748] mb-6">
              <h2 className="text-xl sm:text-2xl font-bold p-4 border-b border-[#2d3748]">
                <span className="text-[#f8b700]">Thông tin</span> <span className="text-white">Socks</span>
              </h2>
              <div className="p-3 border-b border-[#2d3748]">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="w-full">
                    <div className="flex flex-col space-y-2">
                      <div className="flex flex-col">
                        <label htmlFor="username" className="text-xs font-medium text-gray-400">User:</label>
                        <input
                          type="text"
                          id="username"
                          className="w-full px-2 py-1 bg-[#1a1f2e] border border-[#2d3748] rounded text-white text-sm focus:border-[#f8b700] focus:outline-none"
                          value={maskCredential(username)}
                          readOnly={true}
                          placeholder="Username"
                        />
                      </div>
                      
                      <div className="flex flex-col">
                        <label htmlFor="password" className="text-xs font-medium text-gray-400">Pass:</label>
                        <input
                          type="text"
                          id="password"
                          className="w-full px-2 py-1 bg-[#1a1f2e] border border-[#2d3748] rounded text-white text-sm focus:border-[#f8b700] focus:outline-none"
                          value={maskCredential(password)}
                          readOnly={true}
                          placeholder="Password"
                        />
                      </div>
                      
                      <p className="text-xs text-red-400 italic">* Info User-Pass mặc định lấy theo token không thể chỉnh sửa</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {error && (
                <div className="bg-red-900/30 border border-red-500 text-red-300 mx-4 mt-3 px-3 py-2 rounded text-sm">
                  <p>{error}</p>
                </div>
              )}
            </div>
          )}

          {/* Bộ lọc và danh sách máy chủ */}
          {isAuthenticated && (
            <div className="bg-[#1f2937] rounded-lg overflow-hidden border border-[#2d3748]">
              <div className="flex flex-col md:flex-row items-center justify-between p-4 border-b border-[#2d3748]">
                <h2 className="text-xl font-semibold text-[#f8b700] mb-2 md:mb-0">
                  Danh sách SOCKS Proxy
                </h2>
                <button
                  type="button"
                  className="px-3 py-1.5 bg-[#f8b700] text-black text-sm font-medium rounded hover:bg-yellow-400 transition-colors whitespace-nowrap w-full md:w-auto ml-0 md:ml-2"
                  onClick={downloadProxies}
                  disabled={!username || !password || loadingCredentials}
                >
                  Tải tất cả
                </button>
              </div>
              <div className="px-4 py-3 border-b border-[#2d3748]">
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <label htmlFor="country" className="text-xs font-medium text-gray-400 whitespace-nowrap w-full sm:w-auto">
                    Quốc Gia:
                  </label>
                  <select
                    id="country"
                    className="flex-grow px-3 py-1.5 bg-[#1a1f2e] border border-[#2d3748] rounded text-white text-sm focus:border-[#f8b700] focus:outline-none w-full sm:w-auto"
                    value={selectedCountry}
                    onChange={(e) => {
                      const countryName = e.target.value;
                      setSelectedCountry(countryName);
                      
                      // Tìm ID quốc gia tương ứng
                      if (countryName) {
                        const selectedCountry = countries.find(c => c.name === countryName);
                        if (selectedCountry) {
                          setSelectedCountryId(selectedCountry.id.toString());
                          // Gọi API để lấy danh sách máy chủ theo quốc gia
                          fetchSocksServers(true, selectedCountry.id.toString());
                        }
                      } else {
                        // Nếu chọn "Tất cả quốc gia", reset và gọi API không có lọc
                        setSelectedCountryId('');
                        fetchSocksServers(true);
                      }
                    }}
                    disabled={loading}
                  >
                    <option value="">Tất cả quốc gia</option>
                    {countries.map((country) => (
                      <option key={country.id} value={country.name}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                  
                  <select
                    id="sort"
                    className="w-full sm:w-[140px] px-3 py-1.5 bg-[#1a1f2e] border border-[#2d3748] rounded text-white text-sm focus:border-[#f8b700] focus:outline-none"
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value as 'load-asc' | 'load-desc')}
                    disabled={loading}
                  >
                    <option value="load-asc">Tải thấp nhất</option>
                    <option value="load-desc">Tải cao nhất</option>
                  </select>
                </div>
              </div>

              {error ? (
                <div className="bg-red-900/30 border border-red-500 text-red-300 m-4 px-3 py-2 rounded text-sm">
                  <p>{error}</p>
                </div>
              ) : filteredServers.length === 0 ? (
                <div className="p-4 text-center text-gray-400 text-sm">
                  {loading ? 'Đang tải danh sách máy chủ...' : 'Không tìm thấy máy chủ nào phù hợp với bộ lọc'}
                </div>
              ) : (
                renderServerList()
              )}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
} 