import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;
    
    if (!token) {
      return NextResponse.json({
        success: false,
        error: 'Token không được cung cấp'
      }, { status: 400 });
    }
    
    console.log('Debug - Using token to fetch credentials');
    
    // Tạo Basic Auth header từ token
    const basicAuthToken = Buffer.from(`token:${token}`).toString('base64');
    
    console.log('Debug - Basic Auth token created');
    
    const response = await fetch('https://api.nordvpn.com/v1/users/services/credentials', {
      headers: {
        'Authorization': `Basic ${basicAuthToken}`,
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Origin': 'https://nordvpn.com',
        'Referer': 'https://nordvpn.com/'
      }
    });
    
    console.log('Debug - API credentials response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API error response:', errorText);
      
      return NextResponse.json({
        success: false,
        error: `API responded with status: ${response.status}`
      }, { status: response.status });
    }
    
    const data = await response.json();
    console.log('Debug - API credentials response:', JSON.stringify({
      username: data.username,
      passwordLength: data.password?.length || 0
    }, null, 2));
    
    if (!data.username || !data.password) {
      return NextResponse.json({
        success: false,
        error: 'API không trả về thông tin đăng nhập hợp lệ'
      }, { status: 500 });
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
    console.error('Server API Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Đã xảy ra lỗi không xác định'
    }, { status: 500 });
  }
} 