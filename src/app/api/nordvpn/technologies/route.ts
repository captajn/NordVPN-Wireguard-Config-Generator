import { NextResponse } from 'next/server';

interface Technology {
  id: number;
  name: string;
  identifier: string;
  created_at?: string;
  updated_at?: string;
  pivot?: {
    status: string;
  };
  metadata?: Array<{
    name: string;
    value: string;
  }>;
}

export async function GET() {
  try {
    // Gọi API NordVPN để lấy danh sách công nghệ
    const response = await fetch('https://api.nordvpn.com/v1/technologies', {
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Lỗi khi gọi API NordVPN: ${response.status}`);
    }

    const technologies = await response.json();

    // Lọc và sắp xếp công nghệ theo tên
    const sortedTechnologies = technologies
      .filter((tech: Technology) => tech && tech.name && tech.identifier)
      .sort((a: Technology, b: Technology) => a.name.localeCompare(b.name));

    return NextResponse.json({
      success: true,
      technologies: sortedTechnologies
    });

  } catch (error) {
    console.error('Technologies API Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Đã xảy ra lỗi không xác định'
    }, { status: 500 });
  }
} 