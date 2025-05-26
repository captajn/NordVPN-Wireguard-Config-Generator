'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="bg-black py-4 px-6 shadow-md relative z-20">
      <div className="container mx-auto flex justify-between items-center">
        {/* Mobile Logo */}
        <Link href="/" className="md:hidden flex items-center">
          <Image 
            src="/images/logo.png" 
            alt="NordVPN Logo" 
            width={120} 
            height={120} 
            priority
            className="mr-2"
          />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex space-x-8 flex-1 justify-center items-center">
          <Link href="/" className="text-white hover:text-primary transition-colors font-medium text-lg">
            Trang chủ
          </Link>
          <Link href="/wireguard" className="text-white hover:text-primary transition-colors font-medium text-lg">
            WireGuard
          </Link>
          
          {/* Logo in the middle for desktop */}
          <Link href="/" className="flex items-center mx-4">
            <Image 
              src="/images/logo.png" 
              alt="NordVPN Logo" 
              width={120} 
              height={120} 
              priority
              className="mr-2"
            />
          </Link>
          
          <Link href="/servers" className="text-white hover:text-primary transition-colors font-medium text-lg">
            Máy chủ
          </Link>
          <Link href="/socks" className="text-white hover:text-primary transition-colors font-medium text-lg">
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
        <div className="md:hidden bg-[#1f2937] mt-2 py-2 absolute w-full left-0 shadow-lg z-30">
          <Link 
            href="/" 
            className="block px-6 py-3 text-white hover:bg-primary hover:text-black font-medium"
            onClick={() => setIsMenuOpen(false)}
          >
            Trang chủ
          </Link>
          <Link 
            href="/servers" 
            className="block px-6 py-3 text-white hover:bg-primary hover:text-black font-medium"
            onClick={() => setIsMenuOpen(false)}
          >
            Máy chủ
          </Link>
          <Link 
            href="/wireguard" 
            className="block px-6 py-3 text-white hover:bg-primary hover:text-black font-medium"
            onClick={() => setIsMenuOpen(false)}
          >
            WireGuard
          </Link>
          <Link 
            href="/socks" 
            className="block px-6 py-3 text-white hover:bg-primary hover:text-black font-medium"
            onClick={() => setIsMenuOpen(false)}
          >
            SOCKS
          </Link>
        </div>
      )}
    </header>
  );
} 