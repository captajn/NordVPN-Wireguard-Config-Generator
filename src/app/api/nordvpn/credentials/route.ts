import { getCredentials } from '@/app/services/api';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token || typeof token !== 'string' || token.trim().length === 0) {
      return NextResponse.json(
        { error: 'Token không hợp lệ' },
        { status: 400 }
      );
    }

    const response = await getCredentials(token.trim());

    if (!response.success) {
      return NextResponse.json(
        { error: response.error || 'Token không hợp lệ hoặc đã hết hạn' },
        { status: 401 }
      );
    }

    // Kiểm tra dữ liệu trả về từ API
    const data = response.data;
    if (!data?.private_key) {
      return NextResponse.json(
        { error: 'Không thể lấy được private key từ API' },
        { status: 500 }
      );
    }

    // Tính thời gian hết hạn (30 ngày từ thời điểm hiện tại)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    return NextResponse.json({
      privateKey: data.private_key,
      publicKey: data.public_key,
      expires_at: expiresAt.toISOString()
    });
  } catch (error) {
    console.error('Lỗi khi xử lý yêu cầu credentials:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error 
          ? error.message 
          : 'Lỗi khi xử lý yêu cầu. Vui lòng thử lại sau.' 
      },
      { status: 500 }
    );
  }
} 