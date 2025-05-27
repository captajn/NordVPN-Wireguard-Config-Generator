# NordVPN API Explorer

Ứng dụng web cho phép bạn tương tác với API của NordVPN để tạo cấu hình WireGuard, quản lý kết nối SOCKS proxy và xem thông tin máy chủ.

![NordVPN API Explorer](https://i.imgur.com/placeholder.png)

## Tính năng chính

### 1. Danh sách máy chủ

- Xem danh sách đầy đủ các máy chủ NordVPN
- Lọc theo quốc gia, thành phố và mức tải
- Tìm kiếm máy chủ theo tên hoặc vị trí
- Thông tin chi tiết về tình trạng tải và vị trí địa lý

### 2. Tạo cấu hình WireGuard

- Tạo file cấu hình WireGuard (.conf) cho bất kỳ máy chủ nào
- Lọc máy chủ theo quốc gia, thành phố và mức tải
- Tự động tải xuống file cấu hình sẵn sàng sử dụng
- Hỗ trợ xác thực bằng token NordVPN

### 3. SOCKS Proxy

- Danh sách máy chủ hỗ trợ SOCKS proxy
- Thông tin kết nối chi tiết (địa chỉ, cổng, thông tin xác thực)
- Lọc theo quốc gia và tình trạng tải

## Cài đặt

```bash
# Clone repository
git clone https://github.com/yourusername/nordvpn-api-explorer.git
cd nordvpn-api-explorer

# Cài đặt dependencies
npm install

# Chạy môi trường phát triển
npm run dev
```

Sau đó mở [http://localhost:3000](http://localhost:3000) trong trình duyệt để xem ứng dụng.

## Hướng dẫn sử dụng

### Lấy token NordVPN

Để sử dụng đầy đủ tính năng của ứng dụng, bạn cần có token NordVPN:

1. Đăng nhập vào tài khoản NordVPN của bạn
2. Truy cập [https://my.nordaccount.com/api-token/](https://my.nordaccount.com/api-token/)
3. Tạo token mới và sao chép
4. Dán token vào trang WireGuard hoặc SOCKS trong ứng dụng

### Tạo cấu hình WireGuard

1. Truy cập trang "WireGuard" trong ứng dụng
2. Nhập token NordVPN của bạn
3. Chọn máy chủ mong muốn (lọc theo quốc gia, thành phố hoặc tải)
4. Nhấn nút tải xuống để tạo và tải file cấu hình
5. Sử dụng file cấu hình với ứng dụng WireGuard trên thiết bị của bạn

### Sử dụng SOCKS Proxy

1. Truy cập trang "SOCKS" trong ứng dụng
2. Nhập token NordVPN của bạn (nếu cần)
3. Xem danh sách các máy chủ SOCKS có sẵn
4. Sử dụng thông tin kết nối trong ứng dụng hỗ trợ SOCKS proxy

## Công nghệ sử dụng

- [Next.js 15](https://nextjs.org/) - Framework React
- [Tailwind CSS](https://tailwindcss.com/) - Framework CSS
- [TypeScript](https://www.typescriptlang.org/) - Ngôn ngữ lập trình
- [NordVPN API](https://api.nordvpn.com/v1) - API chính thức của NordVPN

## Bảo mật

- Token NordVPN được lưu trữ cục bộ trong trình duyệt của bạn
- Không có dữ liệu nào được gửi đến máy chủ của chúng tôi
- Tất cả các yêu cầu API được thực hiện trực tiếp từ trình duyệt của bạn đến NordVPN

## Đóng góp

Đóng góp luôn được chào đón! Vui lòng tạo issue hoặc pull request nếu bạn muốn cải thiện ứng dụng.

## Giấy phép

[MIT](LICENSE)
