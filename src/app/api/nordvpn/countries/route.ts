import { NextRequest, NextResponse } from 'next/server';

interface NordVPNCountry {
  id: number;
  name: string;
  code: string;
  serverCount: number;
  cities: Array<{
    id: number;
    name: string;
    latitude: number;
    longitude: number;
    dns_name: string;
    hub_score: number;
    serverCount: number;
  }>;
}

export async function GET(request: NextRequest) {
  try {
    // Truy cập trực tiếp API NordVPN thay vì qua proxy
    const apiUrl = "https://api.nordvpn.com/v1/servers/countries";
    
    // Lấy danh sách quốc gia từ API NordVPN
    const response = await fetch(apiUrl, {
      next: { revalidate: 3600 }, // Cache 1 giờ
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`API trả về lỗi: ${response.status}`);
    }
    
    const countries: NordVPNCountry[] = await response.json();
    
    // Chuyển đổi dữ liệu
    const processedCountries = countries.map(country => ({
      id: country.id,
      name: country.name,
      code: country.code,
      serverCount: country.serverCount
    })).sort((a, b) => a.name.localeCompare(b.name));
    
    return NextResponse.json({
      success: true,
      countries: processedCountries
    });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách quốc gia:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Lỗi không xác định'
    }, { status: 500 });
  }
} 