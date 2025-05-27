import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const countryId = searchParams.get('filters[country_id]');

    // Tạo URL với các tham số bắt buộc
    let apiUrl = 'https://api.nordvpn.com/v1/servers/recommendations?' + new URLSearchParams({
      'filters[servers_technologies][identifier]': 'openvpn_udp',
      'limit': '50'
    });

    // Thêm filter quốc gia nếu có
    if (countryId) {
      apiUrl += `&filters[country_id]=${countryId}`;
    }

    // Gọi API NordVPN với headers đầy đủ
    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Origin': 'https://nordvpn.com',
        'Referer': 'https://nordvpn.com/'
      }
    });

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error(`Expected JSON but got ${contentType}`);
    }

    const data = await response.json();

    // Kiểm tra dữ liệu trước khi trả về
    if (!Array.isArray(data)) {
      throw new Error('Dữ liệu không hợp lệ từ API NordVPN');
    }

    return NextResponse.json({
      success: true,
      servers: data
    }, {
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Server API Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Đã xảy ra lỗi không xác định'
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json'
      }
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { hostname, protocol } = await request.json();
    
    if (!hostname || !protocol) {
      return NextResponse.json(
        { error: 'Thiếu hostname hoặc protocol' },
        { status: 400 }
      );
    }

    // Xác định protocol cho URL
    const protocolType = protocol.includes('tcp') ? 'tcp' : 'udp';
    
    // Tạo URL tải cấu hình
    const configUrl = `https://downloads.nordcdn.com/configs/files/ovpn_${protocolType}/servers/${hostname}.${protocolType}.ovpn`;
    
    // Tải file cấu hình với headers phù hợp
    const response = await fetch(configUrl, {
      headers: {
        'Accept': 'text/plain',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Origin': 'https://nordvpn.com',
        'Referer': 'https://nordvpn.com/'
      }
    });
    
    if (!response.ok) {
      throw new Error('Không thể tải file cấu hình OpenVPN');
    }
    
    const config = await response.text();
    
    return new NextResponse(config, {
      headers: {
        'Content-Type': 'text/plain',
        'Content-Disposition': `attachment; filename="${hostname}.${protocolType}.ovpn"`,
        'Cache-Control': 'no-store'
      }
    });
    
  } catch (error) {
    console.error('Error generating OpenVPN config:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Đã xảy ra lỗi không xác định' },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store',
          'Content-Type': 'application/json'
        }
      }
    );
  }
} 