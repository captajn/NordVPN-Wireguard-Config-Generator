'use client';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange
}: PaginationProps) {
  const goToPage = (page: number) => {
    if (page < 1) page = 1;
    if (page > totalPages) page = totalPages;
    onPageChange(page);
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  if (totalPages <= 1) return null;

  return (
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
  );
} 