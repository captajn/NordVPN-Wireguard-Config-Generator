import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Gọi API để lấy danh sách quốc gia
    const response = await fetch('https://api.nordvpn.com/v1/servers/countries', {
      headers: {
        'Accept': 'application/json'
      },
      next: { revalidate: 3600 } // Cache trong 1 giờ
    });
    
    if (!response.ok) {
      throw new Error(`API trả về lỗi: ${response.status}`);
    }
    
    // Parse dữ liệu JSON từ response
    const data = await response.json();
    
    // Kiểm tra dữ liệu trả về có đúng định dạng không
    if (!Array.isArray(data)) {
      throw new Error('API không trả về dữ liệu dạng mảng');
    }
    
    // Lọc và định dạng lại dữ liệu
    const countries = data.map(country => ({
      id: country.id,
      name: country.name,
      code: country.code
    }));
    
    // Sắp xếp theo tên quốc gia
    countries.sort((a, b) => a.name.localeCompare(b.name));
    
    return NextResponse.json({
      success: true,
      countries
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Đã xảy ra lỗi không xác định'
    }, { status: 500 });
  }
} 