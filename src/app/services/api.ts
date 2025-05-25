'use server';

import type { 
  ApiResponse, 
  NordVPNServer, 
  WireGuardCredentials,
  NordVPNCountry
} from '../types';

interface ServerInfo {
  id: number;
  name: string;
  hostname: string;
  country: string;
  city: string;
  load: number;
  publicKey: string;
}

// Định nghĩa các interface cần thiết
interface Location {
  country: {
    name: string;
    id: number;
  };
  city?: {
    name: string;
  };
}

interface ServerParams {
  page?: string;
  limit?: number;
  offset?: number;
  search?: string;
  sort?: string;
  filters?: Record<string, string>;
  noCache?: boolean;
  revalidateSeconds?: number;
  fetchAll?: boolean;
}

const NORD_API_BASE = 'https://api.nordvpn.com/v1';

/**
 * Lấy danh sách quốc gia từ API NordVPN
 */
export async function getCountries(): Promise<ApiResponse<NordVPNCountry[]>> {
  try {
    const cacheOption = { next: { revalidate: 3600 } }; // Cache 1 giờ
    
    // Sử dụng API trực tiếp thay vì qua proxy
    const response = await fetch(`${NORD_API_BASE}/servers/countries`, {
      ...cacheOption,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`API trả về lỗi: ${response.status}`);
    }
    
    const countries = await response.json();
    
    return {
      success: true,
      data: countries,
    };
  } catch (error) {
    console.error('Lỗi khi lấy danh sách quốc gia:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Lỗi không xác định',
    };
  }
}

/**
 * Lấy thông tin xác thực NordVPN
 * @param token Token xác thực người dùng
 */
