'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="bg-black py-4 px-6 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="flex items-center">
          <div className="text-primary text-2xl font-bold">NordVPN API</div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex space-x-8 flex-1 justify-center">
          <Link href="/" className="text-white hover:text-primary transition-colors">
            Trang chủ
          </Link>
          <Link href="/servers" className="text-white hover:text-primary transition-colors">
            Máy chủ
          </Link>
          <Link href="/wireguard" className="text-white hover:text-primary transition-colors">
            WireGuard
          </Link>
          <Link href="/socks" className="text-white hover:text-primary transition-colors">
            SOCKS
          </Link>
        </nav>

        {/* Mobile Menu Button */}
        <button 
          className="md:hidden text-white focus:outline-none"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden bg-secondary mt-2 py-2">
          <Link 
            href="/" 
            className="block px-6 py-2 text-white hover:bg-primary hover:text-black"
            onClick={() => setIsMenuOpen(false)}
          >
            Trang chủ
          </Link>
          <Link 
            href="/servers" 
            className="block px-6 py-2 text-white hover:bg-primary hover:text-black"
            onClick={() => setIsMenuOpen(false)}
          >
            Máy chủ
          </Link>
          <Link 
            href="/wireguard" 
            className="block px-6 py-2 text-white hover:bg-primary hover:text-black"
            onClick={() => setIsMenuOpen(false)}
          >
            WireGuard
          </Link>
          <Link 
            href="/socks" 
            className="block px-6 py-2 text-white hover:bg-primary hover:text-black"
            onClick={() => setIsMenuOpen(false)}
          >
            SOCKS
          </Link>
        </div>
      )}
    </header>
  );
} 