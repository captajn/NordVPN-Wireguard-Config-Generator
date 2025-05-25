export default function ServerListSkeleton() {
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
            <th scope="col" className="py-2 px-2 sm:py-3 sm:px-4 md:px-6 text-left text-[10px] sm:text-xs font-medium text-[#f8b700] uppercase tracking-wider">
              Công nghệ
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
              <td className="py-2 px-2 sm:py-3 sm:px-4 md:px-6 whitespace-normal">
                <div className="flex gap-1 flex-wrap">
                  <div className="h-5 bg-gray-700 rounded animate-pulse w-10"></div>
                  <div className="h-5 bg-gray-700 rounded animate-pulse w-10"></div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 