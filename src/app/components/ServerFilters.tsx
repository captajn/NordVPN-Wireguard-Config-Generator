'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useTransition } from 'react';
import debounce from 'lodash/debounce';

interface Country {
  id: number;
  name: string;
  code: string;
}

interface ServerFiltersProps {
  selectedCountry: string;
  selectedCountryId: number | null;
  selectedCity: string;
  cities: string[];
  countries: Country[];
  searchQuery: string;
  showCountrySuggestions: boolean;
  countrySuggestions: Country[];
  onCountryChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onCityChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectSuggestedCountry: (country: Country) => void;
  onResetFilters: () => void;
  setShowCountrySuggestions: (show: boolean) => void;
}

export default function ServerFilters({
  selectedCountry,
  selectedCountryId,
  selectedCity,
  cities,
  countries,
  searchQuery,
  showCountrySuggestions,
  countrySuggestions,
  onCountryChange,
  onCityChange,
  onSearchChange,
  onSelectSuggestedCountry,
  onResetFilters,
  setShowCountrySuggestions
}: ServerFiltersProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionListRef = useRef<HTMLDivElement>(null);

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
  }, [setShowCountrySuggestions]);

  return (
    <div className="flex flex-wrap gap-2">
      <div className="w-full sm:w-48">
        <select
          className="w-full px-3 py-2 bg-[#121827] border border-[#2d3748] rounded-md text-white focus:border-[#f8b700]"
          value={selectedCountryId || ''}
          onChange={(e) => {
            onCountryChange(e);
            setShowCountrySuggestions(true);
          }}
        >
          <option value="">Tất cả quốc gia</option>
          {countries.map(country => (
            <option 
              key={`country-${country.id}`} 
              value={country.id}
            >
              {country.name} ({country.code})
            </option>
          ))}
        </select>
      </div>
      
      {selectedCountry && cities.length > 0 && (
        <div className="w-full sm:w-48">
          <select
            className="w-full px-3 py-2 bg-[#121827] border border-[#2d3748] rounded-md text-white focus:border-[#f8b700]"
            value={selectedCity}
            onChange={(e) => {
              onCityChange(e);
              setShowCountrySuggestions(true);
            }}
          >
            <option value="">Tất cả thành phố</option>
            {cities.map(city => (
              <option key={`city-${city}`} value={city}>{city}</option>
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
            onSearchChange(e);
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
                  key={`suggestion-${country.id}`}
                  className="block px-4 py-3 hover:bg-[#f8b700] hover:text-black cursor-pointer text-white transition-colors"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onSelectSuggestedCountry(country);
                  }}
                  onMouseDown={(e) => {
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
            onClick={onResetFilters}
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
  );
} 