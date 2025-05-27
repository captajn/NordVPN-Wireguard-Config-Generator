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
    
    // Gọi API để lấy thông tin đăng nhập
    const response = await fetch('https://api.nordvpn.com/v1/users/services/credentials', {
      method: 'GET',
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
    
    // Kiểm tra dữ liệu trả về có đúng định dạng không
    if (!data.username || !data.password) {
      throw new Error('API không trả về thông tin đăng nhập hợp lệ');
    }
    
    // Lưu token vào cookie để sử dụng cho các API call khác
    const cookieResponse = NextResponse.json({
      success: true,
      username: data.username,
      password: data.password
    });
    
    cookieResponse.cookies.set('token', token, {
      path: '/',
      maxAge: 86400, // 24 giờ
      httpOnly: true
    });
    
    return cookieResponse;
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Đã xảy ra lỗi không xác định'
    }, { status: 500 });
  }
} 