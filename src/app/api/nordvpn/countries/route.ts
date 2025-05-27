import { NextResponse } from 'next/server';

interface NordVPNCountry {
  id: number;
  name: string;
  code: string;
  cities: Array<{
    id: number;
    name: string;
    latitude: number;
    longitude: number;
  }>;
}

export async function GET() {
  try {
    // Gọi API NordVPN để lấy danh sách quốc gia
    const response = await fetch('https://api.nordvpn.com/v1/countries', {
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Lỗi khi tải danh sách quốc gia: ${response.status}`);
    }

    const countries = await response.json() as NordVPNCountry[];

    // Sắp xếp theo tên quốc gia
    const sortedCountries = countries
      .map(country => ({
        id: country.id,
        name: country.name,
        code: country.code
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({
      success: true,
      countries: sortedCountries
    });

  } catch (error) {
    console.error('Error fetching countries:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Đã xảy ra lỗi không xác định'
      },
      { status: 500 }
    );
  }
} 