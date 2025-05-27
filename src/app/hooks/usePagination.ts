import { useState, useCallback } from 'react';

interface UsePaginationProps {
  initialPage?: number;
  itemsPerPage?: number;
  totalItems: number;
}

interface UsePaginationReturn {
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  startIndex: number;
  endIndex: number;
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  currentItems: number;
}

export default function usePagination({
  initialPage = 1,
  itemsPerPage = 10,
  totalItems,
}: UsePaginationProps): UsePaginationReturn {
  const [currentPage, setCurrentPage] = useState(initialPage);
  
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  
  // Đảm bảo currentPage không vượt quá totalPages
  if (currentPage > totalPages) {
    setCurrentPage(totalPages);
  }

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage - 1, totalItems - 1);
  const currentItems = endIndex - startIndex + 1;

  const goToPage = useCallback((page: number) => {
    const validPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(validPage);
  }, [totalPages]);

  const nextPage = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  }, [currentPage, totalPages]);

  const previousPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  }, [currentPage]);

  return {
    currentPage,
    totalPages,
    itemsPerPage,
    startIndex,
    endIndex,
    goToPage,
    nextPage,
    previousPage,
    currentItems,
  };
} 