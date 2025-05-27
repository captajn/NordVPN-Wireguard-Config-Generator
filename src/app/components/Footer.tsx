export default function Footer() {
  return (
    <footer className="relative z-10 py-6 px-4 border-t border-gray-700/30">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm -z-10"></div>
      <div className="container mx-auto">
        <div className="flex flex-col md:flex-row justify-between">
          <div className="mb-6 md:mb-0">
            <h3 className="text-primary font-bold text-lg mb-2">NordVPN API Explorer</h3>
            <p className="text-white text-sm">
              Công cụ khám phá API NordVPN, hỗ trợ WireGuard và SOCKS
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            <div>
              <h4 className="text-primary font-semibold mb-3">API</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="/servers" className="text-white hover:text-primary transition-colors">Danh sách máy chủ</a>
                </li>
                <li>
                  <a href="/wireguard" className="text-white hover:text-primary transition-colors">WireGuard</a>
                </li>
                <li>
                  <a href="/socks" className="text-white hover:text-primary transition-colors">SOCKS</a>
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-primary font-semibold mb-3">Tài nguyên</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="https://nordvpn.com/api/docs/" target="_blank" rel="noopener noreferrer" className="text-white hover:text-primary transition-colors">API Docs</a>
                </li>
                <li>
                  <a href="https://nordvpn.com" target="_blank" rel="noopener noreferrer" className="text-white hover:text-primary transition-colors">NordVPN</a>
                </li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="mt-8 pt-6 border-t border-gray-700/30 text-center text-sm text-white">
          <p>© {new Date().getFullYear()} NordVPN API Explorer | Không phải trang web chính thức của NordVPN</p>
        </div>
      </div>
    </footer>
  );
} 