'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { VideoIcon, Video, LogOut, User, ChevronDown, FileText, Menu, X, Home } from 'lucide-react';
import { Button } from './ui/button';

const navigation: Array<{ name: string; href: string; icon: any; step: number; description: string }> = [];

export default function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      // Don't close if clicking the menu button itself (it handles its own toggle)
      if (menuButtonRef.current && menuButtonRef.current.contains(target)) {
        return;
      }
      
      // Check if click is inside the user menu (button or dropdown)
      if (userMenuRef.current && userMenuRef.current.contains(target)) {
        // Check if it's a link or button inside the dropdown
        const isLinkOrButton = (target as Element).closest('a, button');
        if (isLinkOrButton && userMenuRef.current.contains(isLinkOrButton)) {
          // Allow the click to proceed, don't close menu yet
          return;
        }
        return;
      }
      
      if (menuRef.current && !menuRef.current.contains(target)) {
        setIsMenuOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        // Use setTimeout to allow click handlers to fire first
        setTimeout(() => {
          setIsUserMenuOpen(false);
        }, 0);
      }
    };

    if (isMenuOpen || isUserMenuOpen) {
      // Use click with a slight delay to allow button clicks to fire first
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isMenuOpen, isUserMenuOpen]);

  // Close menu when route changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  const handleLogout = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    try {
      setIsUserMenuOpen(false);
      await fetch('/api/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
            <span className="text-xl font-bold">Preceptra</span>
            <span className="ml-2 text-xs text-muted-foreground hidden sm:inline">by MLink</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2 md:gap-3 lg:gap-4">
            {/* Navigation Links */}
            <div className="flex items-center gap-0.5 md:gap-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-1.5 md:gap-2 rounded-md px-2 md:px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                    title={item.name}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span className="hidden xl:inline">{item.name}</span>
                  </Link>
                );
              })}
            </div>

            {/* Home Button */}
            <Link
              href="/"
              className={cn(
                'flex items-center gap-1.5 md:gap-2 rounded-md px-2 md:px-3 py-2 text-sm font-medium transition-colors',
                pathname === '/'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
              title="Home"
            >
              <Home className="h-4 w-4 flex-shrink-0" />
              <span className="hidden lg:inline">Home</span>
            </Link>

            {/* User Menu */}
            <div className="relative" ref={userMenuRef}>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              >
                <User className="h-4 w-4" />
                <span className="hidden lg:inline">User</span>
                <ChevronDown className={cn(
                  "h-4 w-4 transition-transform",
                  isUserMenuOpen && "rotate-180"
                )} />
              </Button>

              {isUserMenuOpen && (
                <div 
                  className="absolute right-0 top-full mt-2 w-48 bg-background border rounded-md shadow-lg overflow-hidden z-50"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <Link
                    href="/tos"
                    className="flex items-center px-4 py-3 text-sm hover:bg-accent transition-colors cursor-pointer"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsUserMenuOpen(false);
                      router.push('/tos');
                    }}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Terms of Service
                  </Link>
                  <button
                    type="button"
                    className="flex items-center w-full px-4 py-3 text-sm hover:bg-accent transition-colors text-left border-t cursor-pointer"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            {/* Home Button (Mobile) */}
            <Link
              href="/"
              className={cn(
                'flex items-center gap-1.5 rounded-md px-2 py-2 text-sm font-medium transition-colors',
                pathname === '/'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
              title="Home"
            >
              <Home className="h-4 w-4" />
            </Link>

            {/* User Menu Button (Mobile) */}
            <div className="relative" ref={userMenuRef}>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              >
                <User className="h-4 w-4" />
              </Button>

              {isUserMenuOpen && (
                <div 
                  className="absolute right-0 top-full mt-2 w-48 bg-background border rounded-md shadow-lg overflow-hidden z-50"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <Link
                    href="/tos"
                    className="flex items-center px-4 py-3 text-sm hover:bg-accent transition-colors cursor-pointer"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsUserMenuOpen(false);
                      router.push('/tos');
                    }}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Terms of Service
                  </Link>
                  <button
                    type="button"
                    className="flex items-center w-full px-4 py-3 text-sm hover:bg-accent transition-colors text-left border-t cursor-pointer"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>

            {/* Hamburger Menu Button */}
            <Button
              ref={menuButtonRef}
              variant="outline"
              size="icon"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t py-4" ref={menuRef}>
            {/* Close Button */}
            <div className="flex justify-end px-4 mb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMenuOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4 mr-2" />
                Close
              </Button>
            </div>
            
            {/* Navigation Links (Mobile) */}
            <div className="px-2">
              <div className="space-y-1">
                {navigation.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        'flex items-start rounded-md px-3 py-3 text-sm transition-colors',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      )}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <div className={cn(
                        'flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full mr-3 text-xs font-bold',
                        isActive
                          ? 'bg-primary-foreground text-primary'
                          : 'bg-muted text-muted-foreground'
                      )}>
                        {item.step}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 flex-shrink-0" />
                          <span className="font-medium">{item.name}</span>
                        </div>
                        <p className={cn(
                          "text-xs mt-0.5",
                          isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'
                        )}>
                          {item.description}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

