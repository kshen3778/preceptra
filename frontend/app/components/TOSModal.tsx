'use client';

import Link from 'next/link';

export function TOSBanner() {
  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 sm:px-6 py-3">
      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 text-sm">
        <span className="font-medium text-amber-900 text-center">
          Alpha Demo - See{' '}
          <Link
            href="/tos"
            className="text-amber-700 hover:text-amber-900 font-medium hover:underline"
          >
            TOS
          </Link>
          .{' '}
          <span className="text-amber-800">
            Contact us to get full version:
          </span>
        </span>
        <div className="flex items-center gap-2 sm:gap-3">
          <a
            href="https://trymlink.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-700 hover:text-amber-900 font-medium hover:underline"
          >
            trymlink.com
          </a>
          <span className="text-amber-700 hidden sm:inline">•</span>
          <a
            href="mailto:info@trymlink.com?subject=Get Full Version"
            className="text-amber-700 hover:text-amber-900 font-medium hover:underline"
          >
            info@trymlink.com
          </a>
        </div>
      </div>
    </div>
  );
}
