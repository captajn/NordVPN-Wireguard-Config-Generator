'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Header from "../components/Header";
import Footer from "../components/Footer";
import ScrollToTop from '../../components/ScrollToTop';

interface ServerInfo {
  id: number;
  name: string;
  hostname: string;
  station: string;
  load: number;
  status: string;
  locations: {
    country: {
      id: number;
      name: string;
      code: string;
      city?: {
        name: string;
        id: number;
        latitude: number;
        longitude: number;
      }
    }
  }[];
  technologies: {
    id: number;
    name: string;
    identifier: string;
    metadata: {
      name: string;
      value: string;
    }[];
    pivot: {
      status: string;
    }
  }[];
}

interface Country {
  id: number;
  name: string;
  code: string;
}

export default function ServersPage() {
  const [servers, setServers] = useState<ServerInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [selectedCountryId, setSelectedCountryId] = useState<number | null>(null);
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [filteredServers, setFilteredServers] = useState<ServerInfo[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const serversPerPage = 24;
  
  // Thêm state cho gợi ý quốc gia và scroll
  const [showCountrySuggestions, setShowCountrySuggestions] = useState(false);
  const [countrySuggestions, setCountrySuggestions] = useState<Country[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionListRef = useRef<HTMLDivElement>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  
  // Thêm useEffect để theo dõi scroll
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Thêm hàm scrollToTop
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // Hàm để tải danh sách quốc gia từ API
  const fetchCountries = useCallback(async () => {
    try {
      const response = await fetch('/api/nordvpn/countries');
      
      if (!response.ok) {
        throw new Error(`Lỗi khi tải danh sách quốc gia: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && Array.isArray(data.countries)) {
        // Sắp xếp quốc gia theo tên
        const sortedCountries = [...data.countries].sort((a, b) => 
          a.name.localeCompare(b.name)
        );
        setCountries(sortedCountries);
      } else {
        throw new Error('Định dạng dữ liệu quốc gia không hợp lệ');
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách quốc gia:', err);
      setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi khi tải danh sách quốc gia');
    }
  }, []);

  // Hàm gọi API để lấy danh sách máy chủ đề xuất
  const fetchRecommendedServers = useCallback(async (countryId?: number) => {
    setLoading(true);
    setError(null);
    
    try {
      // Sửa lại URL API cho đúng route của Next.js
      let apiUrl = '/api/nordvpn/servers';
      if (countryId) {
        apiUrl += `?country_id=${countryId}`;
      }
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`Lỗi khi tải danh sách máy chủ: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.success && Array.isArray(data.servers)) {
        setServers(data.servers);
        setFilteredServers(sortServersByLoad(data.servers));
      } else {
        throw new Error('Định dạng dữ liệu không hợp lệ');
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách máy chủ:', err);
      setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi không xác định');
    } finally {
      setLoading(false);
    }
  }, []);

  // Hàm lấy tên thành phố từ máy chủ
  const getServerCity = (server: ServerInfo): string => {
    if (server.locations && server.locations.length > 0) {
      const location = server.locations[0];
      if (location.country && location.country.city) {
        return location.country.city.name;
      }
    }
    return '';
  };

  // Hàm lấy tên quốc gia từ máy chủ
  const getServerCountry = (server: ServerInfo): string => {
    if (server.locations && server.locations.length > 0) {
      const location = server.locations[0];
      if (location.country) {
        return location.country.name;
      }
    }
    return '';
  };

  // Hàm sắp xếp máy chủ theo tải
  const sortServersByLoad = (serverList: ServerInfo[]): ServerInfo[] => {
    return [...serverList].sort((a, b) => a.load - b.load);
  };

  // Tải dữ liệu quốc gia khi component mount
  useEffect(() => {
    fetchCountries();
  }, [fetchCountries]);

  // Tải dữ liệu máy chủ khi component mount hoặc khi country_id thay đổi
  useEffect(() => {
    fetchRecommendedServers(selectedCountryId || undefined);
  }, [fetchRecommendedServers, selectedCountryId]);

  // Cập nhật danh sách thành phố khi chọn quốc gia
  useEffect(() => {
    if (selectedCountry && servers.length > 0) {
      // Lọc các máy chủ thuộc quốc gia đã chọn
      const countryServers = servers.filter(server => 
        getServerCountry(server) === selectedCountry
      );
      
      // Lấy danh sách thành phố duy nhất
      const uniqueCities = Array.from(
        new Set(
          countryServers
            .map(server => getServerCity(server))
            .filter(city => city) // Loại bỏ các giá trị rỗng
        )
      ).sort();
      
      setCities(uniqueCities);
      setSelectedCity(''); // Reset thành phố đã chọn
      
      // Cập nhật danh sách máy chủ đã lọc
      setFilteredServers(sortServersByLoad(countryServers));
      setCurrentPage(1); // Reset về trang 1
    } else if (!selectedCountry && servers.length > 0) {
      // Nếu không chọn quốc gia, hiển thị tất cả máy chủ
      setCities([]);
      setSelectedCity('');
      setFilteredServers(sortServersByLoad(servers));
      setCurrentPage(1);
    }
  }, [selectedCountry, servers]);

  // Lọc máy chủ khi thay đổi tìm kiếm hoặc thành phố
  useEffect(() => {
    if (servers.length > 0) {
      let filtered = [...servers];
      
      // Lọc theo quốc gia đã được áp dụng ở server-side
      // Lọc theo thành phố
      if (selectedCity) {
        filtered = filtered.filter(server => 
          getServerCity(server) === selectedCity
        );
      }
      
      // Lọc theo từ khóa tìm kiếm
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(server => {
          const country = getServerCountry(server).toLowerCase();
          const city = getServerCity(server).toLowerCase();
          const name = server.name.toLowerCase();
          const hostname = server.hostname.toLowerCase();
          
          return (
            name.includes(query) ||
            hostname.includes(query) ||
            country.includes(query) ||
            city.includes(query)
          );
        });
      }
      
      // Sắp xếp theo tải
      setFilteredServers(sortServersByLoad(filtered));
      setCurrentPage(1); // Reset về trang 1 khi lọc
    }
  }, [servers, selectedCity, searchQuery]);

  // Phân trang
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

  // Xử lý khi chọn quốc gia
  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === '') {
      // Không chọn quốc gia nào
      setSelectedCountry('');
      setSelectedCountryId(null);
    } else {
      // Tìm country object dựa trên ID đã chọn
      const countryId = parseInt(value, 10);
      const country = countries.find(c => c.id === countryId);
      if (country) {
        setSelectedCountry(country.name);
        setSelectedCountryId(countryId);
      }
    }
  };

  // Xử lý khi chọn thành phố
  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCity(e.target.value);
  };

  // Xóa tất cả bộ lọc
  const resetAllFilters = () => {
    setSelectedCountry('');
    setSelectedCountryId(null);
    setSelectedCity('');
    setSearchQuery('');
    if (servers.length > 0) {
      setFilteredServers(sortServersByLoad(servers));
    }
    setCurrentPage(1);
  };

  // Xử lý khi chọn một quốc gia từ danh sách gợi ý
  const handleSelectSuggestedCountry = (country: Country) => {
    setSelectedCountry(country.name);
    setSelectedCountryId(country.id);
    setSearchQuery('');
    setShowCountrySuggestions(false);
    // Reset city khi đổi quốc gia
    setSelectedCity('');
  };
  
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
  
  // Effect để lọc gợi ý quốc gia khi nhập vào ô tìm kiếm
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setCountrySuggestions([]);
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
  }, [searchQuery, countries]);

    return (
    <div className="min-h-screen flex flex-col bg-[#121827]">
      <Header />
      
      <main className="flex-grow p-3 sm:p-6">
          <div className="container mx-auto">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 sm:mb-6 md:mb-8">
              <span className="text-[#f8b700]">Máy Chủ</span> <span className="text-white">được đề xuất</span>
            </h1>
            
          {/* Status Banner */}
          <div className="mb-4 flex justify-between items-center bg-[#1f2937] p-3 rounded-lg border border-[#2d3748]">
            <div className="text-sm text-gray-400">
              <span className="flex items-center">
                <svg className="w-4 h-4 mr-1 text-[#f8b700]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                Cập nhật mới nhất: <span className="text-[#f8b700] font-medium ml-1">Hôm nay</span>
              </span>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg mb-4">
              <p>{error}</p>
            </div>
          )}

          {/* Filter Section */}
          <div className="bg-[#1f2937] p-6 rounded-lg border border-[#2d3748] mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
                <h2 className="text-xl font-semibold text-[#f8b700]">Chọn máy chủ</h2>
                
                <div className="flex flex-wrap gap-2">
                  <div className="w-full sm:w-48">
                    <select
                      className="w-full px-3 py-2 bg-[#121827] border border-[#2d3748] rounded-md text-white focus:border-[#f8b700]"
                      value={selectedCountryId ? selectedCountryId.toString() : ''}
                      onChange={handleCountryChange}
                    >
                      <option value="">Tất cả quốc gia</option>
                      {countries.map(country => (
                        <option key={`country-${country.id}`} value={country.id.toString()}>
                          {country.name} ({country.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Chọn thành phố */}
                  {selectedCountry && cities.length > 0 && (
                    <div className="w-full sm:w-48">
                      <select
                        className="w-full px-3 py-2 bg-[#121827] border border-[#2d3748] rounded-md text-white focus:border-[#f8b700]"
                        value={selectedCity}
                        onChange={handleCityChange}
                      >
                        <option value="">Tất cả thành phố</option>
                        {cities.map(city => (
                          <option key={`city-${city}`} value={city}>
                            {city}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  
                  <div className="w-full sm:w-48 relative">
                    <input
                      type="text"
                      ref={searchInputRef}
                      className="w-full px-3 py-2 bg-[#121827] border border-[#2d3748] rounded-md text-white focus:border-[#f8b700]"
                      placeholder="Tìm kiếm máy chủ..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setShowCountrySuggestions(true);
                      }}
                      onFocus={() => setShowCountrySuggestions(true)}
                    />
                    
                    {/* Danh sách gợi ý quốc gia */}
                    {showCountrySuggestions && countrySuggestions.length > 0 && (
                      <div 
                        ref={suggestionListRef}
                        className="absolute z-50 w-full mt-1 bg-[#1f2937] border-2 border-[#f8b700] rounded-md shadow-lg max-h-60 overflow-y-auto"
                      >
                        <div className="sticky top-0 bg-[#121827] border-b border-[#2d3748] px-3 py-2 text-sm text-gray-400">
                          Chọn một quốc gia ({countrySuggestions.length} kết quả)
                        </div>
                        <ul className="py-1">
                          {countrySuggestions.map(country => (
                            <li 
                              key={`suggestion-${country.id || country.name}`}
                              className="block px-4 py-3 hover:bg-[#f8b700] hover:text-black cursor-pointer text-white transition-colors"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleSelectSuggestedCountry(country);
                              }}
                              onMouseDown={(e) => {
                                // Ngăn không cho input mất focus trước khi xử lý click
                                e.preventDefault();
                              }}
                            >
                              <div className="flex items-center">
                                <span className="mr-2 text-[#f8b700] font-bold">•</span>
                                {country.name} ({country.code})
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Nút xóa bộ lọc */}
                  {(selectedCountry || selectedCity || searchQuery) && (
                    <div className="w-full sm:w-auto">
                      <button
                        onClick={resetAllFilters}
                        className="w-full px-3 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 rounded-md transition-colors flex items-center justify-center gap-2"
                        title="Xóa tất cả bộ lọc"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                        <span>Xóa bộ lọc</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Server Grid */}
          {loading ? (
            <div className="text-center py-6 bg-[#1f2937] rounded-lg border border-[#2d3748]">
              <div className="inline-block w-6 h-6 border-2 border-[#f8b700] border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-2 text-sm text-gray-400">Đang tải...</p>
            </div>
          ) : filteredServers.length === 0 ? (
            <div className="text-center py-6 bg-[#1f2937] rounded-lg border border-[#2d3748]">
              <p className="text-sm text-gray-400">Không tìm thấy máy chủ nào phù hợp.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {currentServers.map((server) => (
                <div 
                  key={server.id}
                  className="bg-[#1f2937] p-3 rounded-lg border border-[#2d3748] hover:border-[#f8b700]/30 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <h3 className="font-medium text-white text-sm">
                      {getServerCountry(server)} #{server.id}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        server.status === 'online' 
                          ? 'bg-[#f8b700]/10 text-[#f8b700]' 
                          : 'bg-red-500/10 text-red-400'
                      }`}>
                        {server.status === 'online' ? 'Online' : 'Offline'}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-lg font-bold ${
                        server.load < 30 ? 'text-green-400' :
                        server.load < 70 ? 'text-yellow-400' :
                        'text-red-400'
                      }`}>
                        {server.load}%
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-gray-400 mb-1">
                    {getServerCity(server) ? `${getServerCity(server)}, ${getServerCountry(server)}` : getServerCountry(server)}
                  </div>

                  <div className="text-xs text-gray-500 font-mono mb-1.5 truncate" title={server.hostname || server.station}>
                    {server.hostname || server.station}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {/* Hiển thị danh sách công nghệ với trạng thái */}
                    {server.technologies && server.technologies.length > 0 && 
                      server.technologies.map((tech) => (
                        <span 
                          key={`${server.id}-${tech.id}`}
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            tech.pivot?.status === 'online'
                              ? 'bg-[#1a1f2e] text-gray-300 border border-gray-700'
                              : 'bg-red-500/10 text-red-400'
                          }`}
                        >
                          {tech.name}
                        </span>
                      ))
                    }
                  </div>
                </div>
              ))}
            </div>
          )}

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
        </main>

      {/* Sử dụng client component riêng cho nút scroll to top */}
      <ScrollToTop />
      
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