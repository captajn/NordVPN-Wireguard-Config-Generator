import { NextResponse } from 'next/server';

// Định nghĩa kiểu dữ liệu cho cache
interface CachedResponse {
  success: boolean;
  servers: Array<{
    id: number;
    name: string;
    hostname?: string;
    country: string;
    city?: string;
    load: number;
    publicKey: string;
  }>;
  cached: boolean;
  timestamp: number;
}

// Bộ nhớ đệm cho servers
let cachedServers: CachedResponse | null = null;
let cacheTime: number = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 giờ

// Định nghĩa kiểu dữ liệu
interface NordVPNTechnology {
  id: number;
  name: string;
  identifier: string;
  metadata?: Array<{
    name: string;
    value: string;
  }>;
  pivot?: {
    server_id: number;
    technology_id: number;
    public_key?: string;
  };
}

interface NordVPNServer {
  id: number;
  name: string;
  station: string;
  hostname: string;
  load: number;
  locations: Array<{
    country: {
      name: string;
      id: number;
      code?: string;
      city?: {
        name: string;
        id?: number;
        latitude?: number;
        longitude?: number;
        dns_name?: string;
        hub_score?: number;
      };
    }
  }>;
  technologies: NordVPNTechnology[];
}

interface ServerInfo {
  id: number;
  name: string;
  hostname: string;
  country: string;
  city: string;
  load: number;
  publicKey: string;
}

// Hàm tìm public key từ metadata giống như phiên bản web
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

export async function GET() {
  try {
    // Kiểm tra cache
    const now = Date.now();
    if (cachedServers && (now - cacheTime < CACHE_DURATION)) {
      // Sử dụng dữ liệu từ cache
      return NextResponse.json(cachedServers);
    }
    
    // Lấy toàn bộ server có hỗ trợ WireGuard với limit cao hơn
    const apiUrl = "https://api.nordvpn.com/v1/servers?limit=7000&filters[servers_technologies]=wireguard_udp";
    
    const response = await fetch(apiUrl, {
      cache: 'no-store', // Không sử dụng cache của fetch, chúng ta sẽ tự quản lý
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`API trả về lỗi: ${response.status}`);
    }
    
    const servers: NordVPNServer[] = await response.json();
    
    // Chuyển đổi và lọc dữ liệu
    const processedServers: ServerInfo[] = servers
      .filter(server => {
        // Kiểm tra location hợp lệ
        const hasValidLocation = server.locations && server.locations.length > 0;
        return hasValidLocation;
      })
      .map(server => {
        const location = server.locations[0];
        const country = location?.country?.name || 'Unknown';
        const city = location?.country?.city?.name || '';
        const publicKey = findPublicKey(server);
        
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
    
    // Nén dữ liệu trước khi gửi về client
    const compressedServers = processedServers.map(server => ({
      id: server.id,
      name: server.name,
      hostname: server.hostname !== server.name ? server.hostname : undefined,
      country: server.country,
      city: server.city || undefined,
      load: server.load,
      publicKey: server.publicKey
    }));
    
    // Lưu vào cache
    cachedServers = {
      success: true,
      servers: compressedServers,
      cached: true,
      timestamp: now
    };
    cacheTime = now;
    
    return NextResponse.json(cachedServers);
  } catch (error) {
    console.error('Error fetching servers:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Lỗi không xác định'
    }, { status: 500 });
  }
} 