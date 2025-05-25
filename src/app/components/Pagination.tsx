'use client';

import Link from 'next/link';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  searchParams: {
    page?: string;
    country?: string;
    technology?: string;
    load?: string;
  };
}

export default function Pagination({ currentPage, totalPages, searchParams }: PaginationProps) {
  // Tạo mảng các số trang để hiển thị
  const pageNumbers = [];
  
  // Tính toán các trang cần hiển thị
  const maxPagesToShow = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
  const endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
  
  // Điều chỉnh lại startPage nếu endPage đã đạt giới hạn
  startPage = Math.max(1, endPage - maxPagesToShow + 1);
  
  // Tạo mảng các số trang
  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }

  // Hàm tạo URL cho từng trang
  const createPageUrl = (page: number) => {
    const params = new URLSearchParams();
    
    if (page > 1) {
      params.set('page', page.toString());
    }
    
    if (searchParams.country) {
      params.set('country', searchParams.country);
    }
    
    if (searchParams.technology) {
      params.set('technology', searchParams.technology);
    }
    
    if (searchParams.load) {
      params.set('load', searchParams.load);
    }
    
    const queryString = params.toString();
    return queryString ? `?${queryString}` : '';
  };

  return (
    <div className="flex justify-center mt-6">
      <nav className="flex items-center space-x-1">
        {/* Previous button */}
        {currentPage > 1 && (
          <Link
            href={createPageUrl(currentPage - 1)}
            className="px-3 py-2 rounded-md text-sm font-medium bg-[#1f2937] text-white hover:bg-[#2d3748] transition-colors"
          >
            &laquo;
          </Link>
        )}
        
        {/* First page if not in view */}
        {startPage > 1 && (
          <>
            <Link
              href={createPageUrl(1)}
              className="px-3 py-2 rounded-md text-sm font-medium bg-[#1f2937] text-white hover:bg-[#2d3748] transition-colors"
            >
              1
            </Link>
            {startPage > 2 && (
              <span className="px-3 py-2 text-gray-500">...</span>
            )}
          </>
        )}
        
        {/* Page numbers */}
        {pageNumbers.map(number => (
          <Link
            key={number}
            href={createPageUrl(number)}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              number === currentPage
                ? 'bg-[#f8b700] text-black'
                : 'bg-[#1f2937] text-white hover:bg-[#2d3748]'
            }`}
          >
            {number}
          </Link>
        ))}
        
        {/* Last page if not in view */}
        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && (
              <span className="px-3 py-2 text-gray-500">...</span>
            )}
            <Link
              href={createPageUrl(totalPages)}
              className="px-3 py-2 rounded-md text-sm font-medium bg-[#1f2937] text-white hover:bg-[#2d3748] transition-colors"
            >
              {totalPages}
            </Link>
          </>
        )}
        
        {/* Next button */}
        {currentPage < totalPages && (
          <Link
            href={createPageUrl(currentPage + 1)}
            className="px-3 py-2 rounded-md text-sm font-medium bg-[#1f2937] text-white hover:bg-[#2d3748] transition-colors"
          >
            &raquo;
          </Link>
        )}
      </nav>
    </div>
  );
} 