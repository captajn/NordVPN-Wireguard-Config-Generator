import { getCredentials } from '@/app/services/api';
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

    const response = await getCredentials(token);

    if (!response.success) {
      return NextResponse.json(
        { error: response.error || 'Lỗi không xác định' },
        { status: 500 }
      );
    }

    // Tính thời gian hết hạn (30 ngày từ thời điểm hiện tại)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Trả về private key cho client, ưu tiên nordlynx_private_key
    const data = response.data;
    return NextResponse.json({
      privateKey: data?.private_key,
      publicKey: data?.public_key,
      expires_at: expiresAt.toISOString()
    });
  } catch (error) {
    console.error('Lỗi khi xử lý yêu cầu credentials:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Lỗi máy chủ nội bộ' 
      },
      { status: 500 }
    );
  }
} 