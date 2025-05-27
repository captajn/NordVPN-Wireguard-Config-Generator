import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Lấy token từ cookie hoặc header
    const token = request.cookies.get('token')?.value || request.headers.get('x-auth-token');
    
    // Nếu không có token, kiểm tra các biến môi trường
    let username = process.env.NORDVPN_SOCKS_USERNAME;
    let password = process.env.NORDVPN_SOCKS_PASSWORD;
    
    // Nếu có token, sử dụng để lấy thông tin đăng nhập
    if (token) {
      try {
        // Tạo Basic Auth header từ token
        const basicAuthToken = Buffer.from(`token:${token}`).toString('base64');
        
        // Gọi API để lấy thông tin đăng nhập
        const userResponse = await fetch('https://api.nordvpn.com/v1/users/services/credentials', {
          headers: {
            'Authorization': `Basic ${basicAuthToken}`,
            'Accept': 'application/json'
          }
        });
        
        if (userResponse.ok) {
          const userData = await userResponse.json();
          
          if (userData.username && userData.password) {
            username = userData.username;
            password = userData.password;
          } else {
            throw new Error('API response missing username or password');
          }
        } else {
          throw new Error(`Failed to fetch user credentials: ${userResponse.status}`);
        }
      } catch {
        // Nếu có lỗi khi lấy thông tin đăng nhập, sử dụng thông tin từ biến môi trường
        if (!username || !password) {
          return NextResponse.json({
            success: false,
            error: 'Không thể lấy thông tin đăng nhập SOCKS'
          }, { status: 401 });
        }
      }
    } else if (!username || !password) {
      // Nếu không có token và không có thông tin trong biến môi trường
      return NextResponse.json({
        success: false,
        error: 'Không có token hoặc thông tin đăng nhập SOCKS'
      }, { status: 401 });
    }
    
    // Gọi API để lấy danh sách máy chủ SOCKS
    const response = await fetch('https://api.nordvpn.com/v1/servers/socks', {
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
    
    const servers = await response.json();
    
    // Trả về danh sách máy chủ và thông tin đăng nhập
    return NextResponse.json({
      success: true,
      servers: servers,
      username: username,
      password: password
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Đã xảy ra lỗi không xác định'
    }, { status: 500 });
  }
}
