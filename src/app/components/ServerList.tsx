'use client';

import React from 'react';

interface ServerInfo {
  id: number;
  name: string;
  hostname: string;
  country: string;
  city?: string;
  load: number;
  publicKey?: string;  // Optional for SOCKS servers
  status?: string;
  technologies?: {
    id: number;
    name: string;
    identifier: string;
    pivot?: {
      status: string;
    }
  }[];
  location?: {  // Optional for WireGuard servers
    lat: number;
    long: number;
  };
}

interface ServerListProps {
  servers: ServerInfo[];
  loading: boolean;
  error: string | null;
  renderServer: (server: ServerInfo, utils: ServerUtils) => React.ReactNode;
}

export interface ServerUtils {
  getLoadColor: (load: number) => string;
}

const ServerList: React.FC<ServerListProps> = ({
  servers,
  loading,
  error,
  renderServer
}) => {
  const utils: ServerUtils = {
    getLoadColor: (load: number) => {
      if (load <= 30) return 'text-green-400';
      if (load <= 70) return 'text-yellow-400';
      return 'text-red-400';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#f8b700]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg">
        <p>{error}</p>
      </div>
    );
  }

  if (!servers || servers.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p>Không tìm thấy máy chủ nào phù hợp với bộ lọc.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {servers.map(server => (
        <div key={server.id}>
          {renderServer(server, utils)}
        </div>
      ))}
    </div>
  );
};

export default ServerList; 