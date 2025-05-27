import { useState, useEffect, useCallback } from 'react';

interface ServerLocation {
  country?: {
    id: number;
    name: string;
    code: string;
    city?: {
      id: number;
      name: string;
      latitude: number;
      longitude: number;
    };
  };
}

interface Technology {
  id: number;
  name: string;
  identifier: string;
  metadata?: Array<{
    name: string;
    value: string;
  }>;
  pivot?: {
    status: string;
  };
}

interface Server {
  id: number;
  name: string;
  hostname: string;
  load: number;
  status: string;
  locations: ServerLocation[];
  technologies: Technology[];
}

interface UseServersOptions {
  technology?: string;
  countryId?: number | null;
  city?: string;
  searchQuery?: string;
}

export default function useServers({
  technology,
  countryId,
  city,
  searchQuery
}: UseServersOptions = {}) {
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cities, setCities] = useState<string[]>([]);

  // Hàm lấy tên thành phố từ server
  const getServerCity = (server: Server): string => {
    if (server.locations && server.locations.length > 0) {
      const location = server.locations[0];
      if (location.country?.city) {
        return location.country.city.name;
      }
    }
    return '';
  };

  // Hàm lấy tên quốc gia từ server
  const getServerCountry = (server: Server): string => {
    if (server.locations && server.locations.length > 0) {
      const location = server.locations[0];
      if (location.country) {
        return location.country.name;
      }
    }
    return '';
  };

  // Hàm tải danh sách server
  const fetchServers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      
      if (technology) {
        params.append('technology', technology);
      }
      
      if (countryId) {
        params.append('country_id', countryId.toString());
      }

      const response = await fetch(`/api/nordvpn/servers?${params.toString()}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Không thể tải danh sách máy chủ');
      }

      let filteredServers = data.servers;

      // Lọc theo thành phố nếu có
      if (city) {
        filteredServers = filteredServers.filter((server: Server) => 
          getServerCity(server).toLowerCase() === city.toLowerCase()
        );
      }

      // Lọc theo từ khóa tìm kiếm
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filteredServers = filteredServers.filter((server: Server) =>
          server.name.toLowerCase().includes(query) ||
          server.hostname.toLowerCase().includes(query) ||
          getServerCountry(server).toLowerCase().includes(query) ||
          getServerCity(server).toLowerCase().includes(query)
        );
      }

      setServers(filteredServers);

      // Cập nhật danh sách thành phố nếu có country_id
      if (countryId) {
        const cities = filteredServers
          .map((server: Server) => getServerCity(server))
          .filter((city: string) => city !== '');
        const citiesInCountry = [...new Set(cities)].sort() as string[];
        setCities(citiesInCountry);
      } else {
        setCities([]);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi không xác định');
    } finally {
      setLoading(false);
    }
  }, [technology, countryId, city, searchQuery]);

  // Gọi API khi các dependencies thay đổi
  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  return {
    servers,
    loading,
    error,
    cities,
    getServerCity,
    getServerCountry,
    refetch: fetchServers
  };
} 