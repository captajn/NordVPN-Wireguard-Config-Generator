import { NextRequest, NextResponse } from 'next/server';

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

// Hàm để lấy danh sách máy chủ WireGuard
async function fetchWireGuardServers(countryId?: number): Promise<{success: boolean; servers?: unknown; error?: string}> {
  try {
    // Xây dựng URL API với các tham số phù hợp
    let apiUrl = 'https://api.nordvpn.com/v1/servers?limit=500&filters[servers_technologies][identifier]=wireguard_udp';
    
    // Thêm tham số country_id nếu được cung cấp
    if (countryId) {
      apiUrl += `&filters[country_id]=${countryId}`;
    }
    
    // Gọi API NordVPN để lấy danh sách máy chủ
    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`API returned status: ${response.status}`);
    }
    
    // Parse dữ liệu JSON từ response
    const servers = await response.json();
    
    // Trả về danh sách máy chủ
    return {
      success: true,
      servers: servers
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Lỗi không xác định khi lấy danh sách máy chủ WireGuard'
    };
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Lấy tham số country_id từ URL nếu có
    const url = new URL(request.url);
    const countryId = url.searchParams.get('country_id');
    
    // Gọi hàm để lấy danh sách máy chủ WireGuard
    const result = await fetchWireGuardServers(countryId ? parseInt(countryId) : undefined);
    
    // Trả về kết quả
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : 'Lỗi không xác định'
    }, { status: 500 });
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

  } catch {
    return NextResponse.json({
      success: false,
      error: 'Lỗi server khi xử lý yêu cầu'
    }, { status: 500 });
  }
} 