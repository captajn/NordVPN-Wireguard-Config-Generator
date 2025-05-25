export default function Footer() {
  return (
    <footer className="bg-black text-white py-6 px-4 border-t border-secondary">
      <div className="container mx-auto">
        <div className="flex flex-col md:flex-row justify-between">
          <div className="mb-6 md:mb-0">
            <h3 className="text-primary font-bold text-lg mb-2">NordVPN API Explorer</h3>
            <p className="text-gray-300 text-sm">
              Công cụ khám phá API NordVPN, hỗ trợ WireGuard và SOCKS
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            <div>
              <h4 className="text-primary font-semibold mb-3">API</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="/servers" className="text-gray-300 hover:text-primary">Danh sách máy chủ</a>
                </li>
                <li>
                  <a href="/wireguard" className="text-gray-300 hover:text-primary">WireGuard</a>
                </li>
                <li>
                  <a href="/socks" className="text-gray-300 hover:text-primary">SOCKS</a>
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-primary font-semibold mb-3">Tài nguyên</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="https://nordvpn.com/api/docs/" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-primary">API Docs</a>
                </li>
                <li>
                  <a href="https://nordvpn.com" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-primary">NordVPN</a>
                </li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="mt-8 pt-6 border-t border-secondary text-center text-sm text-gray-400">
          <p>© {new Date().getFullYear()} NordVPN API Explorer | Không phải trang web chính thức của NordVPN</p>
        </div>
      </div>
    </footer>
  );
} 