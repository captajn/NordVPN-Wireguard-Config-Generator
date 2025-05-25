import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'Token không được cung cấp' },
        { status: 400 }
      );
    }

    // Gọi API của NordVPN để lấy thông tin người dùng
    const response = await fetch('https://api.nordvpn.com/v1/users/services/credentials', {
      headers: {
        'Authorization': `token:${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API trả về lỗi: ${response.status}`);
    }

    const data = await response.json();
    
    // Trả về username và password cho client
    return NextResponse.json({
      username: data.username,
      password: data.password
    });
  } catch (error) {
    console.error('Lỗi khi xử lý yêu cầu user credentials:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Lỗi máy chủ nội bộ' 
      },
      { status: 500 }
    );
  }
} 