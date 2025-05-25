import Header from "../components/Header";
import Footer from "../components/Footer";
import { getServers, getCountries } from "../services/api";
import { unstable_noStore as noStore } from 'next/cache';
import Pagination from "../components/Pagination";
import { ServerFilters, ServerList, ServerListSkeleton } from "../components/ServerComponents";
import { Metadata } from "next";
import { Suspense } from "react";
import { cache } from 'react';

// Số lượng servers mỗi trang
const SERVERS_PER_PAGE = 50;

// Cache danh sách countries trong 1 giờ
const getCountriesWithCache = cache(async () => {
  const response = await getCountries();
  return response.success ? response.data || [] : [];
});

export const metadata: Metadata = {
  title: 'Máy chủ VPN | NordVPN API Explorer',
  description: 'Danh sách tất cả các máy chủ VPN của NordVPN, bao gồm thông tin chi tiết và trạng thái hoạt động.',
};

type SearchParamsType = {
  page?: string;
  country?: string;
  sort?: string;
  search?: string;
  load?: string;
};

interface Props {
  searchParams?: Promise<SearchParamsType>;
}

export default async function ServersPage({ searchParams }: Props) {
  // Đảm bảo searchParams là một object và các giá trị là string
  const resolvedParams = await (searchParams || Promise.resolve({} as SearchParamsType));
  const params = {
    page: String(resolvedParams?.page || '1'),
    country: String(resolvedParams?.country || ''),
    sort: String(resolvedParams?.sort || ''),
    search: String(resolvedParams?.search || ''),
    load: String(resolvedParams?.load || '')
  };
  
  try {
    // Lấy danh sách quốc gia từ cache
    const countries = await getCountriesWithCache();
    
    // Tính offset cho phân trang
    const currentPage = parseInt(params.page, 10) || 1;
    const offset = (currentPage - 1) * SERVERS_PER_PAGE;

    // Xử lý tìm kiếm theo quốc gia
    let countryFilter = params.country;
    if (params.search) {
      // Tìm ID quốc gia từ tên tìm kiếm
      const searchText = params.search.toLowerCase();
      const foundCountry = countries.find(country => 
        country.name.toLowerCase().includes(searchText)
      );
      if (foundCountry) {
        countryFilter = foundCountry.id.toString();
      }
    }
    
    // Lấy servers với phân trang và filter
    const response = await getServers({
      page: params.page,
      limit: SERVERS_PER_PAGE,
      offset: offset,
      search: params.search || undefined,
      sort: params.sort,
      filters: countryFilter ? { country: countryFilter } : undefined,
      revalidateSeconds: 60, // Cache trong 1 phút
      fetchAll: false // Chỉ lấy số lượng servers cần thiết
    });

    const { servers = [], total = 0 } = response.success ? response.data || { servers: [], total: 0 } : { servers: [], total: 0 };
    const totalPages = Math.ceil(total / SERVERS_PER_PAGE);

    // Chuẩn bị danh sách quốc gia cho dropdown
    const countryOptions = countries.map(country => ({
      id: country.id.toString(),
      name: country.name
    })).sort((a, b) => a.name.localeCompare(b.name));

    return (
      <div className="min-h-screen flex flex-col bg-[#121827]">
        <Header />
        
        <main className="flex-grow p-3 sm:p-6">
          <div className="container mx-auto">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 sm:mb-6 md:mb-8">
              <span className="text-[#f8b700]">Danh sách</span> <span className="text-white">máy chủ</span>
            </h1>

            <ServerFilters 
              currentSearch={params.search}
              countries={countryOptions}
              currentCountry={params.country}
              currentLoad={params.load}
            />

            <div className="bg-[#1f2937] rounded-lg overflow-hidden border border-[#2d3748]">
              <Suspense fallback={<ServerListSkeleton />}>
                <ServerList 
                  servers={servers}
                  error={response.success ? null : (response.error || null)} 
                  params={params} 
                />
              </Suspense>
            </div>
            
            {totalPages > 1 && (
              <Pagination 
                currentPage={currentPage}
                totalPages={totalPages}
                searchParams={{
                  page: params.page,
                  country: params.country,
                  load: params.load,
                  technology: undefined
                }}
              />
            )}
          </div>
        </main>

        <Footer />
      </div>
    );
  } catch (error) {
    return (
      <div className="min-h-screen flex flex-col bg-[#121827]">
        <Header />
        
        <main className="flex-grow p-3 sm:p-6">
          <div className="container mx-auto">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 sm:mb-6 md:mb-8">
              <span className="text-[#f8b700]">Danh sách</span> <span className="text-white">máy chủ</span>
            </h1>
            
            <div className="bg-[#1f2937] rounded-lg p-4 sm:p-6 md:p-8">
              <p className="text-red-500 text-center">
                Đã xảy ra lỗi khi tải dữ liệu. Vui lòng thử lại sau.
                {process.env.NODE_ENV === 'development' && (
                  <span className="block mt-2 text-xs text-gray-400">
                    {error instanceof Error ? error.message : 'Unknown error'}
                  </span>
                )}
              </p>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    );
  }
} 