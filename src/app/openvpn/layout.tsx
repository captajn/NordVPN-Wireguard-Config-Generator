import { Metadata } from "next";

export const metadata: Metadata = {
  title: 'OpenVPN | NordVPN API Explorer',
  description: 'Danh sách máy chủ OpenVPN của NordVPN, hỗ trợ tạo và tải xuống cấu hình VPN.',
};

export default function OpenVPNLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 