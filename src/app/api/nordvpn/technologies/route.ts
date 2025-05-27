import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Gọi API để lấy danh sách công nghệ
    const response = await fetch('https://api.nordvpn.com/v1/technologies', {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
      },
      next: { revalidate: 3600 } // Cache 1 giờ
    });
    
    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: `API trả về lỗi: ${response.status}`
      }, { status: response.status });
    }
    
    const technologies = await response.json();
    
    // Trả về danh sách công nghệ
    return NextResponse.json({
      success: true,
      technologies: technologies
    });
    
  } catch (error) {
    console.error('Error in Technologies API:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Đã xảy ra lỗi không xác định'
    }, { status: 500 });
  }
} 