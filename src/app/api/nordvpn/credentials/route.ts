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
    
    // Gọi API để lấy thông tin private key
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
    
    // Tạo private key cho WireGuard
    const privateKey = data.token || '';
    
    // Tính thời gian hết hạn (30 ngày từ hiện tại)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    
    return NextResponse.json({
      success: true,
      privateKey: privateKey,
      expires_at: expiresAt.toISOString()
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Đã xảy ra lỗi không xác định'
    }, { status: 500 });
  }
} 