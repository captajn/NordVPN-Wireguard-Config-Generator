/**
 * Tạo cấu hình WireGuard
 * @param privateKey Private key từ API
 * @param serverHostname Hostname của máy chủ
 * @param serverPublicKey Public key của máy chủ
 */
export function generateWireGuardConfig(
  privateKey: string, 
  serverHostname: string, 
  serverPublicKey: string
): string {
  return `[Interface]
PrivateKey = ${privateKey}
Address = 10.5.0.2/16
DNS = 1.1.1.1, 1.0.0.1

[Peer]
PublicKey = ${serverPublicKey}
Endpoint = ${serverHostname}:51820
AllowedIPs = 0.0.0.0/0
PersistentKeepalive = 25
`;
} 