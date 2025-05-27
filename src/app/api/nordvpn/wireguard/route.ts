import { NextRequest, NextResponse } from 'next/server';

interface NordVPNServer {
  id: number;
  name: string;
  hostname: string;
  load: number;
  status: string;
  locations: Array<{
    country?: {
      id: number;
      name: string;
      code: string;
      city?: {
        name: string;
        latitude: number;
        longitude: number;
      };
    };
    city?: {
      name: string;
      latitude: number;
      longitude: number;
    };
  }>;
  technologies: Array<{
    id: number;
    name: string;
    identifier: string;
    metadata?: Array<{
      name: string;
      value: string;
    }> | {
      public_key?: string;
    };
  }>;
}

interface ServerInfo {
  id: number;
  name: string;
  hostname: string;
  country: string;
  city?: string;
  load: number;
  publicKey?: string;
  status?: string;
}

// Định nghĩa kiểu cho metadata object
interface WireGuardMetadata {
  public_key?: string;
  [key: string]: unknown;
}

// Định nghĩa các DNS có sẵn
const DNS_OPTIONS = {
  cloudflare: '1.1.1.1, 1.0.0.1',
  google: '8.8.8.8, 8.8.4.4',
  nordvpn: '103.86.96.100, 103.86.99.100'
};

/**
 * API handler để lấy danh sách máy chủ WireGuard
 * GET: Lấy danh sách máy chủ WireGuard với các bộ lọc
 * POST: Lấy public key cho một máy chủ WireGuard cụ thể
 */

// GET: Lấy danh sách máy chủ WireGuard
export async function GET(request: NextRequest) {
  try {
    // Lấy country_id từ query
    const countryId = request.nextUrl.searchParams.get('country_id');
    
    // Xây dựng URL API dựa trên tham số
    let apiUrl = 'https://api.nordvpn.com/v1/servers/recommendations?filters[servers_technologies][identifier]=wireguard_udp&limit=50';
    
    // Nếu có country_id, thêm vào filters
    if (countryId) {
      apiUrl = `https://api.nordvpn.com/v1/servers/recommendations?filters[country_id]=${countryId}&filters[servers_technologies][identifier]=wireguard_udp&limit=50`;
    }
    
    console.log('Fetching servers from:', apiUrl);
    
    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Lỗi khi tải danh sách máy chủ: ${response.status}`);
    }

    const servers = await response.json() as NordVPNServer[];
    
    console.log('Received servers:', servers.length);
    
    // Tạo danh sách máy chủ từ kết quả API
    const formattedServers: ServerInfo[] = servers.map((server) => {
      // Tìm thông tin WireGuard public key
      const wireguardTech = server.technologies.find((tech) => 
        tech.identifier === 'wireguard_udp' || tech.identifier === 'wireguard'
      );
      
      // Xử lý cả hai định dạng metadata có thể có
      let publicKey = '';
      if (wireguardTech?.metadata) {
        if (Array.isArray(wireguardTech.metadata)) {
          publicKey = wireguardTech.metadata.find((meta) => 
            meta.name === 'public_key'
          )?.value || '';
        } else if (typeof wireguardTech.metadata === 'object') {
          publicKey = (wireguardTech.metadata as WireGuardMetadata).public_key || '';
        }
      }

      const countryName = server.locations[0]?.country?.name || '';
      const cityName = server.locations[0]?.country?.city?.name || server.locations[0]?.city?.name || '';
      
      return {
        id: server.id,
        name: server.name,
        hostname: server.hostname,
        country: countryName,
        city: cityName,
        load: server.load,
        status: server.status,
        publicKey: publicKey
      };
    });

    return NextResponse.json({ 
      success: true,
      servers: formattedServers
    });
  } catch (error) {
    console.error('Error fetching WireGuard servers:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Đã xảy ra lỗi không xác định' 
      },
      { status: 500 }
    );
  }
}

/**
 * Tạo cấu hình WireGuard
 * @param privateKey Private key từ API
 * @param serverHostname Hostname của máy chủ
 * @param serverPublicKey Public key của máy chủ
 * @param dnsOption Tùy chọn DNS (cloudflare, google, nordvpn)
 */
function generateWireGuardConfig(
  privateKey: string, 
  serverHostname: string, 
  serverPublicKey: string,
  dnsOption: keyof typeof DNS_OPTIONS = 'cloudflare'
): string {
  return `[Interface]
PrivateKey = ${privateKey}
Address = 10.5.0.2/16
DNS = ${DNS_OPTIONS[dnsOption]}

[Peer]
PublicKey = ${serverPublicKey}
Endpoint = ${serverHostname}:51820
AllowedIPs = 0.0.0.0/0
PersistentKeepalive = 25`;
}

// POST: Tạo và trả về cấu hình WireGuard hoàn chỉnh
export async function POST(request: Request) {
  try {
    const { hostname, privateKey, publicKey, dnsOption = 'cloudflare' } = await request.json();

    if (!hostname) {
      return NextResponse.json({
        success: false,
        error: 'Hostname không được cung cấp'
      }, { status: 400 });
    }

    if (!privateKey) {
      return NextResponse.json({
        success: false,
        error: 'Private key không được cung cấp'
      }, { status: 400 });
    }

    if (!publicKey) {
      return NextResponse.json({
        success: false,
        error: 'Public key không được cung cấp'
      }, { status: 400 });
    }

    if (dnsOption && !DNS_OPTIONS[dnsOption as keyof typeof DNS_OPTIONS]) {
      return NextResponse.json({
        success: false,
        error: 'Tùy chọn DNS không hợp lệ'
      }, { status: 400 });
    }

    // Tạo cấu hình WireGuard hoàn chỉnh
    const config = generateWireGuardConfig(
      privateKey, 
      hostname, 
      publicKey, 
      dnsOption as keyof typeof DNS_OPTIONS
    );

    // Trả về cấu hình dưới dạng text
    return new NextResponse(config, {
      headers: {
        'Content-Type': 'text/plain',
        'Content-Disposition': `attachment; filename="${hostname}.conf"`
      }
    });

  } catch (error) {
    console.error('Error in WireGuard API:', error);
    return NextResponse.json({
      success: false,
      error: 'Lỗi server khi xử lý yêu cầu'
    }, { status: 500 });
  }
} 