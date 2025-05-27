import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const countryId = searchParams.get('country_id');

    // URL cơ bản của API NordVPN
    let apiUrl = 'https://api.nordvpn.com/v1/servers/recommendations?limit=50';

    // Thêm filter quốc gia nếu có
    if (countryId) {
      apiUrl += `&filters[country_id]=${countryId}`;
    }

    // Gọi API NordVPN
    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Lỗi khi gọi API NordVPN: ${response.status}`);
    }

    const data = await response.json();

    // Kiểm tra dữ liệu trước khi trả về
    if (!Array.isArray(data)) {
      throw new Error('Dữ liệu không hợp lệ từ API NordVPN');
    }

    return NextResponse.json({
      success: true,
      servers: data
    });

  } catch (error) {
    console.error('Server API Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Đã xảy ra lỗi không xác định'
    }, { status: 500 });
  }
} 