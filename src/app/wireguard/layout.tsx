import { Metadata } from "next";

export const metadata: Metadata = {
  title: 'WireGuard VPN | NordVPN API Explorer',
  description: 'Danh sách máy chủ WireGuard của NordVPN, hỗ trợ tạo và tải xuống cấu hình VPN.',
};

export default function WireGuardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 