import { ServerInfo } from '../app/types';

// Định nghĩa kiểu dữ liệu cho phản hồi từ API NordVPN
interface NordVPNServerResponse {
  id: number;
  name: string;
  station: string;
  hostname: string;
  load: number;
  status: string;
  country: string;
  city: string;
  locations: {
    country: {
      name: string;
      city?: {
        name: string;
      };
    };
  }[];
  technologies: {
    identifier: string;
    pivot?: {
      status?: string;
      public_key?: string;
    };
  }[];
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
    const servers = (data as NordVPNServerResponse[]).map((server): ServerInfo => {
      // Xử lý thông tin quốc gia và thành phố từ locations nếu có
      let country = server.country || '';
      let city = server.city || '';
      
      if (server.locations && server.locations.length > 0) {
        const location = server.locations[0];
        if (location.country) {
          country = location.country.name || country;
          
          if (location.country.city) {
            city = location.country.city.name || city;
          }
        }
      }
      
      return {
        id: server.id,
        name: server.name,
        hostname: server.hostname,
        load: server.load,
        status: server.status === 'online' ? 'online' : 'offline',
        country: country,
        city: city,
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
      };
    });
    
    return servers;
  } catch (error) {
    console.error('Error fetching recommended servers:', error);
    throw error;
  }
} 