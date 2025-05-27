import { Metadata } from "next";

export const metadata: Metadata = {
  title: 'SOCKS Proxy | NordVPN API Explorer',
  description: 'Danh sách máy chủ SOCKS proxy của NordVPN, hỗ trợ tải xuống và cấu hình proxy.',
};

export default function SocksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 