import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Lấy token từ header Authorization
    const authHeader = request.headers.get('Authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Token được lấy nhưng không được sử dụng trong hàm này
      // Giữ lại phần code này để tương thích với các API khác
    }
    
    // Lấy các tham số từ URL
    const searchParams = request.nextUrl.searchParams;
    const params = new URLSearchParams();
    
    // Sao chép các tham số từ request
    searchParams.forEach((value, key) => {
      params.append(key, value);
    });
    
    // Đảm bảo có tham số filters[servers_technologies][identifier] cho OpenVPN
    if (!params.has('filters[servers_technologies][identifier]')) {
      params.append('filters[servers_technologies][identifier]', 'openvpn_udp');
    }
    
    // Gọi API NordVPN
    const apiUrl = `https://api.nordvpn.com/v1/servers?${params.toString()}`;
    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: `API trả về lỗi: ${response.status}`
      }, { status: response.status });
    }
    
    const data = await response.json();
    
    return NextResponse.json({
      success: true,
      servers: data
    });
    
  } catch (error) {
    console.error('Error in OpenVPN API:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Đã xảy ra lỗi không xác định'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Lấy token từ header Authorization
    const authHeader = request.headers.get('Authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Token được lấy nhưng không được sử dụng trong hàm này
      // Giữ lại phần code này để tương thích với các API khác
    }
    
    // Lấy thông tin từ request body
    const { hostname, protocol = 'udp' } = await request.json();
    
    if (!hostname) {
      return NextResponse.json({
        success: false,
        error: 'Hostname không được cung cấp'
      }, { status: 400 });
    }
    
    if (protocol !== 'tcp' && protocol !== 'udp') {
      return NextResponse.json({
        success: false,
        error: 'Protocol phải là tcp hoặc udp'
      }, { status: 400 });
    }
    
    // Tạo URL API để lấy cấu hình OpenVPN
    const apiUrl = `https://api.nordvpn.com/v1/files/openvpn?server=${hostname}&protocol=${protocol}`;
    
    // Gọi API NordVPN
    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'text/plain'
      }
    });
    
    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: `API trả về lỗi: ${response.status}`
      }, { status: response.status });
    }
    
    // Lấy nội dung cấu hình
    const configContent = await response.text();
    
    // Trả về cấu hình dưới dạng file tải xuống
    return new NextResponse(configContent, {
      headers: {
        'Content-Type': 'text/plain',
        'Content-Disposition': `attachment; filename="${hostname}.${protocol}.ovpn"`
      }
    });
    
  } catch (error) {
    console.error('Error in OpenVPN API:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Đã xảy ra lỗi khi tạo cấu hình OpenVPN'
    }, { status: 500 });
  }
} 