'use client';

import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';

export default function LayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  return (
    <div className="flex h-screen overflow-hidden">
      {!isLoginPage && <Sidebar />}
      <main className="flex-1 overflow-y-auto">
        {!isLoginPage && (
          <div className="bg-yellow-100 border-b border-yellow-300 px-6 py-3 text-center">
            <p className="text-sm font-medium text-yellow-800">
              Demo Version - Some features are not available
            </p>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}

