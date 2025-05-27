'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from "../components/Header";
import Footer from "../components/Footer";

interface Server {
  id: number;
  name: string;
  hostname: string;
  load: number;
  status: string;
  locations: Array<{
    country?: {
      id: number;
      name: string;
      code: string;
      city?: {
        name: string;
      };
    };
  }>;
}

interface ServerWithLocation extends Server {
  country: string;
  city?: string;
}

interface FilterState {
  countryId: string | null;
  cityName: string;
  loadRange: string;
  search: string;
}

function OpenVPNContent() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [servers, setServers] = useState<ServerWithLocation[]>([]);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [downloading, setDownloading] = useState<{[key: string]: boolean}>({});
  const [countries, setCountries] = useState<Array<{id: number; name: string}>>([]);
  const [cities, setCities] = useState<Array<{name: string}>>([]);
  const [filters, setFilters] = useState<FilterState>({
    countryId: searchParams.get('country_id'),
    cityName: '',
    loadRange: 'all',
    search: ''
  });

  // Tải danh sách quốc gia
  useEffect(() => {
    const loadCountries = async () => {
      try {
        const response = await fetch('/api/nordvpn/countries');
        const data = await response.json();
        if (data.success) {
          setCountries(data.countries);
        } else {
          setError('Không thể tải danh sách quốc gia');
        }
      } catch (error) {
        setError('Lỗi khi tải danh sách quốc gia');
        console.error(error);
      }
    };

    loadCountries();
  }, []);

  // Tải danh sách thành phố khi chọn quốc gia
  useEffect(() => {
    const loadCities = async () => {
      if (!filters.countryId) {
        setCities([]);
        return;
      }

      try {
        const response = await fetch(`/api/nordvpn/cities?country_id=${filters.countryId}`);
        const data = await response.json();
        if (data.success) {
          setCities(data.cities);
        }
      } catch (error) {
        console.error('Lỗi khi tải danh sách thành phố:', error);
      }
    };

    loadCities();
  }, [filters.countryId]);

  // Tải danh sách máy chủ
  useEffect(() => {
    const loadServers = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          'filters[servers_technologies][identifier]': 'openvpn_udp',
          'limit': '50'
        });

        if (filters.countryId) {
          params.append('filters[country_id]', filters.countryId);
        }

        const response = await fetch(`/api/nordvpn/openvpn?${params.toString()}`);
        const data = await response.json();

        if (data.success) {
          let filteredServers = data.servers.map((server: Server): ServerWithLocation => ({
            ...server,
            country: server.locations[0]?.country?.name || 'Unknown',
            city: server.locations[0]?.country?.city?.name
          }));

          // Lọc theo tải
          if (filters.loadRange !== 'all') {
            filteredServers = filteredServers.filter((server: ServerWithLocation) => {
              switch (filters.loadRange) {
                case 'low': return server.load < 30;
                case 'medium': return server.load >= 30 && server.load < 70;
                case 'high': return server.load >= 70;
                default: return true;
              }
            });
          }

          // Lọc theo tìm kiếm
          if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            filteredServers = filteredServers.filter((server: ServerWithLocation) =>
              server.name.toLowerCase().includes(searchLower) ||
              server.hostname.toLowerCase().includes(searchLower) ||
              server.country.toLowerCase().includes(searchLower)
            );
          }

          setServers(filteredServers);
        } else {
          setError('Không thể tải danh sách máy chủ');
        }
      } catch (error) {
        setError('Lỗi khi tải danh sách máy chủ');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    loadServers();
  }, [filters]);

  // Effect để theo dõi scroll
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const downloadConfig = async (hostname: string, protocol: string) => {
    const key = `${hostname}-${protocol}`;
    setDownloading(prev => ({ ...prev, [key]: true }));
    
    try {
      const response = await fetch('/api/nordvpn/openvpn', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ hostname, protocol }),
      });

      if (!response.ok) {
        throw new Error('Lỗi khi tải file cấu hình');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${hostname}.${protocol}.ovpn`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading config:', error);
      alert('Có lỗi xảy ra khi tải file cấu hình');
    } finally {
      setDownloading(prev => ({ ...prev, [key]: false }));
    }
  };

  const resetFilters = () => {
    setFilters({
      countryId: null,
      cityName: '',
      loadRange: 'all',
      search: ''
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#121827]">
      <Header />
      
      <main className="flex-grow p-3 sm:p-6">
        <div className="container mx-auto">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 sm:mb-6 md:mb-8">
            <span className="text-[#f8b700]">Máy chủ</span> <span className="text-white">OpenVPN</span>
          </h1>

          <div className="bg-[#1f2937] p-4 rounded-lg border border-[#2d3748]">
            {/* Filters */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Bộ lọc</h2>
                <button
                  onClick={resetFilters}
                  className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white bg-[#121827] border border-[#2d3748] rounded-md hover:border-[#f8b700] transition-colors flex items-center space-x-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>Xóa bộ lọc</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Country Filter */}
                <div>
                  <label htmlFor="country" className="block text-sm font-medium text-gray-300 mb-2">
                    Quốc gia
                  </label>
                  <select
                    id="country"
                    value={filters.countryId || ''}
                    onChange={(e) => {
                      setFilters(prev => ({ 
                        ...prev, 
                        countryId: e.target.value || null,
                        cityName: '' // Reset city when country changes
                      }));
                    }}
                    className="w-full bg-[#121827] border border-[#2d3748] text-white rounded-md px-3 py-2"
                  >
                    <option value="">Tất cả quốc gia</option>
                    {countries.map(country => (
                      <option key={country.id} value={country.id}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* City Filter */}
                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-300 mb-2">
                    Thành phố
                  </label>
                  <select
                    id="city"
                    value={filters.cityName}
                    onChange={(e) => setFilters(prev => ({ ...prev, cityName: e.target.value }))}
                    className="w-full bg-[#121827] border border-[#2d3748] text-white rounded-md px-3 py-2"
                    disabled={!filters.countryId || cities.length === 0}
                  >
                    <option value="">Tất cả thành phố</option>
                    {cities.map(city => (
                      <option key={city.name} value={city.name}>
                        {city.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Load Filter */}
                <div>
                  <label htmlFor="load" className="block text-sm font-medium text-gray-300 mb-2">
                    Tải
                  </label>
                  <select
                    id="load"
                    value={filters.loadRange}
                    onChange={(e) => setFilters(prev => ({ ...prev, loadRange: e.target.value }))}
                    className="w-full bg-[#121827] border border-[#2d3748] text-white rounded-md px-3 py-2"
                  >
                    <option value="all">Tất cả</option>
                    <option value="low">Thấp (&lt; 30%)</option>
                    <option value="medium">Trung bình (30-70%)</option>
                    <option value="high">Cao (&gt; 70%)</option>
                  </select>
                </div>

                {/* Search */}
                <div>
                  <label htmlFor="search" className="block text-sm font-medium text-gray-300 mb-2">
                    Tìm kiếm
                  </label>
                  <input
                    type="text"
                    id="search"
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    placeholder="Tìm theo tên, hostname..."
                    className="w-full bg-[#121827] border border-[#2d3748] text-white rounded-md px-3 py-2"
                  />
                </div>
              </div>
            </div>

            {/* Server List */}
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#f8b700]"></div>
              </div>
            ) : error ? (
              <div className="bg-red-900/30 border border-red-500 text-red-300 px-4 py-3 rounded">
                <p>{error}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {servers.map(server => (
                  <div 
                    key={server.id} 
                    className="bg-[#121827] border border-[#2d3748] rounded-lg overflow-hidden hover:border-[#f8b700] transition-colors"
                  >
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-white">{server.name}</h3>
                      </div>
                      
                      <div className="text-sm text-gray-400 space-y-2">
                        <div className="flex items-center">
                          <span className="w-20">Hostname:</span>
                          <span className="text-gray-300 text-xs break-all">{server.hostname}</span>
                        </div>
                        <div className="flex items-center">
                          <span className="w-20">Quốc gia:</span>
                          <span className="text-gray-300">{server.country}</span>
                        </div>
                        {server.city && (
                          <div className="flex items-center">
                            <span className="w-20">Thành phố:</span>
                            <span className="text-gray-300">{server.city}</span>
                          </div>
                        )}
                        
                        {/* Load và Status */}
                        <div className="flex flex-col space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-2xl font-bold text-white">{server.load}%</span>
                            <span className={`text-sm px-3 py-1 rounded-full ${
                              server.status === 'online' 
                                ? 'bg-green-900/30 text-green-400 border border-green-500/30' 
                                : 'bg-red-900/30 text-red-400 border border-red-500/30'
                            }`}>
                              {server.status === 'online' ? 'Online' : 'Offline'}
                            </span>
                          </div>
                          <div className="w-full bg-[#2d3748] rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                server.load < 30 ? 'bg-green-500' : 
                                server.load < 70 ? 'bg-yellow-500' : 
                                'bg-red-500'
                              }`} 
                              style={{ width: `${server.load}%` }}
                            ></div>
                          </div>
                        </div>

                        <div className="flex space-x-2 pt-2">
                          <button
                            onClick={() => downloadConfig(server.hostname, 'tcp')}
                            disabled={downloading[`${server.hostname}-tcp`]}
                            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md ${
                              downloading[`${server.hostname}-tcp`]
                                ? 'bg-gray-600 cursor-not-allowed'
                                : 'bg-[#f8b700] hover:bg-[#f8b700]/90 text-black'
                            }`}
                          >
                            {downloading[`${server.hostname}-tcp`] ? (
                              <span className="flex items-center justify-center">
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Đang tải...
                              </span>
                            ) : 'TCP'}
                          </button>
                          <button
                            onClick={() => downloadConfig(server.hostname, 'udp')}
                            disabled={downloading[`${server.hostname}-udp`]}
                            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md ${
                              downloading[`${server.hostname}-udp`]
                                ? 'bg-gray-600 cursor-not-allowed'
                                : 'bg-[#f8b700] hover:bg-[#f8b700]/90 text-black'
                            }`}
                          >
                            {downloading[`${server.hostname}-udp`] ? (
                              <span className="flex items-center justify-center">
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Đang tải...
                              </span>
                            ) : 'UDP'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />

      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 p-3 bg-[#f8b700] text-black rounded-full shadow-lg hover:bg-[#e5a800] transition-colors"
          aria-label="Scroll to top"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>
      )}
    </div>
  );
}

export default function OpenVPNPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#121827]">
        <div className="text-white text-xl">Đang tải...</div>
      </div>
    }>
      <OpenVPNContent />
    </Suspense>
  );
} 