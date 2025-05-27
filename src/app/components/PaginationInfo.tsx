interface PaginationInfoProps {
  currentPage: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
  totalItems: number;
  className?: string;
}

export default function PaginationInfo({
  currentPage,
  totalPages,
  startIndex,
  endIndex,
  totalItems,
  className = '',
}: PaginationInfoProps) {
  return (
    <div className={`text-sm text-gray-400 ${className}`}>
      {totalItems === 0 ? (
        <span>Không có kết quả nào</span>
      ) : (
        <span>
          Hiển thị {startIndex + 1}-{endIndex + 1} trong số {totalItems} kết quả
          {totalPages > 1 && ` • Trang ${currentPage} / ${totalPages}`}
        </span>
      )}
    </div>
  );
} 