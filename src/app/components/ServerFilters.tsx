'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import debounce from 'lodash/debounce';

interface CountryOption {
  id: string;
  name: string;
}

interface ServerFiltersProps {
  currentSearch: string;
  countries: CountryOption[];
  currentCountry: string;
}

export default function ServerFilters({ currentSearch, countries, currentCountry }: ServerFiltersProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [searchValue, setSearchValue] = useState(currentSearch);
  
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
      url.searchParams.set('country', value);
    } else {
      url.searchParams.delete('country');
    }
    // Xóa trang khi thay đổi quốc gia
    url.searchParams.delete('page');
    startTransition(() => {
      router.push(url.toString());
    });
  }, [router, startTransition]);

  return (
    <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row gap-2 sm:gap-4">
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

      <div className="flex-1 relative">
        <input
          type="text"
          placeholder="Tìm kiếm theo tên, quốc gia hoặc thành phố..."
          value={searchValue}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="w-full sm:w-64 px-3 sm:px-4 py-2 bg-[#1f2937] text-white rounded-md border border-[#2d3748] focus:outline-none focus:border-[#f8b700] text-sm"
        />
        {isPending && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-[#f8b700] border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>
    </div>
  );
} 