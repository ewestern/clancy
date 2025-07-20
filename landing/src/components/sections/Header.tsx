'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { navItems } from '@/lib/data';

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const NavLink = ({ href, children, onClick }: { href: string; children: React.ReactNode; onClick?: () => void }) => {
    const isInternalLink = href.startsWith('/') || href.startsWith('#');
    
    if (isInternalLink) {
      return (
        <Link 
          href={href} 
          className="text-slate-600 hover:text-slate-900 font-medium transition-colors duration-200"
          onClick={onClick}
        >
          {children}
        </Link>
      );
    }
    
    return (
      <a 
        href={href} 
        className="text-slate-600 hover:text-slate-900 font-medium transition-colors duration-200"
        onClick={onClick}
      >
        {children}
      </a>
    );
  };

  return (
    <header className="relative bg-white border-b border-slate-100">
      <div className="section-container">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">C</span>
              </div>
              <span className="font-display font-bold text-xl text-slate-900">
                Clancy AI
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-8">
            {navItems.map((item) => (
              <NavLink key={item.label} href={item.href}>
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden lg:flex items-center space-x-4">
            <Button variant="secondary" href="/login">
              Login
            </Button>
            <Button variant="primary" href="/signup">
              Get Early Access
            </Button>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={toggleMenu}
            className="lg:hidden p-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors duration-200"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="lg:hidden border-t border-slate-100 py-4">
            <nav className="flex flex-col space-y-4">
              {navItems.map((item) => (
                <NavLink 
                  key={item.label} 
                  href={item.href}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.label}
                </NavLink>
              ))}
              <div className="flex flex-col space-y-2 pt-4 border-t border-slate-100">
                <Button variant="secondary" href="/login" size="sm">
                  Login
                </Button>
                <Button variant="primary" href="/signup" size="sm">
                  Get Early Access
                </Button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
} 