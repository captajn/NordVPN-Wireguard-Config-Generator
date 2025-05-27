'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import debounce from 'lodash/debounce';
import type { ServerInfo } from '../types';

// Định nghĩa kiểu dữ liệu cho các component

// ===== SERVER FILTERS COMPONENT =====
interface CountryOption {
  id: string;
  name: string;
}

interface ServerFiltersProps {
  currentSearch: string;
  countries: CountryOption[];
  currentCountry: string;
  currentLoad?: string;
}

export function ServerFilters({ currentSearch, countries, currentCountry, currentLoad }: ServerFiltersProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [searchValue, setSearchValue] = useState(currentSearch);
  
  // Tìm tên quốc gia từ ID
  const getCountryNameById = useCallback((id: string) => {
    const country = countries.find(c => c.id === id);
    return country ? country.name : '';
  }, [countries]);
  
  const debouncedSearchRef = useRef(
    debounce((value: string) => {
      const url = new URL(window.location.href);
      if (value) {
        url.searchParams.set('search', value);
      } else {
        url.searchParams.delete('search');
      }
      startTransition(() => {
        router.push(url.toString());
      });
    }, 300)
  );

  // Cập nhật debounce function khi router hoặc startTransition thay đổi
  useEffect(() => {
    debouncedSearchRef.current = debounce((value: string) => {
      const url = new URL(window.location.href);
      if (value) {
        url.searchParams.set('search', value);
      } else {
        url.searchParams.delete('search');
      }
      startTransition(() => {
        router.push(url.toString());
      });
    }, 300);
    
    // Cleanup
    return () => {
      debouncedSearchRef.current.cancel();
    };
  }, [router, startTransition]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchValue(value);
    debouncedSearchRef.current(value);
  }, []);

  const handleCountryChange = useCallback((value: string) => {
    const url = new URL(window.location.href);
    if (value) {
      const selectedCountry = countries.find(c => c.id === value);
      if (selectedCountry) {
        // Lưu cả id và name của quốc gia
        url.searchParams.set('country', value);
        url.searchParams.set('country_name', encodeURIComponent(selectedCountry.name));
      } else {
        url.searchParams.set('country', value);
      }
    } else {
      url.searchParams.delete('country');
      url.searchParams.delete('country_name');
    }
    
    // Giữ nguyên tham số load nếu đã có
    if (currentLoad) {
      url.searchParams.set('load', currentLoad);
    }
    
    startTransition(() => {
      router.push(url.toString());
    });
  }, [router, startTransition, currentLoad, countries]);

  // Xử lý khi thay đổi checkbox tải
  const handleLoadChange = useCallback((checked: boolean) => {
    const url = new URL(window.location.href);
    if (checked) {
      url.searchParams.set('load', '30');
    } else {
      url.searchParams.delete('load');
    }
    // Giữ nguyên tham số country nếu đã có
    if (currentCountry) {
      url.searchParams.set('country', currentCountry);
      
      // Giữ lại country_name nếu đã có
      const countryName = getCountryNameById(currentCountry);
      if (countryName) {
        url.searchParams.set('country_name', encodeURIComponent(countryName));
      }
    }
    startTransition(() => {
      router.push(url.toString());
    });
  }, [router, startTransition, currentCountry, getCountryNameById]);

  return (
    <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row gap-2 sm:gap-4 items-center">
      <select
        value={currentCountry}
        onChange={(e) => handleCountryChange(e.target.value)}
        className="w-full sm:w-48 px-3 sm:px-4 py-2 bg-[#1f2937] text-white rounded-md border border-[#2d3748] focus:outline-none focus:border-[#f8b700] text-sm"
      >
        <option value="">Tất cả quốc gia</option>
        {countries.map(country => (
          <option key={country.id} value={country.id}>{country.name}</option>
        ))}
      </select>

      <div className="flex items-center gap-3">
        <div className="relative w-full sm:w-48">
          <input
            type="text"
            placeholder="Tìm kiếm..."
            value={searchValue}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full px-3 sm:px-4 py-2 bg-[#1f2937] text-white rounded-md border border-[#2d3748] focus:outline-none focus:border-[#f8b700] text-sm"
          />
          {isPending && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-[#f8b700] border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
        </div>
        
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <div className="relative">
            <input
              type="checkbox"
              checked={currentLoad === '30'}
              onChange={(e) => handleLoadChange(e.target.checked)}
              className="sr-only"
            />
            <div className={`w-4 h-4 border rounded ${
              currentLoad === '30' ? 'bg-green-600 border-green-600' : 'bg-[#1f2937] border-[#2d3748]'
            } transition-colors duration-200`}>
              {currentLoad === '30' && (
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                </svg>
              )}
            </div>
          </div>
          <span className="text-sm text-white">Tải dưới 30% 🟢</span>
        </label>
      </div>
    </div>
  );
}

// ===== SERVER LIST SKELETON COMPONENT =====
export function ServerListSkeleton() {
  // Tạo mảng giả có 5 phần tử để hiển thị skeleton
  const skeletonRows = Array(5).fill(0);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-[#2d3748]">
        <thead className="bg-[#121827]">
          <tr>
            <th scope="col" className="py-2 px-2 sm:py-3 sm:px-4 md:px-6 text-left text-[10px] sm:text-xs font-medium text-[#f8b700] uppercase tracking-wider">
              Tên
            </th>
            <th scope="col" className="py-2 px-2 sm:py-3 sm:px-4 md:px-6 text-left text-[10px] sm:text-xs font-medium text-[#f8b700] uppercase tracking-wider">
              Quốc gia
            </th>
            <th scope="col" className="py-2 px-2 sm:py-3 sm:px-4 md:px-6 text-left text-[10px] sm:text-xs font-medium text-[#f8b700] uppercase tracking-wider">
              <div className="flex items-center gap-2">
                <span>Tải</span>
                <div className="flex flex-col">
                  <span className="text-gray-500">▲</span>
                  <span className="text-gray-500">▼</span>
                </div>
              </div>
            </th>
            <th scope="col" className="hidden sm:table-cell py-2 px-2 sm:py-3 sm:px-4 md:px-6 text-left text-[10px] sm:text-xs font-medium text-[#f8b700] uppercase tracking-wider">
              IP
            </th>
          </tr>
        </thead>
        <tbody className="bg-[#1f2937] divide-y divide-[#2d3748]">
          {skeletonRows.map((_, index) => (
            <tr key={index} className="hover:bg-[#2d3748]">
              <td className="py-2 px-2 sm:py-3 sm:px-4 md:px-6 whitespace-nowrap">
                <div className="h-5 bg-gray-700 rounded animate-pulse w-24"></div>
              </td>
              <td className="py-2 px-2 sm:py-3 sm:px-4 md:px-6 whitespace-nowrap">
                <div className="h-5 bg-gray-700 rounded animate-pulse w-20"></div>
              </td>
              <td className="py-2 px-2 sm:py-3 sm:px-4 md:px-6 whitespace-nowrap">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden animate-pulse">
                    <div className="h-full" style={{ width: '0%' }}></div>
                  </div>
                  <div className="h-5 bg-gray-700 rounded animate-pulse w-8"></div>
                </div>
              </td>
              <td className="hidden sm:table-cell py-2 px-2 sm:py-3 sm:px-4 md:px-6 whitespace-nowrap">
                <div className="h-5 bg-gray-700 rounded animate-pulse w-16"></div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ===== SERVER LIST COMPONENT =====
interface ServerListProps {
  servers: ServerInfo[];
  error: string | null;
}

function ServerList({ servers, error }: ServerListProps) {
  if (error) {
    return (
      <div className="p-4 sm:p-6 md:p-8">
        <p className="text-red-500 text-center">{error}</p>
      </div>
    );
  }

  if (!servers || servers.length === 0) {
    return (
      <div className="p-4 sm:p-6 md:p-8">
        <p className="text-gray-400 text-center">Không tìm thấy máy chủ nào.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-[#2d3748]">
        <thead>
          <tr className="bg-[#1a1f2e]">
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
              Máy chủ
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
              Vị trí
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
              Tải
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
              Trạng thái
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
              Công nghệ hỗ trợ
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#2d3748]">
          {servers.map((server) => (
            <tr key={server.id} className="hover:bg-[#1a1f2e]">
              <td className="px-4 py-3 whitespace-nowrap">
                <div>
                  <div className="text-sm font-medium text-white">{server.name}</div>
                  <div className="text-xs text-gray-400 font-mono">{server.hostname}</div>
                </div>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="text-sm text-white">
                  {server.city ? `${server.city}, ${server.country}` : server.country}
                </div>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  server.load < 30 ? 'bg-green-500/10 text-green-400' :
                  server.load < 70 ? 'bg-yellow-500/10 text-yellow-400' :
                  'bg-red-500/10 text-red-400'
                }`}>
                  {server.load}%
                </span>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  server.status === 'online' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                }`}>
                  {server.status === 'online' ? 'Online' : 'Offline'}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {server.technologies.map((tech) => (
                    <span 
                      key={tech.identifier}
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                        ${tech.status === 'online' ? 'bg-blue-500/10 text-blue-400' : 'bg-gray-500/10 text-gray-400'}
                      `}
                    >
                      {tech.name}
                    </span>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export { ServerList }; 