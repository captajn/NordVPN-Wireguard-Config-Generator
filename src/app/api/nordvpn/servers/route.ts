import { NextRequest, NextResponse } from 'next/server';

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
    },
    city?: {
      name: string;
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

export async function GET(request: NextRequest) {
  try {
    // Lấy toàn bộ server có hỗ trợ WireGuard với limit cao hơn
    const apiUrl = "https://api.nordvpn.com/v1/servers?limit=7000&filters[servers_technologies]=wireguard_udp";
    
    const response = await fetch(apiUrl, {
      next: { revalidate: 3600 }, // Cache 1 giờ
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`API trả về lỗi: ${response.status}`);
    }
    
    const servers: NordVPNServer[] = await response.json();
    
    // Log để debug
    console.log(`Tổng số server trước khi lọc: ${servers.length}`);
    
    // Chuyển đổi và lọc dữ liệu
    const processedServers: ServerInfo[] = servers
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
    
    // Nén dữ liệu trước khi gửi về client
    const compressedServers = processedServers.map(server => ({
      ...server,
      // Chỉ giữ lại hostname nếu khác name
      hostname: server.hostname !== server.name ? server.hostname : undefined,
      // Chỉ giữ lại city nếu có giá trị
      city: server.city || undefined
    }));
    
    return NextResponse.json({
      success: true,
      servers: compressedServers
    });
  } catch (error) {
    console.error('Error fetching servers:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Lỗi không xác định'
    }, { status: 500 });
  }
} 