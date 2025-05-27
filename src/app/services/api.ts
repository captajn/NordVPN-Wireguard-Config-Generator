'use server';

import type { 
  ApiResponse, 
  NordVPNServer, 
  WireGuardCredentials,
  NordVPNCountry,
  ServerInfo,
  NordVPNLocation
} from '../../types';

interface NordVPNServerResponse {
  id: number;
  name: string;
  hostname: string;
  load: number;
  status: string;
  country: string;
  city?: string;
  locations?: NordVPNLocation[];
  technologies: Array<{
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
  }>;
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
        // Bỏ log không cần thiết
        return hasValidLocation;
      })
      .map(server => {
        const location = server.locations[0];
        const country = location?.country?.name || 'Unknown';
        const city = location?.city?.name || '';
        
        // Định nghĩa kiểu cho technology
        type Tech = {
          identifier: string;
          pivot?: {
            status?: string;
          };
        };
        
        return {
          id: server.id,
          name: server.name,
          hostname: server.station || server.hostname,
          country,
          city,
          load: server.load,
          status: (server.status === 'online' ? 'online' : 'offline') as 'online' | 'offline',
          technologies: [
            {
              identifier: 'openvpn_udp',
              name: 'OpenVPN UDP',
              status: server.technologies.find((t: Tech) => t.identifier === 'openvpn_udp')?.pivot?.status === 'online' ? 'online' as const : 'offline' as const
            },
            {
              identifier: 'openvpn_tcp',
              name: 'OpenVPN TCP',
              status: server.technologies.find((t: Tech) => t.identifier === 'openvpn_tcp')?.pivot?.status === 'online' ? 'online' as const : 'offline' as const
            },
            {
              identifier: 'wireguard',
              name: 'WireGuard',
              status: server.technologies.find((t: Tech) => t.identifier === 'wireguard_udp')?.pivot?.status === 'online' ? 'online' as const : 'offline' as const
            }
          ]
        };
      })
      .filter(server => server.technologies.some(tech => tech.identifier === 'wireguard' && tech.status === 'online'));

    // Log tối thiểu cho mục đích debug
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
export async function getSocksServers(params?: Omit<ServerParams, 'filters'> & { token?: string, countryId?: string }): Promise<ApiResponse<{ servers: NordVPNServer[], total: number }>> {
  // Xây dựng URL với API servers và bộ lọc theo yêu cầu
  let url = `${NORD_API_BASE}/servers?filters[servers.status]=online&filters[servers_technologies][identifier]=socks&filters[servers_technologies][pivot][status]=online&limit=${params?.limit || 1000}`;
  
  // Thêm lọc theo quốc gia nếu có
  if (params?.countryId) {
    url += `&filters[country_id]=${params.countryId}`;
  }
  
  try {
    // Dynamic cache strategy dựa trên nhu cầu
    const cacheOption = params?.noCache 
      ? { cache: 'no-store' as const } 
      : { next: { revalidate: params?.revalidateSeconds || 3600 } };

    // Tạo headers với token xác thực nếu có
    const headers: HeadersInit = {
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
    };

    // Thêm token vào header nếu có
    if (params?.token) {
      const basicAuthToken = Buffer.from(`token:${params.token}`).toString('base64');
      headers['Authorization'] = `Basic ${basicAuthToken}`;
    }

    const response = await fetch(url, {
      ...cacheOption,
      headers
    });

    if (!response.ok) {
      throw new Error(`API trả về lỗi: ${response.status}`);
    }

    const servers = await response.json();
    
    // Bảo đảm dữ liệu có kiểu NordVPNServer
    let filteredServers = [...servers].map(server => {
      // Đảm bảo trường station được giữ lại
      return {
        ...server,
        // Thêm các trường mặc định nếu cần
        ips: server.ips || {}
      } as NordVPNServer;
    });
    
    // Lọc theo text tìm kiếm
    if (params?.search) {
      const searchLower = params.search.toLowerCase();
      filteredServers = filteredServers.filter(server =>
        server.locations.some((location: Location) =>
          location.country.name.toLowerCase().includes(searchLower)
        ) || 
        server.name.toLowerCase().includes(searchLower) ||
        (server.locations[0]?.country?.city?.name && 
          server.locations[0].country.city.name.toLowerCase().includes(searchLower))
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

/**
 * Lấy danh sách máy chủ OpenVPN
 */
export async function getOpenVPNServers(params?: Omit<ServerParams, 'filters'>): Promise<ApiResponse<{ servers: ServerInfo[], total: number }>> {
  return getServers({
    ...params, 
    filters: { 'servers_technologies][identifier': 'openvpn_udp' }
  });
}

/**
 * Lấy danh sách máy chủ được đề xuất từ API NordVPN
 * @param params Tham số tìm kiếm và lọc
 */
export async function getRecommendedServers({ countryId, noCache = false }: { countryId?: string; noCache?: boolean }): Promise<ServerInfo[]> {
  try {
    const params = new URLSearchParams();
    params.append('limit', '100');
    if (countryId) {
      params.append('filters[country_id]', countryId);
    }

    const headers: HeadersInit = {
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      'Origin': 'https://nordvpn.com',
      'Referer': 'https://nordvpn.com/',
      'sec-ch-ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin'
    };

    if (noCache) {
      headers['Cache-Control'] = 'no-cache';
      headers['Pragma'] = 'no-cache';
    }

    const response = await fetch(`https://api.nordvpn.com/v1/servers/recommendations?${params.toString()}`, {
      headers,
      cache: noCache ? 'no-store' : 'default'
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // Chuyển đổi dữ liệu từ API sang định dạng ServerInfo
    const servers = (data as NordVPNServerResponse[]).map((server): ServerInfo => ({
      id: server.id,
      name: server.name,
      hostname: server.hostname,
      load: server.load,
      status: server.status === 'online' ? 'online' : 'offline',
      country: server.country,
      city: server.city || '',
      locations: server.locations || [],
      technologies: [
        {
          identifier: 'openvpn_udp',
          name: 'OpenVPN UDP',
          status: server.technologies.find(t => t.identifier === 'openvpn_udp')?.pivot?.status === 'online' ? 'online' : 'offline'
        },
        {
          identifier: 'openvpn_tcp',
          name: 'OpenVPN TCP',
          status: server.technologies.find(t => t.identifier === 'openvpn_tcp')?.pivot?.status === 'online' ? 'online' : 'offline'
        },
        {
          identifier: 'wireguard',
          name: 'WireGuard',
          status: server.technologies.find(t => t.identifier === 'wireguard_udp')?.pivot?.status === 'online' ? 'online' : 'offline'
        }
      ]
    }));
    
    // Thêm thông tin thành phố từ locations nếu có
    servers.forEach(server => {
      if (server.locations && server.locations.length > 0) {
        const location = server.locations[0];
        if (location.country) {
          server.country = location.country.name || server.country;
          
          if (location.country.city) {
            server.city = location.country.city.name || server.city;
          }
        }
      }
    });
    
    return servers;
  } catch (error) {
    console.error('Error fetching recommended servers:', error);
    throw error;
  }
} 