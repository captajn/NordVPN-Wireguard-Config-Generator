'use client';

import { memo } from 'react';
import type { NordVPNServer, NordVPNTechnology } from '../types';

interface ServerListProps {
  servers: NordVPNServer[];
  params: {
    page: string;
    country: string;
    sort: string;
    search: string;
  };
  error: string | null;
}

// Dùng React.memo để tránh re-renders không cần thiết
const ServerList = memo(function ServerList({ servers, params, error }: ServerListProps) {
  if (error) {
    return (
      <div className="p-4 sm:p-6 md:p-8 text-center text-white">
        <p className="text-red-500">Lỗi: {error}</p>
      </div>
    );
  }

  if (!servers || servers.length === 0) {
    return (
      <div className="p-4 sm:p-6 md:p-8 text-center text-white">
        <p>Không có máy chủ nào.</p>
      </div>
    );
  }

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
                  <a
                    href={`/servers?${new URLSearchParams({ ...params, sort: 'load_asc' })}`}
                    className="hover:text-[#f8b700]"
                  >
                    ▲
                  </a>
                  <a
                    href={`/servers?${new URLSearchParams({ ...params, sort: 'load_desc' })}`}
                    className="hover:text-[#f8b700]"
                  >
                    ▼
                  </a>
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
          {servers.map((server: NordVPNServer) => (
            <ServerRow key={server.id} server={server} />
          ))}
        </tbody>
      </table>
    </div>
  );
});

// Tách từng row thành component riêng để tối ưu rendering
const ServerRow = memo(function ServerRow({ server }: { server: NordVPNServer }) {
  return (
    <tr className="hover:bg-[#2d3748]">
      <td className="py-2 px-2 sm:py-3 sm:px-4 md:px-6 whitespace-nowrap text-white hover:text-[#f8b700] transition-colors text-xs sm:text-sm md:text-base">
        {server.name}
      </td>
      <td className="py-2 px-2 sm:py-3 sm:px-4 md:px-6 whitespace-nowrap text-white hover:text-[#f8b700] transition-colors text-xs sm:text-sm md:text-base">
        {server.locations[0]?.country.name || 'N/A'}
      </td>
      <td className="py-2 px-2 sm:py-3 sm:px-4 md:px-6 whitespace-nowrap">
        <LoadIndicator load={server.load} />
      </td>
      <td className="hidden sm:table-cell py-2 px-2 sm:py-3 sm:px-4 md:px-6 whitespace-nowrap text-white hover:text-[#f8b700] transition-colors text-xs sm:text-sm md:text-base">
        {server.station || 'N/A'}
      </td>
      <td className="py-2 px-2 sm:py-3 sm:px-4 md:px-6 whitespace-normal">
        <TechBadges technologies={server.technologies} />
      </td>
    </tr>
  );
});

// Component hiển thị thanh tải
const LoadIndicator = memo(function LoadIndicator({ load }: { load: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
        <div 
          className={`h-full ${
            load < 30 ? 'bg-green-500' : 
            load < 70 ? 'bg-yellow-500' : 
            'bg-red-500'
          }`}
          style={{ width: `${load}%` }}
        ></div>
      </div>
      <span className="text-white text-xs sm:text-sm md:text-base whitespace-nowrap">{load}%</span>
    </div>
  );
});

// Component hiển thị các badge công nghệ
const TechBadges = memo(function TechBadges({ technologies }: { technologies: NordVPNServer['technologies'] }) {
  return (
    <div className="flex gap-1 flex-wrap">
      {technologies.map((tech: NordVPNTechnology) => (
        <span 
          key={tech.id}
          className="bg-[#121827] px-1 py-0.5 sm:px-1.5 sm:py-0.5 md:px-2 md:py-1 rounded text-[8px] sm:text-[10px] md:text-xs text-[#f8b700] border border-[#2d3748] hover:bg-[#2d3748] transition-colors"
        >
          {tech.identifier}
        </span>
      ))}
    </div>
  );
});

export default ServerList; 