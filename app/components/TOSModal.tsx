'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import Link from 'next/link';

export function TOSBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already dismissed the banner
    const hasDismissed = localStorage.getItem('tos-banner-dismissed');
    if (!hasDismissed) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('tos-banner-dismissed', 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 sm:px-6 py-3 relative">
      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 text-sm">
        <span className="font-medium text-amber-900 text-center">
          Alpha Version - See{' '}
          <Link
            href="/tos"
            className="text-amber-700 hover:text-amber-900 font-medium hover:underline"
          >
            TOS
          </Link>
        </span>
        <button
          onClick={handleDismiss}
          className="absolute right-4 sm:relative sm:right-auto text-amber-700 hover:text-amber-900 p-1 rounded hover:bg-amber-100 transition-colors"
          aria-label="Dismiss banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
