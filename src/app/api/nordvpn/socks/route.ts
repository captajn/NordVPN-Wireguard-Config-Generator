import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const countryId = searchParams.get('filters[country_id]');
    const token = request.cookies.get('token')?.value;

    // Tạo URL với các tham số bắt buộc
    const params = new URLSearchParams({
      'filters[servers.status]': 'online',
      'filters[servers_technologies][identifier]': 'socks',
      'filters[servers_technologies][pivot][status]': 'online',
      'limit': '10000'
    });

    // Thêm filter quốc gia nếu có
    if (countryId) {
      params.append('filters[country_id]', countryId);
    }

    const apiUrl = `https://api.nordvpn.com/v1/servers?${params.toString()}`;

    // Gọi API NordVPN với headers đầy đủ
    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Origin': 'https://nordvpn.com',
        'Referer': 'https://nordvpn.com/',
        'Authorization': token ? `Bearer ${token}` : ''
      }
    });

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }

    const data = await response.json();

    // Kiểm tra dữ liệu trước khi trả về
    if (!Array.isArray(data)) {
      throw new Error('Dữ liệu không hợp lệ từ API NordVPN');
    }

    // Lấy thông tin xác thực SOCKS từ biến môi trường hoặc API
    let credentials = null;
    
    // Thử lấy từ biến môi trường trước
    const savedUsername = process.env.NORDVPN_SOCKS_USERNAME;
    const savedPassword = process.env.NORDVPN_SOCKS_PASSWORD;
    
    console.log('Debug - Env variables:', {
      username: savedUsername,
      password: savedPassword ? 'Exists (not showing for security)' : 'Not found'
    });
    
    if (savedUsername && savedPassword) {
      credentials = {
        username: savedUsername,
        password: savedPassword // Sử dụng mật khẩu thật từ biến môi trường
      };
      console.log('Debug - Using credentials from env variables');
    } else if (token) {
      // Nếu không có trong biến môi trường, thử lấy từ API
      try {
        // Tạo Basic Auth header từ token
        const basicAuthToken = Buffer.from(`token:${token}`).toString('base64');
        
        console.log('Debug - Using Basic Auth with token to fetch credentials');
        
        const userResponse = await fetch('https://api.nordvpn.com/v1/users/services/credentials', {
          headers: {
            'Authorization': `Basic ${basicAuthToken}`,
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Origin': 'https://nordvpn.com',
            'Referer': 'https://nordvpn.com/'
          }
        });

        console.log('Debug - API credentials response status:', userResponse.status);
        
        if (userResponse.ok) {
          const userData = await userResponse.json();
          console.log('Debug - API credentials response:', JSON.stringify({
            username: userData.username,
            passwordLength: userData.password?.length || 0
          }, null, 2));
          
          if (userData.username && userData.password) {
            credentials = {
              username: userData.username,
              password: userData.password
            };
            console.log('Debug - Using credentials from NordVPN API:', {
              username: userData.username,
              passwordLength: userData.password?.length || 0
            });
          } else {
            console.error('API response missing username or password:', userData);
          }
        } else {
          console.error('Failed to fetch user credentials:', await userResponse.text());
        }
      } catch (error) {
        console.error('Error fetching user credentials:', error);
      }
    }

    // Nếu không lấy được credentials, sử dụng giá trị mặc định
    if (!credentials) {
      // Mật khẩu mặc định cho tài khoản NordVPN
      credentials = {
        username: 'myZr6jMobacVy77Ga93NZP4F',
        password: 'nordvpnsocks1234' // Mật khẩu mặc định
      };
      console.log('Debug - Using default credentials with hardcoded password');
    }

    console.log('Debug - Final credentials:', {
      username: credentials.username,
      passwordLength: credentials.password?.length || 0
    });

    return NextResponse.json({
      success: true,
      servers: data,
      credentials
    }, {
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Server API Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Đã xảy ra lỗi không xác định'
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json'
      }
    });
  }
}
