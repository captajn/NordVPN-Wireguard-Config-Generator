import { NextRequest, NextResponse } from 'next/server';

// Định nghĩa các DNS có sẵn
const DNS_OPTIONS = {
  cloudflare: '1.1.1.1, 1.0.0.1',
  google: '8.8.8.8, 8.8.4.4',
  nordvpn: '103.86.96.100, 103.86.99.100',
  adguard: '94.140.14.14, 94.140.15.15',
  quad9: '9.9.9.9, 149.112.112.112',
  controld: '76.76.2.11, 76.76.10.11'
};

/**
 * API handler để lấy danh sách máy chủ WireGuard
 * GET: Lấy danh sách máy chủ WireGuard với các bộ lọc
 * POST: Lấy public key cho một máy chủ WireGuard cụ thể
 */

export async function GET(request: NextRequest) {
  try {
    // Lấy token từ header Authorization, query param hoặc cookie
    const authHeader = request.headers.get('Authorization');
    const url = new URL(request.url);
    let token = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else {
      // Thử các nguồn token khác nhau
      token = request.headers.get('x-auth-token') ||
              url.searchParams.get('token') ||
              request.cookies.get('token')?.value;
    }
    
    console.log('Token source check: Auth Header exists:', !!authHeader);
    console.log('Token source check: x-auth-token exists:', !!request.headers.get('x-auth-token'));
    console.log('Token source check: URL token exists:', !!url.searchParams.get('token'));
    console.log('Token source check: Cookie token exists:', !!request.cookies.get('token')?.value);
    
    // Nếu không có token, trả về lỗi
    if (!token) {
      return NextResponse.json({
        success: false,
        error: 'Không có token xác thực'
      }, { status: 401 });
    }
    
    // Tạo headers với token xác thực
    const headers: HeadersInit = {
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
    };

    // Thêm token vào header
    const basicAuthToken = Buffer.from(`token:${token}`).toString('base64');
    headers['Authorization'] = `Basic ${basicAuthToken}`;

    // Lấy country_id từ query parameters nếu có
    const countryId = url.searchParams.get('country_id');
    
    console.log('Query parameters:', Object.fromEntries(url.searchParams.entries()));
    console.log('countryId từ query params:', countryId);
    
    // Xây dựng URL với các tham số lọc
    // URL cơ bản luôn bao gồm bộ lọc wireguard_udp và giới hạn 50 kết quả
    let apiUrl = 'https://api.nordvpn.com/v1/servers/recommendations?filters[servers_technologies][identifier]=wireguard_udp&limit=50';
    
    // Thêm country_id vào bộ lọc nếu có
    // Format đúng: https://api.nordvpn.com/v1/servers/recommendations?filters[country_id]=<ID_COUNTRY>&filters[servers_technologies][identifier]=wireguard_udp&limit=50
    if (countryId) {
      apiUrl = `https://api.nordvpn.com/v1/servers/recommendations?filters[country_id]=${countryId}&filters[servers_technologies][identifier]=wireguard_udp&limit=50`;
      console.log('Sử dụng country_id:', countryId, 'trong API URL');
    }
    
    console.log('Calling NordVPN API:', apiUrl);
    
    // Gọi API để lấy danh sách máy chủ WireGuard được đề xuất
    const response = await fetch(apiUrl, {
      headers
    });
    
    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: `API trả về lỗi: ${response.status}`
      }, { status: response.status });
    }
    
    const servers = await response.json();
    
    // Log một phần của dữ liệu để debug
    if (Array.isArray(servers) && servers.length > 0) {
      console.log('Mẫu dữ liệu server đầu tiên từ API:');
      console.log('- Tên server:', servers[0].name);
      if (servers[0].locations && servers[0].locations.length > 0) {
        const location = servers[0].locations[0];
        if (location.country) {
          console.log('- Quốc gia từ locations:', location.country.name, 'ID:', location.country.id);
        }
      }
      console.log('- Số lượng server:', servers.length);
    }
    
    // Trả về danh sách máy chủ
    return NextResponse.json({
      success: true,
      servers: servers
    });
    
  } catch (error) {
    console.error('Error in WireGuard API:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Đã xảy ra lỗi không xác định'
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

  } catch (error) {
    console.error('Lỗi khi tạo cấu hình WireGuard:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Lỗi server khi xử lý yêu cầu'
    }, { status: 500 });
  }
} 