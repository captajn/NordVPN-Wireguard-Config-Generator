import { NextRequest, NextResponse } from 'next/server';
import { getSocksServers } from '../../../services/api';

export async function GET(request: NextRequest) {
  try {
    // Lấy token từ header Authorization hoặc cookie
    const authHeader = request.headers.get('Authorization');
    let token = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else {
      token = request.cookies.get('token')?.value || request.headers.get('x-auth-token');
    }
    
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
      } catch (error) {
        console.error('Error fetching SOCKS credentials:', error);
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
    
    // Lấy tham số country_id từ query string nếu có
    const url = new URL(request.url);
    const countryId = url.searchParams.get('country_id');
    
    // Sử dụng hàm getSocksServers từ services/api.ts
    const result = await getSocksServers({ 
      token: token || undefined, 
      countryId: countryId || undefined,
      limit: 50, 
      noCache: true 
    });
    
    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || 'Lỗi khi lấy danh sách máy chủ SOCKS'
      }, { status: 500 });
    }
    
    // Trả về danh sách máy chủ và thông tin đăng nhập
    return NextResponse.json({
      success: true,
      servers: result.data?.servers || [],
      username: username,
      password: password
    });
    
  } catch (error) {
    console.error('Error in SOCKS API:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Đã xảy ra lỗi không xác định'
    }, { status: 500 });
  }
}