export async function getCredentials(token: string): Promise<ApiResponse<WireGuardCredentials>> {
  try {
    const options = {
      headers: {
        'Authorization': `token:${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store' as RequestCache,
    };
    
    // Sử dụng API trực tiếp cho xác thực (không qua proxy)
    const response = await fetch(`${NORD_API_BASE}/users/services/credentials`, options);

    if (!response.ok) {
      throw new Error(`API trả về lỗi: ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      data: {
        ...data,
        private_key: data.nordlynx_private_key || data.private_key,
        public_key: data.nordlynx_public_key || data.public_key
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Lỗi không xác định',
    };
  }
}

/**
 * Tìm public key từ metadata của server
 */
function findPublicKey(server: NordVPNServer): string {
  for (const tech of server.technologies) {
    if (tech.identifier === 'wireguard_udp') {
      // Kiểm tra metadata dạng mảng
      if (Array.isArray(tech.metadata)) {
        for (const data of tech.metadata) {
          if (data.name === 'public_key') {
            return data.value;
          }
        }
      }
      // Kiểm tra pivot nếu có
      if (tech.pivot?.public_key) {
        return tech.pivot.public_key;
      }
    }
  }
  return '';
}

/**
 * Lấy danh sách máy chủ NordVPN
 * @param params Tham số tìm kiếm, lọc và phân trang
 */
export async function getServers(params?: ServerParams): Promise<ApiResponse<{ servers: ServerInfo[], total: number }>> {
  try {
    // Tính toán limit và offset cho phân trang
    const limit = params?.limit || 500;
    const page = params?.page ? parseInt(params.page, 10) : 1;
    const offset = (page - 1) * limit;
    
    // Lấy tổng số servers trước
    const countUrl = `${NORD_API_BASE}/servers/count`;
    const countResponse = await fetch(countUrl, {
      next: { revalidate: 60 }, // Cache 1 phút
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
      }
    });

    if (!countResponse.ok) {
      throw new Error(`API trả về lỗi khi lấy tổng số servers: ${countResponse.status}`);
    }

    await countResponse.json();
    
    // Sử dụng API trực tiếp thay vì qua proxy
    let url = `${NORD_API_BASE}/servers?limit=${limit}&offset=${offset}`;
    
    // Thêm filters từ params
    if (params?.filters) {
      Object.entries(params.filters).forEach(([key, value]) => {
        if (value) {
          if (key === 'country') {
            // Luôn sử dụng country_id cho filter
            url += `&filters[country_id]=${encodeURIComponent(String(value))}`;
          } else if (key === 'load') {
            url += `&filters[${key}]=${encodeURIComponent(String(value))}`;
          } else {
            url += `&filters[${key}]=${encodeURIComponent(String(value))}`;
          }
        }
      });
    }

    // Dynamic cache strategy dựa trên nhu cầu
    const cacheOption = params?.noCache 
      ? { cache: 'no-store' as const } 
      : { next: { revalidate: params?.revalidateSeconds || 60 } }; // Cache 1 phút

    const response = await fetch(url, {
      ...cacheOption,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`API trả về lỗi: ${response.status}`);
    }

    const servers = await response.json();
    
    // Tìm kiếm dựa trên text nếu cần
    let filteredServers = [...servers];
    
    // Lọc theo search text nếu có và không phải là tìm theo quốc gia
    if (params?.search && !params?.filters?.country) {
      const searchText = params.search.toLowerCase();
      filteredServers = filteredServers.filter(server => 
        server.name.toLowerCase().includes(searchText) ||
        server.hostname.toLowerCase().includes(searchText) ||
        server.station.toLowerCase().includes(searchText)
      );
    }
    
    // Lọc theo tên quốc gia nếu có và không phải số (ID)
    if (params?.filters?.country && isNaN(Number(params.filters.country))) {
      const countryName = params.filters.country;
      filteredServers = filteredServers.filter(server => 
        server.locations.some((location: Location) => 
          location.country.name === countryName
        )
      );
    }
    
    // Lọc theo % tải nếu có
    if (params?.filters?.load) {
      const loadValue = Number(params.filters.load);
      filteredServers = filteredServers.filter(server => server.load < loadValue);
    }
    
    // Sắp xếp theo tải nếu có
    if (params?.sort) {
      if (params.sort === 'load_asc') {
        filteredServers.sort((a, b) => a.load - b.load);
      } else if (params.sort === 'load_desc') {
        filteredServers.sort((a, b) => b.load - a.load);
      }
    }

    // Chuyển đổi và lọc dữ liệu
    const processedServers: ServerInfo[] = filteredServers
      .filter(server => {
        // Kiểm tra location hợp lệ
        const hasValidLocation = server.locations && server.locations.length > 0;
        if (!hasValidLocation) {
          console.log(`Server ${server.name} không có location`);
        }
        return hasValidLocation;
      })
      .map(server => {
        const location = server.locations[0];
        const country = location?.country?.name || 'Unknown';
        const city = location?.city?.name || '';
        const publicKey = findPublicKey(server);
        
        // Log server không có public key
        if (!publicKey) {
          console.log(`Server ${server.name} không có public key`);
        }
        
        return {
          id: server.id,
          name: server.name,
          hostname: server.station || server.hostname,
          country,
          city,
          load: server.load,
          publicKey
        };
      })
      .filter(server => server.publicKey);

    // Log kết quả cuối cùng
    console.log(`Số server sau khi lọc: ${processedServers.length}`);

    return {
      success: true,
      data: {
        servers: processedServers,
        total: processedServers.length
      }
    };
  } catch (error) {
    console.error('Lỗi khi lấy danh sách máy chủ:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Lỗi không xác định',
    };
  }
}

/**
 * Lấy danh sách máy chủ SOCKS
 */
export async function getSocksServers(params?: Omit<ServerParams, 'filters'>): Promise<ApiResponse<{ servers: NordVPNServer[], total: number }>> {
  // Sử dụng API đúng cho máy chủ SOCKS
  const url = `${NORD_API_BASE}/servers?limit=${params?.limit || 500}&filters[servers_technologies][identifier]=socks`;
  
  try {
    // Dynamic cache strategy dựa trên nhu cầu
    const cacheOption = params?.noCache 
      ? { cache: 'no-store' as const } 
      : { next: { revalidate: params?.revalidateSeconds || 3600 } };

    const response = await fetch(url, {
      ...cacheOption,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`API trả về lỗi: ${response.status}`);
    }

    const servers = await response.json();
    
    // Xử lý tìm kiếm và sắp xếp tương tự như getServers
    let filteredServers = [...servers];
    
    // Lọc theo text tìm kiếm
    if (params?.search) {
      const searchLower = params.search.toLowerCase();
      filteredServers = filteredServers.filter(server =>
        server.locations.some((location: Location) =>
          location.country.name.toLowerCase().includes(searchLower)
        ) || 
        server.name.toLowerCase().includes(searchLower) ||
        (server.locations[0]?.city?.name && 
          server.locations[0].city.name.toLowerCase().includes(searchLower))
      );
    }
    
    // Sắp xếp servers nếu cần
    if (params?.sort) {
      if (params.sort === 'load_asc') {
        filteredServers.sort((a, b) => a.load - b.load);
      } else if (params.sort === 'load_desc') {
        filteredServers.sort((a, b) => b.load - a.load);
      }
    }
    
    // Tổng số servers (cho phân trang)
    const total = filteredServers.length;
    
    return {
      success: true,
      data: {
        servers: params?.fetchAll ? filteredServers : filteredServers.slice(0, params?.limit || 500),
        total
      },
    };
  } catch (error) {
    console.error('Lỗi khi lấy danh sách máy chủ SOCKS:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Lỗi không xác định',
    };
  }
}

/**
 * Lấy danh sách máy chủ WireGuard
 */
export async function getWireguardServers(params?: Omit<ServerParams, 'filters'>): Promise<ApiResponse<{ servers: ServerInfo[], total: number }>> {
  return getServers({
    ...params, 
    filters: { 'servers_technologies][identifier': 'wireguard_udp' }
  });
} 