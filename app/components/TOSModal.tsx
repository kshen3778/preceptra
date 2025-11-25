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
    <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 relative">
      <div className="flex items-center justify-center gap-3 text-sm max-w-5xl mx-auto">
        <span className="font-semibold text-amber-900">
          Alpha Version:
        </span>
        <span className="text-amber-800">
          This is experimental AI technology. I understand the
        </span>
        <Link
          href="/tos"
          className="text-amber-700 hover:text-amber-900 font-medium underline"
        >
          Terms of Service
        </Link>
        <span className="text-amber-800">
          and will review all AI-generated results.
        </span>
        <button
          onClick={handleDismiss}
          className="ml-2 text-amber-700 hover:text-amber-900 p-1 rounded hover:bg-amber-100 transition-colors"
          aria-label="Dismiss banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
