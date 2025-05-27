import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Lấy token từ request body
    const { token } = await request.json();
    
    if (!token) {
      return NextResponse.json({
        success: false,
        error: 'Token không được cung cấp'
      }, { status: 400 });
    }
    
    // Tạo Basic Auth token từ token
    const basicAuth = Buffer.from(`token:${token}`).toString('base64');
    
    // Gọi API để lấy thông tin đăng nhập SOCKS
    const response = await fetch('https://api.nordvpn.com/v1/users/services/credentials', {
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      // Xử lý lỗi từ API
      const errorText = await response.text();
      throw new Error(`API trả về lỗi: ${response.status} - ${errorText}`);
    }
    
    // Parse dữ liệu JSON từ response
    const data = await response.json();
    
    // Kiểm tra dữ liệu trả về từ API
    console.log('API user data:', JSON.stringify(data));
    
    // Lấy thông tin đăng nhập SOCKS
    const username = data.username || '';
    const password = data.password || '';
    
    if (!username || !password) {
      return NextResponse.json({
        success: false,
        error: 'Không thể lấy thông tin đăng nhập SOCKS từ API. Vui lòng kiểm tra token của bạn.'
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: true,
      username: username,
      password: password
    });
    
  } catch (error) {
    console.error('Error in user API:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Đã xảy ra lỗi không xác định'
    }, { status: 500 });
  }
} 